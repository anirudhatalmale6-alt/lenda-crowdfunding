<?php
/**
 * PlatformAnnouncement Model
 * 
 * Handles platform-wide announcements and notifications
 * 
 * @package Lenda
 * @subpackage Model
 */
App::uses('AppModel', 'Model');
class PlatformAnnouncement extends AppModel {
    public $name = 'PlatformAnnouncement';
    public $useTable = 'platform_announcements';
    
    public $belongsTo = array(
        'Creator' => array(
            'className' => 'User',
            'foreignKey' => 'created_by'
        )
    );
    
    public $hasMany = array(
        'UserAnnouncementRead' => array(
            'className' => 'UserAnnouncementRead',
            'foreignKey' => 'announcement_id',
            'dependent' => true
        )
    );
    
    public $validate = array(
        'title' => array(
            'notEmpty' => array(
                'rule' => 'notEmpty',
                'message' => 'Title is required'
            )
        ),
        'message' => array(
            'notEmpty' => array(
                'rule' => 'notEmpty',
                'message' => 'Message is required'
            )
        ),
        'announcement_type' => array(
            'inList' => array(
                'rule' => array('inList', array('info', 'warning', 'success', 'danger')),
                'message' => 'Invalid announcement type'
            )
        ),
        'target_audience' => array(
            'inList' => array(
                'rule' => array('inList', array('all', 'lenders', 'borrowers', 'admins')),
                'message' => 'Invalid target audience'
            )
        )
    );
    
    /**
     * Get active announcements for a user
     * 
     * @param int $userId User ID
     * @param string $role User role
     * @return array Active announcements
     */
    public function getActiveAnnouncements($userId = null, $role = null) {
        $conditions = array(
            'PlatformAnnouncement.is_active' => 1,
            'OR' => array(
                'PlatformAnnouncement.start_date <=' => date('Y-m-d H:i:s'),
                'PlatformAnnouncement.start_date' => null
            ),
            'OR' => array(
                'PlatformAnnouncement.end_date >=' => date('Y-m-d H:i:s'),
                'PlatformAnnouncement.end_date' => null
            )
        );
        
        // Filter by target audience
        if ($role) {
            $conditions['OR'][] = array('PlatformAnnouncement.target_audience' => 'all');
            $conditions['OR'][] = array('PlatformAnnouncement.target_audience' => $role);
        }
        
        return $this->find('all', array(
            'conditions' => $conditions,
            'order' => array('PlatformAnnouncement.created' => 'DESC'),
            'limit' => 10
        ));
    }
    
    /**
     * Get unread announcements for a user
     * 
     * @param int $userId User ID
     * @return array Unread announcements
     */
    public function getUnreadAnnouncements($userId) {
        // Get all active announcements
        $announcements = $this->getActiveAnnouncements();
        
        if (empty($announcements)) {
            return array();
        }
        
        // Get read announcement IDs
        $readIds = $this->UserAnnouncementRead->find('list', array(
            'conditions' => array('UserAnnouncementRead.user_id' => $userId),
            'fields' => array('announcement_id')
        ));
        
        // Filter out read announcements
        $unread = array();
        foreach ($announcements as $announcement) {
            if (!in_array($announcement['PlatformAnnouncement']['id'], $readIds)) {
                $unread[] = $announcement;
            }
        }
        
        return $unread;
    }
    
    /**
     * Mark announcement as read
     * 
     * @param int $userId User ID
     * @param int $announcementId Announcement ID
     * @return bool Success
     */
    public function markAsRead($userId, $announcementId) {
        // Check if already read
        $existing = $this->UserAnnouncementRead->find('first', array(
            'conditions' => array(
                'UserAnnouncementRead.user_id' => $userId,
                'UserAnnouncementRead.announcement_id' => $announcementId
            )
        ));
        
        if ($existing) {
            return true;
        }
        
        $this->UserAnnouncementRead->create();
        return $this->UserAnnouncementRead->save(array(
            'user_id' => $userId,
            'announcement_id' => $announcementId,
            'read_at' => date('Y-m-d H:i:s')
        ));
    }
    
    /**
     * Get announcement types
     * 
     * @return array Types
     */
    public function getTypes() {
        return array(
            'info' => 'Information',
            'warning' => 'Warning',
            'success' => 'Success',
            'danger' => 'Danger'
        );
    }
    
    /**
     * Get target audiences
     * 
     * @return array Audiences
     */
    public function getAudiences() {
        return array(
            'all' => 'All Users',
            'lenders' => 'Lenders Only',
            'borrowers' => 'Borrowers Only',
            'admins' => 'Admins Only'
        );
    }
}
