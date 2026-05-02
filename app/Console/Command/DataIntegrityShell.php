<?php
App::uses('Shell', 'Console');

/**
 * DataIntegrity Shell
 * 
 * Handles periodic data integrity operations:
 * - Wallet reconciliation
 * - Ledger verification
 * - Token ownership sync
 * - Idempotency key cleanup
 * - Lock cleanup
 * 
 * Usage:
 *   cd app && Console/cake DataIntegrity.reconcile
 *   cd app && Console/cake DataIntegrity.verify
 *   cd app && Console/cake DataIntegrity.sync_tokens
 *   cd app && Console/cake DataIntegrity.cleanup
 */
class DataIntegrityShell extends Shell {
    
    /**
     * Models
     */
    private $WalletAccount;
    private $WalletTransaction;
    private $DataIntegrity;
    private $LedgerEntry;
    private $LedgerVerification;
    private $TokenOwnershipSync;
    private $IdempotencyKey;
    private $OperationLock;
    
    /**
     * Initialize
     */
    public function initialize() {
        parent::initialize();
        
        App::uses('WalletAccount', 'Model');
        App::uses('WalletTransaction', 'Model');
        App::uses('DataIntegrity', 'Model');
        App::uses('LedgerEntry', 'Model');
        App::uses('LedgerVerification', 'Model');
        App::uses('TokenOwnershipSync', 'Model');
        App::uses('IdempotencyKey', 'Model');
        App::uses('OperationLock', 'Model');
        App::uses('ReservePoolReconciliation', 'Model');
        
        $this->WalletAccount = ClassRegistry::init('WalletAccount');
        $this->WalletTransaction = ClassRegistry::init('WalletTransaction');
        $this->DataIntegrity = new DataIntegrity();
        $this->LedgerEntry = ClassRegistry::init('LedgerEntry');
        $this->LedgerVerification = ClassRegistry::init('LedgerVerification');
        $this->TokenOwnershipSync = ClassRegistry::init('TokenOwnershipSync');
        $this->IdempotencyKey = ClassRegistry::init('IdempotencyKey');
        $this->OperationLock = ClassRegistry::init('OperationLock');
        $this->ReservePoolReconciliation = ClassRegistry::init('ReservePoolReconciliation');
    }
    
    /**
     * Main entry point
     */
    public function main() {
        $this->out('Data Integrity Shell');
        $this->out('====================');
        $this->out('');
        $this->out('Available commands:');
        $this->out('  reconcile              - Run wallet balance reconciliation');
        $this->out('  verify                 - Verify ledger entries');
        $this->out('  sync_tokens           - Sync token ownership with blockchain');
        $this->out('  cleanup               - Clean up expired keys and locks');
        $this->out('  reconcile_reserve_pools - Run reserve pool daily reconciliation');
        $this->out('  daily                 - Run all daily integrity checks');
        $this->out('  weekly                - Run all weekly integrity checks');
    }
    
    /**
     * Reconcile all wallets
     */
    public function reconcile() {
        $this->out('Starting wallet reconciliation...');
        
        $wallets = $this->WalletAccount->find('all', array(
            'fields' => array('id', 'user_id', 'balance'),
            'recursive' => -1
        ));
        
        $success = 0;
        $failed = 0;
        
        foreach ($wallets as $wallet) {
            try {
                $result = $this->DataIntegrity->reconcileWallet($wallet['WalletAccount']['id']);
                
                if ($result['success']) {
                    $success++;
                    $status = $result['balanced'] ? 'OK' : 'MISMATCH';
                    $this->out("Wallet {$wallet['WalletAccount']['id']}: {$status} (diff: {$result['discrepancy']})");
                } else {
                    $failed++;
                    $this->out("Wallet {$wallet['WalletAccount']['id']}: FAILED - {$result['error']}");
                }
            } catch (Exception $e) {
                $failed++;
                $this->out("Wallet {$wallet['WalletAccount']['id']}: ERROR - {$e->getMessage()}");
            }
        }
        
        $this->out('');
        $this->out("Reconciliation complete: {$success} success, {$failed} failed");
    }
    
