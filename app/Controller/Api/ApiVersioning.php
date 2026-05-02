<?php
/**
 * API Versioning Middleware
 * 
 * Implements URL-based API versioning strategy (/api/v1/, /api/v2/)
 * 
 * @package Lenda
 * @subpackage Controller.Api
 */
App::uses('BaseApiController', 'Controller/Api');

/**
 * API Versioning Controller
 * 
 * Provides versioning support for LENDA API endpoints.
 * Supports URL-based versioning: /api/v1/* and /api/v2/*
 */
class ApiVersioningController extends AppController {
    
    /**
     * Current API version
     */
    const VERSION_1 = 'v1';
    const VERSION_2 = 'v2';
    
    /**
     * Version configuration
     */
    protected $_versionConfig = array(
        'v1' => array(
            'deprecated' => false,
            'sunset_date' => null,
            'features' => array('basic_loans', 'basic_escrow', 'basic_risk')
        ),
        'v2' => array(
            'deprecated' => false,
            'sunset_date' => null,
            'features' => array(
                'basic_loans', 
                'basic_escrow', 
                'basic_risk',
                'tokenization',
                'advanced_risk_scoring',
                'refinancing',
                'recovery_marketplace',
                'accelerator'
            )
        )
    );
    
    /**
     * Components
     */
    public $components = array(
        'RateLimit' => array('className' => 'RateLimit')
    );
    
    /**
     * Before filter - check API version
     */
    public function beforeFilter() {
        parent::beforeFilter();
        $this->Auth->allow(array('version', 'deprecations', 'migrations'));
    }
    
