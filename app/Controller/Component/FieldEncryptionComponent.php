<?php
/**
 * SEC-014: Field Encryption Component
 * 
 * Provides encryption for sensitive PII fields (SSN, bank accounts)
 * Uses AES-256-GCM for authenticated encryption
 * 
 * @package Lenda
 * @subpackage Controller/Component
 */

App::uses('Component', 'Controller');

class FieldEncryptionComponent extends Component {
    
    /**
     * Encryption configuration
     */
    const ALGORITHM = 'aes-256-gcm';
    const IV_LENGTH = 12; // 96 bits for GCM
    const TAG_LENGTH = 16; // 128 bits
    
    /**
     * Components
     */
    public $Controller;
    
    /**
     * Encryption key (should be from secure config in production)
     */
    protected $_encryptionKey;
    
    /**
     * Initialize component
     */
    public function initialize(Controller $controller, $settings = array()) {
        $this->Controller = $controller;
        
        // Get encryption key from configuration
        $this->_encryptionKey = Configure::read('Security.fieldEncryptionKey');
        
        // Generate key from master key if not set
        if (empty($this->_encryptionKey)) {
            $masterKey = Configure::read('Security.masterKey');
            if (empty($masterKey)) {
                $masterKey = Configure::read('Security.salt');
            }
            $this->_encryptionKey = hash('sha256', $masterKey, true);
        }
    }
    
    /**
     * SEC-014: Encrypt a sensitive field
     * 
     * @param string $plaintext The value to encrypt
     * @return string Base64 encoded encrypted value (IV + ciphertext + tag)
     */
    public function encrypt($plaintext) {
        if (empty($plaintext)) {
            return null;
        }
        
        // Generate random IV
        $iv = random_bytes(self::IV_LENGTH);
        
        // Encrypt using AES-256-GCM
        $tag = '';
        $ciphertext = openssl_encrypt(
            $plaintext,
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
     * SEC-014: Decrypt a sensitive field
     * 
     * @param string $encryptedData Base64 encoded encrypted value
     * @return string Decrypted plaintext
     */
    public function decrypt($encryptedData) {
        if (empty($encryptedData)) {
            return null;
        }
        
        // Decode from base64
        $data = base64_decode($encryptedData);
        
        if ($data === false) {
            throw new Exception('Invalid encrypted data');
        }
        
        // Extract IV, ciphertext, and tag
        $iv = substr($data, 0, self::IV_LENGTH);
        $tag = substr($data, -self::TAG_LENGTH);
        $ciphertext = substr($data, self::IV_LENGTH, -self::TAG_LENGTH);
        
        // Decrypt
        $plaintext = openssl_decrypt(
            $ciphertext,
            self::ALGORITHM,
            $this->_encryptionKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        
        if ($plaintext === false) {
            throw new Exception('Decryption failed: ' . openssl_error_string());
        }
        
        return $plaintext;
    }
    
    /**
     * SEC-014: Encrypt and store sensitive user data
     * 
     * @param int $userId User ID
     * @param array $data Sensitive data to encrypt
     * @return bool Success
     */
    public function encryptUserFields($userId, $data) {
        App::import('Model', 'User');
        $this->User = new User();
        
        $updateData = array();
        
        // Encrypt SSN
        if (isset($data['ssn'])) {
            $updateData['encrypted_ssn'] = $this->encrypt($data['ssn']);
        }
        
        // Encrypt bank account number
        if (isset($data['bank_account'])) {
            $updateData['encrypted_bank_account'] = $this->encrypt($data['bank_account']);
        }
        
        // Encrypt routing number
        if (isset($data['routing_number'])) {
            $updateData['encrypted_routing_number'] = $this->encrypt($data['routing_number']);
        }
        
        // Generate and store IV for this user
        $updateData['encryption_iv'] = bin2hex(random_bytes(16));
        
        if (empty($updateData)) {
            return true;
        }
        
        $this->User->id = $userId;
        return $this->User->save($updateData, false, array_keys($updateData));
    }
    
    /**
     * SEC-014: Decrypt sensitive user data
     * 
     * @param int $userId User ID
     * @param array $fields Fields to decrypt
     * @return array Decrypted data
     */
    public function decryptUserFields($userId, $fields = array('ssn', 'bank_account', 'routing_number')) {
        App::import('Model', 'User');
        $this->User = new User();
        
        $user = $this->User->findById($userId);
        
        if (empty($user)) {
            return array();
        }
        
        $decrypted = array();
        
        foreach ($fields as $field) {
            switch ($field) {
                case 'ssn':
                    if (!empty($user['User']['encrypted_ssn'])) {
                        $decrypted['ssn'] = $this->decrypt($user['User']['encrypted_ssn']);
                        // Mask SSN for display
                        $decrypted['ssn_masked'] = '***-**-' . substr($decrypted['ssn'], -4);
                    }
                    break;
                    
                case 'bank_account':
                    if (!empty($user['User']['encrypted_bank_account'])) {
                        $decrypted['bank_account'] = $this->decrypt($user['User']['encrypted_bank_account']);
                        // Mask bank account for display
                        $decrypted['bank_account_masked'] = '****' . substr($decrypted['bank_account'], -4);
                    }
                    break;
                    
                case 'routing_number':
                    if (!empty($user['User']['encrypted_routing_number'])) {
                        $decrypted['routing_number'] = $this->decrypt($user['User']['encrypted_routing_number']);
                        // Mask routing number for display
                        $decrypted['routing_number_masked'] = '****' . substr($decrypted['routing_number'], -4);
                    }
                    break;
            }
        }
        
        return $decrypted;
    }
    
    /**
     * SEC-014: Hash data for comparison (not encryption)
     * 
     * @param string $data Data to hash
     * @return string Hash
     */
    public function hash($data) {
        return hash('sha256', $data);
    }
    
    /**
     * SEC-014: Securely compare two values (timing-safe)
     * 
     * @param string $a First value
     * @param string $b Second value
     * @return bool True if equal
     */
    public function secureCompare($a, $b) {
        return hash_equals($a, $b);
    }
}
