<?php
App::uses('AppModel', 'Model');

/**
 * OwnershipHistory Model
 * 
 * Full history of token ownership changes
 */
class OwnershipHistory extends AppModel {
    public $name = 'OwnershipHistory';
    public $useTable = 'ownership_history';
    
    public $belongsTo = array(
        'LoanTokenContract' => array(
            'className' => 'LoanTokenContract',
            'foreignKey' => 'contract_id'
        ),
        'FromHolder' => array(
            'className' => 'User',
            'foreignKey' => 'from_holder_id'
        ),
        'ToHolder' => array(
            'className' => 'User',
            'foreignKey' => 'to_holder_id'
        )
    );
    
    /**
     * Get ownership history for a contract
     * 
     * @param int $contractId
     * @param int $limit
     * @return array
     */
    public function getHistory($contractId, $limit = 100) {
        return $this->find('all', array(
            'conditions' => array('OwnershipHistory.contract_id' => $contractId),
            'order' => array('OwnershipHistory.created_at' => 'DESC'),
            'limit' => $limit
        ));
    }
    
    /**
     * Get history for a specific holder
     * 
     * @param int $holderId
     * @param int $limit
     * @return array
     */
    public function getHolderHistory($holderId, $limit = 100) {
        return $this->find('all', array(
            'conditions' => array(
                'OR' => array(
                    'OwnershipHistory.from_holder_id' => $holderId,
                    'OwnershipHistory.to_holder_id' => $holderId
                )
            ),
            'order' => array('OwnershipHistory.created_at' => 'DESC'),
            'limit' => $limit
        ));
    }
    
    /**
     * Get pending verification entries
     * 
     * @return array
     */
    public function getPendingVerification() {
        return $this->find('all', array(
            'conditions' => array(
                'OwnershipHistory.verification_status' => 'pending',
                'OwnershipHistory.created_at >=' => date('Y-m-d H:i:s', strtotime('-7 days'))
            )
        ));
    }
}
