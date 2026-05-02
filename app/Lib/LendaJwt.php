<?php
/**
 * LENDA Secure JWT Implementation with RS256 Asymmetric Signing
 * 
 * Provides RS256 (RSA Signature with SHA-256) signed JWT tokens for secure API authentication
 * Uses asymmetric key pair: private key for signing, public key for verification
 * 
 * @package Lenda
 * @subpackage Lib
 */

App::uses('Security', 'Utility');

class LendaJwt {
    
    /**
     * RSA Private Key (PEM format) - for signing tokens
     * @var string|null
     */
    private static $privateKey = null;
    
    /**
     * RSA Public Key (PEM format) - for verifying tokens
     * @var string|null
     */
    private static $publicKey = null;
    
    /**
     * Token expiration time in seconds (1 hour for access tokens)
     */
    const ACCESS_TOKEN_EXPIRATION = 3600;
    
    /**
     * Refresh token expiration (7 days)
     */
    const REFRESH_TOKEN_EXPIRATION = 604800;
    
    /**
     * Algorithm for signing - RS256 (RSA Signature with SHA-256)
     */
    const ALGORITHM = 'RS256';
    
    /**
     * Key directory for storing keys
     */
    const KEY_DIR = APP . 'Config' . DS . 'keys' . DS;
    
    /**
     * Initialize the RSA key pair
     */
    public static function init() {
        if (self::$privateKey === null || self::$publicKey === null) {
            self::loadOrGenerateKeys();
        }
        return array(
            'public' => self::$publicKey,
            'algorithm' => self::ALGORITHM
        );
    }
    
    /**
     * Load existing keys or generate new key pair
     */
    private static function loadOrGenerateKeys() {
        // SEC-01 FIX: Check for environment variables first
        $envPrivateKey = getenv('LENDA_JWT_PRIVATE_KEY');
        $envPublicKey = getenv('LENDA_JWT_PUBLIC_KEY');
        
        // Also check CakePHP Configure
        $configPrivateKey = Configure::read('Security.jwtPrivateKey');
        $configPublicKey = Configure::read('Security.jwtPublicKey');
        
        // Priority: Environment variables > Configure > File
        if (!empty($envPrivateKey) && !empty($envPublicKey)) {
            self::$privateKey = openssl_pkey_get_private($envPrivateKey);
            self::$publicKey = openssl_pkey_get_public($envPublicKey);
            
            if (self::$privateKey === false || self::$publicKey === false) {
                throw new Exception('Invalid JWT keys from environment variables');
            }
            return;
        }
        
        if (!empty($configPrivateKey) && !empty($configPublicKey)) {
            self::$privateKey = openssl_pkey_get_private($configPrivateKey);
            self::$publicKey = openssl_pkey_get_public($configPublicKey);
            
            if (self::$privateKey === false || self::$publicKey === false) {
                throw new Exception('Invalid JWT keys from configuration');
            }
            return;
        }
        
        // Fall back to file-based keys
        $privateKeyPath = self::KEY_DIR . 'jwt_private.pem';
        $publicKeyPath = self::KEY_DIR . 'jwt_public.pem';
        
        // Try to load existing keys
        if (file_exists($privateKeyPath) && file_exists($publicKeyPath)) {
            self::$privateKey = openssl_pkey_get_private(file_get_contents($privateKeyPath));
            self::$publicKey = openssl_pkey_get_public(file_get_contents($publicKeyPath));
            
            if (self::$privateKey === false || self::$publicKey === false) {
                // Keys exist but invalid, regenerate
                self::generateKeyPair($privateKeyPath, $publicKeyPath);
            }
        } else {
            // Generate new key pair
            self::generateKeyPair($privateKeyPath, $publicKeyPath);
        }
    }
    
    /**
     * Generate RSA key pair
     */
    private static function generateKeyPair($privateKeyPath, $publicKeyPath) {
        // Generate RSA key pair (2048-bit)
        $config = array(
            "private_key_bits" => 2048,
            "private_key_type" => OPENSSL_KEYTYPE_RSA,
        );
        
        $keyPair = openssl_pkey_new($config);
        
        if (!$keyPair) {
            throw new Exception('Failed to generate RSA key pair');
        }
        
        // Export private key
        openssl_pkey_export($keyPair, $privateKey);
        
        // Get public key
        $publicKeyDetails = openssl_pkey_get_details($keyPair);
        $publicKey = $publicKeyDetails['key'];
        
        // Ensure directory exists
        if (!is_dir(self::KEY_DIR)) {
            mkdir(self::KEY_DIR, 0700, true);
        }
        
        // Save keys with proper permissions
        file_put_contents($privateKeyPath, $privateKey);
        chmod($privateKeyPath, 0600); // Read/write for owner only
        
        file_put_contents($publicKeyPath, $publicKey);
        chmod($publicKeyPath, 0644);
        
        self::$privateKey = $keyPair;
        self::$publicKey = openssl_pkey_get_public($publicKey);
    }
    
