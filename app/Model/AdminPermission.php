<?php
/**
 * AdminPermission Model
 * 
 * Handles RBAC permissions for admin roles
 * 
 * @package Lenda
 * @subpackage Model
 */
App::uses('AppModel', 'Model');
class AdminPermission extends AppModel {
    public $name = 'AdminPermission';
    public $useTable = 'admin_permissions';
    
    public $belongsTo = array(
        'AdminRole' => array(
            'className' => 'AdminRole',
            'foreignKey' => 'admin_role_id'
        )
    );
    
    /**
     * Save permissions for a role
     * 
     * @param int $roleId Admin role ID
     * @param array $permissions Array of permissions
     * @return bool Success
     */
    public function savePermissions($roleId, $permissions) {
        // Delete existing permissions
        $this->deleteAll(array('AdminPermission.admin_role_id' => $roleId));
        
        // Save new permissions
        $data = array();
        foreach ($permissions as $permission) {
            $data[] = array(
                'admin_role_id' => $roleId,
                'controller' => $permission['controller'],
                'action' => $permission['action'],
                'allowed' => $permission['allowed'] ?? 1
            );
        }
        
        if (!empty($data)) {
            return $this->saveAll($data);
        }
        return true;
    }
    
    /**
     * Get available controllers and actions for permissions
     * 
     * @return array Available permissions
     */
    public function getAvailablePermissions() {
        return array(
            // User Management
            'users' => array(
                'label' => 'User Management',
                'actions' => array(
                    'admin_index' => 'View Users',
                    'admin_view' => 'View User Details',
                    'admin_add' => 'Add User',
                    'admin_edit' => 'Edit User',
                    'admin_delete' => 'Delete User',
                    'admin_update' => 'Bulk Update Users',
                    'admin_change_password' => 'Change Password',
                    'admin_send_mail' => 'Send Email',
                    'admin_export' => 'Export Users'
                )
            ),
            // Dashboard
            'dashboard' => array(
                'label' => 'Dashboard',
                'actions' => array(
                    'admin_stats' => 'View Stats',
                    'admin_action_taken' => 'View Action Taken'
                )
            ),
            // Settings
            'settings' => array(
                'label' => 'Settings',
                'actions' => array(
                    'admin_index' => 'View Settings',
                    'admin_edit' => 'Edit Settings',
                    'admin_plugin_settings' => 'Plugin Settings'
                )
            ),
            // Finance
            'transactions' => array(
                'label' => 'Transactions',
                'actions' => array(
                    'admin_index' => 'View Transactions',
                    'admin_export' => 'Export Transactions'
                )
            ),
            'payments' => array(
                'label' => 'Payments',
                'actions' => array(
                    'admin_index' => 'View Payments'
                )
            ),
            // Fee Management
            'fee_configurations' => array(
                'label' => 'Fee Configuration',
                'actions' => array(
                    'admin_index' => 'View Fees',
                    'admin_add' => 'Add Fee',
                    'admin_edit' => 'Edit Fee',
                    'admin_delete' => 'Delete Fee'
                )
            ),
            // Announcements
            'announcements' => array(
                'label' => 'Announcements',
                'actions' => array(
                    'admin_index' => 'View Announcements',
                    'admin_add' => 'Add Announcement',
                    'admin_edit' => 'Edit Announcement',
                    'admin_delete' => 'Delete Announcement'
                )
            ),
            // Audit Logs
            'audit_logs' => array(
                'label' => 'Audit Logs',
                'actions' => array(
                    'admin_index' => 'View Audit Logs'
                )
            ),
            // Admin Roles
            'admin_roles' => array(
                'label' => 'Admin Roles',
                'actions' => array(
                    'admin_index' => 'View Roles',
                    'admin_add' => 'Add Role',
                    'admin_edit' => 'Edit Role',
                    'admin_delete' => 'Delete Role',
                    'admin_permissions' => 'Manage Permissions'
                )
            ),
            // Sessions
            'admin_sessions' => array(
                'label' => 'Session Management',
                'actions' => array(
                    'admin_index' => 'View Sessions',
                    'admin_settings' => 'Session Settings'
                )
            )
        );
    }
}
