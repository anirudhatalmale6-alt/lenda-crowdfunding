<?php
/**
 * PlatformAnnouncements Controller
 * 
 * Handles platform-wide announcements and notifications
 * 
 * @package Lenda
 * @subpackage Controller
 */
class PlatformAnnouncementsController extends AppController {
    public $name = 'PlatformAnnouncements';
    public $components = array('Session');
    public $helpers = array('Html', 'Form', 'Time');
    
    public function beforeFilter() {
        parent::beforeFilter();
    }
    
    /**
     * Index - List all announcements
     */
    public function admin_index() {
        $this->pageTitle = 'Announcements';
        
        // Filter conditions
        $conditions = array();
        
        if (!empty($this->request->params['named']['status'])) {
            if ($this->request->params['named']['status'] == 'active') {
                $conditions['PlatformAnnouncement.is_active'] = 1;
            } elseif ($this->request->params['named']['status'] == 'inactive') {
                $conditions['PlatformAnnouncement.is_active'] = 0;
            }
        }
        
        if (!empty($this->request->params['named']['audience'])) {
            $conditions['PlatformAnnouncement.target_audience'] = $this->request->params['named']['audience'];
        }
        
        $this->paginate = array(
            'conditions' => $conditions,
            'contain' => array(
                'Creator' => array(
                    'fields' => array('id', 'username')
                )
            ),
            'order' => array('PlatformAnnouncement.created' => 'DESC'),
            'limit' => 20
        );
        
        $this->set('announcements', $this->paginate());
        $this->set('pageTitle', $this->pageTitle);
        
        // Set filter options
        $this->set('statusOptions', array(
            'active' => 'Active',
            'inactive' => 'Inactive'
        ));
        $this->set('audienceOptions', $this->PlatformAnnouncement->getAudiences());
    }
    
