<?php
/**
 * AdminRoles Controller
 * 
 * Handles RBAC role management
 * 
 * @package Lenda
 * @subpackage Controller
 */
class AdminRolesController extends AppController {
    public $name = 'AdminRoles';
    public $components = array('Session');
    public $helpers = array('Html', 'Form', 'Time');
    
    public function beforeFilter() {
        parent::beforeFilter();
    }
    
    /**
     * Index - List all admin roles
     */
    public function admin_index() {
        $this->pageTitle = 'Admin Roles';
        
        $this->paginate = array(
            'order' => array('AdminRole.id' => 'ASC'),
            'limit' => 20,
            'contain' => array(
                'User' => array(
                    'fields' => array('id')
                )
            )
        );
        
        $this->set('adminRoles', $this->paginate());
        $this->set('pageTitle', $this->pageTitle);
    }
    
    /**
     * View role details
     */
    public function admin_view($id = null) {
        if (is_null($id)) {
            $this->Session->setFlash('Invalid request', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $role = $this->AdminRole->find('first', array(
            'conditions' => array('AdminRole.id' => $id),
            'contain' => array(
                'AdminPermission',
                'User' => array(
                    'fields' => array('id', 'username', 'email'),
                    'limit' => 10
                )
            )
        ));
        
        if (empty($role)) {
            $this->Session->setFlash('Role not found', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $this->pageTitle = $role['AdminRole']['name'];
        $this->set('role', $role);
        $this->set('pageTitle', $this->pageTitle);
    }
    
    /**
     * Add new role
     */
    public function admin_add() {
        if (!empty($this->request->data)) {
            $this->AdminRole->create();
            
            if ($this->AdminRole->save($this->request->data)) {
                // Save default permissions
                $defaultPermissions = $this->AdminRole->getDefaultPermissions();
                $this->AdminRole->AdminPermission->savePermissions($this->AdminRole->id, $defaultPermissions);
                
                $this->Session->setFlash('Role has been added', 'default', array('class' => 'success-message'));
                $this->redirect(array('action' => 'index'));
            } else {
                $this->Session->setFlash('Role could not be added. Please try again.', 'default', array('class' => 'error-message'));
            }
        }
        
        $this->pageTitle = 'Add Admin Role';
        $this->set('pageTitle', $this->pageTitle);
    }
    
    /**
     * Edit role
     */
    public function admin_edit($id = null) {
        if (is_null($id)) {
            $this->Session->setFlash('Invalid request', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        if (!empty($this->request->data)) {
            $this->AdminRole->id = $id;
            
            if ($this->AdminRole->save($this->request->data)) {
                $this->Session->setFlash('Role has been updated', 'default', array('class' => 'success-message'));
                $this->redirect(array('action' => 'index'));
            } else {
                $this->Session->setFlash('Role could not be updated. Please try again.', 'default', array('class' => 'error-message'));
            }
        }
        
        if (empty($this->request->data)) {
            $this->request->data = $this->AdminRole->findById($id);
            
            if (empty($this->request->data)) {
                $this->Session->setFlash('Role not found', 'default', array('class' => 'error-message'));
                $this->redirect(array('action' => 'index'));
            }
        }
        
        $this->pageTitle = 'Edit Admin Role';
        $this->set('pageTitle', $this->pageTitle);
    }
    
    /**
     * Delete role
     */
    public function admin_delete($id = null) {
        if (is_null($id)) {
            $this->Session->setFlash('Invalid request', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        // Cannot delete super admin
        if ($id == 1) {
            $this->Session->setFlash('Cannot delete Super Admin role', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        // Check if role has users
        $userCount = $this->AdminRole->User->find('count', array(
            'conditions' => array('User.admin_role_id' => $id)
        ));
        
        if ($userCount > 0) {
            $this->Session->setFlash('Cannot delete role with assigned users', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        if ($this->AdminRole->delete($id)) {
            $this->Session->setFlash('Role has been deleted', 'default', array('class' => 'success-message'));
        } else {
            $this->Session->setFlash('Role could not be deleted', 'default', array('class' => 'error-message'));
        }
        
        $this->redirect(array('action' => 'index'));
    }
    
    /**
     * Manage permissions for a role
     */
    public function admin_permissions($id = null) {
        if (is_null($id)) {
            $this->Session->setFlash('Invalid request', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $role = $this->AdminRole->findById($id);
        
        if (empty($role)) {
            $this->Session->setFlash('Role not found', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        if (!empty($this->request->data)) {
            // Process permissions
            $permissions = array();
            
            if (!empty($this->request->data['Permission'])) {
                foreach ($this->request->data['Permission'] as $controller => $actions) {
                    foreach ($actions as $action => $allowed) {
                        if ($allowed) {
                            $permissions[] = array(
                                'controller' => $controller,
                                'action' => $action,
                                'allowed' => 1
                            );
                        }
                    }
                }
            }
            
            $this->AdminRole->AdminPermission->savePermissions($id, $permissions);
            $this->Session->setFlash('Permissions have been updated', 'default', array('class' => 'success-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        // Get current permissions
        $currentPermissions = array();
        if (!empty($role['AdminPermission'])) {
            foreach ($role['AdminPermission'] as $perm) {
                $currentPermissions[$perm['controller']][$perm['action']] = true;
            }
        }
        
        // Get available permissions
        $availablePermissions = $this->AdminRole->AdminPermission->getAvailablePermissions();
        
        $this->pageTitle = 'Manage Permissions - ' . $role['AdminRole']['name'];
        $this->set('role', $role);
        $this->set('currentPermissions', $currentPermissions);
        $this->set('availablePermissions', $availablePermissions);
        $this->set('pageTitle', $this->pageTitle);
    }
}
