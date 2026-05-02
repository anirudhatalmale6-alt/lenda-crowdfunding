<?php
/**
 * AdminService
 * 
 * Service layer for admin operations including audit logging, RBAC, and session management
 * 
 * @package Lenda
 * @subpackage Service
 */
App::uses('AppService', 'Service');
class AdminService extends AppService {
    
    /**
     * Components used by this service
     */
    public $components = array('Session');
    
    /**
     * Log an admin action with before/after values
     * 
     * @param int $adminUserId Admin user ID
     * @param string $action Action performed
     * @param string $entityType Type of entity
     * @param int $entityId ID of the entity
     * @param array $oldValues Previous values
     * @param array $newValues New values
     * @return bool Success
     */
    public function logAdminAction($adminUserId, $action, $entityType = null, $entityId = null, $oldValues = array(), $newValues = array()) {
        App::import('Model', 'AdminAuditLog');
        $AuditLog = new AdminAuditLog();
        
        return $AuditLog->logAction($adminUserId, $action, $entityType, $entityId, $oldValues, $newValues);
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
        App::import('Model', 'AdminRole');
        $AdminRole = new AdminRole();
        
        return $AdminRole->hasPermission($roleId, $controller, $action);
    }
    
    /**
     * Create a new admin session
     * 
     * @param int $adminUserId Admin user ID
     * @param string $sessionId Session ID
     * @return bool Success
     */
    public function createAdminSession($adminUserId, $sessionId) {
        App::import('Model', 'AdminSession');
        $AdminSession = new AdminSession();
        
        return $AdminSession->createSession($adminUserId, $sessionId);
    }
    
    /**
     * Validate admin session
     * 
     * @param string $sessionId Session ID
     * @return bool Is valid
     */
    public function validateSession($sessionId) {
        App::import('Model', 'AdminSession');
        $AdminSession = new AdminSession();
        
        return $AdminSession->isValidSession($sessionId);
    }
    
    /**
     * Refresh admin session
     * 
     * @param string $sessionId Session ID
     * @return bool Success
     */
    public function refreshSession($sessionId) {
        App::import('Model', 'AdminSession');
        $AdminSession = new AdminSession();
        
        return $AdminSession->refreshSession($sessionId);
    }
    
    /**
     * Terminate admin session
     * 
     * @param string $sessionId Session ID
     * @return bool Success
     */
    public function terminateSession($sessionId) {
        App::import('Model', 'AdminSession');
        $AdminSession = new AdminSession();
        
        return $AdminSession->deleteSession($sessionId);
    }
    
    /**
     * Get active sessions count for a user
     * 
     * @param int $adminUserId Admin user ID
     * @return int Number of active sessions
     */
    public function getActiveSessionsCount($adminUserId) {
        App::import('Model', 'AdminSession');
        $AdminSession = new AdminSession();
        
        $sessions = $AdminSession->getActiveSessions($adminUserId);
        return count($sessions);
    }
    
    /**
     * Check concurrent session limit
     * 
     * @param int $adminUserId Admin user ID
     * @return bool Can create new session
     */
    public function canCreateSession($adminUserId) {
        App::import('Model', 'AdminSessionSetting');
        $AdminSessionSetting = new AdminSessionSetting();
        
        $settings = $AdminSessionSetting->getSettings();
        $currentSessions = $this->getActiveSessionsCount($adminUserId);
        
        return $currentSessions < $settings['max_concurrent_sessions'];
    }
    
    /**
     * Get fee configuration
     * 
     * @param string $feeType Fee type
     * @return array Fee configuration
     */
    public function getFeeConfiguration($feeType) {
        App::import('Model', 'FeeConfiguration');
        $FeeConfiguration = new FeeConfiguration();
        
        return $FeeConfiguration->getFeeByType($feeType);
    }
    
    /**
     * Calculate fee amount
     * 
     * @param string $feeType Fee type
     * @param float $amount Transaction amount
     * @return float Calculated fee
     */
    public function calculateFee($feeType, $amount) {
        App::import('Model', 'FeeConfiguration');
        $FeeConfiguration = new FeeConfiguration();
        
        return $FeeConfiguration->calculateFee($feeType, $amount);
    }
    
    /**
     * Get active announcements for a user
     * 
     * @param int $userId User ID (optional)
     * @param string $role User role (optional)
     * @return array Active announcements
     */
    public function getActiveAnnouncements($userId = null, $role = null) {
        App::import('Model', 'PlatformAnnouncement');
        $PlatformAnnouncement = new PlatformAnnouncement();
        
        return $PlatformAnnouncement->getActiveAnnouncements($userId, $role);
    }
    
