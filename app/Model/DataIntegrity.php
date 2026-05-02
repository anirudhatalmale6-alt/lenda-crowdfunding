<?php
App::uses('AppModel', 'Model');

/**
 * DataIntegrity Model
 * 
 * Handles data integrity operations including:
 * - ACID transactions for loan funding
 * - Wallet balance reconciliation
 * - Idempotency key management
 * - Optimistic locking
 * - Double-entry ledger verification
 * - Token ownership sync
 * - Ownership history tracking
 * 
 * @property IdempotencyKey $IdempotencyKey
 * @property OperationLock $OperationLock
 * @property LedgerEntry $LedgerEntry
 * @property BalanceAdjustment $BalanceAdjustment
 * @property TokenOwnershipSync $TokenOwnershipSync
 * @property OwnershipHistory $OwnershipHistory
 */
class DataIntegrity extends AppModel {
    public $name = 'DataIntegrity';
    public $useTable = false; // This is a virtual model that coordinates other models
    
    /**
     * Database transaction wrapper
     * 
     * @param callable $callback Function to execute within transaction
     * @param array $errorResponse Response on failure
     * @param int $errorCode HTTP error code
     * @return mixed
     */
    public function withTransaction($callback, $errorResponse = array('success' => false, 'message' => 'Transaction failed'), $errorCode = 500) {
        $db = ConnectionManager::getDataSource('default');
        
        try {
            $db->begin();
            
            $result = call_user_func($callback);
            
            $db->commit();
            return $result;
            
        } catch (Exception $e) {
            $db->rollback();
            
            // Log the error
            CakeLog::write('error', 'DataIntegrity Transaction Failed: ' . $e->getMessage());
            
            return array(
                'success' => false,
                'message' => $errorResponse['message'] ?? 'Transaction failed: ' . $e->getMessage(),
                'code' => $errorCode,
                'error' => $e->getMessage()
            );
        }
    }
    
    /**
     * Check and validate idempotency key
     * 
     * @param string $key The idempotency key
     * @param string $endpoint The API endpoint
     * @param int|null $userId User ID if authenticated
     * @param array $requestData Request data to hash
     * @return array Response with cached result if exists
     */
    public function checkIdempotency($key, $endpoint, $userId = null, $requestData = array()) {
        App::uses('IdempotencyKey', 'Model');
        $this->IdempotencyKey = ClassRegistry::init('IdempotencyKey');
        
        $keyHash = hash('sha256', $key);
        $requestHash = hash('sha256', json_encode($requestData));
        
        // Check if key exists
        $existing = $this->IdempotencyKey->find('first', array(
            'conditions' => array(
                'IdempotencyKey.key_hash' => $keyHash,
                'IdempotencyKey.expires_at >' => date('Y-m-d H:i:s')
            )
        ));
        
        if ($existing) {
            // Check if request is identical
            if ($existing['IdempotencyKey']['request_hash'] === $requestHash) {
                return array(
                    'success' => true,
                    'cached' => true,
                    'response_status' => $existing['IdempotencyKey']['response_status'],
                    'response_body' => json_decode($existing['IdempotencyKey']['response_body'], true)
                );
            }
            
            return array(
                'success' => false,
                'cached' => true,
                'error' => 'Idempotency key already exists with different request'
            );
        }
        
        return array('success' => true, 'cached' => false);
    }
    
    /**
     * Store idempotency key with response
     * 
     * @param string $key The idempotency key
     * @param string $endpoint The API endpoint
     * @param int|null $userId User ID
     * @param array $requestData Request data
     * @param int $responseStatus HTTP status code
     * @param array $responseBody Response body
     * @param int $ttlSeconds Time to live in seconds (default 24 hours)
     * @return bool
     */
    public function storeIdempotency($key, $endpoint, $userId, $requestData, $responseStatus, $responseBody, $ttlSeconds = 86400) {
        App::uses('IdempotencyKey', 'Model');
        $this->IdempotencyKey = ClassRegistry::init('IdempotencyKey');
        
        $keyHash = hash('sha256', $key);
        $requestHash = hash('sha256', json_encode($requestData));
        
        $this->IdempotencyKey->create();
        return $this->IdempotencyKey->save(array(
            'key_hash' => $keyHash,
            'endpoint' => $endpoint,
            'user_id' => $userId,
            'request_hash' => $requestHash,
            'response_status' => $responseStatus,
            'response_body' => json_encode($responseBody),
            'expires_at' => date('Y-m-d H:i:s', time() + $ttlSeconds)
        ));
    }
    
