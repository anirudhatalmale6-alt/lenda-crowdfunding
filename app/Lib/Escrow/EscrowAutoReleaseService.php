<?php
/**
 * Escrow Auto-Release Service
 * 
 * Handles automatic release of escrow funds after delivery confirmation
 * or timeout period
 * 
 * @package Lenda
 * @subpackage Lib.Escrow
 */

App::uses('LendaEventBus', 'Lib.Event');

/**
 * Escrow Auto-Release Service
 */
class EscrowAutoReleaseService {
    
    /**
     * Default auto-release days
     */
    const DEFAULT_AUTO_RELEASE_DAYS = 14;
    
    /**
     * Process auto-release for an escrow
     */
    public function processAutoRelease($escrowTransactionId) {
        App::uses('EscrowTransaction', 'Model');
        $EscrowTransaction = ClassRegistry::init('EscrowTransaction');
        
        $escrow = $EscrowTransaction->find('first', array(
            'conditions' => array('EscrowTransaction.id' => $escrowTransactionId),
            'contain' => array('Buyer', 'Seller')
        ));
        
        if (!$escrow) {
            throw new Exception("Escrow not found: {$escrowTransactionId}");
        }
        
        // Check if auto-release conditions are met
        if (!$this->_canAutoRelease($escrow)) {
            return false;
        }
        
        // Release funds
        return $this->_releaseFunds($escrow);
    }
    
