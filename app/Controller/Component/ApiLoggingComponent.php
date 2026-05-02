<?php
App::uses('Component', 'Controller');

/**
 * ApiLoggingComponent
 * 
 * Middleware for logging all API requests and responses
 * Provides audit trail for API calls
 * 
 * Features:
 * - Request logging (headers, body, params)
 * - Response logging (status, body)
 * - Performance metrics (execution time)
 * - Error tracking
 * - Configurable log levels
 */
class ApiLoggingComponent extends Component {
    
    /**
     * Components used by this component
     */
    public $components = array('RequestHandler');
    
    /**
     * Log levels
     */
    const LOG_LEVEL_DEBUG = 'DEBUG';
    const LOG_LEVEL_INFO = 'INFO';
    const LOG_LEVEL_WARNING = 'WARNING';
    const LOG_LEVEL_ERROR = 'ERROR';
    
    /**
     * Default configuration
     */
    protected $_defaults = array(
        'logLevel' => 'INFO',           // DEBUG, INFO, WARNING, ERROR
        'logPath' => 'api_logs',        // Log file path
        'logRequestBody' => true,        // Log request body
        'logResponseBody' => true,       // Log response body
        'logHeaders' => true,            // Log request headers
        'logPerformance' => true,         // Log execution time
        'logErrorsOnly' => false,        // Only log errors
        'maxBodyLength' => 10000,        // Max body length to log
        'sensitiveFields' => array(      // Fields to mask in logs
            'password',
            'api_key',
            'api_secret',
            'access_token',
            'refresh_token',
            'credit_card',
            'cvv',
            'secret',
            'Authorization'
        ),
        'skipEndpoints' => array(        // Endpoints to skip logging
            '/api/health',
            '/api/v1/health'
        )
    );
    
    /**
     * Initialize component
     */
    public function initialize(Controller $controller) {
        $this->_controller = $controller;
        $this->_config = array_merge($this->_defaults, $this->_config);
        
        // Start timer
        $this->_startTime = microtime(true);
    }
    
    /**
     * Log incoming API request
     */
    public function logRequest() {
        // Skip if disabled or on skip list
        if ($this->_shouldSkip()) {
            return;
        }
        
        $logData = array(
            'timestamp' => date('c'),
            'level' => self::LOG_LEVEL_INFO,
            'type' => 'REQUEST',
            'method' => $this->_controller->request->method(),
            'url' => $this->_controller->request->url,
            'ip' => $this->_controller->request->clientIp(),
            'user_id' => $this->_getUserId(),
            'controller' => $this->_controller->name,
            'action' => $this->_controller->action
        );
        
        // Log headers if enabled
        if ($this->_config['logHeaders']) {
            $logData['headers'] = $this->_sanitizeHeaders(getallheaders());
        }
        
        // Log query params
        $logData['params'] = $this->_sanitizeParams($this->_controller->request->query);
        
        // Log request body if enabled
        if ($this->_config['logRequestBody']) {
            $body = $this->_controller->request->input('json_decode', true);
            if ($body) {
                $logData['body'] = $this->_sanitizeData($body);
            }
        }
        
        // Store in controller for later use
        $this->_controller->apiLogData = $logData;
        
        $this->_writeLog($logData);
    }
    
    /**
     * Log API response
     */
    public function logResponse($responseData = null, $statusCode = 200) {
        // Skip if disabled or on skip list
        if ($this->_shouldSkip()) {
            return;
        }
        
        // Calculate execution time
        $executionTime = microtime(true) - $this->_startTime;
        
        $logData = array(
            'timestamp' => date('c'),
            'level' => $statusCode >= 400 ? self::LOG_LEVEL_ERROR : self::LOG_LEVEL_INFO,
            'type' => 'RESPONSE',
            'status_code' => $statusCode,
            'execution_time_ms' => round($executionTime * 1000, 2),
            'url' => $this->_controller->request->url,
            'method' => $this->_controller->request->method(),
            'user_id' => $this->_getUserId()
        );
        
        // Log response body if enabled
        if ($this->_config['logResponseBody'] && $responseData) {
            if (is_array($responseData)) {
                $logData['response'] = $this->_sanitizeData($responseData);
            } else {
                $logData['response'] = substr($responseData, 0, $this->_config['maxBodyLength']);
            }
        }
        
        // Add performance warnings
        if ($this->_config['logPerformance']) {
            if ($executionTime > 5) {
                $logData['level'] = self::LOG_LEVEL_WARNING;
                $logData['performance_warning'] = 'Slow request detected (>5s)';
            }
        }
        
        $this->_writeLog($logData);
    }
    
