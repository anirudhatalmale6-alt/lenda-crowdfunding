<?php
/**
 * LENDA Rate Limiting Component
 * 
 * Implements API rate limiting to prevent abuse and DoS attacks
 * Uses PHP sessions for simplicity (should use Redis/Memcached in production)
 * 
 * SEC-004: Enhanced with stricter limits per security audit recommendations
 * - Auth endpoints: 50 attempts per 15 minutes
 * - Write operations: 30 attempts per minute
 * - Default: 60 attempts per minute
 * 
 * @package Lenda
 * @subpackage Controller/Component
 */

App::uses('Component', 'Controller');

class RateLimitComponent extends Component {
    
    /**
     * SEC-004: Default rate limit settings - Updated per security audit
     */
    const DEFAULT_LIMIT = 60;        // requests per window
    const DEFAULT_WINDOW = 60;         // window in seconds
    const AUTH_LIMIT = 50;            // SEC-004: login attempts per window (50 per 15min)
    const AUTH_WINDOW = 900;          // SEC-004: 15 minutes in seconds
    
    /**
     * Components
     */
    public $Controller;
    
    /**
     * SEC-004: Rate limit configurations by endpoint type - Updated
     */
    protected $_limits = array(
        'default' => array('limit' => 60, 'window' => 60),       // 60 req/min
        'auth' => array('limit' => 50, 'window' => 900),          // SEC-004: 50 req/15min
        'login' => array('limit' => 50, 'window' => 900),          // SEC-004: 50 login attempts/15min
        'write' => array('limit' => 30, 'window' => 60),           // 30 writes/min
        'upload' => array('limit' => 10, 'window' => 60),           // SEC-010: 10 uploads/min
        'admin' => array('limit' => 100, 'window' => 60),          // 100 admin req/min
        'kyc' => array('limit' => 5, 'window' => 3600),            // SEC-006: 5 KYC uploads/hour
    );
    
    /**
     * Initialize component
     * 
     * @param Controller $controller
     * @param array $settings
     */
    public function initialize(Controller $controller, $settings = array()) {
        $this->Controller = $controller;
    }
    
    /**
     * Check if request is within rate limit
     * 
     * @param string $type Rate limit type (default, auth, write, admin)
     * @param string $identifier Custom identifier (defaults to IP + User Agent)
     * @return bool True if within limit, false if exceeded
     */
    public function check($type = 'default', $identifier = null) {
        $config = isset($this->_limits[$type]) ? $this->_limits[$type] : $this->_limits['default'];
        
        if ($identifier === null) {
            $identifier = $this->getIdentifier();
        }
        
        $key = $this->getCacheKey($type, $identifier);
        
        return $this->isAllowed($key, $config['limit'], $config['window']);
    }
    
    /**
     * Get rate limit info for response headers
     * 
     * @param string $type Rate limit type
     * @param string $identifier Custom identifier
     * @return array Limit info (remaining, reset, limit)
     */
    public function getLimitInfo($type = 'default', $identifier = null) {
        $config = isset($this->_limits[$type]) ? $this->_limits[$type] : $this->_limits['default'];
        
        if ($identifier === null) {
            $identifier = $this->getIdentifier();
        }
        
        $key = $this->getCacheKey($type, $identifier);
        $data = $this->getRateData($key);
        
        $now = time();
        $reset = isset($data['reset']) ? $data['reset'] : ($now + $config['window']);
        $used = isset($data['count']) ? $data['count'] : 0;
        $remaining = max(0, $config['limit'] - $used);
        
        return array(
            'limit' => $config['limit'],
            'remaining' => $remaining,
            'reset' => $reset,
            'retry_after' => max(0, $reset - $now)
        );
    }
    
    /**
     * Apply rate limit - returns error response if exceeded
     * 
     * @param string $type Rate limit type
     * @param string $identifier Custom identifier
     * @param bool $sendHeaders Whether to send rate limit headers
     * @return bool True if allowed, false if rate limited
     */
    public function apply($type = 'default', $identifier = null, $sendHeaders = true) {
        $config = isset($this->_limits[$type]) ? $this->_limits[$type] : $this->_limits['default'];
        
        if ($identifier === null) {
            $identifier = $this->getIdentifier();
        }
        
        $key = $this->getCacheKey($type, $identifier);
        
        if (!$this->isAllowed($key, $config['limit'], $config['window'])) {
            if ($sendHeaders) {
                $this->sendRateLimitHeaders($key, $config['limit'], $config['window']);
            }
            return false;
        }
        
        if ($sendHeaders) {
            $this->sendRateLimitHeaders($key, $config['limit'], $config['window']);
        }
        
        return true;
    }
    
