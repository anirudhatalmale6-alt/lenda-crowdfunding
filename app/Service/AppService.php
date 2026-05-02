<?php
/**
 * App Service Base Class
 * 
 * Base class for all service layer components
 * Provides common functionality for service classes
 */

App::uses('CakeLog', 'Log');

class AppService {
    
    /**
     * Service name for logging
     */
    protected $serviceName = 'AppService';
    
    /**
     * Log levels
     */
    const LOG_DEBUG = 'debug';
    const LOG_INFO = 'info';
    const LOG_WARNING = 'warning';
    const LOG_ERROR = 'error';
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->initialize();
    }
    
    /**
     * Initialize hook - override in child classes
     */
    public function initialize() {
        // Override in child classes
    }
    
    /**
     * Log a message
     * 
     * @param string $message Log message
     * @param string $level Log level
     */
    protected function log($message, $level = self::LOG_INFO) {
        CakeLog::write($level, "{$this->serviceName}: {$message}");
    }
    
    /**
     * Log debug message
     */
    protected function logDebug($message) {
        $this->log($message, self::LOG_DEBUG);
    }
    
    /**
     * Log info message
     */
    protected function logInfo($message) {
        $this->log($message, self::LOG_INFO);
    }
    
    /**
     * Log warning message
     */
    protected function logWarning($message) {
        $this->log($message, self::LOG_WARNING);
    }
    
    /**
     * Log error message
     */
    protected function logError($message) {
        $this->log($message, self::LOG_ERROR);
    }
    
    /**
     * Handle service error
     * 
     * @param Exception $exception The exception
     * @param string $context Context description
     * @return array Error response
     */
    protected function handleError($exception, $context = '') {
        $this->logError("{$context}: " . $exception->getMessage());
        
        return [
            'success' => false,
            'error' => [
                'message' => $exception->getMessage(),
                'code' => $exception->getCode(),
                'context' => $context
            ]
        ];
    }
    
    /**
     * Validate required parameters
     * 
     * @param array $params Parameters to validate
     * @param array $required Required parameter names
     * @return array|null Error array or null if valid
     */
    protected function validateRequired($params, $required) {
        $missing = [];
        
        foreach ($required as $param) {
            if (!isset($params[$param]) || (is_string($params[$param]) && empty(trim($params[$param])))) {
                $missing[] = $param;
            }
        }
        
        if (!empty($missing)) {
            return [
                'success' => false,
                'error' => [
                    'message' => 'Missing required parameters: ' . implode(', ', $missing),
                    'code' => 'MISSING_PARAMS',
                    'missing' => $missing
                ]
            ];
        }
        
        return null;
    }
    
    /**
     * Format success response
     * 
     * @param mixed $data Response data
     * @param string $message Optional message
     * @return array Formatted response
     */
    protected function successResponse($data = null, $message = '') {
        return [
            'success' => true,
            'data' => $data,
            'message' => $message
        ];
    }
    
    /**
     * Format error response
     * 
     * @param string $message Error message
     * @param string $code Error code
     * @param mixed $details Additional error details
     * @return array Formatted error response
     */
    protected function errorResponse($message, $code = 'ERROR', $details = null) {
        $response = [
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => $code
            ]
        ];
        
        if ($details !== null) {
            $response['error']['details'] = $details;
        }
        
        return $response;
    }
    
    /**
     * Dispatch event to CakePHP event system
     * 
     * @param string $eventType Event type (e.g., 'Model.User.login')
     * @param array $data Event data
     */
    protected function dispatchEvent($eventType, $data = []) {
        App::uses('CakeEventManager', 'Event');
        App::uses('CakeEvent', 'Event');
        
        $manager = CakeEventManager::instance();
        $event = new CakeEvent("Service.{$eventType}", $this, $data);
        $manager->dispatch($event);
    }
}