    /**
     * Log error/exception
     */
    public function logError($message, $exception = null) {
        $logData = array(
            'timestamp' => date('c'),
            'level' => self::LOG_LEVEL_ERROR,
            'type' => 'ERROR',
            'message' => $message,
            'url' => $this->_controller->request->url,
            'method' => $this->_controller->request->method(),
            'ip' => $this->_controller->request->clientIp(),
            'user_id' => $this->_getUserId(),
            'controller' => $this->_controller->name,
            'action' => $this->_controller->action
        );
        
        if ($exception) {
            $logData['exception'] = array(
                'class' => get_class($exception),
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $exception->getTraceAsString()
            );
        }
        
        $this->_writeLog($logData);
    }
    
    /**
     * Check if logging should be skipped for this endpoint
     */
    protected function _shouldSkip() {
        $url = '/' . $this->_controller->request->url;
        
        foreach ($this->_config['skipEndpoints'] as $skip) {
            if (strpos($url, $skip) === 0) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get current user ID if authenticated
     */
    protected function _getUserId() {
        // Try to get from session
        if (isset($this->_controller->Auth) && $this->_controller->Auth->user('id')) {
            return $this->_controller->Auth->user('id');
        }
        
        // Try to get from JWT token in request
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $auth = $headers['Authorization'];
            if (strpos($auth, 'Bearer ') === 0) {
                $token = substr($auth, 7);
                // Try to decode JWT without verification for logging
                $parts = explode('.', $token);
                if (count($parts) === 3) {
                    $payload = json_decode(base64_decode($parts[1]), true);
                    if (isset($payload['sub'])) {
                        return $payload['sub'];
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * Sanitize headers - remove sensitive information
     */
    protected function _sanitizeHeaders($headers) {
        $sanitized = array();
        
        foreach ($headers as $key => $value) {
            $keyLower = strtolower($key);
            
            // Skip sensitive headers
            if (in_array($keyLower, array('authorization', 'x-api-key', 'cookie'))) {
                $sanitized[$key] = '[REDACTED]';
            } else {
                $sanitized[$key] = $value;
            }
        }
        
        return $sanitized;
    }
    
    /**
     * Sanitize params - mask sensitive fields
     */
    protected function _sanitizeParams($params) {
        return $this->_sanitizeData($params);
    }
    
    /**
     * Sanitize data - mask sensitive fields
     */
    protected function _sanitizeData($data) {
        if (!is_array($data)) {
            return $data;
        }
        
        $sanitized = array();
        
        foreach ($data as $key => $value) {
            // Check if this is a sensitive field
            if (in_array(strtolower($key), $this->_config['sensitiveFields'])) {
                $sanitized[$key] = '[REDACTED]';
            } elseif (is_array($value)) {
                $sanitized[$key] = $this->_sanitizeData($value);
            } else {
                // Truncate long strings
                if (is_string($value) && strlen($value) > $this->_config['maxBodyLength']) {
                    $sanitized[$key] = substr($value, 0, $this->_config['maxBodyLength']) . '...';
                } else {
                    $sanitized[$key] = $value;
                }
            }
        }
        
        return $sanitized;
    }
    
    /**
     * Write log to file
     */
    protected function _writeLog($data) {
        // Check log level
        $logLevel = $this->_config['logLevel'];
        $dataLevel = $data['level'];
        
        $levels = array(
            self::LOG_LEVEL_DEBUG => 0,
            self::LOG_LEVEL_INFO => 1,
            self::LOG_LEVEL_WARNING => 2,
            self::LOG_LEVEL_ERROR => 3
        );
        
        // Skip if log level is higher than data level
        if (isset($levels[$logLevel]) && isset($levels[$dataLevel])) {
            if ($levels[$logLevel] > $levels[$dataLevel]) {
                if (!$this->_config['logErrorsOnly'] || $dataLevel !== self::LOG_LEVEL_ERROR) {
                    return;
                }
            }
        }
        
        // Format log entry
        $logEntry = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
        // Write to CakeLog
        CakeLog::write($this->_config['logPath'], $logEntry);
    }
    
    /**
     * Called after the controller's afterFilter
     */
    public function shutdown(Controller $controller) {
        // Log response on shutdown if not already logged
        if (!isset($controller->apiResponseLogged) || !$controller->apiResponseLogged) {
            // Get response status code
            $statusCode = http_response_code();
            $this->logResponse(null, $statusCode);
        }
    }
}