    /**
     * Acquire optimistic lock for an operation
     * 
     * @param string $entityType Entity type (e.g., 'loan', 'wallet')
     * @param int $entityId Entity ID
     * @param string $operationType Operation type (e.g., 'funding', 'transfer')
     * @param int|null $userId User performing the operation
     * @param int $ttlSeconds Lock time to live
     * @return array Result with lock token or error
     */
    public function acquireLock($entityType, $entityId, $operationType, $userId = null, $ttlSeconds = 30) {
        App::uses('OperationLock', 'Model');
        $this->OperationLock = ClassRegistry::init('OperationLock');
        
        $lockToken = bin2hex(random_bytes(16));
        
        // Check for existing active lock
        $existing = $this->OperationLock->find('first', array(
            'conditions' => array(
                'OperationLock.entity_type' => $entityType,
                'OperationLock.entity_id' => $entityId,
                'OperationLock.operation_type' => $operationType,
                'OperationLock.expires_at >' => date('Y-m-d H:i:s'),
                'OperationLock.released_at' => null
            )
        ));
        
        if ($existing) {
            // Check if it's the same user (allow re-entry)
            if ($existing['OperationLock']['user_id'] == $userId) {
                // Extend the lock
                $this->OperationLock->id = $existing['OperationLock']['id'];
                $this->OperationLock->saveField('expires_at', date('Y-m-d H:i:s', time() + $ttlSeconds));
                
                return array(
                    'success' => true,
                    'lock_token' => $existing['OperationLock']['lock_token'],
                    'reacquired' => true
                );
            }
            
            return array(
                'success' => false,
                'error' => 'Operation in progress',
                'locked_by' => $existing['OperationLock']['user_id'],
                'expires_at' => $existing['OperationLock']['expires_at']
            );
        }
        
        // Create new lock
        $this->OperationLock->create();
        $result = $this->OperationLock->save(array(
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'operation_type' => $operationType,
            'lock_token' => $lockToken,
            'user_id' => $userId,
            'expires_at' => date('Y-m-d H:i:s', time() + $ttlSeconds)
        ));
        
        if ($result) {
            return array(
                'success' => true,
                'lock_token' => $lockToken
            );
        }
        
        return array(
            'success' => false,
            'error' => 'Failed to acquire lock'
        );
    }
    
    /**
     * Release an optimistic lock
     * 
     * @param string $lockToken The lock token
     * @return bool
     */
    public function releaseLock($lockToken) {
        App::uses('OperationLock', 'Model');
        $this->OperationLock = ClassRegistry::init('OperationLock');
        
        $lock = $this->OperationLock->find('first', array(
            'conditions' => array(
                'OperationLock.lock_token' => $lockToken
            )
        ));
        
        if ($lock) {
            $this->OperationLock->id = $lock['OperationLock']['id'];
            return $this->OperationLock->saveField('released_at', date('Y-m-d H:i:s'));
        }
        
        return false;
    }
    
    /**
     * Verify optimistic locking version
     * 
     * @param string $modelName Model name
     * @param int $id Record ID
     * @param int $expectedVersion Expected version number
     * @return bool
     */
    public function verifyVersion($modelName, $id, $expectedVersion) {
        App::uses($modelName, 'Model');
        $Model = ClassRegistry::init($modelName);
        
        $record = $Model->find('first', array(
            'conditions' => array($Model->alias . '.id' => $id),
            'fields' => array('id', 'version'),
            'recursive' => -1
        ));
        
        if (!$record) {
            return false;
        }
        
        return intval($record[$Model->alias]['version']) === intval($expectedVersion);
    }
    
    /**
     * Increment version after successful operation
     * 
     * @param string $modelName Model name
     * @param int $id Record ID
     * @return bool
     */
    public function incrementVersion($modelName, $id) {
        App::uses($modelName, 'Model');
        $Model = ClassRegistry::init($modelName);
        
        $Model->id = $id;
        return $Model->saveField('version', $Model->field('version') + 1);
    }
    
