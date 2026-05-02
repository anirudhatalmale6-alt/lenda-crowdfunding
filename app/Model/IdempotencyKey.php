<?php
App::uses('AppModel', 'Model');

/**
 * IdempotencyKey Model
 * 
 * Stores idempotency keys to prevent duplicate API operations
 * 
 * @property User $User
 */
class IdempotencyKey extends AppModel {
    public $name = 'IdempotencyKey';
    public $useTable = 'idempotency_keys';
    
    public $belongsTo = array(
        'User' => array(
            'className' => 'User',
            'foreignKey' => 'user_id'
        )
    );
    
    /**
     * Clean up expired keys
     * 
     * @return int Number of deleted records
     */
    public function cleanupExpired() {
        return $this->deleteAll(array(
            'IdempotencyKey.expires_at <' => date('Y-m-d H:i:s')
        ));
    }
}
