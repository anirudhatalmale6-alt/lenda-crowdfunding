<?php
/**
 * AdminAuditLog Model
 * 
 * Handles admin action audit trail logging
 * 
 * @package Lenda
 * @subpackage Model
 */
App::uses('AppModel', 'Model');
class AdminAuditLog extends AppModel {
    public $name = 'AdminAuditLog';
    public $useTable = 'admin_audit_logs';
    
    public $belongsTo = array(
        'AdminUser' => array(
            'className' => 'User',
            'foreignKey' => 'admin_user_id'
        )
    );
    
    /**
     * Log an admin action
     * 
     * @param int $adminUserId Admin user ID
     * @param string $action Action performed (e.g., 'user_update', 'settings_change')
     * @param string $entityType Type of entity affected (e.g., 'User', 'Setting')
     * @param int $entityId ID of the entity
     * @param array $oldValues Previous values (before change)
     * @param array $newValues New values (after change)
     * @return bool Success
     */
    public function logAction($adminUserId, $action, $entityType = null, $entityId = null, $oldValues = array(), $newValues = array()) {
        $data = array(
            'admin_user_id' => $adminUserId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'old_values' => !empty($oldValues) ? json_encode($oldValues) : null,
            'new_values' => !empty($newValues) ? json_encode($newValues) : null,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            'created' => date('Y-m-d H:i:s')
        );
        
        $this->create();
        return $this->save($data);
    }
    
    /**
     * Get audit logs for an entity
     * 
     * @param string $entityType Type of entity
     * @param int $entityId ID of the entity
     * @return array Audit logs
     */
    public function getEntityLogs($entityType, $entityId) {
        return $this->find('all', array(
            'conditions' => array(
                'AdminAuditLog.entity_type' => $entityType,
                'AdminAuditLog.entity_id' => $entityId
            ),
            'contain' => array('AdminUser' => array('fields' => array('username', 'email'))),
            'order' => array('AdminAuditLog.created' => 'DESC'),
            'limit' => 50
        ));
    }
    
    /**
     * Get recent admin activities
     * 
     * @param int $limit Number of records to return
     * @return array Recent activities
     */
    public function getRecentActivities($limit = 50) {
        return $this->find('all', array(
            'contain' => array('AdminUser' => array('fields' => array('username', 'email'))),
            'order' => array('AdminAuditLog.created' => 'DESC'),
            'limit' => $limit
        ));
    }
}
