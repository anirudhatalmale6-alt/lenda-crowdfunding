<?php
/**
 * LENDA Platform - Field-Level Encryption Library
 * 
 * Provides AES-256-GCM encryption for sensitive PII data at rest
 * Addresses SEC-10: Field-level encryption for sensitive data
 * 
 * @package Lenda\Lib\Security
 * @author Lenda Platform Team
 * @version 1.0.0
 */

App::uses('CakeSession', 'Model/Datasource');
App::uses('Security', 'Utility');

class FieldEncryption {
    
    /**
     * Encryption algorithm
     */
    const ALGORITHM = 'aes-256-gcm';
    
    /**
     * Key length for AES-256
     */
    const KEY_LENGTH = 32;
    
    /**
     * IV length for GCM
     */
    const IV_LENGTH = 12;
    
    /**
     * Auth tag length
     */
    const TAG_LENGTH = 16;
    
    /**
     * Singleton instance
     */
    protected static $_instance = null;
    
    /**
     * Encryption key (derived from master key)
     */
    protected $_encryptionKey = null;
    
    /**
     * Sensitive fields that should be encrypted
     */
    protected $_sensitiveFields = array(
        'User' => array(
            'first_name',
            'last_name',
            'email',
            'phone',
            'date_of_birth',
            'ssn',
            'tax_id',
            'address',
            'city',
            'state',
            'zip_code',
            'country',
            'nationality',
            'bank_account_number',
            'routing_number',
            'credit_card_number'
        ),
        'Borrower' => array(
            'business_name',
            'business_registration_number',
            'tax_id',
            'officer_name',
            'officer_ssn',
            'financial_statement'
        ),
        'Loan' => array(
            'collateral_description',
            'collateral_location'
        ),
        'EscrowTransaction' => array(
            'delivery_proof',
            'dispute_notes'
        )
    );
    
    /**
     * Get singleton instance
     * 
     * @return FieldEncryption
     */
    public static function getInstance() {
        if (self::$_instance === null) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }
    
    /**
     * Constructor
     */
    protected function __construct() {
        $this->_initializeKey();
    }
    
    /**
     * Initialize encryption key from environment
     */
    protected function _initializeKey() {
        $masterKey = env('LENDA_FIELD_ENCRYPTION_KEY');
        
        if (empty($masterKey)) {
            throw new Exception('LENDA_FIELD_ENCRYPTION_KEY environment variable not set');
        }
        
        // Derive a proper 32-byte key using HKDF
        $this->_encryptionKey = hash_hmac('sha256', $masterKey, 'lenda-field-encryption', true);
        
        if (strlen($this->_encryptionKey) !== self::KEY_LENGTH) {
            throw new Exception('Invalid encryption key length');
        }
    }
    
