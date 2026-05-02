<?php
/**
 * AdminSessions Controller
 * 
 * Handles admin session management and concurrent login limits
 * 
 * @package Lenda
 * @subpackage Controller
 */
class AdminSessionsController extends AppController {
    public $name = 'AdminSessions';
    public $components = array('Session');
    public $helpers = array('Html', 'Form', 'Time');
    
    public function beforeFilter() {
        parent::beforeFilter();
    }
    
    /**
     * Index - View all active sessions
     */
    public function admin_index() {
        $this->pageTitle = 'Admin Sessions';
        
        $this->paginate = array(
            'conditions' => array(
                'AdminSession.expires >' => date('Y-m-d H:i:s')
            ),
            'contain' => array(
                'AdminUser' => array(
                    'fields' => array('id', 'username', 'email')
                )
            ),
            'order' => array('AdminSession.created' => 'DESC'),
            'limit' => 50
        );
        
        $this->set('sessions', $this->paginate());
        $this->set('pageTitle', $this->pageTitle);
        
        // Get session settings
        $settings = $this->AdminSession->AdminSessionSetting->getSettings();
        $this->set('settings', $settings);
    }
    
    /**
     * Session settings
     */
    public function admin_settings() {
        $settings = $this->AdminSession->AdminSessionSetting->find('first');
        
        if (!empty($this->request->data)) {
            if ($this->AdminSession->AdminSessionSetting->save($this->request->data)) {
                $this->Session->setFlash('Session settings have been updated', 'default', array('class' => 'success-message'));
                $this->redirect(array('action' => 'index'));
            } else {
                $this->Session->setFlash('Settings could not be saved', 'default', array('class' => 'error-message'));
            }
        }
        
        if (empty($this->request->data) && !empty($settings)) {
            $this->request->data = $settings;
        }
        
        $this->pageTitle = 'Session Settings';
        $this->set('pageTitle', $this->pageTitle);
    }
    
    /**
     * Delete a session (force logout)
     */
    public function admin_delete_session($sessionId = null) {
        if (is_null($sessionId)) {
            $this->Session->setFlash('Invalid request', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        if ($this->AdminSession->deleteSession($sessionId)) {
            $this->Session->setFlash('Session has been terminated', 'default', array('class' => 'success-message'));
        } else {
            $this->Session->setFlash('Could not terminate session', 'default', array('class' => 'error-message'));
        }
        
        $this->redirect(array('action' => 'index'));
    }
    
    /**
     * Delete all sessions for a user (force logout all)
     */
    public function admin_delete_user_sessions($userId = null) {
        if (is_null($userId)) {
            $this->Session->setFlash('Invalid request', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        if ($this->AdminSession->deleteAllUserSessions($userId)) {
            $this->Session->setFlash('All sessions for this user have been terminated', 'default', array('class' => 'success-message'));
        } else {
            $this->Session->setFlash('Could not terminate sessions', 'default', array('class' => 'error-message'));
        }
        
        $this->redirect(array('action' => 'index'));
    }
    
    /**
     * View sessions for specific user
     */
    public function admin_user_sessions($userId = null) {
        if (is_null($userId)) {
            $this->Session->setFlash('Invalid request', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $sessions = $this->AdminSession->getActiveSessions($userId);
        
        // Get user info
        App::import('Model', 'User');
        $userModel = new User();
        $user = $userModel->find('first', array(
            'conditions' => array('User.id' => $userId),
            'fields' => array('id', 'username', 'email')
        ));
        
        $this->pageTitle = 'Sessions - ' . $user['User']['username'];
        $this->set('sessions', $sessions);
        $this->set('user', $user);
        $this->set('pageTitle', $this->pageTitle);
    }
    
    /**
     * Cleanup expired sessions
     */
    public function admin_cleanup() {
        $deleted = $this->AdminSession->cleanupExpiredSessions();
        
        $this->Session->setFlash($deleted . ' expired sessions have been cleaned up', 'default', array('class' => 'success-message'));
        $this->redirect(array('action' => 'index'));
    }
}