    /**
     * Redirect non-versioned API requests to versioned endpoints
     * This ensures backward compatibility while enforcing versioning
     * GET /api/* -> /api/v2/*
     */
    public function redirectToVersioned() {
        $path = $this->request->url;
        
        // Extract the original path after /api/
        $versionedPath = preg_replace('/^api\//', 'api/v2/', $path);
        
        // Check if URL already has a version
        if (preg_match('/\/api\/v[0-9]+\//', $path)) {
            // Already versioned, just continue
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Invalid API version format',
                'code' => 'INVALID_VERSION'
            ), 400);
        }
        
        // Return redirect information
        return $this->_jsonResponse(array(
            'success' => true,
            'message' => 'API v2 is the current version. Non-versioned endpoints are deprecated.',
            'deprecated' => true,
            'redirect_to' => '/' . $versionedPath,
            'latest_version' => self::VERSION_2,
            'migration_guide' => '/api/v2/migrations'
        ), 301, array('Location' => '/' . $versionedPath));
    }
    
    /**
     * GET /api/version
     * Get API version information
     */
    public function version() {
        $requestedVersion = $this->_extractVersionFromRequest();
        
        return $this->_jsonResponse(array(
            'success' => true,
            'api' => array(
                'version' => $requestedVersion,
                'latest' => self::VERSION_2,
                'supported_versions' => array_keys($this->_versionConfig),
                'build' => '2026.03.19',
                'environment' => Configure::read('Environment.name') ?? 'production'
            ),
            'features' => $this->_versionConfig[$requestedVersion]['features'] ?? array()
        ));
    }
    
    /**
     * GET /api/versions
     * List all available API versions
     */
    public function versions() {
        $versions = array();
        
        foreach ($this->_versionConfig as $version => $config) {
            $versions[] = array(
                'version' => $version,
                'deprecated' => $config['deprecated'],
                'sunset_date' => $config['sunset_date'],
                'features' => $config['features']
            );
        }
        
        return $this->_jsonResponse(array(
            'success' => true,
            'versions' => $versions,
            'current' => $this->_extractVersionFromRequest()
        ));
    }
    
    /**
     * GET /api/deprecations
     * Get deprecation information
     */
    public function deprecations() {
        $requestedVersion = $this->_extractVersionFromRequest();
        $deprecations = array();
        
        // Check current version for deprecations
        if ($requestedVersion === self::VERSION_1) {
            $deprecations[] = array(
                'version' => self::VERSION_1,
                'deprecated' => true,
                'sunset_date' => '2026-12-31',
                'message' => 'API v1 will be deprecated on December 31, 2026',
                'migration_guide' => '/api/docs/v1-to-v2-migration'
            );
        }
        
        return $this->_jsonResponse(array(
            'success' => true,
            'deprecations' => $deprecations
        ));
    }
    
    /**
     * GET /api/migrations
     * Get migration information between versions
     */
    public function migrations() {
        $requestedVersion = $this->_extractVersionFromRequest();
        
        $migrations = array(
            'v1_to_v2' => array(
                'from' => self::VERSION_1,
                'to' => self::VERSION_2,
                'breaking_changes' => array(
                    'Response format: Added pagination.cursor field',
                    'Loan status: Added "platform_settled" status',
                    'Risk score: Changed from 0-100 to 0-1000 scale'
                ),
                'new_features' => array(
                    'Tokenized loan participation',
                    'Advanced risk scoring with ML',
                    'Refinancing marketplace',
                    'Recovery marketplace',
                    'Funding accelerator'
                ),
                'required_actions' => array(
                    'Update Accept header to application/vnd.lenda.v2+json',
                    'Update response parsing for new fields',
                    'Review new error codes'
                )
            )
        );
        
        return $this->_jsonResponse(array(
            'success' => true,
            'migrations' => $migrations,
            'current_version' => $requestedVersion
        ));
    }
    
    /**
     * Check if requested version is supported
     */
    public function checkVersion() {
        $version = $this->request->query['version'] ?? null;
        
        if (!$version) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Version parameter required'
            ), 400);
        }
        
        $isSupported = isset($this->_versionConfig[$version]);
        $isDeprecated = $isSupported ? $this->_versionConfig[$version]['deprecated'] : false;
        
        return $this->_jsonResponse(array(
            'success' => true,
            'version' => $version,
            'supported' => $isSupported,
            'deprecated' => $isDeprecated,
            'message' => $isSupported 
                ? ($isDeprecated ? 'Version is deprecated' : 'Version is supported')
                : 'Version not supported'
        ));
    }
    
    /**
     * Extract version from request
     */
    protected function _extractVersionFromRequest() {
        // Check Accept header first
        $accept = $this->request->header('Accept');
        if (strpos($accept, 'v2') !== false) {
            return self::VERSION_2;
        }
        if (strpos($accept, 'v1') !== false) {
            return self::VERSION_1;
        }
        
        // Check URL path
        $path = $this->request->url;
        if (strpos($path, '/v2/') !== false || strpos($path, '/v2') !== false) {
            return self::VERSION_2;
        }
        
        // Default to v1
        return self::VERSION_1;
    }
    
    /**
     * Check if feature is available in current version
     */
    protected function _isFeatureAvailable($feature) {
        $version = $this->_extractVersionFromRequest();
        $config = $this->_versionConfig[$version] ?? array();
        
        return in_array($feature, $config['features'] ?? array());
    }
    
    /**
     * Require specific API version
     */
    protected function _requireVersion($requiredVersion) {
        $currentVersion = $this->_extractVersionFromRequest();
        
        if ($currentVersion !== $requiredVersion) {
            return $this->_jsonResponse(array(
                'success' => false,
                'error' => array(
                    'message' => "This endpoint requires API version {$requiredVersion}",
                    'code' => 'VERSION_REQUIRED',
                    'current_version' => $currentVersion,
                    'required_version' => $requiredVersion
                )
            ), 400);
        }
        
        return true;
    }
    
    /**
     * JSON response helper
     */
    protected function _jsonResponse($data, $code = 200) {
        http_response_code($code);
        header("Content-Type: application/json");
        header("X-API-Version: " . $this->_extractVersionFromRequest());
        header("X-Content-Type-Options: nosniff");
        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/**
 * API Versioning Helper Trait
 * 
 * Use this trait in controllers to enable version-specific behavior
 */
trait ApiVersioningTrait {
    
    /**
     * Get current API version
     */
    protected function _getApiVersion() {
        $version = 'v1';
        
        // Check Accept header
        $accept = isset($_SERVER['HTTP_ACCEPT']) ? $_SERVER['HTTP_ACCEPT'] : '';
        if (strpos($accept, 'v2') !== false) {
            $version = 'v2';
        }
        
        // Check URL
        $url = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '';
        if (strpos($url, '/v2/') !== false) {
            $version = 'v2';
        }
        
        return $version;
    }
    
    /**
     * Check if feature is available in current version
     */
    protected function _hasFeature($feature) {
        $features = array(
            'v1' => array('basic_loans', 'basic_escrow', 'basic_risk'),
            'v2' => array('basic_loans', 'basic_escrow', 'basic_risk', 'tokenization', 
                         'advanced_risk_scoring', 'refinancing', 'recovery_marketplace', 'accelerator')
        );
        
        $version = $this->_getApiVersion();
        return in_array($feature, $features[$version] ?? array());
    }
    
    /**
     * Format response based on API version
     */
    protected function _formatResponse($data, $code = 200) {
        $version = $this->_getApiVersion();
        
        // V2 adds cursor-based pagination
        if ($version === 'v2' && isset($data['pagination'])) {
            $data['pagination']['cursor'] = $data['pagination']['cursor'] ?? null;
        }
        
        return $data;
    }
}
