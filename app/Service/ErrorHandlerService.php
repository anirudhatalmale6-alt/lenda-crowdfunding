<?php
/**
 * LENDA Error Handler Service
 * 
 * Centralized error handling and logging
 * Integrates with Sentry for error tracking
 * 
 * CODE-005: Centralized error tracking (Sentry, Datadog)
 * CODE-006: Standardized error response format
 */

App::uses('AppService', 'Service');
App::uses('CakeLog', 'Log');

class ErrorHandlerService extends AppService {
    
    /**
     * Service name for logging
     */
    protected $serviceName = 'ErrorHandlerService';
    
    /**
     * Error codes
     */
    const ERR_VALIDATION = 'VALIDATION_ERROR';
    const ERR_AUTHENTICATION = 'AUTHENTICATION_ERROR';
    const ERR_AUTHORIZATION = 'AUTHORIZATION_ERROR';
    const ERR_NOT_FOUND = 'NOT_FOUND';
    const ERR_SERVER = 'SERVER_ERROR';
    const ERR_EXTERNAL = 'EXTERNAL_SERVICE_ERROR';
    const ERR_RATE_LIMIT = 'RATE_LIMIT_ERROR';
    const ERR_VALIDATION_FAILED = 'VALIDATION_FAILED';
    const ERR_DUPLICATE = 'DUPLICATE_ERROR';
    const ERR_INVALID_INPUT = 'INVALID_INPUT';
    
    /**
     * HTTP status codes
     */
    const HTTP_OK = 200;
    const HTTP_CREATED = 201;
    const HTTP_BAD_REQUEST = 400;
    const HTTP_UNAUTHORIZED = 401;
    const HTTP_FORBIDDEN = 403;
    const HTTP_NOT_FOUND = 404;
    const HTTP_CONFLICT = 409;
    const HTTP_UNPROCESSABLE = 422;
    const HTTP_TOO_MANY_REQUESTS = 429;
    const HTTP_INTERNAL_ERROR = 500;
    
    /**
     * Sentry configuration
     */
    protected $sentryDsn;
    protected $environment;
    protected $release;
    
    /**
     * Initialize service
     */
    public function initialize() {
        $this->sentryDsn = Configure::read('Sentry.dsn');
        $this->environment = Configure::read('Sentry.environment') ?: 'production';
        $this->release = Configure::read('Sentry.release') ?: '1.0.0';
        
        $this->initializeSentry();
    }
    
    /**
     * Initialize Sentry
     */
    protected function initializeSentry() {
        if (!empty($this->sentryDsn)) {
            // Check if Sentry SDK is available
            if (class_exists('\Sentry\SentrySdk')) {
                \Sentry\init([
                    'dsn' => $this->sentryDsn,
                    'environment' => $this->environment,
                    'release' => $this->release,
                    'sample_rate' => floatval(Configure::read('Sentry.sample_rate') ?: 1.0),
                ]);
            }
        }
    }
    
    /**
     * Handle exception and log to Sentry
     * 
     * @param Exception $exception The exception
     * @param array $context Additional context
     */
    public function handleException($exception, $context = []) {
        // Log to CakePHP log
        $this->logError($exception->getMessage());
        
        // Capture to Sentry if available
        if (!empty($this->sentryDsn) && class_exists('\Sentry\SentrySdk')) {
            \Sentry\captureException($exception, [
                'extra' => $context
            ]);
        }
        
        // Return standardized error response
        return $this->formatErrorResponse(
            $exception->getMessage(),
            self::ERR_SERVER,
            self::HTTP_INTERNAL_ERROR
        );
    }
    
    /**
     * Log error with context
     * 
     * @param string $message Error message
     * @param array $context Context data
     */
    public function logErrorWithContext($message, $context = []) {
        $contextString = !empty($context) ? ' | ' . json_encode($context) : '';
        $this->logError($message . $contextString);
        
        // Capture to Sentry
        if (!empty($this->sentryDsn) && class_exists('\Sentry\SentrySdk')) {
            \Sentry\captureMessage($message, \Sentry\Severity::error(), [
                'extra' => $context
            ]);
        }
    }
    
    /**
     * Format standardized error response
     * 
     * @param string $message Error message
     * @param string $code Error code
     * @param int $httpStatus HTTP status code
     * @param array $details Additional error details
     * @param array $validationErrors Validation errors
     * @return array Formatted error response
     */
    public function formatErrorResponse(
        $message,
        $code = self::ERR_SERVER,
        $httpStatus = self::HTTP_INTERNAL_ERROR,
        $details = [],
        $validationErrors = []
    ) {
        $response = [
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => $code,
                'status' => $httpStatus
            ]
        ];
        
        if (!empty($details)) {
            $response['error']['details'] = $details;
        }
        
