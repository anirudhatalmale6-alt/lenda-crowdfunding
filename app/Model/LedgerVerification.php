<?php
App::uses('AppModel', 'Model');

/**
 * LedgerVerification Model
 * 
 * Tracks ledger verification status
 */
class LedgerVerification extends AppModel {
    public $name = 'LedgerVerification';
    public $useTable = 'ledger_verifications';
    
    /**
     * Get unbalanced transactions
     * 
     * @return array
     */
    public function getUnbalanced() {
        return $this->find('all', array(
            'conditions' => array(
                'LedgerVerification.is_balanced' => 0
            ),
            'order' => array('LedgerVerification.created_at' => 'DESC')
        ));
    }
    
    /**
     * Get recent verifications
     * 
     * @param int $limit
     * @return array
     */
    public function getRecent($limit = 50) {
        return $this->find('all', array(
            'order' => array('LedgerVerification.created_at' => 'DESC'),
            'limit' => $limit
        ));
    }
}
