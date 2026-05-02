<?php
App::uses('AppModel', 'Model');

/**
 * OperationLock Model
 * 
 * Manages optimistic locking for concurrent operations
 * 
 * @property User $User
 */
class OperationLock extends AppModel {
    public $name = 'OperationLock';
    public $useTable = 'operation_locks';
    
    public $belongsTo = array(
        'User' => array(
            'className' => 'User',
            'foreignKey' => 'user_id'
        )
    );
    
    /**
     * Release expired locks
     * 
     * @return int Number of released locks
     */
    public function releaseExpired() {
        return $this->updateAll(
            array('released_at' => '"' . date('Y-m-d H:i:s') . '"'),
            array(
                'OperationLock.expires_at <' => date('Y-m-d H:i:s'),
                'OperationLock.released_at' => null
            )
        );
    }
    
    /**
     * Get active locks for an entity
     * 
     * @param string $entityType
     * @param int $entityId
     * @return array
     */
    public function getActiveLocks($entityType, $entityId) {
        return $this->find('all', array(
            'conditions' => array(
                'OperationLock.entity_type' => $entityType,
                'OperationLock.entity_id' => $entityId,
                'OperationLock.expires_at >' => date('Y-m-d H:i:s'),
                'OperationLock.released_at' => null
            )
        ));
    }
}
