<?php
App::uses('AppModel', 'Model');

/**
 * ReservePoolReconciliation Model
 * 
 * Handles daily reconciliation of reserve pools between on-chain
 * and off-chain state (DATA-02)
 * 
 * @property ReserveFund $ReserveFund
 * @property ReserveFundTransaction $ReserveFundTransaction
 */
class ReservePoolReconciliation extends AppModel {
    public $name = 'ReservePoolReconciliation';
    public $useTable = 'reserve_pool_reconciliations';
    
    // Pool types
    const POOL_GUARANTEE = 'guarantee';
    const POOL_INSURANCE = 'insurance';
    const POOL_LIQUIDITY = 'liquidity';
    const POOL_RECOVERY = 'recovery';
    
    // Statuses
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_COMPLETED = 'completed';
    const STATUS_FAILED = 'failed';
    const STATUS_DISCREPANCY_FOUND = 'discrepancy_found';
    const STATUS_RESOLVED = 'resolved';
    
    /**
     * Run daily reconciliation for all reserve pools
     * 
     * @return array Reconciliation results
     */
    public function runDailyReconciliation() {
        $results = array();
        
        $pools = array(
            self::POOL_GUARANTEE,
            self::POOL_INSURANCE,
            self::POOL_LIQUIDITY,
            self::POOL_RECOVERY
        );
        
        foreach ($pools as $poolType) {
            $result = $this->reconcilePool($poolType, 'daily');
            $results[$poolType] = $result;
        }
        
        return $results;
    }
    
    /**
     * Reconcile a single reserve pool
     * 
     * @param string $poolType Pool type
     * @param string $reconciliationType Type of reconciliation
     * @return array Reconciliation result
     */
    public function reconcilePool($poolType, $reconciliationType = 'daily') {
        // Create reconciliation record
        $this->create();
        $this->save(array(
            'pool_id' => $this->getPoolIdByType($poolType),
            'pool_type' => $poolType,
            'reconciliation_type' => $reconciliationType,
            'status' => self::STATUS_IN_PROGRESS,
            'started_at' => date('Y-m-d H:i:s')
        ));
        
        $reconciliationId = $this->getLastInsertID();
        
        try {
            // Get on-chain data (from blockchain/event logs)
            $onchainData = $this->getOnChainData($poolType);
            
            // Get off-chain data (from database)
            $offchainData = $this->getOffChainData($poolType);
            
            // Compare and update record
            $this->id = $reconciliationId;
            $this->save(array(
                // On-chain values
                'onchain_balance' => $onchainData['balance'],
                'onchain_total_debits' => $onchainData['total_debits'],
                'onchain_total_credits' => $onchainData['total_credits'],
                'onchain_block_number' => $onchainData['block_number'] ?? null,
                'onchain_verified_at' => date('Y-m-d H:i:s'),
                
                // Off-chain values
                'offchain_balance' => $offchainData['balance'],
                'offchain_total_debits' => $offchainData['total_debits'],
                'offchain_total_credits' => $offchainData['total_credits'],
                'offchain_verified_at' => date('Y-m-d H:i:s'),
                
                // Calculate discrepancies
                'balance_discrepancy' => abs($onchainData['balance'] - $offchainData['balance']),
                'debits_discrepancy' => abs($onchainData['total_debits'] - $offchainData['total_debits']),
                'credits_discrepancy' => abs($onchainData['total_credits'] - $offchainData['total_credits'])
            ));
            
            // Check if balanced
            $tolerance = 0.01; // Allow for floating point differences
            $isBalanced = 
                abs($onchainData['balance'] - $offchainData['balance']) < $tolerance &&
                abs($onchainData['total_debits'] - $offchainData['total_debits']) < $tolerance &&
                abs($onchainData['total_credits'] - $offchainData['total_credits']) < $tolerance;
            
            $this->saveField('is_balanced', $isBalanced ? 1 : 0);
            
            // Verify double-entry bookkeeping
            $bookkeepingResult = $this->verifyBookkeeping($poolType);
            $this->saveField('bookkeeping_balanced', $bookkeepingResult['balanced'] ? 1 : 0);
            $this->saveField('bookkeeping_discrepancy', $bookkeepingResult['discrepancy']);
            
            // Update status
            $status = self::STATUS_COMPLETED;
            $discrepancyReason = null;
            
            if (!$isBalanced) {
                $status = self::STATUS_DISCREPANCY_FOUND;
                $discrepancyReason = sprintf(
                    'Balance: %.2f, Debits: %.2f, Credits: %.2f',
                    abs($onchainData['balance'] - $offchainData['balance']),
                    abs($onchainData['total_debits'] - $offchainData['total_debits']),
                    abs($onchainData['total_credits'] - $offchainData['total_credits'])
                );
            } elseif (!$bookkeepingResult['balanced']) {
                $status = self::STATUS_DISCREPANCY_FOUND;
                $discrepancyReason = 'Double-entry bookkeeping verification failed';
            }
            
            $this->saveField('status', $status);
            $this->saveField('discrepancy_reason', $discrepancyReason);
            $this->saveField('completed_at', date('Y-m-d H:i:s'));
            $this->saveField('next_reconciliation_at', date('Y-m-d H:i:s', strtotime('+1 day')));
            
            // Log alert if discrepancy found
            if ($status === self::STATUS_DISCREPANCY_FOUND) {
                CakeLog::write('warning', 'Reserve Pool Reconciliation Discrepancy: ' . $poolType . ' - ' . $discrepancyReason);
            }
            
            return array(
                'success' => true,
                'reconciliation_id' => $reconciliationId,
                'pool_type' => $poolType,
                'is_balanced' => $isBalanced,
                'bookkeeping_balanced' => $bookkeepingResult['balanced'],
                'discrepancy' => array(
                    'balance' => abs($onchainData['balance'] - $offchainData['balance']),
                    'debits' => abs($onchainData['total_debits'] - $offchainData['total_debits']),
                    'credits' => abs($onchainData['total_credits'] - $offchainData['total_credits'])
                )
            );
            
        } catch (Exception $e) {
            $this->id = $reconciliationId;
            $this->saveField('status', self::STATUS_FAILED);
            $this->saveField('discrepancy_reason', $e->getMessage());
            $this->saveField('completed_at', date('Y-m-d H:i:s'));
            
            CakeLog::write('error', 'Reserve Pool Reconciliation Failed: ' . $e->getMessage());
            
            return array(
                'success' => false,
                'reconciliation_id' => $reconciliationId,
                'pool_type' => $poolType,
                'error' => $e->getMessage()
            );
        }
    }
    
