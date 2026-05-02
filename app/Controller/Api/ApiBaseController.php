<?php
App::uses("AppController", "Controller");
App::uses('ApiErrorCodes', 'Lib');

/**
 * ApiBaseController Trait
 * Provides common functionality for all API controllers including:
 * - Transaction handling
 * - Error handling
 * - API consistency
 * - Response formatting
 * - Rate limiting
 * - API key authentication
 * - Request signing
 */
trait ApiBaseControllerTrait {
    
    /**
     * Rate limit configurations by endpoint type
     */
    protected $_apiRateLimits = array(
        'default' => array('limit' => 60, 'window' => 60),
        'auth' => array('limit' => 10, 'window' => 300),
        'write' => array('limit' => 30, 'window' => 60),
        'read' => array('limit' => 120, 'window' => 60),
        'critical' => array('limit' => 5, 'window' => 60),
        'admin' => array('limit' => 100, 'window' => 60),
    );
    
    /**
     * Get database connection for transactions
     */
    protected function _getDb() {
        return ConnectionManager::getDataSource('default');
    }
    
    /**
     * Check rate limit before processing request
     * 
     * @param string $type Rate limit type
     * @return bool True if allowed, false if rate limited
     */
    protected function _checkRateLimit($type = 'default') {
        $config = isset($this->_apiRateLimits[$type]) ? $this->_apiRateLimits[$type] : $this->_apiRateLimits['default'];
        
        // Use user ID if authenticated, otherwise use IP
        $identifier = $this->_getRateLimitIdentifier();
        
        $key = 'api_rate_limit_' . $type . '_' . md5($identifier);
        
        return $this->_applyRateLimit($key, $config['limit'], $config['window']);
    }
    
    /**
     * Get rate limit identifier
     */
    protected function _getRateLimitIdentifier() {
        // Try to get authenticated user ID first
        $userId = $this->_getCurrentUserId();
        if ($userId) {
            return 'user_' . $userId;
        }
        
        // Fall back to IP address
        return 'ip_' . $this->request->clientIp();
    }
    
    /**
     * Apply rate limit
     */
    protected function _applyRateLimit($key, $limit, $window) {
        $now = time();
        $cacheKey = $key;
        
        // Use Cache for rate limiting
        $data = Cache::read($cacheKey, 'api_rate_limit');
        
        if ($data === false) {
            $data = array('count' => 1, 'reset' => $now + $window);
        } else {
            // Check if window has expired
            if ($data['reset'] < $now) {
                $data = array('count' => 1, 'reset' => $now + $window);
            } else {
                // Check if limit exceeded
                if ($data['count'] >= $limit) {
                    $this->_sendRateLimitHeaders($limit, max(0, $data['reset'] - $now), $data['count']);
                    return false;
                }
                $data['count']++;
            }
        }
        
        Cache::write($cacheKey, $data, array('config' => 'api_rate_limit', 'duration' => $window));
        
        $this->_sendRateLimitHeaders($limit, max(0, $data['reset'] - $now), $data['count']);
        return true;
    }
    
    /**
     * Send rate limit headers
     */
    protected function _sendRateLimitHeaders($limit, $retryAfter, $used) {
        header('X-RateLimit-Limit: ' . $limit);
        header('X-RateLimit-Remaining: ' . max(0, $limit - $used));
        header('X-RateLimit-Reset: ' . (time() + $retryAfter));
        header('Retry-After: ' . $retryAfter);
    }
    
    /**
     * Enforce rate limit for critical endpoints
     * Call this in beforeFilter of critical controllers
     */
    protected function _enforceRateLimit($type = 'default') {
        if (!$this->_checkRateLimit($type)) {
            $this->_errorResponse('Rate limit exceeded. Please try again later.', 429);
            exit;
        }
    }
    
    /**
     * Validate API key for service accounts (SEC-11)
     */
    protected function _validateApiKey() {
        $headers = getallheaders();
        $apiKey = isset($headers['X-API-Key']) ? $headers['X-API-Key'] : '';
        
        if (empty($apiKey)) {
            return false;
        }
        
        // Validate API key from database
        App::uses('ApiKey', 'Model');
        $ApiKey = ClassRegistry::init('ApiKey');
        
        $keyData = $ApiKey->find('first', array(
            'conditions' => array(
                'ApiKey.key' => $apiKey,
                'ApiKey.is_active' => 1
            ),
            'recursive' => -1
        ));
        
        if (!$keyData) {
            return false;
        }
        
        // Check expiration
        if (!empty($keyData['ApiKey']['expires_at']) && 
            strtotime($keyData['ApiKey']['expires_at']) < time()) {
            return false;
        }
        
        return $keyData;
    }
    
