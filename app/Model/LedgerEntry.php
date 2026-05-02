<?php
App::uses('AppModel', 'Model');

/**
 * LedgerEntry Model
 * 
 * Double-entry ledger for financial transactions
 */
class LedgerEntry extends AppModel {
    public $name = 'LedgerEntry';
    public $useTable = 'ledger_entries';
    
    /**
     * Get entries for a transaction
     * 
     * @param int $transactionId
     * @return array
     */
    public function getEntriesForTransaction($transactionId) {
        return $this->find('all', array(
            'conditions' => array('LedgerEntry.transaction_id' => $transactionId)
        ));
    }
    
    /**
     * Verify account balance from ledger
     * 
     * @param string $accountType
     * @param int $accountId
     * @return float
     */
    public function getAccountBalance($accountType, $accountId) {
        $entries = $this->find('all', array(
            'conditions' => array(
                'LedgerEntry.account_type' => $accountType,
                'LedgerEntry.account_id' => $accountId
            ),
            'fields' => array(
                'SUM(CASE WHEN LedgerEntry.entry_type = "credit" THEN LedgerEntry.amount ELSE 0 END) as credits',
                'SUM(CASE WHEN LedgerEntry.entry_type = "debit" THEN LedgerEntry.amount ELSE 0 END) as debits'
            )
        ));
        
        $credits = floatval($entries[0][0]['credits'] ?? 0);
        $debits = floatval($entries[0][0]['debits'] ?? 0);
        
        return $credits - $debits;
    }
}