    /**
     * Get on-chain data for a pool (from blockchain)
     * 
     * @param string $poolType Pool type
     * @return array On-chain data
     */
    private function getOnChainData($poolType) {
        // In production, this would query the blockchain
        // For now, we'll get data from blockchain_event_logs
        
        App::uses('BlockchainEventLog', 'Model');
        $BlockchainEventLog = ClassRegistry::init('BlockchainEventLog');
        
        // Get pool ID mapping
        $poolId = $this->getPoolIdByType($poolType);
        
        // Get deposit events
        $deposits = $BlockchainEventLog->find('first', array(
            'conditions' => array(
                'BlockchainEventLog.contract_type' => 'reserve_pool',
                'BlockchainEventLog.event_name' => 'PoolDeposited',
                'BlockchainEventLog.processed' => 1
            ),
            'fields' => array(
                'SUM(JSON_EXTRACT(event_data, "$.amount")) as total_deposits'
            )
        ));
        
        // Get withdrawal events
        $withdrawals = $BlockchainEventLog->find('first', array(
            'conditions' => array(
                'BlockchainEventLog.contract_type' => 'reserve_pool',
                'BlockchainEventLog.event_name' => 'PoolWithdrawn',
                'BlockchainEventLog.processed' => 1
            ),
            'fields' => array(
                'SUM(JSON_EXTRACT(event_data, "$.amount")) as total_withdrawals'
            )
        ));
        
        // Get latest block number
        $latestBlock = $BlockchainEventLog->find('first', array(
            'conditions' => array(
                'BlockchainEventLog.contract_type' => 'reserve_pool'
            ),
            'order' => array('BlockchainEventLog.block_number' => 'DESC'),
            'fields' => array('block_number')
        ));
        
        $totalDeposits = floatval($deposits[0][0]['total_deposits'] ?? 0);
        $totalWithdrawals = floatval($withdrawals[0][0]['total_withdrawals'] ?? 0);
        
        return array(
            'balance' => $totalDeposits - $totalWithdrawals,
            'total_debits' => $totalWithdrawals,
            'total_credits' => $totalDeposits,
            'block_number' => $latestBlock ? $latestBlock['BlockchainEventLog']['block_number'] : null
        );
    }
    