    /**
     * Generate a signed JWT token with RS256
     * 
     * @param array $payload Token payload data
     * @param string $type Token type ('access' or 'refresh')
     * @return string JWT token
     */
    public static function generate($payload, $type = 'access') {
        self::init();
        
        // Set expiration based on token type
        $expiration = ($type === 'refresh') 
            ? self::REFRESH_TOKEN_EXPIRATION 
            : self::ACCESS_TOKEN_EXPIRATION;
        
        // Add standard claims
        $payload['iat'] = time();
        $payload['exp'] = time() + $expiration;
        $payload['jti'] = self::generateJti();
        $payload['type'] = $type;
        
        // Create JWT parts
        $header = self::base64UrlEncode(json_encode(array(
            'typ' => 'JWT',
            'alg' => self::ALGORITHM
        )));
        
        $payloadEncoded = self::base64UrlEncode(json_encode($payload));
        
        // Create RS256 signature
        $signature = self::sign($header . '.' . $payloadEncoded);
        
        return $header . '.' . $payloadEncoded . '.' . $signature;
    }
    
    /**
     * Generate refresh token (separate method for clarity)
     */
    public static function generateRefreshToken($userId, $email) {
        $payload = array(
            'sub' => $userId,
            'email' => $email,
            'type' => 'refresh'
        );
        
        return self::generate($payload, 'refresh');
    }
    
    /**
     * Verify and decode a JWT token
     * 
     * @param string $token JWT token to verify
     * @return array|false Decoded payload or false if invalid
     */
    public static function verify($token) {
        self::init();
        
        $parts = explode('.', $token);
        
        if (count($parts) !== 3) {
            return false;
        }
        
        list($header, $payload, $signature) = $parts;
        
        // Verify signature using RS256
        if (!self::verifySignature($header . '.' . $payload, $signature)) {
            return false;
        }
        
        // Decode header to check algorithm
        $headerData = json_decode(self::base64UrlDecode($header), true);
        if (!isset($headerData['alg']) || $headerData['alg'] !== self::ALGORITHM) {
            return false;
        }
        
        // Additional security check: reject tokens with 'none' algorithm or unsupported algorithms
        $allowedAlgorithms = array('RS256', 'RS384', 'RS512');
        if (!in_array($headerData['alg'], $allowedAlgorithms)) {
            return false;
        }
        
        // Decode and verify payload
        $payloadData = json_decode(self::base64UrlDecode($payload), true);
        
        if (!$payloadData) {
            return false;
        }
        
        // SEC-003 FIX: Check if token is blacklisted
        if (isset($payloadData['jti']) && self::isBlacklisted($payloadData['jti'])) {
            return false;
        }
        
        // Check expiration
        if (isset($payloadData['exp']) && $payloadData['exp'] < time()) {
            return false;
        }
        
        // Check not before
        if (isset($payloadData['nbf']) && $payloadData['nbf'] > time()) {
            return false;
        }
        
        // Check token type
        if (isset($payloadData['type']) && $payloadData['type'] === 'refresh') {
            // For refresh tokens, only allow in specific contexts
            return false;
        }
        
        return $payloadData;
    }
    
    /**
     * Verify refresh token
     */
    public static function verifyRefreshToken($token) {
        self::init();
        
        $parts = explode('.', $token);
        
        if (count($parts) !== 3) {
            return false;
        }
        
        list($header, $payload, $signature) = $parts;
        
        // Verify signature
        if (!self::verifySignature($header . '.' . $payload, $signature)) {
            return false;
        }
        
        // Decode payload
        $payloadData = json_decode(self::base64UrlDecode($payload), true);
        
        if (!$payloadData) {
            return false;
        }
        
        // Verify it's a refresh token
        if (!isset($payloadData['type']) || $payloadData['type'] !== 'refresh') {
            return false;
        }
        
        // Check expiration
        if (isset($payloadData['exp']) && $payloadData['exp'] < time()) {
            return false;
        }
        
        return $payloadData;
    }
    
    /**
     * Generate a unique JWT ID
     */
    private static function generateJti() {
        return bin2hex(random_bytes(16));
    }
    
    /**
     * Create RS256 signature using private key
     */
    private static function sign($data) {
        $signature = '';
        
        $success = openssl_sign($data, $signature, self::$privateKey, OPENSSL_ALGO_SHA256);
        
        if (!$success) {
            throw new Exception('Failed to sign JWT token');
        }
        
        return self::base64UrlEncode($signature);
    }
    
