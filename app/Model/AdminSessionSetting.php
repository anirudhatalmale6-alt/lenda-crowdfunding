<?php
/**
 * AdminSessionSetting Model
 * 
 * Handles admin session settings
 * 
 * @package Lenda
 * @subpackage Model
 */
App::uses('AppModel', 'Model');
class AdminSessionSetting extends AppModel {
    public $name = 'AdminSessionSetting';
    public $useTable = 'admin_session_settings';
    
    public $validate = array(
        'max_concurrent_sessions' => array(
            'numeric' => array(
                'rule' => 'numeric',
                'message' => 'Please enter a valid number'
            ),
            'range' => array(
                'rule' => array('range', 0, 11),
                'message' => 'Maximum sessions must be between 1 and 10'
            )
        ),
        'session_timeout_minutes' => array(
            'numeric' => array(
                'rule' => 'numeric',
                'message' => 'Please enter a valid number'
            ),
            'range' => array(
                'rule' => array('range', 4, 1441),
                'message' => 'Session timeout must be between 5 and 1440 minutes'
            )
        )
    );
    
    /**
     * Get session settings
     * 
     * @return array Settings
     */
    public function getSettings() {
        $settings = $this->find('first');
        
        if (empty($settings)) {
            // Create default settings
            $this->create();
            $this->save(array(
                'max_concurrent_sessions' => 3,
                'session_timeout_minutes' => 60,
                'is_active' => 1
            ));
            return array(
                'max_concurrent_sessions' => 3,
                'session_timeout_minutes' => 60
            );
        }
        
        return array(
            'max_concurrent_sessions' => $settings['AdminSessionSetting']['max_concurrent_sessions'],
            'session_timeout_minutes' => $settings['AdminSessionSetting']['session_timeout_minutes']
        );
    }
    
    /**
     * Update session settings
     * 
     * @param array $data Settings data
     * @return bool Success
     */
    public function updateSettings($data) {
        $settings = $this->find('first');
        
        if ($settings) {
            $this->id = $settings['AdminSessionSetting']['id'];
        } else {
            $this->create();
        }
        
        return $this->save($data);
    }
}
