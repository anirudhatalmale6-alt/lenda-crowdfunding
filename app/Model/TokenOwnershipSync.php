<?php
App::uses('AppModel', 'Model');

/**
 * TokenOwnershipSync Model
 * 
 * Tracks synchronization between DB and blockchain token ownership
 */
class TokenOwnershipSync extends AppModel {
    public $name = 'TokenOwnershipSync';
    public $useTable = 'token_ownership_sync';
    
    public $belongsTo = array(
        'LoanTokenContract' => array(
            'className' => 'LoanTokenContract',
            'foreignKey' => 'contract_id'
        ),
        'User' => array(
            'className' => 'User',
            'foreignKey' => 'holder_id'
        )
    );
    
    /**
     * Get out-of-sync records
     * 
     * @return array
     */
    public function getOutOfSync() {
        return $this->find('all', array(
            'conditions' => array(
                'TokenOwnershipSync.sync_status' => array('mismatch', 'error')
            ),
            'order' => array('TokenOwnershipSync.last_sync_at' => 'ASC')
        ));
    }
    
    /**
     * Get records needing sync
     * 
     * @param int $hours Hours since last sync
     * @return array
     */
    public function getNeedingSync($hours = 24) {
        return $this->find('all', array(
            'conditions' => array(
                'OR' => array(
                    'TokenOwnershipSync.last_sync_at <' => date('Y-m-d H:i:s', strtotime("-{$hours} hours")),
                    'TokenOwnershipSync.last_sync_at' => null
                )
            )
        ));
    }
}
