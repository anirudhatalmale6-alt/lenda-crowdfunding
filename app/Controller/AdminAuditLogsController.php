<?php
/**
 * AdminAuditLogs Controller
 * 
 * Handles admin action audit trail viewing
 * 
 * @package Lenda
 * @subpackage Controller
 */
class AdminAuditLogsController extends AppController {
    public $name = 'AdminAuditLogs';
    public $components = array('Session');
    public $helpers = array('Html', 'Form', 'Time');
    
    /**
     * Before filter
     * SEC-007: Removed public access - audit logs require admin authentication
     */
    public function beforeFilter() {
        parent::beforeFilter();
        // SEC-007: Audit logs are admin-only - removed public access
        // Only admin users can view audit logs
    }
    
    /**
     * Index - View audit logs
     */
    public function admin_index() {
        $this->pageTitle = 'Audit Logs';
        
        // Build conditions
        $conditions = array();
        
        if (!empty($this->request->params['named']['action'])) {
            $conditions['AdminAuditLog.action LIKE'] = '%' . $this->request->params['named']['action'] . '%';
        }
        
        if (!empty($this->request->params['named']['entity_type'])) {
            $conditions['AdminAuditLog.entity_type'] = $this->request->params['named']['entity_type'];
        }
        
        if (!empty($this->request->params['named']['admin_user_id'])) {
            $conditions['AdminAuditLog.admin_user_id'] = $this->request->params['named']['admin_user_id'];
        }
        
        if (!empty($this->request->params['named']['from_date'])) {
            $conditions['AdminAuditLog.created >='] = $this->request->params['named']['from_date'];
        }
        
        if (!empty($this->request->params['named']['to_date'])) {
            $conditions['AdminAuditLog.created <='] = $this->request->params['named']['to_date'] . ' 23:59:59';
        }
        
        $this->paginate = array(
            'conditions' => $conditions,
            'contain' => array(
                'AdminUser' => array(
                    'fields' => array('id', 'username', 'email')
                )
            ),
            'order' => array('AdminAuditLog.created' => 'DESC'),
            'limit' => 50
        );
        
        $this->set('auditLogs', $this->paginate());
        $this->set('pageTitle', $this->pageTitle);
        
        // Get filter options
        $this->set('entityTypes', array(
            'User' => 'User',
            'Setting' => 'Settings',
            'Transaction' => 'Transaction',
            'Project' => 'Project',
            'Payment' => 'Payment'
        ));
        
        $this->set('actions', array(
            'create' => 'Created',
            'edit' => 'Updated',
            'delete' => 'Deleted',
            'login' => 'Login',
            'logout' => 'Logout',
            'activate' => 'Activated',
            'deactivate' => 'Deactivated'
        ));
    }
    
    /**
     * View single log entry details
     */
    public function admin_view($id = null) {
        if (is_null($id)) {
            throw new NotFoundException(__l('Invalid request'));
        }
        
        $auditLog = $this->AdminAuditLog->find('first', array(
            'conditions' => array('AdminAuditLog.id' => $id),
            'contain' => array(
                'AdminUser' => array('fields' => array('id', 'username', 'email'))
            )
        ));
        
        if (empty($auditLog)) {
            throw new NotFoundException(__l('Invalid request'));
        }
        
        $this->pageTitle = 'Audit Log Details';
        $this->set('auditLog', $auditLog);
        $this->set('pageTitle', $this->pageTitle);
    }
    
    /**
     * Export audit logs
     */
    public function admin_export() {
        $conditions = array();
        
        if (!empty($this->request->params['named']['from_date'])) {
            $conditions['AdminAuditLog.created >='] = $this->request->params['named']['from_date'];
        }
        
        if (!empty($this->request->params['named']['to_date'])) {
            $conditions['AdminAuditLog.created <='] = $this->request->params['named']['to_date'] . ' 23:59:59';
        }
        
        $logs = $this->AdminAuditLog->find('all', array(
            'conditions' => $conditions,
            'contain' => array(
                'AdminUser' => array('fields' => array('username'))
            ),
            'order' => array('AdminAuditLog.created' => 'DESC')
        ));
        
        $data = array();
        foreach ($logs as $log) {
            $data[] = array(
                'Date' => $log['AdminAuditLog']['created'],
                'Admin' => $log['AdminUser']['username'],
                'Action' => $log['AdminAuditLog']['action'],
                'Entity Type' => $log['AdminAuditLog']['entity_type'],
                'Entity ID' => $log['AdminAuditLog']['entity_id'],
                'IP Address' => $log['AdminAuditLog']['ip_address']
            );
        }
        
        $this->layout = false;
        $this->set('data', $data);
        $this->render('/Elements/export_csv');
    }
}