    /**
     * Verify ledger entries
     */
    public function verify() {
        $this->out('Starting ledger verification...');
        
        // Get unbalanced transactions
        $unbalanced = $this->LedgerVerification->getUnbalanced();
        
        $this->out("Found " . count($unbalanced) . " unbalanced transactions");
        
        foreach ($unbalanced as $entry) {
            $this->out("Transaction {$entry['LedgerVerification']['transaction_id']}: " .
                "Debits: {$entry['LedgerVerification']['total_debits']}, " .
                "Credits: {$entry['LedgerVerification']['total_credits']}, " .
                "Discrepancy: {$entry['LedgerVerification']['discrepancy']}");
        }
        
        // Verify each wallet account
        $wallets = $this->WalletAccount->find('all', array('recursive' => -1));
        
        $this->out('');
        $this->out('Verifying wallet accounts against ledger...');
        
        foreach ($wallets as $wallet) {
            $ledgerBalance = $this->LedgerEntry->getAccountBalance(
                'wallet',
                $wallet['WalletAccount']['id']
            );
            
            $recordedBalance = floatval($wallet['WalletAccount']['balance']);
            $diff = abs($ledgerBalance - $recordedBalance);
            
            if ($diff > 0.01) {
                $this->out("Wallet {$wallet['WalletAccount']['id']}: MISMATCH " .
                    "(recorded: {$recordedBalance}, ledger: {$ledgerBalance}, diff: {$diff})");
            }
        }
        
        $this->out('');
        $this->out('Ledger verification complete');
    }
    
    /**
     * Sync token ownership
     */
    public function sync_tokens() {
        $this->out('Starting token ownership sync...');
        
        // This would typically call blockchain to get actual token counts
        // For now, we'll mark all as synced
        
        $outOfSync = $this->TokenOwnershipSync->getOutOfSync();
        
        $this->out("Found " . count($outOfSync) . " out-of-sync records");
        
        foreach ($outOfSync as $sync) {
            $this->out("Contract {$sync['TokenOwnershipSync']['contract_id']}, " .
                "Holder {$sync['TokenOwnershipSync']['holder_id']}: " .
                "DB: {$sync['TokenOwnershipSync']['db_token_count']}, " .
                "Blockchain: {$sync['TokenOwnershipSync']['blockchain_token_count']}");
        }
        
        $this->out('');
        $this->out('Note: Full blockchain sync requires external blockchain node connection');
    }
    
    /**
     * Cleanup expired data
     */
    public function cleanup() {
        $this->out('Starting cleanup...');
        
        // Clean up idempotency keys
        $keyCount = $this->IdempotencyKey->cleanupExpired();
        $this->out("Cleaned up {$keyCount} expired idempotency keys");
        
        // Clean up operation locks
        $lockCount = $this->OperationLock->releaseExpired();
        $this->out("Released {$lockCount} expired operation locks");
        
        $this->out('');
        $this->out('Cleanup complete');
    }
    
    /**
     * Run daily integrity checks
     */
    public function daily() {
        $this->out('Starting daily integrity checks...');
        $this->hr();
        
        $this->cleanup();
        $this->hr();
        
        $this->verify();
        $this->hr();
        
        $this->reconcile_reserve_pools();
        $this->hr();
        
        $this->out('Daily integrity checks complete');
    }
    
    /**
     * Run weekly integrity checks
     */
    public function weekly() {
        $this->out('Starting weekly integrity checks...');
        $this->hr();
        
        $this->reconcile();
        $this->hr();
        
        $this->sync_tokens();
        $this->hr();
        
        $this->out('Weekly integrity checks complete');
    }
    
    /**
     * Reconcile reserve pools (DATA-02)
     * Runs daily reconciliation of reserve pools between on-chain and off-chain state
     */
    public function reconcile_reserve_pools() {
        $this->out('Starting reserve pool reconciliation...');
        $this->hr();
        
        try {
            /** @var ReservePoolReconciliation $reconciliationModel */
            $reconciliationModel = $this->ReservePoolReconciliation;
            $results = $reconciliationModel->runDailyReconciliation();
            
            $balanced = 0;
            $discrepancies = 0;
            
            foreach ($results as $poolType => $result) {
                if ($result['success']) {
                    $status = $result['is_balanced'] ? 'BALANCED' : 'DISCREPANCY';
                    $this->out(sprintf(
                        "Pool [%s]: %s (Balance: %.2f, Debits: %.2f, Credits: %.2f)",
                        strtoupper($poolType),
                        $status,
                        $result['discrepancy']['balance'] ?? 0,
                        $result['discrepancy']['debits'] ?? 0,
                        $result['discrepancy']['credits'] ?? 0
                    ));
                    
                    if ($result['is_balanced']) {
                        $balanced++;
                    } else {
                        $discrepancies++;
                    }
                } else {
                    $this->out("Pool [" . strtoupper($poolType) . "]: FAILED - " . ($result['error'] ?? 'Unknown error'));
                }
            }
            
            $this->hr();
            $this->out("Reserve pool reconciliation complete: {$balanced} balanced, {$discrepancies} discrepancies");
            
            // Alert if discrepancies found
            if ($discrepancies > 0) {
                $this->out('');
                $this->out('WARNING: Discrepancies found in reserve pool reconciliation!');
                $this->out('Review reconciliation_snapshots table for details.');
            }
            
        } catch (Exception $e) {
            $this->out('ERROR: Reserve pool reconciliation failed - ' . $e->getMessage());
            CakeLog::write('error', 'ReservePoolReconciliation failed: ' . $e->getMessage());
        }
    }
}
