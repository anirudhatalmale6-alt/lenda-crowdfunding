<?php
/**
 * Security Configuration
 * 
 * Centralized security settings including JWT, encryption, and authentication
 * 
 * @package Lenda.Config
 */

/**
 * Security configuration class
 * All secrets MUST be loaded from environment variables in production
 */
class SecurityConfig {
    
    /**
     * JWT Secret Key
     * MUST be set via environment variable LENDA_JWT_SECRET
     * SEC-01 FIX: Strict validation - throw exception in production if not set
     */
    public static function getJWTSecret() {
        $secret = getenv('LENDA_JWT_SECRET');
        
        if (empty($secret)) {
            // SEC-01 FIX: Strict mode - fail if no secret in production
            if (self::isProduction()) {
                throw new Exception('CRITICAL SECURITY: JWT secret not configured. Set LENDA_JWT_SECRET environment variable.');
            }
            // Only allow insecure default in development
            error_log('WARNING: JWT secret not set via environment variable. Using insecure default for DEVELOPMENT ONLY.');
            return 'lenda_dev_secret_key_change_in_production';
        }
        
        // SEC-01 FIX: Validate minimum key length
        if (strlen($secret) < 32) {
            throw new Exception('JWT secret must be at least 32 characters for security.');
        }
        
        return $secret;
    }
    
    /**
     * JWT Algorithm
     */
    public static function getJWTAlgorithm() {
        return 'HS256';
    }
    
    /**
     * JWT Expiration time (in seconds)
     */
    public static function getJWTExpiration() {
        return 3600; // 1 hour
    }
    
    /**
     * JWT Refresh Token Expiration (in seconds)
     */
    public static function getJWTRefreshExpiration() {
        return 604800; // 7 days
    }
    
    /**
     * Encryption Key for field-level encryption
     * MUST be set via environment variable LENDA_ENCRYPTION_KEY
     */
    public static function getEncryptionKey() {
        $key = getenv('LENDA_ENCRYPTION_KEY');
        
        if (empty($key)) {
            error_log('WARNING: Encryption key not set via environment variable.');
            return null;
        }
        
        // Ensure key is 32 bytes for AES-256
        return hash('sha256', $key, true);
    }
    
    /**
     * Get encryption IV size
     */
    public static function getEncryptionIVSize() {
        return 16; // AES block size
    }
    
    /**
     * Password hashing algorithm
     */
    public static function getPasswordAlgorithm() {
        return PASSWORD_BCRYPT;
    }
    
    /**
     * Password hashing cost
     */
    public static function getPasswordCost() {
        return 12;
    }
    
    /**
     * Rate limiting settings
     */
    public static function getRateLimits() {
        return [
            'login' => [
                'max_attempts' => 5,
                'window' => 300, // 5 minutes
                'lockout' => 900 // 15 minutes
            ],
            'api' => [
                'max_requests' => 100,
                'window' => 60 // 1 minute
            ],
            'funding' => [
                'max_attempts' => 10,
                'window' => 3600 // 1 hour
            ]
        ];
    }
    
