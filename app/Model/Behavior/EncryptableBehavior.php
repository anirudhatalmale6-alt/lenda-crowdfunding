<?php
/**
 * SEC-015: Database Encryption Behavior
 * 
 * Provides field-level encryption for sensitive data at rest.
 * Uses AES-256-CBC encryption for secure data storage.
 * 
 * Usage in model:
 *   public $actsAs = array(
 *       'Encryptable' => array(
 *           'fields' => array('ssn', 'credit_card', 'bank_account'),
 *           'key' => 'your-encryption-key', // Should be from Configure
 *       )
 *   );
 */

App::uses('ModelBehavior', 'Model');

class EncryptableBehavior extends ModelBehavior {
    
    /**
     * Default settings
     */
    protected $_defaults = array(
        'fields' => array(),           // Fields to encrypt
        'key' => null,                 // Encryption key (should be from Configure::read)
        'algorithm' => 'aes-256-cbc',  // Encryption algorithm
        'autoDecrypt' => true,        // Auto decrypt on find
        'autoEncrypt' => true,        // Auto encrypt on save
    );
    
    /**
     * Setup behavior
     */
    public function setup(Model $model, $settings = array()) {
        $this->_settings[$model->alias] = array_merge(
            $this->_defaults,
            $settings
        );
        
        // Get encryption key from Configure if not provided
        if (empty($this->_settings[$model->alias]['key'])) {
            $this->_settings[$model->alias]['key'] = Configure::read('Security.encryptionKey');
        }
        
        // Validate settings
        if (empty($this->_settings[$model->alias]['fields'])) {
            unset($this->_settings[$model->alias]);
            return;
        }
        
        if (empty($this->_settings[$model->alias]['key'])) {
            CakeLog::error('EncryptableBehavior: No encryption key configured', 'security');
            unset($this->_settings[$model->alias]);
            return;
        }
    }
    
    /**
     * Encrypt fields before save
     */
    public function beforeSave(Model $model, $options = array()) {
        if (!isset($this->_settings[$model->alias])) {
            return true;
        }
        
        $settings = $this->_settings[$model->alias];
        
        if (!$settings['autoEncrypt']) {
            return true;
        }
        
        foreach ($settings['fields'] as $field) {
            if (isset($model->data[$model->alias][$field]) 
                && !empty($model->data[$model->alias][$field])) {
                
                // Skip if already encrypted (to prevent double encryption)
                if ($this->_isEncrypted($model->data[$model->alias][$field])) {
                    continue;
                }
                
                $model->data[$model->alias][$field] = $this->_encrypt(
                    $model->data[$model->alias][$field],
                    $settings['key']
                );
            }
        }
        
        return true;
    }
    
    /**
     * Decrypt fields after find
     */
    public function afterFind(Model $model, $results, $primary = false) {
        if (!isset($this->_settings[$model->alias])) {
            return $results;
        }
        
        $settings = $this->_settings[$model->alias];
        
        if (!$settings['autoDecrypt']) {
            return $results;
        }
        
        foreach ($results as &$result) {
            if (isset($result[$model->alias])) {
                foreach ($settings['fields'] as $field) {
                    if (isset($result[$model->alias][$field]) 
                        && !empty($result[$model->alias][$field])
                        && $this->_isEncrypted($result[$model->alias][$field])) {
                        
                        $result[$model->alias][$field] = $this->_decrypt(
                            $result[$model->alias][$field],
                            $settings['key']
                        );
                    }
                }
            }
        }
        
        return $results;
    }
    
    /**
     * Encrypt a value
     * 
     * @param string $value
     * @param string $key
     * @return string
     */
    protected function _encrypt($value, $key) {
        // Generate IV
        $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length('aes-256-cbc'));
        
        // Encrypt
        $encrypted = openssl_encrypt(
            $value,
            'aes-256-cbc',
            $key,
            0,
            $iv
        );
        
        // Return IV + encrypted data (base64 encoded)
        return base64_encode($iv . ':' . $encrypted);
    }
    
    /**
     * Decrypt a value
     * 
     * @param string $encryptedValue
     * @param string $key
     * @return string
     */
    protected function _decrypt($encryptedValue, $key) {
        // Decode from base64
        $data = base64_decode($encryptedValue);
        
        // Split IV and encrypted data
        $parts = explode(':', $data, 2);
        
        if (count($parts) !== 2) {
            CakeLog::warning('EncryptableBehavior: Invalid encrypted data format', 'security');
            return $encryptedValue;
        }
        
        list($iv, $encrypted) = $parts;
        
        // Decrypt
        $decrypted = openssl_decrypt(
            $encrypted,
            'aes-256-cbc',
            $key,
            0,
            $iv
        );
        
        return $decrypted !== false ? $decrypted : $encryptedValue;
    }
    
    /**
     * Check if a value appears to be encrypted
     * 
     * @param string $value
     * @return bool
     */
    protected function _isEncrypted($value) {
        if (empty($value) || !is_string($value)) {
            return false;
        }
        
        // Check if it's base64 encoded
        if (!preg_match('/^[A-Za-z0-9+\/=]+$/', $value)) {
            return false;
        }
        
        // Try to decode and check format
        $decoded = base64_decode($value, true);
        if ($decoded === false) {
            return false;
        }
        
        // Check for our encryption format (IV:encrypted)
        $parts = explode(':', $decoded, 2);
        return count($parts) === 2;
    }
    
    /**
     * Manually encrypt a field value
     * 
     * @param Model $model
     * @param string $field
     * @param string $value
     * @return string
     */
    public function encryptField(Model $model, $field, $value) {
        if (!isset($this->_settings[$model->alias])) {
            return $value;
        }
        
        $settings = $this->_settings[$model->alias];
        return $this->_encrypt($value, $settings['key']);
    }
    
    /**
     * Manually decrypt a field value
     * 
     * @param Model $model
     * @param string $field
     * @param string $value
     * @return string
     */
    public function decryptField(Model $model, $field, $value) {
        if (!isset($this->_settings[$model->alias])) {
            return $value;
        }
        
        $settings = $this->_settings[$model->alias];
        return $this->_decrypt($value, $settings['key']);
    }
    
    /**
     * Get list of encrypted fields
     * 
     * @param Model $model
     * @return array
     */
    public function getEncryptedFields(Model $model) {
        if (!isset($this->_settings[$model->alias])) {
            return array();
        }
        
        return $this->_settings[$model->alias]['fields'];
    }
}
