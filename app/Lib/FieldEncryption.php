<?php
/**
 * Field-Level Encryption for PII (SEC-14, SEC-15)
 * 
 * Provides encryption/decryption for sensitive personal data
 * Uses AES-256-GCM for authenticated encryption
 * 
 * @package Lenda
 * @subpackage Lib
 */

App::uses('Security', 'Utility');

class FieldEncryption {
    
    /**
     * Encryption key (should be stored in environment variable)
     * @var string
     */
    private static $encryptionKey = null;
    
    /**
     * Initialize encryption key
     */
    private static function init() {
        if (self::$encryptionKey === null) {
            // SEC-14 FIX: Check environment variable first
            $key = getenv('LENDA_FIELD_ENCRYPTION_KEY');
            
            if (empty($key)) {
                // Try Configure as fallback
                $key = Configure::read('Security.fieldEncryptionKey');
            }
            
            if (empty($key)) {
                // Generate a secure key if not configured (for development only)
                $key = bin2hex(random_bytes(32));
                Configure::write('Security.fieldEncryptionKey', $key);
                trigger_error('Field encryption key not configured. Generated temporary key for development.', E_USER_WARNING);
            }
            
            // Derive proper key for AES-256
            self::$encryptionKey = hash('sha256', $key, true);
        }
        
        return self::$encryptionKey;
    }
    
    /**
     * Encrypt sensitive field value
     * 
     * @param string $value Value to encrypt
     * @param string $fieldName Name of field (for audit)
     * @return string Encrypted value (base64 encoded)
     */
    public static function encrypt($value, $fieldName = '') {
        if (empty($value)) {
            return $value;
        }
        
        self::init();
        
        // Generate random IV
        $iv = random_bytes(16);
        
        // Encrypt using AES-256-GCM (provides authentication)
        $encrypted = openssl_encrypt(
            $value,
            'aes-256-gcm',
            self::$encryptionKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        
        if ($encrypted === false) {
            throw new Exception('Encryption failed: ' . openssl_error_string());
        }
        
        // Combine IV + encrypted data + authentication tag
        $result = $iv . $tag . $encrypted;
        
        // Return base64 encoded
        return base64_encode($result);
    }
    
    /**
     * Decrypt sensitive field value
     * 
     * @param string $encryptedValue Encrypted value (base64 encoded)
     * @return string Decrypted value
     */
    public static function decrypt($encryptedValue) {
        if (empty($encryptedValue)) {
            return $encryptedValue;
        }
        
        // Check if value is actually encrypted (starts with encrypted marker)
        // This allows for backward compatibility
        $decoded = base64_decode($encryptedValue, true);
        if ($decoded === false || strlen($decoded) < 33) {
            // Not a properly encrypted value, return as-is
            return $encryptedValue;
        }
        
        self::init();
        
        // Extract IV (16 bytes), tag (16 bytes), and ciphertext
        $iv = substr($decoded, 0, 16);
        $tag = substr($decoded, 16, 16);
        $ciphertext = substr($decoded, 32);
        
        // Decrypt
        $decrypted = openssl_decrypt(
            $ciphertext,
            'aes-256-gcm',
            self::$encryptionKey,
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
     * Encrypt PII fields in an array
     * 
     * @param array $data Data array
     * @param array $fields Fields to encrypt
     * @return array Data with encrypted fields
     */
    public static function encryptFields($data, $fields) {
        foreach ($fields as $field) {
            if (isset($data[$field]) && !empty($data[$field])) {
                $data[$field] = self::encrypt($data[$field], $field);
            }
        }
        
        return $data;
    }
    
    /**
     * Decrypt PII fields in an array
     * 
     * @param array $data Data array
     * @param array $fields Fields to decrypt
     * @return array Data with decrypted fields
     */
    public static function decryptFields($data, $fields) {
        foreach ($fields as $field) {
            if (isset($data[$field]) && !empty($data[$field])) {
                try {
                    $data[$field] = self::decrypt($data[$field]);
                } catch (Exception $e) {
                    // If decryption fails, keep original value
                    // (might be legacy unencrypted data)
                }
            }
        }
        
        return $data;
    }
    
    /**
     * Hash sensitive data (one-way)
     * 
     * @param string $value Value to hash
     * @return string Hashed value
     */
    public static function hash($value) {
        if (empty($value)) {
            return $value;
        }
        
        return hash('sha256', $value);
    }
    
    /**
     * Mask sensitive data for display
     * 
     * @param string $value Value to mask
     * @param int $visibleChars Number of visible characters at end
     * @return string Masked value
     */
    public static function mask($value, $visibleChars = 4) {
        if (empty($value)) {
            return $value;
        }
        
        $length = strlen($value);
        
        if ($length <= $visibleChars) {
            return str_repeat('*', $length);
        }
        
        $masked = str_repeat('*', $length - $visibleChars);
        $visible = substr($value, -$visibleChars);
        
        return $masked . $visible;
    }
    
    /**
     * Mask email address
     * 
     * @param string $email Email to mask
     * @return string Masked email
     */
    public static function maskEmail($email) {
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $email;
        }
        
        $parts = explode('@', $email);
        $username = $parts[0];
        $domain = $parts[1];
        
        // Mask username
        $usernameLength = strlen($username);
        if ($usernameLength <= 2) {
            $maskedUsername = str_repeat('*', $usernameLength);
        } else {
            $maskedUsername = $username[0] . str_repeat('*', $usernameLength - 2) . $username[$usernameLength - 1];
        }
        
        return $maskedUsername . '@' . $domain;
    }
    
    /**
     * Mask phone number
     * 
     * @param string $phone Phone number to mask
     * @return string Masked phone
     */
    public static function maskPhone($phone) {
        if (empty($phone)) {
            return $phone;
        }
        
        // Keep only last 4 digits visible
        $length = strlen(preg_replace('/[^0-9]/', '', $phone));
        
        if ($length <= 4) {
            return str_repeat('*', $length);
        }
        
        return str_repeat('*', $length - 4) . substr($phone, -4);
    }
    
    /**
     * PII fields that should be encrypted
     */
    const PII_FIELDS = array(
        'first_name',
        'last_name',
        'phone',
        'date_of_birth',
        'national_id',
        'passport_number',
        'drivers_license',
        'address',
        'city',
        'state',
        'postal_code',
        'bank_account',
        'routing_number',
        'ssn'
    );
    
    /**
     * Masked PII fields for API responses
     */
    const MASKED_FIELDS = array(
        'email' => 'maskEmail',
        'phone' => 'maskPhone',
        'national_id' => 'mask',
        'bank_account' => 'mask'
    );
}