    /**
     * Validate request HMAC signature (SEC-12)
     */
    protected function _validateRequestSignature($secret) {
        $headers = getallheaders();
        $signature = isset($headers['X-Signature']) ? $headers['X-Signature'] : '';
        $timestamp = isset($headers['X-Timestamp']) ? $headers['X-Timestamp'] : '';
        
        if (empty($signature) || empty($timestamp)) {
            return false;
        }
        
        // Check timestamp freshness (5 minute window)
        if (abs(time() - intval($timestamp)) > 300) {
            return false;
        }
        
        // Build signature payload
        $payload = $timestamp . '.' . file_get_contents('php://input');
        
        // Compute expected signature
        $expectedSignature = hash_hmac('sha256', $payload, $secret);
        
        return hash_equals($signature, $expectedSignature);
    }
    
    /**
     * Validate CSRF token for API requests
     */
    protected function _validateCsrfToken() {
        // Skip for API requests with valid authentication
        if ($this->_getCurrentUserId()) {
            return true;
        }
        
        $headers = getallheaders();
        $token = isset($headers['X-CSRF-Token']) ? $headers['X-CSRF-Token'] : '';
        
        return !empty($token);
    }
    
    /**
     * Start a database transaction
     */
    protected function _beginTransaction() {
        $db = $this->_getDb();
        $db->begin();
    }
    
    /**
     * Commit a database transaction
     */
    protected function _commit() {
        $db = $this->_getDb();
        $db->commit();
    }
    
    /**
     * Rollback a database transaction
     */
    protected function _rollback() {
        $db = $this->_getDb();
        $db->rollback();
    }
    
    /**
     * Execute callback within a transaction
     * @param callable $callback The function to execute
     * @param array $response Response on failure
     * @param int $statusCode HTTP status code on failure
     */
    protected function _withTransaction($callback, $errorResponse = array('success' => false, 'message' => 'Transaction failed'), $errorCode = 500) {
        $this->_beginTransaction();
        
        try {
            $result = $callback();
            $this->_commit();
            return $result;
        } catch (Exception $e) {
            $this->_rollback();
            $this->_logError('Transaction failed: ' . $e->getMessage(), $e);
            
            $response = $errorResponse;
            if (!isset($response['error'])) {
                $response['error'] = $e->getMessage();
            }
            return $this->_jsonResponse($response, $errorCode);
        }
    }
    
