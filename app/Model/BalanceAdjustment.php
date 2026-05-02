<?php
App::uses('AppModel', 'Model');

/**
 * BalanceAdjustment Model
 * 
 * Audit trail for all balance changes
 */
class BalanceAdjustment extends AppModel {
    public $name = 'BalanceAdjustment';
    public $useTable = 'balance_adjustments';
    
    public $belongsTo = array(
        'User' => array(
            'className' => 'User',
            'foreignKey' => 'user_id'
        ),
        'WalletAccount' => array(
            'className' => 'WalletAccount',
            'foreignKey' => 'wallet_id'
        )
    );
    
    /**
     * Get adjustment history for a wallet
     * 
     * @param int $walletId
     * @param int $limit
     * @return array
     */
    public function getHistory($walletId, $limit = 100) {
        return $this->find('all', array(
            'conditions' => array('BalanceAdjustment.wallet_id' => $walletId),
            'order' => array('BalanceAdjustment.created_at' => 'DESC'),
            'limit' => $limit
        ));
    }
    
    /**
     * Get manual adjustments that need review
     * 
     * @return array
     */
    public function getPendingManualAdjustments() {
        return $this->find('all', array(
            'conditions' => array(
                'BalanceAdjustment.is_auto' => 0,
                'BalanceAdjustment.created_at >=' => date('Y-m-d H:i:s', strtotime('-7 days'))
            ),
            'order' => array('BalanceAdjustment.created_at' => 'DESC')
        ));
    }
}