    /**
     * Get unread announcements for a user
     * 
     * @param int $userId User ID
     * @return array Unread announcements
     */
    public function getUnreadAnnouncements($userId) {
        App::import('Model', 'PlatformAnnouncement');
        $PlatformAnnouncement = new PlatformAnnouncement();
        
        return $PlatformAnnouncement->getUnreadAnnouncements($userId);
    }
    
    /**
     * Mark announcement as read
     * 
     * @param int $userId User ID
     * @param int $announcementId Announcement ID
     * @return bool Success
     */
    public function markAnnouncementAsRead($userId, $announcementId) {
        App::import('Model', 'PlatformAnnouncement');
        $PlatformAnnouncement = new PlatformAnnouncement();
        
        return $PlatformAnnouncement->markAsRead($userId, $announcementId);
    }
    
    /**
     * Get all active fee configurations
     * 
     * @return array Active fee configurations
     */
    public function getAllFeeConfigurations() {
        App::import('Model', 'FeeConfiguration');
        $FeeConfiguration = new FeeConfiguration();
        
        return $FeeConfiguration->getActiveFees();
    }
    
    /**
     * Save fee configuration
     * 
     * @param array $data Fee data
     * @param int $adminUserId Admin user ID
     * @return bool Success
     */
    public function saveFeeConfiguration($data, $adminUserId) {
        App::import('Model', 'FeeConfiguration');
        $FeeConfiguration = new FeeConfiguration();
        
        $data['FeeConfiguration']['created_by'] = $adminUserId;
        
        // Log the action
        $this->logAdminAction(
            $adminUserId,
            'fee_update',
            'FeeConfiguration',
            !empty($data['FeeConfiguration']['id']) ? $data['FeeConfiguration']['id'] : null,
            array(),
            $data['FeeConfiguration']
        );
        
        $FeeConfiguration->create();
        return $FeeConfiguration->save($data);
    }
    
    /**
     * Get admin role details
     * 
     * @param int $roleId Admin role ID
     * @return array Role with permissions
     */
    public function getAdminRole($roleId) {
        App::import('Model', 'AdminRole');
        $AdminRole = new AdminRole();
        
        return $AdminRole->getRoleWithPermissions($roleId);
    }
    
    /**
     * Save admin role and permissions
     * 
     * @param array $roleData Role data
     * @param array $permissions Permissions array
     * @param int $adminUserId Admin user ID
     * @return bool Success
     */
    public function saveAdminRole($roleData, $permissions, $adminUserId) {
        App::import('Model', 'AdminRole');
        $AdminRole = new AdminRole();
        
        $isNew = empty($roleData['AdminRole']['id']);
        
        $AdminRole->create();
        $result = $AdminRole->save($roleData);
        
        if ($result) {
            $roleId = $AdminRole->id;
            
            // Save permissions
            $formattedPermissions = array();
            foreach ($permissions as $key => $allowed) {
                if ($allowed) {
                    $parts = explode('.', $key);
                    if (count($parts) == 2) {
                        $formattedPermissions[] = array(
                            'controller' => $parts[0],
                            'action' => $parts[1],
                            'allowed' => 1
                        );
                    }
                }
            }
            
            $AdminRole->AdminPermission->savePermissions($roleId, $formattedPermissions);
            
            // Log the action
            $this->logAdminAction(
                $adminUserId,
                $isNew ? 'create' : 'update',
                'AdminRole',
                $roleId,
                array(),
                $roleData['AdminRole']
            );
        }
        
        return $result;
    }
    
    /**
     * Get session settings
     * 
     * @return array Session settings
     */
    public function getSessionSettings() {
        App::import('Model', 'AdminSessionSetting');
        $AdminSessionSetting = new AdminSessionSetting();
        
        return $AdminSessionSetting->getSettings();
    }
    
    /**
     * Update session settings
     * 
     * @param array $data Settings data
     * @param int $adminUserId Admin user ID
     * @return bool Success
     */
    public function updateSessionSettings($data, $adminUserId) {
        App::import('Model', 'AdminSessionSetting');
        $AdminSessionSetting = new AdminSessionSetting();
        
        $oldSettings = $this->getSessionSettings();
        
        $result = $AdminSessionSetting->updateSettings($data);
        
        if ($result) {
            // Log the action
            $this->logAdminAction(
                $adminUserId,
                'update',
                'AdminSessionSetting',
                1,
                $oldSettings,
                $data['AdminSessionSetting']
            );
        }
        
        return $result;
    }
}