    /**
     * Create double-entry ledger entries
     * 
     * @param int $transactionId Parent transaction ID
     * @param array $entries Array of entry arrays with: type, account_type, account_id, amount, reference_type, reference_id, description
     * @return array Result with entry IDs or error
     */
    public function createLedgerEntries($transactionId, $entries) {
        App::uses('LedgerEntry', 'Model');
        $this->LedgerEntry = ClassRegistry::init('LedgerEntry');
        
        $entryIds = array();
        $totalDebits = 0;
        $totalCredits = 0;
        
        foreach ($entries as $entry) {
            $this->LedgerEntry->create();
            $result = $this->LedgerEntry->save(array(
                'transaction_id' => $transactionId,
                'entry_type' => $entry['type'],
                'account_type' => $entry['account_type'],
                'account_id' => $entry['account_id'],
                'amount' => $entry['amount'],
                'currency' => $entry['currency'] ?? 'USD',
                'reference_type' => $entry['reference_type'] ?? null,
                'reference_id' => $entry['reference_id'] ?? null,
                'description' => $entry['description'] ?? null,
                'metadata' => isset($entry['metadata']) ? json_encode($entry['metadata']) : null
            ));
            
            if ($result) {
                $entryIds[] = $this->LedgerEntry->getLastInsertID();
                
                if ($entry['type'] === 'debit') {
                    $totalDebits += floatval($entry['amount']);
                } else {
                    $totalCredits += floatval($entry['amount']);
                }
            } else {
                return array(
                    'success' => false,
                    'error' => 'Failed to create ledger entry'
                );
            }
        }
        
        // Create verification record
        $isBalanced = abs($totalDebits - $totalCredits) < 0.01;
        
        App::uses('LedgerVerification', 'Model');
        $this->LedgerVerification = ClassRegistry::init('LedgerVerification');
        
        $this->LedgerVerification->create();
        $this->LedgerVerification->save(array(
            'transaction_id' => $transactionId,
            'total_debits' => $totalDebits,
            'total_credits' => $totalCredits,
            'is_balanced' => $isBalanced ? 1 : 0,
            'discrepancy' => abs($totalDebits - $totalCredits)
        ));
        
        return array(
            'success' => true,
            'entry_ids' => $entryIds,
            'total_debits' => $totalDebits,
            'total_credits' => $totalCredits,
            'balanced' => $isBalanced
        );
    }
    
    /**
     * Verify ledger balance for a transaction
     * 
     * @param int $transactionId Transaction ID
     * @return array Verification result
     */
    public function verifyLedgerBalance($transactionId) {
        App::uses('LedgerVerification', 'Model');
        $this->LedgerVerification = ClassRegistry::init('LedgerVerification');
        
        $verification = $this->LedgerVerification->find('first', array(
            'conditions' => array(
                'LedgerVerification.transaction_id' => $transactionId
            )
        ));
        
        if ($verification) {
            return array(
                'verified' => (bool) $verification['LedgerVerification']['is_balanced'],
                'debits' => $verification['LedgerVerification']['total_debits'],
                'credits' => $verification['LedgerVerification']['total_credits'],
                'discrepancy' => $verification['LedgerVerification']['discrepancy'],
                'verified_at' => $verification['LedgerVerification']['verified_at']
            );
        }
        
        return array('verified' => false, 'error' => 'No verification record found');
    }
    
    /**
     * Record balance adjustment with audit trail
     * 
     * @param int $walletId Wallet ID
     * @param int $userId User ID
     * @param string $type Adjustment type
     * @param float $amount Amount
     * @param float $balanceBefore Balance before adjustment
     * @param float $balanceAfter Balance after adjustment
     * @param string|null $referenceType Reference type
     * @param int|null $referenceId Reference ID
     * @param string|null $reason Reason for adjustment
     * @param bool $isAuto Whether this is automatic
     * @param int|null $createdBy Admin user ID if manual
     * @return int|false Adjustment ID
     */
    public function recordBalanceAdjustment($walletId, $userId, $type, $amount, $balanceBefore, $balanceAfter, $referenceType = null, $referenceId = null, $reason = null, $isAuto = true, $createdBy = null) {
        App::uses('BalanceAdjustment', 'Model');
        $this->BalanceAdjustment = ClassRegistry::init('BalanceAdjustment');
        
        $this->BalanceAdjustment->create();
        $result = $this->BalanceAdjustment->save(array(
            'wallet_id' => $walletId,
            'user_id' => $userId,
            'adjustment_type' => $type,
            'amount' => $amount,
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'reason' => $reason,
            'is_auto' => $isAuto ? 1 : 0,
            'created_by' => $createdBy
        ));
        
        if ($result) {
            return $this->BalanceAdjustment->getLastInsertID();
        }
        
        return false;
    }
    
