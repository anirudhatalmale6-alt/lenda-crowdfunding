<?php
/**
 * SEC-013: HMAC Request Signing Component
 * 
 * Provides request signature verification for API security.
 * Implements HMAC-SHA256 request signing to prevent tampering.
 * 
 * Usage:
 *   $this->HmacSign->verify($request);
 *   $this->HmacSign->sign($data);
 */

App::uses('Component', 'Controller');

class HmacSignComponent extends Component {
    
    // HMAC algorithm
    const ALGORITHM = 'sha256';
    
    // Maximum age of request timestamp (5 minutes)
    const MAX_TIMESTAMP_AGE = 300;
    
    // Component settings
    protected $_settings = array(
        'apiSecret' => null,
        'headerSignature' => 'X-Request-Signature',
        'headerTimestamp' => 'X-Request-Timestamp',
        'headerNonce' => 'X-Request-Nonce',
        'enableTimestampCheck' => true,
        'enableNonceCheck' => true,
        'nonceCachePrefix' => 'hmac_nonce_',
    );
    
    /**
     * Initialize component
     */
    public function initialize(Controller $controller, $settings = array()) {
        $this->_settings = array_merge($this->_settings, $settings);
        
        // Load API secret from configuration
        if (empty($this->_settings['apiSecret'])) {
            $this->_settings['apiSecret'] = Configure::read('Security.apiSecret');
        }
    }
    
    /**
     * Verify request signature
     * 
     * @param CakeRequest $request
     * @return bool
     */
    public function verify($request) {
        $headers = $request->header(array(
            $this->_settings['headerSignature'],
            $this->_settings['headerTimestamp'],
            $this->_settings['headerNonce'],
        ));
        
        $signature = isset($headers[$this->_settings['headerSignature']]) 
            ? $headers[$this->_settings['headerSignature']] 
            : null;
        $timestamp = isset($headers[$this->_settings['headerTimestamp']]) 
            ? $headers[$this->_settings['headerTimestamp']] 
            : null;
        $nonce = isset($headers[$this->_settings['headerNonce']]) 
            ? $headers[$this->_settings['headerNonce']] 
            : null;
        
        // Check required headers
        if (empty($signature) || empty($timestamp) || empty($nonce)) {
            CakeLog::warning('HMAC: Missing required headers', 'security');
            return false;
        }
        
        // Verify timestamp is within acceptable window
        if ($this->_settings['enableTimestampCheck']) {
            $requestTime = intval($timestamp);
            $now = time();
            
            if (abs($now - $requestTime) > self::MAX_TIMESTAMP_AGE) {
                CakeLog::warning('HMAC: Request timestamp outside acceptable window', 'security');
                return false;
            }
        }
        
        // Verify nonce to prevent replay attacks
        if ($this->_settings['enableNonceCheck']) {
            if ($this->_isNonceUsed($nonce)) {
                CakeLog::warning('HMAC: Nonce already used (replay attack?)', 'security');
                return false;
            }
            $this->_storeNonce($nonce);
        }
        
        // Generate expected signature
        $expectedSignature = $this->generateSignature(
            $request->method(),
            $request->url(),
            $this->_getRequestData($request),
            $this->_settings['apiSecret'],
            $timestamp,
            $nonce
        );
        
        // Constant-time comparison
        return $this->_timingSafeEquals($signature, $expectedSignature);
    }
    
    /**
     * Generate HMAC signature for data
     * 
     * @param string $method
     * @param string $path
     * @param array $data
     * @param string $secret
     * @param string $timestamp
     * @param string $nonce
     * @return string
     */
    public function generateSignature($method, $path, $data = array(), $secret, $timestamp = null, $nonce = null) {
        if (empty($timestamp)) {
            $timestamp = time();
        }
        if (empty($nonce)) {
            $nonce = $this->_generateNonce();
        }
        
        // Sort and serialize data
        $sortedData = $this->_sortArray($data);
        $canonicalData = json_encode($sortedData);
        
        // Create string to sign
        $stringToSign = sprintf(
            '%s:%s:%d:%s:%s',
            strtoupper($method),
            $path,
            $timestamp,
            $nonce,
            $canonicalData
        );
        
        // Generate HMAC
        return hash_hmac(self::ALGORITHM, $stringToSign, $secret);
    }
    
    /**
     * Sign data for outgoing requests
     * 
     * @param array $data
     * @return array Signature headers
     */
    public function sign($data = array()) {
        $timestamp = time();
        $nonce = $this->_generateNonce();
        
        // Use current request if no path provided
        $request = Router::getRequest();
        $method = $request ? $request->method() : 'GET';
        $path = $request ? $request->url() : '/';
        
        $signature = $this->generateSignature(
            $method,
            $path,
            $data,
            $this->_settings['apiSecret'],
            $timestamp,
            $nonce
        );
        
        return array(
            $this->_settings['headerSignature'] => $signature,
            $this->_settings['headerTimestamp'] => strval($timestamp),
            $this->_settings['headerNonce'] => $nonce,
        );
    }
    
    /**
     * Get request data for signing
     * 
     * @param CakeRequest $request
     * @return array
     */
    protected function _getRequestData($request) {
        $data = array();
        
        // Get parsed body
        if ($request->is(array('post', 'put', 'patch'))) {
            $data = $request->data();
        }
        
        // Also include query string params
        if (!empty($request->query)) {
            $data = array_merge($data, $request->query);
        }
        
        return $data;
    }
    
    /**
     * Generate random nonce
     * 
     * @return string
     */
    protected function _generateNonce() {
        return bin2hex(random_bytes(16));
    }
    
    /**
     * Check if nonce was already used
     * 
     * @param string $nonce
     * @return bool
     */
    protected function _isNonceUsed($nonce) {
        $cacheKey = $this->_settings['nonceCachePrefix'] . $nonce;
        return Cache::read($cacheKey) !== false;
    }
    
    /**
     * Store nonce to prevent replay attacks
     * 
     * @param string $nonce
     */
    protected function _storeNonce($nonce) {
        $cacheKey = $this->_settings['nonceCachePrefix'] . $nonce;
        // Store for max timestamp age + 1 minute buffer
        Cache::write($cacheKey, true, (self::MAX_TIMESTAMP_AGE + 60) / 60);
    }
    
    /**
     * Sort array recursively
     * 
     * @param array $array
     * @return array
     */
    protected function _sortArray($array) {
        if (!is_array($array)) {
            return $array;
        }
        
        ksort($array);
        
        foreach ($array as $key => $value) {
            $array[$key] = $this->_sortArray($value);
        }
        
        return $array;
    }
    
    /**
     * Constant-time string comparison
     * 
     * @param string $expected
     * @param string $actual
     * @return bool
     */
    protected function _timingSafeEquals($expected, $actual) {
        if (strlen($expected) !== strlen($actual)) {
            return false;
        }
        
        $result = 0;
        $length = strlen($expected);
        
        for ($i = 0; $i < $length; $i++) {
            $result |= ord($expected[$i]) ^ ord($actual[$i]);
        }
        
        return $result === 0;
    }
}
