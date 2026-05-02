<?php
/**
 * AdminSession Model
 * 
 * Handles admin session management and concurrent login limits
 * 
 * @package Lenda
 * @subpackage Model
 */
App::uses('AppModel', 'Model');
class AdminSession extends AppModel {
    public $name = 'AdminSession';
    public $useTable = 'admin_sessions';
    
    public $belongsTo = array(
        'AdminUser' => array(
            'className' => 'User',
            'foreignKey' => 'admin_user_id'
        )
    );
    
    /**
     * Create a new admin session
     * 
     * @param int $adminUserId Admin user ID
     * @param string $sessionId Session ID
     * @return bool Success
     */
    public function createSession($adminUserId, $sessionId) {
        // Get session settings
        $settings = $this->AdminSessionSetting->getSettings();
        
        // Check concurrent session limit
        $currentSessions = $this->getActiveSessions($adminUserId);
        if (count($currentSessions) >= $settings['max_concurrent_sessions']) {
            // Remove oldest session
            $this->deleteOldestSession($adminUserId);
        }
        
        // Calculate expiration
        $expires = date('Y-m-d H:i:s', strtotime('+' . $settings['session_timeout_minutes'] . ' minutes'));
        
        $data = array(
            'id' => $sessionId,
            'admin_user_id' => $adminUserId,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            'created' => date('Y-m-d H:i:s'),
            'expires' => $expires
        );
        
        $this->create();
        return $this->save($data);
    }
    
    /**
     * Get active sessions for a user
     * 
     * @param int $adminUserId Admin user ID
     * @return array Active sessions
     */
    public function getActiveSessions($adminUserId) {
        return $this->find('all', array(
            'conditions' => array(
                'AdminSession.admin_user_id' => $adminUserId,
                'AdminSession.expires >' => date('Y-m-d H:i:s')
            ),
            'order' => array('AdminSession.created' => 'DESC')
        ));
    }
    
    /**
     * Check if session is valid
     * 
     * @param string $sessionId Session ID
     * @return bool Is valid
     */
    public function isValidSession($sessionId) {
        $session = $this->find('first', array(
            'conditions' => array(
                'AdminSession.id' => $sessionId,
                'AdminSession.expires >' => date('Y-m-d H:i:s')
            )
        ));
        return !empty($session);
    }
    
    /**
     * Refresh session expiration
     * 
     * @param string $sessionId Session ID
     * @return bool Success
     */
    public function refreshSession($sessionId) {
        $settings = $this->AdminSessionSetting->getSettings();
        $expires = date('Y-m-d H:i:s', strtotime('+' . $settings['session_timeout_minutes'] . ' minutes'));
        
        return $this->updateAll(
            array('AdminSession.expires' => "'" . $expires . "'"),
            array('AdminSession.id' => $sessionId)
        );
    }
    
    /**
     * Delete oldest session for a user
     * 
     * @param int $adminUserId Admin user ID
     * @return bool Success
     */
    public function deleteOldestSession($adminUserId) {
        $oldestSession = $this->find('first', array(
            'conditions' => array('AdminSession.admin_user_id' => $adminUserId),
            'order' => array('AdminSession.created' => 'ASC')
        ));
        
        if ($oldestSession) {
            return $this->delete($oldestSession['AdminSession']['id']);
        }
        return false;
    }
    
    /**
     * Delete session by ID
     * 
     * @param string $sessionId Session ID
     * @return bool Success
     */
    public function deleteSession($sessionId) {
        return $this->delete($sessionId);
    }
    
    /**
     * Delete all sessions for a user (logout all)
     * 
     * @param int $adminUserId Admin user ID
     * @return bool Success
     */
    public function deleteAllUserSessions($adminUserId) {
        return $this->deleteAll(array('AdminSession.admin_user_id' => $adminUserId));
    }
    
    /**
     * Clean up expired sessions
     * 
     * @return int Number of deleted sessions
     */
    public function cleanupExpiredSessions() {
        return $this->deleteAll(array('AdminSession.expires <' => date('Y-m-d H:i:s')));
    }
    
    /**
     * Get all active admin sessions (for admin panel)
     * 
     * @return array All active sessions
     */
    public function getAllActiveSessions() {
        return $this->find('all', array(
            'conditions' => array(
                'AdminSession.expires >' => date('Y-m-d H:i:s')
            ),
            'contain' => array('AdminUser' => array('fields' => array('id', 'username', 'email'))),
            'order' => array('AdminSession.created' => 'DESC')
        ));
    }
}