    /**
     * Reconcile wallet balance
     * 
     * @param int $walletId Wallet ID
     * @return array Reconciliation result
     */
    public function reconcileWallet($walletId) {
        App::uses('WalletAccount', 'Model');
        App::uses('WalletTransaction', 'Model');
        App::uses('BalanceAdjustment', 'Model');
        
        $WalletAccount = ClassRegistry::init('WalletAccount');
        $WalletTransaction = ClassRegistry::init('WalletTransaction');
        
        // Get current wallet balance
        $wallet = $WalletAccount->find('first', array(
            'conditions' => array('WalletAccount.id' => $walletId),
            'recursive' => -1
        ));
        
        if (!$wallet) {
            return array('success' => false, 'error' => 'Wallet not found');
        }
        
        // Calculate actual balance from transactions
        $transactions = $WalletTransaction->find('all', array(
            'conditions' => array(
                'WalletTransaction.wallet_id' => $walletId,
                'WalletTransaction.status' => 'completed'
            ),
            'fields' => array(
                'SUM(CASE WHEN WalletTransaction.type IN ("deposit", "earning", "escrow_release", "repayment") THEN WalletTransaction.amount ELSE 0 END) as credits',
                'SUM(CASE WHEN WalletTransaction.type IN ("withdrawal", "transfer", "loan_funding", "escrow_hold", "fee") THEN WalletTransaction.amount ELSE 0 END) as debits'
            ),
            'recursive' => -1
        ));
        
        $credits = floatval($transactions[0][0]['credits'] ?? 0);
        $debits = floatval($transactions[0][0]['debits'] ?? 0);
        $calculatedBalance = $credits - $debits;
        $recordedBalance = floatval($wallet['WalletAccount']['balance']);
        
        $isBalanced = abs($calculatedBalance - $recordedBalance) < 0.01;
        
        // Update wallet reconciliation status
        $WalletAccount->id = $walletId;
        $WalletAccount->save(array(
            'last_reconciled_at' => date('Y-m-d H:i:s'),
            'reconciliation_status' => $isBalanced ? 'ok' : 'mismatch'
        ));
        
        // Create reconciliation snapshot
        App::uses('ReconciliationSnapshot', 'Model');
        $ReconciliationSnapshot = ClassRegistry::init('ReconciliationSnapshot');
        
        $transactionCount = $WalletTransaction->find('count', array(
            'conditions' => array(
                'WalletTransaction.wallet_id' => $walletId,
                'WalletTransaction.status' => 'completed'
            )
        ));
        
        $ReconciliationSnapshot->create();
        $ReconciliationSnapshot->save(array(
            'snapshot_type' => 'manual',
            'wallet_id' => $walletId,
            'balance_before' => $recordedBalance,
            'balance_after' => $calculatedBalance,
            'transaction_count' => $transactionCount,
            'total_debits' => $debits,
            'total_credits' => $credits,
            'discrepancies_found' => $isBalanced ? 0 : 1,
            'discrepancies_resolved' => 0,
            'status' => 'completed',
            'completed_at' => date('Y-m-d H:i:s')
        ));
        
        return array(
            'success' => true,
            'recorded_balance' => $recordedBalance,
            'calculated_balance' => $calculatedBalance,
            'balanced' => $isBalanced,
            'discrepancy' => abs($calculatedBalance - $recordedBalance),
            'transaction_count' => $transactionCount
        );
    }
    