    /**
     * Encrypt a field value
     * 
     * @param mixed $value The value to encrypt
     * @return string Encrypted value (base64 encoded)
     */
    public function encrypt($value) {
        if ($value === null || $value === '') {
            return $value;
        }
        
        // Generate random IV
        $iv = random_bytes(self::IV_LENGTH);
        
        // Encrypt using AES-256-GCM
        $ciphertext = openssl_encrypt(
            $value,
            self::ALGORITHM,
            $this->_encryptionKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        
        if ($ciphertext === false) {
            throw new Exception('Encryption failed: ' . openssl_error_string());
        }
        
        // Combine IV + ciphertext + tag
        $encrypted = $iv . $ciphertext . $tag;
        
        // Return base64 encoded
        return base64_encode($encrypted);
    }
    
    /**
     * Decrypt a field value
     * 
     * @param string $encryptedValue The encrypted value (base64 encoded)
     * @return mixed Decrypted value
     */
    public function decrypt($encryptedValue) {
        if ($encryptedValue === null || $encryptedValue === '') {
            return $encryptedValue;
        }
        
        // Decode from base64
        $encrypted = base64_decode($encryptedValue, true);
        
        if ($encrypted === false) {
            throw new Exception('Invalid encrypted value format');
        }
        
        // Extract components
        $iv = substr($encrypted, 0, self::IV_LENGTH);
        $tag = substr($encrypted, -self::TAG_LENGTH);
        $ciphertext = substr($encrypted, self::IV_LENGTH, -self::TAG_LENGTH);
        
        // Decrypt
        $decrypted = openssl_decrypt(
            $ciphertext,
            self::ALGORITHM,
            $this->_encryptionKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        
        if ($decrypted === false) {
            throw new Exception('Decryption failed: ' . openssl_error_string());
        }
        
        return $decrypted;
    }
    
    /**
     * Encrypt sensitive fields in a data array
     * 
     * @param string $modelName The model name
     * @param array $data The data array
     * @return array Data with sensitive fields encrypted
     */
    public function encryptFields($modelName, $data) {
        if (!isset($this->_sensitiveFields[$modelName])) {
            return $data;
        }
        
        $fields = $this->_sensitiveFields[$modelName];
        
        foreach ($fields as $field) {
            if (isset($data[$field]) && !empty($data[$field])) {
                // Skip if already encrypted (check for base64 pattern)
                if (!$this->isEncrypted($data[$field])) {
                    $data[$field] = $this->encrypt($data[$field]);
                }
            }
        }
        
        return $data;
    }
    
    /**
     * Decrypt sensitive fields in a data array
     * 
     * @param string $modelName The model name
     * @param array $data The data array
     * @return array Data with sensitive fields decrypted
     */
    public function decryptFields($modelName, $data) {
        if (!isset($this->_sensitiveFields[$modelName])) {
            return $data;
        }
        
        $fields = $this->_sensitiveFields[$modelName];
        
        foreach ($fields as $field) {
            if (isset($data[$field]) && !empty($data[$field])) {
                if ($this->isEncrypted($data[$field])) {
                    $data[$field] = $this->decrypt($data[$field]);
                }
            }
        }
        
        return $data;
    }
    
    /**
     * Check if a value appears to be encrypted
     * 
     * @param string $value The value to check
     * @return bool
     */
    public function isEncrypted($value) {
        if (!is_string($value)) {
            return false;
        }
        
        // Check if it's valid base64 and has expected length for encrypted data
        $decoded = base64_decode($value, true);
        if ($decoded === false) {
            return false;
        }
        
        // Minimum length: IV + at least 1 byte + tag
        $minLength = self::IV_LENGTH + 1 + self::TAG_LENGTH;
        
        return strlen($decoded) >= $minLength;
    }
    
    /**
     * Get list of sensitive fields for a model
     * 
     * @param string $modelName The model name
     * @return array
     */
    public function getSensitiveFields($modelName) {
        return isset($this->_sensitiveFields[$modelName]) 
            ? $this->_sensitiveFields[$modelName] 
            : array();
    }
    
    /**
     * Hash a value for comparison (one-way)
     * 
     * @param string $value The value to hash
     * @return string Hashed value
     */
    public function hash($value) {
        return hash_hmac('sha256', $value, $this->_encryptionKey);
    }
    
    /**
     * Verify a hashed value
     * 
     * @param string $value The value to verify
     * @param string $hash The hash to compare
     * @return bool
     */
    public function verifyHash($value, $hash) {
        return hash_equals($this->hash($value), $hash);
    }
    
    /**
     * Generate a secure random token
     * 
     * @param int $length Token length
     * @return string
     */
    public function generateToken($length = 32) {
        return bin2hex(random_bytes($length / 2));
    }
}

/**
 * Behavior for automatic field encryption/decryption in Models
 * 
 * Usage:
 * 
 * class User extends AppModel {
 *     public $actsAs = array('Encryption' => array(
 *         'fields' => array('email', 'ssn', 'bank_account_number')
 *     ));
 * }
 */
App::uses('ModelBehavior', 'Model');
class EncryptionBehavior extends ModelBehavior {
    
    /**
     * Default configuration
     */
    protected $_defaults = array(
        'fields' => array(),
        'encrypted' => array()
    );
    
    /**
     * Setup the behavior
     * 
     * @param Model $model The model
     * @param array $config Configuration
     */
    public function setup(Model $model, $config = array()) {
        $this->_settings[$model->alias] = array_merge($this->_defaults, $config);
    }
    
    /**
     * Before find callback
     * 
     * @param Model $model The model
     * @param array $query The query
     * @return array Modified query
     */
    public function beforeFind(Model $model, $query) {
        return $query;
    }
    
    /**
     * After find callback - decrypt fields
     * 
     * @param Model $model The model
     * @param array $results The results
     * @param bool $primary Whether this is a primary find
     * @return array Decrypted results
     */
    public function afterFind(Model $model, $results, $primary = false) {
        $encryption = FieldEncryption::getInstance();
        $settings = $this->_settings[$model->alias];
        
        foreach ($results as &$result) {
            if (isset($result[$model->alias])) {
                foreach ($settings['fields'] as $field) {
                    if (isset($result[$model->alias][$field]) && !empty($result[$model->alias][$field])) {
                        if ($encryption->isEncrypted($result[$model->alias][$field])) {
                            $result[$model->alias][$field] = $encryption->decrypt($result[$model->alias][$field]);
                        }
                    }
                }
            }
        }
        
        return $results;
    }
    
    /**
     * Before save callback - encrypt fields
     * 
     * @param Model $model The model
     * @param array $options Options
     * @return bool True
     */
    public function beforeSave(Model $model, $options = array()) {
        $encryption = FieldEncryption::getInstance();
        $settings = $this->_settings[$model->alias];
        
        foreach ($settings['fields'] as $field) {
            if (isset($model->data[$model->alias][$field]) && !empty($model->data[$model->alias][$field])) {
                // Only encrypt if not already encrypted
                if (!$encryption->isEncrypted($model->data[$model->alias][$field])) {
                    $model->data[$model->alias][$field] = $encryption->encrypt($model->data[$model->alias][$field]);
                }
            }
        }
        
        return true;
    }
}