        if (!empty($validationErrors)) {
            $response['error']['validation_errors'] = $validationErrors;
        }
        
        // Include request ID for debugging
        $response['error']['request_id'] = $this->getRequestId();
        
        return $response;
    }
    
    /**
     * Format standardized success response
     * 
     * @param mixed $data Response data
     * @param string $message Optional message
     * @param int $httpStatus HTTP status code
     * @return array Formatted success response
     */
    public function formatSuccessResponse(
        $data = null,
        $message = '',
        $httpStatus = self::HTTP_OK
    ) {
        $response = [
            'success' => true,
            'data' => $data
        ];
        
        if (!empty($message)) {
            $response['message'] = $message;
        }
        
        $response['request_id'] = $this->getRequestId();
        
        return $response;
    }
    
    /**
     * Format validation error response
     * 
     * @param array $errors Validation errors
     * @param string $message Custom message
     * @return array Formatted error response
     */
    public function formatValidationError($errors, $message = 'Validation failed') {
        return $this->formatErrorResponse(
            $message,
            self::ERR_VALIDATION_FAILED,
            self::HTTP_UNPROCESSABLE,
            [],
            $errors
        );
    }
    
    /**
     * Format authentication error response
     * 
     * @param string $message Error message
     * @return array Formatted error response
     */
    public function formatAuthError($message = 'Authentication required') {
        return $this->formatErrorResponse(
            $message,
            self::ERR_AUTHENTICATION,
            self::HTTP_UNAUTHORIZED
        );
    }
    
    /**
     * Format authorization error response
     * 
     * @param string $message Error message
     * @return array Formatted error response
     */
    public function formatForbiddenError($message = 'Access denied') {
        return $this->formatErrorResponse(
            $message,
            self::ERR_AUTHORIZATION,
            self::HTTP_FORBIDDEN
        );
    }
    
    /**
     * Format not found error response
     * 
     * @param string $resource Resource type
     * @return array Formatted error response
     */
    public function formatNotFoundError($resource = 'Resource') {
        return $this->formatErrorResponse(
            "{$resource} not found",
            self::ERR_NOT_FOUND,
            self::HTTP_NOT_FOUND
        );
    }
    
    /**
     * Format bad request error response
     * 
     * @param string $message Error message
     * @return array Formatted error response
     */
    public function formatBadRequestError($message = 'Invalid request') {
        return $this->formatErrorResponse(
            $message,
            self::ERR_INVALID_INPUT,
            self::HTTP_BAD_REQUEST
        );
    }
    
    /**
     * Format conflict error response
     * 
     * @param string $message Error message
     * @return array Formatted error response
     */
    public function formatConflictError($message = 'Resource already exists') {
        return $this->formatErrorResponse(
            $message,
            self::ERR_DUPLICATE,
            self::HTTP_CONFLICT
        );
    }
    
    /**
     * Get or generate request ID
     * 
     * @return string Request ID
     */
    protected function getRequestId() {
        if (php_sapi_name() !== 'cli') {
            $request = Router::getRequest();
            if ($request) {
                $requestId = $request->header('X-Request-ID');
                if (!empty($requestId)) {
                    return $requestId;
                }
            }
        }
        
        return uniqid('req_', true);
    }
    
    /**
     * Set user context for Sentry
     * 
     * @param array $user User data
     */
    public function setUserContext($user) {
        if (!empty($this->sentryDsn) && class_exists('\Sentry\SentrySdk')) {
            \Sentry\configureScope(function (\Sentry\State\Scope $scope) use ($user) {
                $scope->setUser([
                    'id' => $user['id'] ?? null,
                    'email' => $user['email'] ?? null,
                    'username' => $user['username'] ?? null,
                ]);
            });
        }
    }
    
    /**
     * Add breadcrumb for Sentry
     * 
     * @param string $message Breadcrumb message
     * @param string $category Breadcrumb category
     * @param string $level Breadcrumb level
     */
    public function addBreadcrumb($message, $category = 'app', $level = 'info') {
        if (!empty($this->sentryDsn) && class_exists('\Sentry\SentrySdk')) {
            \Sentry\addBreadcrumb(new \Sentry\Breadcrumb(
                $level,
                $category,
                null,
                $message
            ));
        }
    }
    
    /**
     * Handle API error
     * 
     * @param string $message Error message
     * @param string $code Error code
     * @param int $httpStatus HTTP status
     * @param Exception|null $exception Original exception
     * @return array Error response
     */
    public function handleApiError($message, $code = self::ERR_SERVER, $httpStatus = self::HTTP_INTERNAL_ERROR, $exception = null) {
        // Log error
        if ($exception) {
            $this->handleException($exception, ['api_error' => true]);
        } else {
            $this->logErrorWithContext($message, ['code' => $code]);
        }
        
        return $this->formatErrorResponse($message, $code, $httpStatus);
    }
}