    /**
     * CORS settings
     */
    public static function getCORS() {
        return [
            'allowed_origins' => explode(',', getenv('LENDA_ALLOWED_ORIGINS') ?: '*'),
            'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With'],
            'expose_headers' => ['Content-Length', 'Content-Type'],
            'max_age' => 86400,
            'credentials' => true
        ];
    }
    
    /**
     * API Key configuration
     */
    public static function getAPIKeySettings() {
        return [
            'length' => 32,
            'prefix' => 'lenda_',
            'expiration_days' => 90
        ];
    }
    
    /**
     * Session configuration
     */
    public static function getSessionConfig() {
        return [
            'name' => 'LENDA_SESSION',
            'cookie_lifetime' => 0,
            'cookie_secure' => true,
            'cookie_httponly' => true,
            'cookie_samesite' => 'Strict',
            'gc_maxlifetime' => 3600
        ];
    }
    
    /**
     * TOTP 2FA settings
     */
    public static function getTOTPSettings() {
        return [
            'issuer' => 'LENDA',
            'digits' => 6,
            'period' => 30,
            'algorithm' => 'sha1'
        ];
    }
    
    /**
     * Check if running in production
     */
    public static function isProduction() {
        return getenv('LENDA_ENV') === 'production';
    }
    
    /**
     * FIN-02 FIX: Get reserve fund minimum from environment variable
     * Falls back to configurable default, not hardcoded value
     */
    public static function getReserveFundMinimum() {
        $minimum = getenv('RESERVE_FUND_MINIMUM');
        
        if (!empty($minimum) && is_numeric($minimum)) {
            return floatval($minimum);
        }
        
        // Return configurable default instead of hardcoded 500000
        // Default: 10% of typical loan portfolio
        return floatval(Configure::read('ReserveFund.minimum') ?: 100000);
    }
    
    /**
     * FIN-02 FIX: Get reserve fund target from environment variable
     */
    public static function getReserveFundTarget() {
        $target = getenv('RESERVE_FUND_TARGET');
        
        if (!empty($target) && is_numeric($target)) {
            return floatval($target);
        }
        
        return floatval(Configure::read('ReserveFund.target') ?: 1000000);
    }
    
    /**
     * FIN-01 FIX: Get origination fee percentage from environment variable
     */
    public static function getOriginationFeePercent() {
        $fee = getenv('ORIGINATION_FEE_PERCENT');
        
        if (!empty($fee) && is_numeric($fee)) {
            return floatval($fee);
        }
        
        return floatval(Configure::read('Fee.origination_percent') ?: 2.0);
    }
    
    /**
     * FIN-01 FIX: Get platform fee percentage from environment variable
     */
    public static function getPlatformFeePercent() {
        $fee = getenv('PLATFORM_FEE_PERCENT');
        
        if (!empty($fee) && is_numeric($fee)) {
            return floatval($fee);
        }
        
        return floatval(Configure::read('Fee.platform_percent') ?: 0.5);
    }
    
    /**
     * Get allowed file upload types
     */
    public static function getAllowedUploadTypes() {
        return [
            'image' => ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            'document' => ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
            'video' => ['mp4', 'webm']
        ];
    }
    
    /**
     * Get maximum upload size (in bytes)
     */
    public static function getMaxUploadSize() {
        return 10 * 1024 * 1024; // 10MB
    }
}

/**
 * Field-level encryption helper
 */
class FieldEncryption {
    
    /**
     * Encrypt a field value
     * 
     * @param string $value
     * @return string|null
     */
    public static function encrypt($value) {
        $key = SecurityConfig::getEncryptionKey();
        
        if (!$key || empty($value)) {
            return $value;
        }
        
        $iv = openssl_random_pseudo_bytes(16);
        $encrypted = openssl_encrypt($value, 'aes-256-cbc', $key, 0, $iv);
        
        // Return IV + encrypted data
        return base64_encode($iv . $encrypted);
    }
    
    /**
     * Decrypt a field value
     * 
     * @param string $encryptedValue
     * @return string|null
     */
    public static function decrypt($encryptedValue) {
        $key = SecurityConfig::getEncryptionKey();
        
        if (!$key || empty($encryptedValue)) {
            return $encryptedValue;
        }
        
        $data = base64_decode($encryptedValue);
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        
        return openssl_decrypt($encrypted, 'aes-256-cbc', $key, 0, $iv);
    }
    
    /**
     * Hash sensitive data (one-way)
     * 
     * @param string $value
     * @return string
     */
    public static function hash($value) {
        return hash('sha256', $value);
    }
}

/**
 * API Authentication helper
 */
class APIAuth {
    
    /**
     * Validate API key
     * 
     * @param string $apiKey
     * @return array
     */
    public static function validateAPIKey($apiKey) {
        App::uses('ApiKey', 'Model');
        $ApiKey = ClassRegistry::init('ApiKey');
        
        $key = $ApiKey->find('first', [
            'conditions' => [
                'ApiKey.key_value' => $apiKey,
                'ApiKey.status' => 'active'
            ]
        ]);
        
        if (!$key) {
            return ['valid' => false, 'message' => 'Invalid API key'];
        }
        
        // Check expiration
        $expires = new DateTime($key['ApiKey']['expires_at']);
        $now = new DateTime();
        
        if ($expires < $now) {
            return ['valid' => false, 'message' => 'API key expired'];
        }
        
        return [
            'valid' => true,
            'user_id' => $key['ApiKey']['user_id'],
            'permissions' => json_decode($key['ApiKey']['permissions'] ?? '[]', true)
        ];
    }
    
    /**
     * Generate secure API key
     * 
     * @return string
     */
    public static function generateAPIKey() {
        $config = SecurityConfig::getAPIKeySettings();
        return $config['prefix'] . bin2hex(random_bytes($config['length'] / 2));
    }
}