    /**
     * Get off-chain data for a pool (from database)
     * 
     * @param string $poolType Pool type
     * @return array Off-chain data
     */
    private function getOffChainData($poolType) {
        App::uses('ReserveFund', 'Model');
        App::uses('ReserveFundTransaction', 'Model');
        
        $ReserveFund = ClassRegistry::init('ReserveFund');
        $ReserveFundTransaction = ClassRegistry::init('ReserveFundTransaction');
        
        // Get current balance
        $reserve = $ReserveFund->find('first');
        $balance = $reserve ? floatval($reserve['ReserveFund']['balance']) : 0;
        
        // Get total debits (withdrawals, claims paid)
        $debits = $ReserveFundTransaction->find('first', array(
            'conditions' => array(
                'ReserveFundTransaction.type' => array('claim_paid')
            ),
            'fields' => array('SUM(amount) as total')
        ));
        $totalDebits = floatval($debits[0][0]['total'] ?? 0);
        
        // Get total credits (deposits, fee income)
        $credits = $ReserveFundTransaction->find('first', array(
            'conditions' => array(
                'ReserveFundTransaction.type' => array('replenishment', 'fee_income', 'investment_income')
            ),
            'fields' => array('SUM(amount) as total')
        ));
        $totalCredits = floatval($credits[0][0]['total'] ?? 0);
        
        return array(
            'balance' => $balance,
            'total_debits' => $totalDebits,
            'total_credits' => $totalCredits
        );
    }
    
    /**
     * Verify double-entry bookkeeping for a pool
     * 
     * @param string $poolType Pool type
     * @return array Verification result
     */
    private function verifyBookkeeping($poolType) {
        App::uses('LedgerEntry', 'Model');
        $LedgerEntry = ClassRegistry::init('LedgerEntry');
        
        // Get ledger entries for reserve pool
        $entries = $LedgerEntry->find('all', array(
            'conditions' => array(
                'LedgerEntry.account_type' => 'reserve'
            ),
            'fields' => array(
                'SUM(CASE WHEN LedgerEntry.entry_type = "credit" THEN LedgerEntry.amount ELSE 0 END) as credits',
                'SUM(CASE WHEN LedgerEntry.entry_type = "debit" THEN LedgerEntry.amount ELSE 0 END) as debits'
            )
        ));
        
        $credits = floatval($entries[0][0]['credits'] ?? 0);
        $debits = floatval($entries[0][0]['debits'] ?? 0);
        
        $discrepancy = abs($credits - $debits);
        $balanced = $discrepancy < 0.01;
        
        return array(
            'balanced' => $balanced,
            'discrepancy' => $discrepancy,
            'credits' => $credits,
            'debits' => $debits
        );
    }
    
    /**
     * Get pool ID by type
     * 
     * @param string $poolType Pool type
     * @return int Pool ID
     */
    private function getPoolIdByType($poolType) {
        // Map pool types to IDs (would come from ReservePool contract)
        $poolMap = array(
            self::POOL_GUARANTEE => 1,
            self::POOL_INSURANCE => 2,
            self::POOL_LIQUIDITY => 3,
            self::POOL_RECOVERY => 4
        );
        
        return $poolMap[$poolType] ?? 0;
    }
    
    /**
     * Get reconciliation history for a pool
     * 
     * @param string $poolType Pool type
     * @param int $limit Number of records
     * @return array Reconciliation history
     */
    public function getReconciliationHistory($poolType, $limit = 30) {
        return $this->find('all', array(
            'conditions' => array('ReservePoolReconciliation.pool_type' => $poolType),
            'order' => array('ReservePoolReconciliation.completed_at' => 'DESC'),
            'limit' => $limit
        ));
    }
    
    /**
     * Get latest reconciliation for a pool
     * 
     * @param string $poolType Pool type
     * @return array|null Latest reconciliation
     */
    public function getLatestReconciliation($poolType) {
        return $this->find('first', array(
            'conditions' => array(
                'ReservePoolReconciliation.pool_type' => $poolType,
                'ReservePoolReconciliation.status' => array(self::STATUS_COMPLETED, self::STATUS_DISCREPANCY_FOUND)
            ),
            'order' => array('ReservePoolReconciliation.completed_at' => 'DESC')
        ));
    }
    
    /**
     * Get all reconciliations with discrepancies
     * 
     * @return array Reconciliations with discrepancies
     */
    public function getDiscrepancies() {
        return $this->find('all', array(
            'conditions' => array(
                'ReservePoolReconciliation.status' => self::STATUS_DISCREPANCY_FOUND
            ),
            'order' => array('ReservePoolReconciliation.completed_at' => 'DESC')
        ));
    }
}
