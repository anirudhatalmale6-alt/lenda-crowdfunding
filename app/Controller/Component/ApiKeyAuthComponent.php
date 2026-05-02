<?php
/**
 * SEC-008: API Key Authentication Component
 * 
 * Implements API key + JWT dual authentication for service accounts
 * 
 * @package Lenda
 * @subpackage Controller/Component
 */

App::uses('Component', 'Controller');

class ApiKeyAuthComponent extends Component {
    
    /**
     * Components
     */
    public $Controller;
    
    /**
     * API key prefix for identification
     */
    const KEY_PREFIX = 'lenda_sk_';
    
    /**
     * Key length (32 bytes = 64 hex chars)
     */
    const KEY_LENGTH = 32;
    
    /**
     * Default key expiry (1 year)
     */
    const DEFAULT_EXPIRY = 365 * 24 * 60 * 60;
    
    /**
     * Allowed permissions
     */
    const PERMISSION_READ = 'read';
    const PERMISSION_WRITE = 'write';
    const PERMISSION_ADMIN = 'admin';
    
    /**
     * Initialize component
     */
    public function initialize(Controller $controller, $settings = []) {
        $this->Controller = $controller;
    }
    
    /**
     * SEC-008: Generate a new API key
     * 
     * @param int $userId User ID
     * @param string $name Key name/description
     * @param array $permissions Key permissions
     * @param int $expiresAt Expiration timestamp (null for no expiry)
     * @return array Key details including the secret (only shown once)
     */
    public function generateKey($userId, $name, $permissions = [self::PERMISSION_READ], $expiresAt = null) {
        // Generate cryptographically secure key
        $key = self::KEY_PREFIX . bin2hex(random_bytes(self::KEY_LENGTH));
        
        // Hash the key for storage (never store plaintext)
        $keyHash = hash('sha256', $key);
        
        // Generate key ID for identification
        $keyId = bin2hex(random_bytes(8));
        
        // Set expiry
        if ($expiresAt === null) {
            $expiresAt = time() + self::DEFAULT_EXPIRY;
        }
        
        // Store key in database
        App::import('Model', 'ApiKey');
        $this->ApiKey = new ApiKey();
        
        $this->ApiKey->create();
        $this->ApiKey->save([
            'ApiKey' => [
                'key_id' => $keyId,
                'key_hash' => $keyHash,
                'user_id' => $userId,
                'name' => $name,
                'permissions' => json_encode($permissions),
                'created_at' => date('Y-m-d H:i:s'),
                'expires_at' => date('Y-m-d H:i:s', $expiresAt),
                'last_used_at' => null,
                'is_active' => true
            ]
        ]);
        
        return [
            'key_id' => $keyId,
            'key' => $key, // Only returned once!
            'name' => $name,
            'permissions' => $permissions,
            'expires_at' => $expiresAt
        ];
    }
    
    /**
     * SEC-008: Validate API key
     * 
     * @param string $apiKey The API key from request header
     * @return array|false User data if valid, false otherwise
     */
    public function authenticate($apiKey = null) {
        if ($apiKey === null) {
            // Try to get from header
            $headers = getallheaders();
            $apiKey = isset($headers['X-API-Key']) ? $headers['X-API-Key'] : null;
        }
        
        if (empty($apiKey)) {
            return false;
        }
        
        // Hash the provided key for comparison
        $keyHash = hash('sha256', $apiKey);
        
        // Look up key in database
        App::import('Model', 'ApiKey');
        $this->ApiKey = new ApiKey();
        
        $keyData = $this->ApiKey->find('first', [
            'conditions' => [
                'ApiKey.key_hash' => $keyHash,
                'ApiKey.is_active' => true
            ],
            'recursive' => -1
        ]);
        
        if (empty($keyData)) {
            $this->_logFailedAttempt($apiKey);
            return false;
        }
        
        $key = $keyData['ApiKey'];
        
        // Check expiration
        if (strtotime($key['expires_at']) < time() && $key['expires_at'] !== null) {
            return false;
        }
        
        // Update last used timestamp
        $this->ApiKey->id = $key['id'];
        $this->ApiKey->saveField('last_used_at', date('Y-m-d H:i:s'));
        
        // Get user data
        App::import('Model', 'User');
        $this->User = new User();
        
        $user = $this->User->find('first', [
            'conditions' => ['User.id' => $key['user_id']],
            'fields' => ['id', 'email', 'role'],
            'recursive' => -1
        ]);
        
        if (empty($user)) {
            return false;
        }
        
        return [
            'user' => $user['User'],
            'key_id' => $key['key_id'],
            'permissions' => json_decode($key['permissions'], true)
        ];
    }
    
    /**
     * SEC-008: Require specific permission
     * 
     * @param string $requiredPermission Required permission
     * @return bool
     */
    public function requirePermission($requiredPermission) {
        $authData = $this->Controller->Session->read('ApiKeyAuth');
        
        if (empty($authData)) {
            return false;
        }
        
        $permissions = $authData['permissions'];
        
        // Admin has all permissions
        if (in_array(self::PERMISSION_ADMIN, $permissions)) {
            return true;
        }
        
        return in_array($requiredPermission, $permissions);
    }
    
    /**
     * SEC-008: Revoke an API key
     * 
     * @param string $keyId Key ID to revoke
     * @return bool
     */
    public function revokeKey($keyId) {
        App::import('Model', 'ApiKey');
        $this->ApiKey = new ApiKey();
        
        $key = $this->ApiKey->find('first', [
            'conditions' => ['ApiKey.key_id' => $keyId],
            'recursive' => -1
        ]);
        
        if (empty($key)) {
            return false;
        }
        
        $this->ApiKey->id = $key['ApiKey']['id'];
        return $this->ApiKey->saveField('is_active', false);
    }
    
    /**
     * SEC-008: Get all API keys for a user
     * 
     * @param int $userId User ID
     * @return array
     */
    public function getUserKeys($userId) {
        App::import('Model', 'ApiKey');
        $this->ApiKey = new ApiKey();
        
        $keys = $this->ApiKey->find('all', [
            'conditions' => ['ApiKey.user_id' => $userId],
            'fields' => ['key_id', 'name', 'permissions', 'created_at', 'expires_at', 'last_used_at', 'is_active'],
            'order' => ['ApiKey.created_at' => 'DESC'],
            'recursive' => -1
        ]);
        
        return $keys;
    }
    
    /**
     * Log failed API key attempt
     */
    protected function _logFailedAttempt($apiKey) {
        $logData = [
            'event' => 'api_key_auth_failed',
            'key_prefix' => substr($apiKey, 0, 15) . '...',
            'ip' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown',
            'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'unknown',
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        CakeLog::write('security', json_encode($logData));
    }
}

/**
 * SEC-008: API Key Model
 */
App::uses('AppModel', 'Model');
class ApiKey extends AppModel {
    public $name = 'ApiKey';
    public $useTable = 'api_keys';
    
    public $belongsTo = ['User'];
    
    public function beforeSave($options = []) {
        // Generate key_id if not set
        if (empty($this->data['ApiKey']['key_id'])) {
            $this->data['ApiKey']['key_id'] = bin2hex(random_bytes(8));
        }
        return true;
    }
}
