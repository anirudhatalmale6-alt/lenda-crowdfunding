<?php
/**
 * AdminRole Model
 * 
 * Handles RBAC roles for administrators
 * 
 * @package Lenda
 * @subpackage Model
 */
App::uses('AppModel', 'Model');
class AdminRole extends AppModel {
    public $name = 'AdminRole';
    public $useTable = 'admin_roles';
    
    public $hasMany = array(
        'AdminPermission' => array(
            'className' => 'AdminPermission',
            'foreignKey' => 'admin_role_id',
            'dependent' => true
        ),
        'User' => array(
            'className' => 'User',
            'foreignKey' => 'admin_role_id'
        )
    );
    
    public $validate = array(
        'name' => array(
            'notEmpty' => array(
                'rule' => 'notEmpty',
                'message' => 'Role name is required'
            ),
            'unique' => array(
                'rule' => 'isUnique',
                'message' => 'Role name already exists'
            )
        )
    );
    
    /**
     * Get all active roles
     * 
     * @return array Active roles
     */
    public function getActiveRoles() {
        return $this->find('list', array(
            'conditions' => array('AdminRole.is_active' => 1),
            'order' => array('AdminRole.name' => 'ASC')
        ));
    }
    
    /**
     * Check if user has permission for an action
     * 
     * @param int $roleId Admin role ID
     * @param string $controller Controller name
     * @param string $action Action name
     * @return bool Has permission
     */
    public function hasPermission($roleId, $controller, $action) {
        // Super admin (id 1) has all permissions
        if ($roleId == 1) {
            return true;
        }
        
        $permission = $this->AdminPermission->find('first', array(
            'conditions' => array(
                'AdminPermission.admin_role_id' => $roleId,
                'AdminPermission.controller' => $controller,
                'AdminPermission.action' => $action
            )
        ));
        
        return !empty($permission) && $permission['AdminPermission']['allowed'];
    }
    
    /**
     * Get role with permissions
     * 
     * @param int $id Role ID
     * @return array Role with permissions
     */
    public function getRoleWithPermissions($id) {
        return $this->find('first', array(
            'conditions' => array('AdminRole.id' => $id),
            'contain' => array('AdminPermission')
        ));
    }
    
    /**
     * Default permissions for new roles
     * 
     * @return array Default permissions
     */
    public function getDefaultPermissions() {
        return array(
            // User Management
            array('controller' => 'users', 'action' => 'admin_index', 'allowed' => 1),
            array('controller' => 'users', 'action' => 'admin_view', 'allowed' => 1),
            array('controller' => 'users', 'action' => 'admin_add', 'allowed' => 1),
            array('controller' => 'users', 'action' => 'admin_edit', 'allowed' => 1),
            array('controller' => 'users', 'action' => 'admin_delete', 'allowed' => 1),
            array('controller' => 'users', 'action' => 'admin_update', 'allowed' => 1),
            // Dashboard
            array('controller' => 'users', 'action' => 'admin_stats', 'allowed' => 1),
            // Settings
            array('controller' => 'settings', 'action' => 'admin_index', 'allowed' => 1),
            array('controller' => 'settings', 'action' => 'admin_edit', 'allowed' => 1),
        );
    }
}
