<?php
App::uses('AppModel', 'Model');

/**
 * ReconciliationSnapshot Model
 * 
 * Tracks reconciliation snapshots
 */
class ReconciliationSnapshot extends AppModel {
    public $name = 'ReconciliationSnapshot';
    public $useTable = 'reconciliation_snapshots';
    
    /**
     * Get snapshots by type
     * 
     * @param string $type
     * @param int $limit
     * @return array
     */
    public function getByType($type, $limit = 30) {
        return $this->find('all', array(
            'conditions' => array('ReconciliationSnapshot.snapshot_type' => $type),
            'order' => array('ReconciliationSnapshot.completed_at' => 'DESC'),
            'limit' => $limit
        ));
    }
    
    /**
     * Get failed snapshots
     * 
     * @return array
     */
    public function getFailed() {
        return $this->find('all', array(
            'conditions' => array('ReconciliationSnapshot.status' => 'failed')
        ));
    }
}