    /**
     * Check if escrow can be auto-released
     */
    protected function _canAutoRelease($escrow) {
        $status = $escrow['EscrowTransaction']['status'];
        
        // Must be in funded state
        if ($status !== 'funded') {
            return false;
        }
        
        // Check if delivery is confirmed
        if (!empty($escrow['EscrowTransaction']['delivery_confirmed_at'])) {
            return true;
        }
        
        // Check if auto-release date has passed
        $autoReleaseAt = $escrow['EscrowTransaction']['auto_release_at'];
        if ($autoReleaseAt && strtotime($autoReleaseAt) <= time()) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Release funds to seller
     */
    protected function _releaseFunds($escrow) {
        $escrowId = $escrow['EscrowTransaction']['id'];
        $amount = $escrow['EscrowTransaction']['amount'];
        $sellerId = $escrow['EscrowTransaction']['seller_id'];
        
        // Get escrow wallet
        App::uses('WalletAccount', 'Model');
        $WalletAccount = ClassRegistry::init('WalletAccount');
        
        $sellerWallet = $WalletAccount->find('first', array(
            'conditions' => array(
                'WalletAccount.user_id' => $sellerId,
                'WalletAccount.type' => 'main'
            )
        ));
        
        if (!$sellerWallet) {
            throw new Exception("Seller wallet not found");
        }
        
        // Update escrow status
        App::uses('EscrowTransaction', 'Model');
        $EscrowTransaction = ClassRegistry::init('EscrowTransaction');
        
        $EscrowTransaction->id = $escrowId;
        $EscrowTransaction->saveField('status', 'released');
        $EscrowTransaction->saveField('released_at', date('Y-m-d H:i:s'));
        $EscrowTransaction->saveField('release_reason', 'auto_release');
        
        // Credit seller wallet
        $currentBalance = floatval($sellerWallet['WalletAccount']['balance']);
        $WalletAccount->id = $sellerWallet['WalletAccount']['id'];
        $WalletAccount->saveField('balance', $currentBalance + $amount);
        
        // Record transaction
        App::uses('WalletTransaction', 'Model');
        $WalletTransaction = ClassRegistry::init('WalletTransaction');
        
        $WalletTransaction->create();
        $WalletTransaction->save(array(
            'wallet_id' => $sellerWallet['WalletAccount']['id'],
            'user_id' => $sellerId,
            'type' => 'escrow_release',
            'amount' => $amount,
            'status' => 'completed',
            'reference_type' => 'escrow',
            'reference_id' => $escrowId,
            'completed_at' => date('Y-m-d H:i:s')
        ));
        
        // Record status history
        $this->_recordStatusHistory($escrowId, 'released', 'auto_release');
        
        // Publish event
        LendaEventBus::getInstance()->publish(LendaEvent::ESCROW_RELEASED, array(
            'escrow_id' => $escrowId,
            'amount' => $amount,
            'released_to' => $sellerId,
            'release_type' => 'auto'
        ));
        
        return true;
    }
    
    /**
     * Process delivery confirmation
     */
    public function confirmDelivery($escrowTransactionId, $userId, $data = array()) {
        App::uses('EscrowTransaction', 'Model');
        App::uses('EscrowDeliveryConfirmation', 'Model');
        
        $EscrowTransaction = ClassRegistry::init('EscrowTransaction');
        $EscrowDeliveryConfirmation = ClassRegistry::init('EscrowDeliveryConfirmation');
        
        // Get escrow
        $escrow = $EscrowTransaction->find('first', array(
            'conditions' => array('EscrowTransaction.id' => $escrowTransactionId)
        ));
        
        if (!$escrow) {
            throw new Exception("Escrow not found");
        }
        
        // Verify user is buyer
        if ($escrow['EscrowTransaction']['buyer_id'] != $userId) {
            throw new Exception("Only buyer can confirm delivery");
        }
        
        // Verify escrow is in funded state
        if ($escrow['EscrowTransaction']['status'] !== 'funded') {
            throw new Exception("Escrow must be in funded state");
        }
        
        // Save delivery confirmation
        $EscrowDeliveryConfirmation->create();
        $EscrowDeliveryConfirmation->save(array(
            'escrow_transaction_id' => $escrowTransactionId,
            'confirmed_by' => $userId,
            'confirmation_type' => 'buyer',
            'proof_url' => $data['proof_url'] ?? null,
            'proof_type' => $data['proof_type'] ?? 'photo',
            'notes' => $data['notes'] ?? null,
            'ip_address' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null
        ));
        
        // Update escrow with delivery confirmation
        $EscrowTransaction->id = $escrowTransactionId;
        $EscrowTransaction->saveField('delivery_confirmed_at', date('Y-m-d H:i:s'));
        $EscrowTransaction->saveField('delivery_proof_url', $data['proof_url'] ?? null);
        $EscrowTransaction->saveField('delivery_notes', $data['notes'] ?? null);
        
        // Record status history
        $this->_recordStatusHistory($escrowTransactionId, 'delivered', 'buyer_confirmation');
        
        // Check if auto-release should happen immediately (or schedule it)
        $autoReleaseDays = $escrow['EscrowTransaction']['auto_release_days'] ?? self::DEFAULT_AUTO_RELEASE_DAYS;
        $autoReleaseAt = date('Y-m-d H:i:s', strtotime("+{$autoReleaseDays} days"));
        
        $EscrowTransaction->saveField('auto_release_at', $autoReleaseAt);
        
        // If buyer confirms, release immediately (optional - some platforms wait)
        // For now, we schedule auto-release but can trigger immediately
        $this->processAutoRelease($escrowTransactionId);
        
        return true;
    }
    
    /**
     * Schedule auto-release for all eligible escrows
     */
    public function scheduleAutoReleases() {
        App::uses('EscrowTransaction', 'Model');
        $EscrowTransaction = ClassRegistry::init('EscrowTransaction');
        
        // Find escrows that need auto-release scheduling
        $escrows = $EscrowTransaction->find('all', array(
            'conditions' => array(
                'EscrowTransaction.status' => 'shipped',
                'EscrowTransaction.auto_release_at' => null
            )
        ));
        
        $scheduled = 0;
        
        foreach ($escrows as $escrow) {
            $autoReleaseDays = $escrow['EscrowTransaction']['auto_release_days'] ?? self::DEFAULT_AUTO_RELEASE_DAYS;
            $autoReleaseAt = date('Y-m-d H:i:s', strtotime("+{$autoReleaseDays} days"));
            
            $EscrowTransaction->id = $escrow['EscrowTransaction']['id'];
            $EscrowTransaction->saveField('auto_release_at', $autoReleaseAt);
            
            $scheduled++;
        }
        
        return $scheduled;
    }
    
    /**
     * Process all pending auto-releases
     */
    public function processPendingAutoReleases() {
        App::uses('EscrowTransaction', 'Model');
        $EscrowTransaction = ClassRegistry::init('EscrowTransaction');
        
        // Find escrows ready for auto-release
        $escrows = $EscrowTransaction->find('all', array(
            'conditions' => array(
                'EscrowTransaction.status' => 'funded',
                'EscrowTransaction.auto_release_at <=' => date('Y-m-d H:i:s')
            )
        ));
        
        $processed = 0;
        $failed = 0;
        
        foreach ($escrows as $escrow) {
            try {
                if ($this->processAutoRelease($escrow['EscrowTransaction']['id'])) {
                    $processed++;
                }
            } catch (Exception $e) {
                $failed++;
                // Log error
                CakeLog::write('error', "Auto-release failed for escrow {$escrow['EscrowTransaction']['id']}: " . $e->getMessage());
            }
        }
        
        return array(
            'processed' => $processed,
            'failed' => $failed
        );
    }
    
    /**
     * Record status history
     */
    protected function _recordStatusHistory($escrowId, $status, $notes = null) {
        App::uses('EscrowStatusHistory', 'Model');
        $EscrowStatusHistory = ClassRegistry::init('EscrowStatusHistory');
        
        $EscrowStatusHistory->create();
        $EscrowStatusHistory->save(array(
            'escrow_transaction_id' => $escrowId,
            'status' => $status,
            'notes' => $notes,
            'changed_by' => isset($_SESSION['Auth']['User']['id']) ? $_SESSION['Auth']['User']['id'] : null
        ));
    }
    
    /**
     * Get escrow auto-release status
     */
    public function getAutoReleaseStatus($escrowTransactionId) {
        App::uses('EscrowTransaction', 'Model');
        $EscrowTransaction = ClassRegistry::init('EscrowTransaction');
        
        $escrow = $EscrowTransaction->find('first', array(
            'conditions' => array('EscrowTransaction.id' => $escrowTransactionId)
        ));
        
        if (!$escrow) {
            return null;
        }
        
        $status = $escrow['EscrowTransaction']['status'];
        $autoReleaseAt = $escrow['EscrowTransaction']['auto_release_at'];
        $deliveryConfirmed = !empty($escrow['EscrowTransaction']['delivery_confirmed_at']);
        
        $canRelease = false;
        $reason = '';
        
        if ($status === 'released') {
            $reason = 'Already released';
        } elseif ($status !== 'funded') {
            $reason = 'Escrow not in funded state';
        } elseif ($deliveryConfirmed) {
            $canRelease = true;
            $reason = 'Delivery confirmed';
        } elseif ($autoReleaseAt && strtotime($autoReleaseAt) <= time()) {
            $canRelease = true;
            $reason = 'Auto-release deadline reached';
        } elseif ($autoReleaseAt) {
            $reason = 'Waiting for auto-release date: ' . $autoReleaseAt;
        } else {
            $reason = 'Waiting for shipping';
        }
        
        return array(
            'escrow_id' => $escrowTransactionId,
            'status' => $status,
            'can_auto_release' => $canRelease,
            'reason' => $reason,
            'auto_release_at' => $autoReleaseAt,
            'delivery_confirmed' => $deliveryConfirmed,
            'delivery_confirmed_at' => $escrow['EscrowTransaction']['delivery_confirmed_at']
        );
    }
}