    /**
     * Enhanced JSON response helper with consistent format
     */
    protected function _jsonResponse($data, $code = 200, $headers = array()) {
        http_response_code($code);
        
        // Enable gzip compression if client supports it
        $this->_enableGzipCompression();
        
        // Consistent headers
        header("Content-Type: application/json");
        header("X-Content-Type-Options: nosniff");
        header("X-Frame-Options: DENY");
        header("X-XSS-Protection: 1; mode=block");
        header("X-API-Version: " . Configure::read('API.version') ?? '1.0');
        
        // Cache headers for API responses (PERF-07)
        $this->_setCacheHeaders();
        
        // Rate limit headers
        if (isset($this->RateLimit)) {
            header("X-RateLimit-Limit: " . ($this->RateLimit->limit ?? ''));
            header("X-RateLimit-Remaining: " . ($this->RateLimit->remaining ?? ''));
            header("X-RateLimit-Reset: " . ($this->RateLimit->reset ?? ''));
        }
        
        // Custom headers
        foreach ($headers as $key => $value) {
            header("$key: $value");
        }
        
        // Add timestamp to all responses
        if (is_array($data)) {
            $data['timestamp'] = date('c');
        }
        
        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    /**
     * Enable gzip compression for API responses (PERF-05)
     */
    protected function _enableGzipCompression() {
        if (!ini_get('zlib.output_compression')) {
            $acceptEncoding = isset($_SERVER['HTTP_ACCEPT_ENCODING']) ? $_SERVER['HTTP_ACCEPT_ENCODING'] : '';
            
            if (extension_loaded('zlib') && (strpos($acceptEncoding, 'gzip') !== false)) {
                ob_start('ob_gzhandler');
            }
        }
    }
    
    /**
     * Set cache headers for API responses (PERF-07)
     */
    protected function _setCacheHeaders($maxAge = 300, $isPrivate = true) {
        $cacheControl = $isPrivate ? 'private' : 'public';
        header('Cache-Control: ' . $cacheControl . ', max-age=' . $maxAge . ', must-revalidate');
        header('Pragma: cache');
        header('Expires: ' . gmdate('D, d M Y H:i:s', time() + $maxAge) . ' GMT');
        header('Vary: Accept-Encoding');
    }
    
    /**
     * Set no-cache headers for dynamic API responses
     */
    protected function _setNoCacheHeaders() {
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: 0');
    }
    
    /**
     * Success response
     */
    protected function _successResponse($data, $message = null, $code = 200) {
        $response = array('success' => true);
        
        if ($message !== null) {
            $response['message'] = $message;
        }
        
        if (is_array($data)) {
            $response = array_merge($response, $data);
        } else {
            $response['data'] = $data;
        }
        
        return $this->_jsonResponse($response, $code);
    }
    
    /**
     * Error response with standardized error codes
     */
    protected function _errorResponse($message, $code = 400, $errors = null, $errorCode = null) {
        $response = array(
            'success' => false,
            'message' => $message,
            'code' => $errorCode ?? 'GEN_002' // Default to GEN_002 (Invalid request)
        );
        
        if ($errors !== null) {
            $response['errors'] = $errors;
        }
        
        return $this->_jsonResponse($response, $code);
    }
    
    /**
     * Standardized error response using ApiErrorCodes
     */
    protected function _apiError($errorCode, $httpStatus = null, $additionalData = null) {
        $message = ApiErrorCodes::getMessage($errorCode);
        $httpStatus = $httpStatus ?? ApiErrorCodes::getHttpStatus($errorCode);
        
        $response = array(
            'success' => false,
            'message' => $message,
            'code' => $errorCode
        );
        
        if ($additionalData !== null) {
            $response = array_merge($response, $additionalData);
        }
        
        return $this->_jsonResponse($response, $httpStatus);
    }
    
    /**
     * Paginated response
     */
    protected function _paginatedResponse($items, $page, $limit, $total) {
        $totalPages = ceil($total / $limit);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'data' => $items,
            'pagination' => array(
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1
            )
        ));
    }
    
    /**
     * Log error with context
     */
    protected function _logError($message, $exception = null) {
        $context = array(
            'controller' => isset($this->name) ? $this->name : 'Unknown',
            'action' => isset($this->action) ? $this->action : 'Unknown',
            'user_id' => $this->_getCurrentUserId(),
            'ip' => $this->request->clientIp(),
            'url' => isset($this->request->url) ? $this->request->url : ''
        );
        
        if ($exception) {
            $context['exception'] = array(
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $exception->getTraceAsString()
            );
        }
        
        CakeLog::write('error', $message . ' - ' . json_encode($context));
    }
    
    /**
     * Validate required fields
     */
    protected function _validateRequired($data, $requiredFields) {
        $errors = array();
        
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                $errors[$field] = ucfirst($field) . ' is required';
            }
        }
        
        return $errors;
    }
    
    /**
     * Validate numeric fields
     */
    protected function _validateNumeric($data, $fields) {
        $errors = array();
        
        foreach ($fields as $field) {
            if (isset($data[$field]) && $data[$field] !== '') {
                if (!is_numeric($data[$field])) {
                    $errors[$field] = ucfirst($field) . ' must be a number';
                }
            }
        }
        
        return $errors;
    }
    
    /**
     * Get current user ID from JWT token
     */
    protected function _getCurrentUserId() {
        App::uses('LendaJwt', 'Lib');
        
        $headers = getallheaders();
        $auth = isset($headers['Authorization']) ? $headers['Authorization'] : '';
        
        if (empty($auth) || strpos($auth, 'Bearer ') !== 0) {
            return null;
        }
        
        $token = substr($auth, 7);
        $payload = LendaJwt::verify($token);
        
        if (!$payload) {
            return null;
        }
        
        return $payload['sub'] ?? null;
    }
    
    /**
     * Check if user is admin
     */
    protected function _isAdmin($userId) {
        App::uses('User', 'Model');
        $User = ClassRegistry::init('User');
        
        $user = $User->find("first", array(
            "conditions" => array("User.id" => $userId),
            "fields" => array("role"),
            "recursive" => -1
        ));
        
        return $user && $user['User']['role'] === 'admin';
    }
    
    /**
     * Require authentication
     */
    protected function _requireAuth() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_errorResponse('Unauthorized', 401);
        }
        return $userId;
    }
    
    /**
     * Require admin access
     */
    protected function _requireAdmin() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_errorResponse('Unauthorized', 401);
        }
        if (!$this->_isAdmin($userId)) {
            return $this->_errorResponse('Admin access required', 403);
        }
        return $userId;
    }
}