    /**
     * Sync token ownership with blockchain
     * 
     * @param int $contractId Token contract ID
     * @param int $holderId Holder user ID
     * @param float $blockchainCount Token count from blockchain
     * @param array $syncErrors Any sync errors
     * @return array Sync result
     */
    public function syncTokenOwnership($contractId, $holderId, $blockchainCount, $syncErrors = array()) {
        App::uses('TokenOwnershipSync', 'Model');
        App::uses('TokenHolding', 'Model');
        
        $TokenOwnershipSync = ClassRegistry::init('TokenOwnershipSync');
        $TokenHolding = ClassRegistry::init('TokenHolding');
        
        // Find or create sync record
        $sync = $TokenOwnershipSync->find('first', array(
            'conditions' => array(
                'TokenOwnershipSync.contract_id' => $contractId,
                'TokenOwnershipSync.holder_id' => $holderId
            )
        ));
        
        // Get current DB count
        $holding = $TokenHolding->find('first', array(
            'conditions' => array(
                'TokenHolding.contract_id' => $contractId,
                'TokenHolding.holder_id' => $holderId
            )
        ));
        
        $dbCount = $holding ? floatval($holding['TokenHolding']['token_count']) : 0;
        
        $status = 'synced';
        if (!empty($syncErrors)) {
            $status = 'error';
        } elseif (abs($dbCount - $blockchainCount) > 0) {
            $status = 'mismatch';
        }
        
        if ($sync) {
            $TokenOwnershipSync->id = $sync['TokenOwnershipSync']['id'];
            $TokenOwnershipSync->save(array(
                'db_token_count' => $dbCount,
                'blockchain_token_count' => $blockchainCount,
                'last_sync_at' => date('Y-m-d H:i:s'),
                'last_verified_at' => date('Y-m-d H:i:s'),
                'sync_status' => $status,
                'sync_errors' => empty($syncErrors) ? null : json_encode($syncErrors)
            ));
        } else {
            $TokenOwnershipSync->create();
            $TokenOwnershipSync->save(array(
                'contract_id' => $contractId,
                'holder_id' => $holderId,
                'db_token_count' => $dbCount,
                'blockchain_token_count' => $blockchainCount,
                'last_sync_at' => date('Y-m-d H:i:s'),
                'last_verified_at' => date('Y-m-d H:i:s'),
                'sync_status' => $status,
                'sync_errors' => empty($syncErrors) ? null : json_encode($syncErrors)
            ));
        }
        
        // Update token holding sync info
        if ($holding && $status === 'synced') {
            $TokenHolding->id = $holding['TokenHolding']['id'];
            $TokenHolding->save(array(
                'last_synced_at' => date('Y-m-d H:i:s'),
                'sync_version' => $holding['TokenHolding']['sync_version'] + 1
            ));
        }
        
        return array(
            'success' => true,
            'db_count' => $dbCount,
            'blockchain_count' => $blockchainCount,
            'status' => $status,
            'requires_correction' => ($status === 'mismatch')
        );
    }
    
    /**
     * Record ownership history entry
     * 
     * @param int $contractId Token contract ID
     * @param int|null $tokenId Token ID (for NFT-style)
     * @param int|null $fromHolderId Previous holder
     * @param int $toHolderId New holder
     * @param float $tokenCount Number of tokens
     * @param string $transferType Type of transfer
     * @param string|null $txHash Blockchain transaction hash
     * @param string|null $notes Additional notes
     * @return int|false History ID
     */
    public function recordOwnershipHistory($contractId, $tokenId, $fromHolderId, $toHolderId, $tokenCount, $transferType, $txHash = null, $notes = null) {
        App::uses('OwnershipHistory', 'Model');
        $this->OwnershipHistory = ClassRegistry::init('OwnershipHistory');
        
        $this->OwnershipHistory->create();
        $result = $this->OwnershipHistory->save(array(
            'contract_id' => $contractId,
            'token_id' => $tokenId,
            'from_holder_id' => $fromHolderId,
            'to_holder_id' => $toHolderId,
            'token_count' => $tokenCount,
            'transfer_type' => $transferType,
            'tx_hash' => $txHash,
            'verification_status' => $txHash ? 'pending' : 'verified',
            'notes' => $notes
        ));
        
        if ($result) {
            return $this->OwnershipHistory->getLastInsertID();
        }
        
        return false;
    }
}
