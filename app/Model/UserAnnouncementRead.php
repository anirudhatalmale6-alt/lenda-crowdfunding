<?php
/**
 * UserAnnouncementRead Model
 * 
 * Tracks which users have read announcements
 * 
 * @package Lenda
 * @subpackage Model
 */
App::uses('AppModel', 'Model');
class UserAnnouncementRead extends AppModel {
    public $name = 'UserAnnouncementRead';
    public $useTable = 'user_announcement_reads';
    
    public $belongsTo = array(
        'User' => array(
            'className' => 'User',
            'foreignKey' => 'user_id'
        ),
        'PlatformAnnouncement' => array(
            'className' => 'PlatformAnnouncement',
            'foreignKey' => 'announcement_id'
        )
    );
}