    /**
     * Verify RS256 signature using public key
     */
    private static function verifySignature($data, $signature) {
        $signatureDecoded = self::base64UrlDecode($signature);
        
        return openssl_verify($data, $signatureDecoded, self::$publicKey, OPENSSL_ALGO_SHA256) === 1;
    }
    
    /**
     * Base64 URL encode (JWT standard)
     */
    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    /**
     * Base64 URL decode (JWT standard)
     */
    private static function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }
    
    /**
     * Get public key (for external verification)
     */
    public static function getPublicKey() {
        self::init();
        
        $keyDetails = openssl_pkey_get_details(self::$publicKey);
        return $keyDetails['key'];
    }
    
    /**
     * Refresh an existing access token using refresh token
     */
    public static function refresh($refreshToken) {
        $payload = self::verifyRefreshToken($refreshToken);
        
        if (!$payload) {
            return false;
        }
        
        // Generate new access token
        $newPayload = array(
            'sub' => $payload['sub'],
            'email' => $payload['email'],
            'type' => 'access'
        );
        
        return self::generate($newPayload, 'access');
    }
    
    /**
     * Token blacklist cache (for production, use Redis)
     * @var array
     */
    private static $tokenBlacklist = array();
    
    /**
     * Get Redis configuration from environment
     * @return array
     */
    private static function getRedisConfig() {
        return array(
            'host' => getenv('LENDA_REDIS_HOST') ?: '127.0.0.1',
            'port' => getenv('LENDA_REDIS_PORT') ?: 6379,
            'password' => getenv('LENDA_REDIS_PASSWORD') ?: null,
            'database' => getenv('LENDA_REDIS_DATABASE') ?: 0
        );
    }
    
    /**
     * Initialize Redis connection for token blacklist
     */
    private static function initRedis() {
        // Try to use Redis if available
        if (class_exists('Redis')) {
            try {
                $config = self::getRedisConfig();
                $redis = new Redis();
                $redis->connect($config['host'], $config['port']);
                if ($config['password']) {
                    $redis->auth($config['password']);
                }
                if ($config['database']) {
                    $redis->select($config['database']);
                }
                return $redis;
            } catch (Exception $e) {
                // Fall back to in-memory
            }
        }
        return null;
    }
    
    /**
     * Invalidate token by adding to blacklist
     * 
     * @param string $token Token to invalidate
     * @return bool
     */
    public static function invalidate($token) {
        try {
            // Decode token to get JTI and expiration
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return false;
            }
            
            $payload = json_decode(self::base64UrlDecode($parts[1]), true);
            
            if (!$payload || !isset($payload['jti']) || !isset($payload['exp'])) {
                return false;
            }
            
            $jti = $payload['jti'];
            $exp = $payload['exp'];
            $ttl = $exp - time();
            
            if ($ttl <= 0) {
                // Token already expired
                return true;
            }
            
            // Try Redis first, fall back to in-memory
            $redis = self::initRedis();
            
            if ($redis) {
                // Store in Redis with TTL
                $redis->setex('jwt_blacklist:' . $jti, $ttl, '1');
            } else {
                // In-memory fallback (not recommended for production)
                self::$tokenBlacklist[$jti] = array(
                    'expires' => time() + $ttl
                );
            }
            
            return true;
        } catch (Exception $e) {
            CakeLog::write('error', 'JWT invalidate error: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Check if token is blacklisted
     * 
     * @param string $jti JWT ID
     * @return bool
     */
    private static function isBlacklisted($jti) {
        // Try Redis first
        $redis = self::initRedis();
        
        if ($redis) {
            return $redis->exists('jwt_blacklist:' . $jti);
        }
        
        // In-memory fallback
        if (isset(self::$tokenBlacklist[$jti])) {
            // Clean up expired entries
            if (self::$tokenBlacklist[$jti]['expires'] < time()) {
                unset(self::$tokenBlacklist[$jti]);
                return false;
            }
            return true;
        }
        
        return false;
    }
    
    /**
     * Clean up expired entries from in-memory blacklist
     */
    private static function cleanupBlacklist() {
        $now = time();
        foreach (self::$tokenBlacklist as $jti => $entry) {
            if ($entry['expires'] < $now) {
                unset(self::$tokenBlacklist[$jti]);
            }
        }
    }
    
    /**
     * Get token expiration time
     */
    public static function getAccessTokenExpiration() {
        return self::ACCESS_TOKEN_EXPIRATION;
    }
    
    /**
     * Decode token without verification (for debugging)
     */
    public static function decode($token) {
        $parts = explode('.', $token);
        
        if (count($parts) !== 3) {
            return false;
        }
        
        return array(
            'header' => json_decode(self::base64UrlDecode($parts[0]), true),
            'payload' => json_decode(self::base64UrlDecode($parts[1]), true),
            'signature' => $parts[2]
        );
    }
}