    /**
     * View announcement
     */
    public function admin_view($id = null) {
        if (is_null($id)) {
            $this->Session->setFlash('Invalid request', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $announcement = $this->PlatformAnnouncement->findById($id);
        
        if (empty($announcement)) {
            $this->Session->setFlash('Announcement not found', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $this->pageTitle = $announcement['PlatformAnnouncement']['title'];
        $this->set('announcement', $announcement);
        $this->set('pageTitle', $this->pageTitle);
    }
    
    /**
     * Add new announcement
     */
    public function admin_add() {
        if (!empty($this->request->data)) {
            $this->PlatformAnnouncement->create();
            $this->request->data['PlatformAnnouncement']['created_by'] = $this->Auth->user('id');
            $this->request->data['PlatformAnnouncement']['created'] = date('Y-m-d H:i:s');
            
            if ($this->PlatformAnnouncement->save($this->request->data)) {
                // Log the action
                $this->loadModel('AdminAuditLog');
                $this->AdminAuditLog->logAction(
                    $this->Auth->user('id'),
                    'create',
                    'PlatformAnnouncement',
                    $this->PlatformAnnouncement->id,
                    array(),
                    $this->request->data['PlatformAnnouncement']
                );
                
                $this->Session->setFlash('Announcement has been created', 'default', array('class' => 'success-message'));
                $this->redirect(array('action' => 'index'));
            } else {
                $this->Session->setFlash('Announcement could not be created. Please try again.', 'default', array('class' => 'error-message'));
            }
        }
        
        $this->pageTitle = 'Create Announcement';
        $this->set('announcementTypes', $this->PlatformAnnouncement->getTypes());
        $this->set('targetAudiences', $this->PlatformAnnouncement->getAudiences());
        $this->set('pageTitle', $this->pageTitle);
    }
    
    /**
     * Edit announcement
     */
    public function admin_edit($id = null) {
        if (is_null($id)) {
            $this->Session->setFlash('Invalid request', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $announcement = $this->PlatformAnnouncement->findById($id);
        
        if (empty($announcement)) {
            $this->Session->setFlash('Announcement not found', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        if (!empty($this->request->data)) {
            // Store old values for audit
            $oldValues = $announcement['PlatformAnnouncement'];
            
            $this->PlatformAnnouncement->id = $id;
            $this->request->data['PlatformAnnouncement']['modified'] = date('Y-m-d H:i:s');
            
            if ($this->PlatformAnnouncement->save($this->request->data)) {
                // Log the action
                $this->loadModel('AdminAuditLog');
                $this->AdminAuditLog->logAction(
                    $this->Auth->user('id'),
                    'edit',
                    'PlatformAnnouncement',
                    $id,
                    $oldValues,
                    $this->request->data['PlatformAnnouncement']
                );
                
                $this->Session->setFlash('Announcement has been updated', 'default', array('class' => 'success-message'));
                $this->redirect(array('action' => 'index'));
            } else {
                $this->Session->setFlash('Announcement could not be updated. Please try again.', 'default', array('class' => 'error-message'));
            }
        }
        
        if (empty($this->request->data)) {
            $this->request->data = $announcement;
        }
        
        $this->pageTitle = 'Edit Announcement';
        $this->set('announcementTypes', $this->PlatformAnnouncement->getTypes());
        $this->set('targetAudiences', $this->PlatformAnnouncement->getAudiences());
        $this->set('pageTitle', $this->pageTitle);
    }
    
    /**
     * Delete announcement
     */
    public function admin_delete($id = null) {
        if (is_null($id)) {
            $this->Session->setFlash('Invalid request', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $announcement = $this->PlatformAnnouncement->findById($id);
        
        if (empty($announcement)) {
            $this->Session->setFlash('Announcement not found', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        if ($this->PlatformAnnouncement->delete($id)) {
            // Log the action
            $this->loadModel('AdminAuditLog');
            $this->AdminAuditLog->logAction(
                $this->Auth->user('id'),
                'delete',
                'PlatformAnnouncement',
                $id,
                $announcement['PlatformAnnouncement'],
                array()
            );
            
            $this->Session->setFlash('Announcement has been deleted', 'default', array('class' => 'success-message'));
        } else {
            $this->Session->setFlash('Announcement could not be deleted', 'default', array('class' => 'error-message'));
        }
        
        $this->redirect(array('action' => 'index'));
    }
    
    /**
     * Toggle announcement active status
     */
    public function admin_toggle($id = null) {
        if (is_null($id)) {
            $this->Session->setFlash('Invalid request', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $announcement = $this->PlatformAnnouncement->findById($id);
        
        if (empty($announcement)) {
            $this->Session->setFlash('Announcement not found', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $newStatus = $announcement['PlatformAnnouncement']['is_active'] ? 0 : 1;
        
        $this->PlatformAnnouncement->id = $id;
        $this->PlatformAnnouncement->saveField('is_active', $newStatus);
        
        $statusText = $newStatus ? 'activated' : 'deactivated';
        $this->Session->setFlash('Announcement has been ' . $statusText, 'default', array('class' => 'success-message'));
        
        $this->redirect(array('action' => 'index'));
    }
    
    /**
     * View read statistics for an announcement
     */
    public function admin_stats($id = null) {
        if (is_null($id)) {
            $this->Session->setFlash('Invalid request', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $announcement = $this->PlatformAnnouncement->findById($id);
        
        if (empty($announcement)) {
            $this->Session->setFlash('Announcement not found', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        // Get read statistics
        $totalReads = $this->PlatformAnnouncement->UserAnnouncementRead->find('count', array(
            'conditions' => array('UserAnnouncementRead.announcement_id' => $id)
        ));
        
        // Get recent reads
        $recentReads = $this->PlatformAnnouncement->UserAnnouncementRead->find('all', array(
            'conditions' => array('UserAnnouncementRead.announcement_id' => $id),
            'contain' => array(
                'User' => array('fields' => array('id', 'username', 'email'))
            ),
            'order' => array('UserAnnouncementRead.read_at' => 'DESC'),
            'limit' => 50
        ));
        
        $this->pageTitle = 'Announcement Stats - ' . $announcement['PlatformAnnouncement']['title'];
        $this->set('announcement', $announcement);
        $this->set('totalReads', $totalReads);
        $this->set('recentReads', $recentReads);
        $this->set('pageTitle', $this->pageTitle);
    }
    
    /**
     * Public - Get active announcements for a user
     */
    public function get_active() {
        $this->autoRender = false;
        
        $userId = null;
        $role = null;
        
        // Get user info if logged in
        if ($this->Auth->user()) {
            $userId = $this->Auth->user('id');
            $role = 'user';
            
            // Determine role
            if ($this->Auth->user('role_id') == ConstUserTypes::Admin) {
                $role = 'admin';
            }
        }
        
        $announcements = $this->PlatformAnnouncement->getActiveAnnouncements($userId, $role);
        
        echo json_encode($announcements);
    }
    
    /**
     * Public - Mark announcement as read
     */
    public function mark_read($announcementId) {
        $this->autoRender = false;
        
        if (!$this->Auth->user()) {
            echo json_encode(array('success' => false, 'message' => 'Not authenticated'));
            return;
        }
        
        $userId = $this->Auth->user('id');
        $result = $this->PlatformAnnouncement->markAsRead($userId, $announcementId);
        
        echo json_encode(array('success' => $result));
    }
}