    /**
     * Get unique identifier for rate limiting
     * 
     * @return string
     */
    protected function getIdentifier() {
        // Use IP + User Agent for anonymous requests
        $ip = $this->getClientIp();
        $userAgent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
        
        // If user is logged in, use user ID for more personalized limits
        if (isset($this->Controller->Auth) && $this->Controller->Auth->user('id')) {
            return 'user_' . $this->Controller->Auth->user('id');
        }
        
        return 'ip_' . md5($ip . $userAgent);
    }
    
    /**
     * Get client IP address
     * 
     * @return string
     */
    protected function getClientIp() {
        $ip = '';
        
        // Check for proxy forwarded IPs
        if (isset($_SERVER['HTTP_X_FORWARDED_FOR']) && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            $ip = trim($ips[0]);
        } elseif (isset($_SERVER['HTTP_X_REAL_IP']) && !empty($_SERVER['HTTP_X_REAL_IP'])) {
            $ip = $_SERVER['HTTP_X_REAL_IP'];
        } elseif (isset($_SERVER['REMOTE_ADDR'])) {
            $ip = $_SERVER['REMOTE_ADDR'];
        }
        
        // Validate IP
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            $ip = '127.0.0.1';
        }
        
        return $ip;
    }
    
    /**
     * Generate cache key for rate limiting
     * 
     * @param string $type
     * @param string $identifier
     * @return string
     */
    protected function getCacheKey($type, $identifier) {
        return 'rate_limit_' . $type . '_' . md5($identifier);
    }
    
    /**
     * Get rate limit data from storage
     * 
     * @param string $key
     * @return array
     */
    protected function getRateData($key) {
        // Use CakePHP cache
        $data = Cache::read($key, 'rate_limit');
        
        if ($data === false) {
            return array('count' => 0, 'reset' => time() + 60);
        }
        
        return $data;
    }
    
    /**
     * Save rate limit data
     * 
     * @param string $key
     * @param array $data
     * @param int $ttl
     */
    protected function saveRateData($key, $data, $ttl) {
        Cache::write($key, $data, array(
            'config' => 'rate_limit',
            'duration' => $ttl
        ));
    }
    
    /**
     * Check if request is allowed
     * 
     * @param string $key
     * @param int $limit
     * @param int $window
     * @return bool
     */
    protected function isAllowed($key, $limit, $window) {
        $now = time();
        $data = $this->getRateData($key);
        
        // Check if window has expired
        if (!isset($data['reset']) || $data['reset'] < $now) {
            // Reset counter
            $data = array(
                'count' => 1,
                'reset' => $now + $window
            );
            $this->saveRateData($key, $data, $window);
            return true;
        }
        
        // Check if limit exceeded
        if ($data['count'] >= $limit) {
            return false;
        }
        
        // Increment counter
        $data['count']++;
        $this->saveRateData($key, $data, $data['reset'] - $now);
        
        return true;
    }
    
    /**
     * Send rate limit headers
     * 
     * @param string $key
     * @param int $limit
     * @param int $window
     */
    protected function sendRateLimitHeaders($key, $limit, $window) {
        $data = $this->getRateData($key);
        $now = time();
        
        $reset = isset($data['reset']) ? $data['reset'] : ($now + $window);
        $used = isset($data['count']) ? $data['count'] : 0;
        $remaining = max(0, $limit - $used);
        
        header('X-RateLimit-Limit: ' . $limit);
        header('X-RateLimit-Remaining: ' . $remaining);
        header('X-RateLimit-Reset: ' . $reset);
    }
    
    /**
     * Reset rate limit for an identifier
     * 
     * @param string $type
     * @param string $identifier
     */
    public function reset($type = 'default', $identifier = null) {
        if ($identifier === null) {
            $identifier = $this->getIdentifier();
        }
        
        $key = $this->getCacheKey($type, $identifier);
        Cache::delete($key, 'rate_limit');
    }
    
    /**
     * Set custom rate limit for endpoint type
     * 
     * @param string $type
     * @param int $limit
     * @param int $window
     */
    public function setLimit($type, $limit, $window) {
        $this->_limits[$type] = array(
            'limit' => (int) $limit,
            'window' => (int) $window
        );
    }
}

/**
 * Rate Limit Exception
 */
class RateLimitException extends Exception {
    public function __construct($message = 'Rate limit exceeded', $code = 429) {
        parent::__construct($message, $code);
    }
}
