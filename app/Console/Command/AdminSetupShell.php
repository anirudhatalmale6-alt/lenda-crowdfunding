<?php
/**
 * LENDA Secure Admin Setup Console Command
 * 
 * Creates admin users securely during first-run setup
 * Prevents hardcoded credentials in production
 * 
 * @package Lenda
 * @subpackage Console/Command
 */

App::uses('AppShell', 'Console/Command');
App::uses('User', 'Model');

class AdminSetupShell extends AppShell {
    
    /**
     * Models
     */
    public $uses = array('User');
    
    /**
     * Main execution
     */
    public function main() {
        $this->out('LENDA Secure Admin Setup');
        $this->out('========================');
        $this->out('');
        
        // Check if admin already exists
        $adminExists = $this->User->find('count', array(
            'conditions' => array('User.role' => 'admin'),
            'recursive' => -1
        ));
        
        if ($adminExists > 0) {
            $this->out('Admin users already exist. Aborting for security.', 'error');
            $this->out('To reset admin, manually delete users and run this command.', 'warning');
            return false;
        }
        
        // Get admin credentials securely
        $email = $this->_getAdminEmail();
        $password = $this->_getSecurePassword();
        $name = $this->_getAdminName();
        
        if (!$email || !$password || !$name) {
            $this->out('Setup cancelled.', 'error');
            return false;
        }
        
        // Create admin user
        $this->User->create();
        $userData = array(
            'User' => array(
                'email' => $email,
                'password_hash' => password_hash($password, PASSWORD_BCRYPT),
                'name' => $name,
                'role' => 'admin',
                'status' => 'active',
                'kyc_status' => 'approved',
                'is_first_login' => 1, // Force password change on first login
                'password_changed_at' => null
            )
        );
        
        if ($this->User->save($userData)) {
            $adminId = $this->User->getLastInsertID();
            
            $this->out('');
            $this->out('Admin user created successfully!', 'success');
            $this->out('Admin ID: ' . $adminId);
            $this->out('Email: ' . $email);
            $this->out('');
            $this->out('IMPORTANT: Change your password on first login!', 'warning');
            
            // Log admin creation event
            $this->_logAdminCreation($adminId, $email);
            
            return true;
        } else {
            $this->out('Failed to create admin user.', 'error');
            return false;
        }
    }
    
    /**
     * Get admin email interactively
     */
    protected function _getAdminEmail() {
        $this->out('');
        $email = $this->in(
            'Enter admin email address:',
            null,
            'admin@lenda.local'
        );
        
        if (empty($email)) {
            $this->out('Email is required.', 'error');
            return false;
        }
        
        // Validate email format
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->out('Invalid email format.', 'error');
            return false;
        }
        
        // Check if email already exists
        $exists = $this->User->find('count', array(
            'conditions' => array('User.email' => $email),
            'recursive' => -1
        ));
        
        if ($exists > 0) {
            $this->out('Email already registered.', 'error');
            return false;
        }
        
        return trim($email);
    }
    
    /**
     * Get secure password interactively
     */
    protected function _getSecurePassword() {
        $this->out('');
        $this->out('Password requirements:', 'info');
        $this->out('  - At least 12 characters');
        $this->out('  - At least one uppercase letter');
        $this->out('  - At least one lowercase letter');
        $this->out('  - At least one number');
        $this->out('  - At least one special character');
        $this->out('');
        
        $password = $this->in('Enter secure password:');
        
        if (empty($password)) {
            $this->out('Password is required.', 'error');
            return false;
        }
        
        // Validate password strength
        if (!$this->_validatePasswordStrength($password)) {
            $this->out('Password does not meet requirements.', 'error');
            return false;
        }
        
        // Confirm password
        $confirm = $this->in('Confirm password:');
        
        if ($password !== $confirm) {
            $this->out('Passwords do not match.', 'error');
            return false;
        }
        
        return $password;
    }
    
    /**
     * Get admin name
     */
    protected function _getAdminName() {
        $this->out('');
        $name = $this->in('Enter admin display name:');
        
        if (empty($name)) {
            $this->out('Name is required.', 'error');
            return false;
        }
        
        return trim($name);
    }
    
    /**
     * Validate password strength
     */
    protected function _validatePasswordStrength($password) {
        if (strlen($password) < 12) {
            return false;
        }
        
        if (!preg_match('/[A-Z]/', $password)) {
            return false;
        }
        
        if (!preg_match('/[a-z]/', $password)) {
            return false;
        }
        
        if (!preg_match('/[0-9]/', $password)) {
            return false;
        }
        
        if (!preg_match('/[^A-Za-z0-9]/', $password)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Log admin creation event
     */
    protected function _logAdminCreation($userId, $email) {
        $logData = array(
            'event' => 'admin_created',
            'user_id' => $userId,
            'email' => $email,
            'ip' => 'console',
            'timestamp' => date('Y-m-d H:i:s')
        );
        
        // Log to security log
        CakeLog::write('security', json_encode($logData));
    }
    
    /**
     * Help text
     */
    public function getOptionParser() {
        $parser = parent::getOptionParser();
        $parser->description('Secure admin user setup for LENDA platform');
        return $parser;
    }
}
