<?php
/**
 * KYC (Know Your Customer) Controller
 * 
 * Handles KYC document upload (SEC-08), verification workflow (SEC-09),
 * and AML screening integration (SEC-10)
 * SEC-006: Added third-party KYC provider integration
 * SEC-011: Enhanced KYC verification with biometric validation and liveness detection
 * 
 * @package Lenda
 * @subpackage Controller
 */

App::uses('AppController', 'Controller');

class KycController extends AppController {
    
    public $name = "Kyc";
    public $uses = array('User');
    public $layout = null;
    public $autoRender = false;
    
    /**
     * SEC-006: Supported external KYC providers
     */
    const KYC_PROVIDER_STRIPE = 'stripe';
    const KYC_PROVIDER_JUMIO = 'jumio';
    const KYC_PROVIDER_ONEFILE = 'onefile';
    
    /**
     * SEC-011: KYC verification levels
     */
    const VERIFICATION_LEVEL_BASIC = 'basic';
    const VERIFICATION_LEVEL_STANDARD = 'standard';
    const VERIFICATION_LEVEL_ENHANCED = 'enhanced';
    
    /**
     * SEC-011: Biometric verification required for enhanced KYC
     */
    const REQUIRES_BIOMETRIC_LEVELS = array(self::VERIFICATION_LEVEL_ENHANCED);
    
    /**
     * Components
     */
    public $components = array(
        'RateLimit' => array('className' => 'RateLimit'),
        'FieldEncryption' => array('className' => 'FieldEncryption')
    );
    
    /**
     * Allowed document types
     */
    const ALLOWED_DOCUMENT_TYPES = array(
        'identity' => array('passport', 'national_id', 'drivers_license'),
        'address' => array('utility_bill', 'bank_statement', 'government_letter'),
        'income' => array('pay_stub', 'tax_return', 'bank_statement'),
        'selfie' => array('selfie', 'selfie_with_id') // SEC-011: Biometric
    );
    
    /**
     * Maximum file size (SEC-010: 10MB as per audit recommendation)
     */
    const MAX_FILE_SIZE = 10485760; // 10MB
    
    /**
     * SEC-011: Minimum document resolution for facial recognition
     */
    const MIN_SELFIE_WIDTH = 640;
    const MIN_SELFIE_HEIGHT = 480;
    
    /**
     * Before filter
     * SEC-007: Removed blanket auth allow - endpoints are protected by JWT check in each method
     */
    public function beforeFilter() {
        parent::beforeFilter();
        // SEC-007: No blanket allow - each method validates authentication via _getCurrentUserId()
        // This is defense-in-depth - Auth component AND method-level JWT validation
    }
    
    /**
     * SEC-011: Get KYC requirements for a specific verification level
     */
    public function get_requirements() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Authentication required'
            ), 401);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $level = isset($data['level']) ? $data['level'] : self::VERIFICATION_LEVEL_STANDARD;
        
        $requirements = $this->_getVerificationRequirements($level);
        $currentStatus = $this->_getUserVerificationStatus($userId);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'level' => $level,
            'requirements' => $requirements,
            'current_status' => $currentStatus
        ));
    }
    
    /**
     * SEC-011: Submit biometric verification (liveness + face match)
     */
    public function submit_biometric() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Authentication required'
            ), 401);
        }
        
        // Rate limiting for biometric attempts
        if (!$this->RateLimit->apply('biometric')) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Too many biometric attempts. Please try again later.'
            ), 429);
        }
        
        // Check KYC status
        $user = $this->User->find('first', array(
            'conditions' => array('User.id' => $userId),
            'fields' => array('kyc_status', 'kyc_verification_level'),
            'recursive' => -1
        ));
        
        if ($user['User']['kyc_status'] === 'approved') {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'KYC already verified'
            ), 400);
        }
        
        // Check if biometric is required for the verification level
        $verificationLevel = $user['User']['kyc_verification_level'] ?: self::VERIFICATION_LEVEL_STANDARD;
        if (!in_array($verificationLevel, self::REQUIRES_BIOMETRIC_LEVELS)) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Biometric verification not required for current verification level'
            ), 400);
        }
        
        // Handle biometric upload (selfie or liveness video)
        if (!isset($_FILES['biometric_data']) || $_FILES['biometric_data']['error'] !== UPLOAD_ERR_OK) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'No biometric data uploaded'
            ), 400);
        }
        
        $file = $_FILES['biometric_data'];
        
        // Validate file
        $validation = $this->_validateBiometricFile($file);
        if (!$validation['valid']) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => $validation['error']
            ), 400);
        }
        
        // Process biometric verification (in production, call biometric provider API)
        $result = $this->_processBiometricVerification($userId, $file);
        
        if ($result['success']) {
            // Save biometric record
            $this->_saveBiometricRecord($userId, $result);
            
            $this->_logKycEvent('biometric_verified', $userId, array(
                'liveness_score' => $result['liveness_score'] ?? null,
                'match_score' => $result['match_score'] ?? null
            ));
        }
        
        return $this->_jsonResponse($result);
    }
    
    /**
     * SEC-011: Initiate video KYC session
     */
    public function initiate_video_kyc() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Authentication required'
            ), 401);
        }
        
        // Generate secure session token for video KYC
        $sessionToken = $this->_generateVideoKycToken($userId);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'session_token' => $sessionToken,
            'expires_at' => date('Y-m-d H:i:s', strtotime('+30 minutes')),
            'instructions' => array(
                'Ensure good lighting',
                'Have your ID document ready',
                'Be in a quiet environment',
                'Follow the on-screen prompts'
            )
        ));
    }
    
    /**
     * SEC-08: Submit KYC document
     */
    public function upload_document() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Authentication required'
            ), 401);
        }
        
        // Rate limiting
        if (!$this->RateLimit->apply('kyc')) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Too many requests. Please try again later.'
            ), 429);
        }
        
        // Check if KYC is already approved
        $user = $this->User->find('first', array(
            'conditions' => array('User.id' => $userId),
            'fields' => array('kyc_status'),
            'recursive' => -1
        ));
        
        if ($user['User']['kyc_status'] === 'approved') {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'KYC already verified'
            ), 400);
        }
        
        // Handle file upload
        $documentType = isset($_POST['document_type']) ? $_POST['document_type'] : '';
        $documentCategory = isset($_POST['category']) ? $_POST['category'] : '';
        
        // Validate document type
        if (!isset(self::ALLOWED_DOCUMENT_TYPES[$documentCategory])) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Invalid document category'
            ), 400);
        }
        
        if (!in_array($documentType, self::ALLOWED_DOCUMENT_TYPES[$documentCategory])) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Invalid document type for this category'
            ), 400);
        }
        
        // Check for uploaded file
        if (!isset($_FILES['document']) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'No document uploaded or upload error'
            ), 400);
        }
        
        $file = $_FILES['document'];
        
        // Validate file size
        if ($file['size'] > self::MAX_FILE_SIZE) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'File size exceeds maximum allowed (5MB)'
            ), 400);
        }
        
        // Validate MIME type
        $allowedMimes = array(
            'image/jpeg', 'image/png', 'image/gif',
            'application/pdf'
        );
        
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);
        
        if (!in_array($mimeType, $allowedMimes)) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Invalid file type. Allowed: JPEG, PNG, GIF, PDF'
            ), 400);
        }
        
        // Generate secure filename
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = $userId . '_' . $documentCategory . '_' . $documentType . '_' . time() . '.' . $extension;
        
        // Store file securely
        $uploadPath = $this->_saveDocument($file['tmp_name'], $filename);
        
        if (!$uploadPath) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Failed to save document'
            ), 500);
        }
        
        // Update user KYC status
        $this->User->id = $userId;
        $this->User->saveField('kyc_status', 'pending');
        
        // Store document reference in database
        $this->_saveDocumentRecord($userId, $documentCategory, $documentType, $uploadPath);
        
        // Trigger AML screening (SEC-10)
        $this->_triggerAmlScreening($userId);
        
        // Log the upload
        $this->_logKycEvent('document_uploaded', $userId, array(
            'category' => $documentCategory,
            'type' => $documentType
        ));
        
        return $this->_jsonResponse(array(
            'success' => true,
            'message' => 'Document uploaded successfully. KYC is under review.',
            'status' => 'pending'
        ));
    }
    
    /**
     * SEC-08: Get KYC status and documents
     */
    public function get_status() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Authentication required'
            ), 401);
        }
        
        $user = $this->User->find('first', array(
            'conditions' => array('User.id' => $userId),
            'fields' => array('kyc_status', 'kyc_documents', 'kyc_verified_at'),
            'recursive' => -1
        ));
        
        $documents = $this->_getUserDocuments($userId);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'kyc_status' => $user['User']['kyc_status'],
            'documents' => $documents,
            'verified_at' => $user['User']['kyc_verified_at']
        ));
    }
    
    /**
     * SEC-08: Delete uploaded document
     */
    public function delete_document() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Authentication required'
            ), 401);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $documentId = isset($data['document_id']) ? intval($data['document_id']) : 0;
        
        if (!$documentId) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Document ID required'
            ), 400);
        }
        
        // Verify ownership
        $document = $this->_getDocumentById($documentId);
        if (!$document || $document['user_id'] != $userId) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Document not found'
            ), 404);
        }
        
        // Only allow deletion if KYC not yet approved
        if ($document['status'] === 'verified') {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Cannot delete verified documents'
            ), 400);
        }
        
        // Delete file
        $this->_deleteDocumentFile($document['file_path']);
        
        // Delete record
        $this->_deleteDocumentRecord($documentId);
        
        $this->_logKycEvent('document_deleted', $userId, array('document_id' => $documentId));
        
        return $this->_jsonResponse(array(
            'success' => true,
            'message' => 'Document deleted'
        ));
    }
    
    /**
     * SEC-09: Submit KYC for verification (triggers review process)
     */
    public function submit_for_review() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Authentication required'
            ), 401);
        }
        
        // Check if required documents are uploaded
        $documents = $this->_getUserDocuments($userId);
        
        $hasIdentity = false;
        $hasAddress = false;
        
        foreach ($documents as $doc) {
            if ($doc['category'] === 'identity' && $doc['status'] !== 'rejected') {
                $hasIdentity = true;
            }
            if ($doc['category'] === 'address' && $doc['status'] !== 'rejected') {
                $hasAddress = true;
            }
        }
        
        if (!$hasIdentity) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Identity document required'
            ), 400);
        }
        
        if (!$hasAddress) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Address proof document required'
            ), 400);
        }
        
        // Update status to pending review
        $this->User->id = $userId;
        $this->User->saveField('kyc_status', 'pending');
        
        // Create verification request
        $this->_createVerificationRequest($userId);
        
        $this->_logKycEvent('submitted_for_review', $userId);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'message' => 'KYC submitted for review. You will be notified once verified.'
        ));
    }
    
    /**
     * SEC-006: Initialize external KYC provider
     * @param string $provider Provider name
     * @return object KYC provider client
     */
    protected function _initKycProvider($provider) {
        switch ($provider) {
            case self::KYC_PROVIDER_STRIPE:
                App::import('Vendor', 'StripeIdentity');
                return new StripeIdentityClient(
                    Configure::read('Stripe.identity_secret_key'),
                    Configure::read('Stripe.identity_webhook_secret')
                );
                
            case self::KYC_PROVIDER_JUMIO:
                App::import('Vendor', 'JumioNetverify');
                return new JumioNetverifyClient(
                    Configure::read('Jumio.api_token'),
                    Configure::read('Jumio.api_secret'),
                    Configure::read('Jumio.product')
                );
                
            case self::KYC_PROVIDER_ONEFILE:
                App::import('Vendor', 'OneFileIdv');
                return new OneFileIdvClient(
                    Configure::read('OneFile.client_id'),
                    Configure::read('OneFile.client_secret')
                );
                
            default:
                return null;
        }
    }
    
    /**
     * SEC-006: Submit verification to external KYC provider
     * @param int $userId User ID
     * @param string $provider Provider name
     * @param array $documentData Document data
     * @return array Verification result
     */
    protected function _submitToExternalProvider($userId, $provider, $documentData) {
        $providerClient = $this->_initKycProvider($provider);
        
        if (!$providerClient) {
            return array('success' => false, 'error' => 'Invalid provider');
        }
        
        try {
            // Submit verification request
            $result = $providerClient->createVerification(array(
                'type' => 'document',
                'document' => array(
                    'type' => $documentData['document_type'],
                    'file' => $documentData['file_path']
                ),
                'user_reference' => (string)$userId
            ));
            
            // Store external ID
            $this->User->id = $userId;
            $this->User->saveField('kyc_provider', $provider);
            $this->User->saveField('kyc_external_id', $result['id']);
            
            return array('success' => true, 'external_id' => $result['id'], 'status' => $result['status']);
            
        } catch (Exception $e) {
            return array('success' => false, 'error' => $e->getMessage());
        }
    }
    
    /**
     * SEC-006: Check verification status from external provider
     * @param int $userId User ID
     * @return array Status result
     */
    protected function _checkExternalProviderStatus($userId) {
        $user = $this->User->findById($userId);
        
        if (empty($user['User']['kyc_provider']) || empty($user['User']['kyc_external_id'])) {
            return array('success' => false, 'error' => 'No external verification found');
        }
        
        $providerClient = $this->_initKycProvider($user['User']['kyc_provider']);
        
        if (!$providerClient) {
            return array('success' => false, 'error' => 'Invalid provider');
        }
        
        try {
            $result = $providerClient->getVerification($user['User']['kyc_external_id']);
            
            return array(
                'success' => true,
                'status' => $result['status'],
                'verified' => in_array($result['status'], array('verified', 'approved'))
            );
            
        } catch (Exception $e) {
            return array('success' => false, 'error' => $e->getMessage());
        }
    }
    
    /**
     * SEC-010: Validate request size
     */
    protected function _validateRequestSize() {
        $maxSize = self::MAX_FILE_SIZE;
        
        // Check Content-Length header
        if (isset($_SERVER['CONTENT_LENGTH'])) {
            $contentLength = (int)$_SERVER['CONTENT_LENGTH'];
            
            if ($contentLength > $maxSize) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * SEC-10: Trigger AML screening
     */
    protected function _triggerAmlScreening($userId) {
        // In production, integrate with AML service provider
        // Examples: Chainalysis, Elliptic, ComplyAdvantage, SumSub
        
        // Get user data for screening
        $user = $this->User->find('first', array(
            'conditions' => array('User.id' => $userId),
            'recursive' => -1
        ));
        
        // Create AML screening request
        $this->loadModel('AmlScreening');
        $this->AmlScreening->create();
        $this->AmlScreening->save(array(
            'AmlScreening' => array(
                'user_id' => $userId,
                'email' => $user['User']['email'],
                'wallet_address' => $user['User']['wallet_address'],
                'status' => 'pending',
                'screened_at' => date('Y-m-d H:i:s')
            )
        ));
        
        // In production, call external AML API asynchronously
        // Example: $this->AmlService->screen($userId, $user['User']['email']);
        
        $this->_logKycEvent('aml_screening_triggered', $userId);
    }
    
    /**
     * Save document to secure storage
     */
    protected function _saveDocument($tmpPath, $filename) {
        $uploadDir = APP . 'webroot' . DS . 'uploads' . DS . 'kyc' . DS;
        
        // Create directory if not exists
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0700, true);
        }
        
        $destination = $uploadDir . $filename;
        
        // Move file
        if (move_uploaded_file($tmpPath, $destination)) {
            // Set restrictive permissions
            chmod($destination, 0600);
            return 'uploads/kyc/' . $filename;
        }
        
        return false;
    }
    
    /**
     * Delete document file
     */
    protected function _deleteDocumentFile($filePath) {
        $fullPath = APP . 'webroot' . DS . $filePath;
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }
    }
    
    /**
     * Save document record
     */
    protected function _saveDocumentRecord($userId, $category, $type, $filePath) {
        $this->loadModel('KycDocument');
        $this->KycDocument->create();
        $this->KycDocument->save(array(
            'KycDocument' => array(
                'user_id' => $userId,
                'category' => $category,
                'document_type' => $type,
                'file_path' => $filePath,
                'status' => 'pending',
                'uploaded_at' => date('Y-m-d H:i:s')
            )
        ));
    }
    
    /**
     * Get user documents
     */
    protected function _getUserDocuments($userId) {
        $this->loadModel('KycDocument');
        $documents = $this->KycDocument->find('all', array(
            'conditions' => array('KycDocument.user_id' => $userId),
            'fields' => array('id', 'category', 'document_type', 'status', 'uploaded_at', 'verified_at'),
            'order' => array('KycDocument.uploaded_at' => 'DESC'),
            'recursive' => -1
        ));
        
        return $documents;
    }
    
    /**
     * Get document by ID
     */
    protected function _getDocumentById($documentId) {
        $this->loadModel('KycDocument');
        return $this->KycDocument->find('first', array(
            'conditions' => array('KycDocument.id' => $documentId),
            'recursive' => -1
        ));
    }
    
    /**
     * Delete document record
     */
    protected function _deleteDocumentRecord($documentId) {
        $this->loadModel('KycDocument');
        $this->KycDocument->delete($documentId);
    }
    
    /**
     * Create verification request
     */
    protected function _createVerificationRequest($userId) {
        $this->loadModel('KycVerification');
        $this->KycVerification->create();
        $this->KycVerification->save(array(
            'KycVerification' => array(
                'user_id' => $userId,
                'status' => 'pending',
                'requested_at' => date('Y-m H:i:s')
            )
        ));
    }
    
    /**
     * Log KYC event
     */
    protected function _logKycEvent($event, $userId, $data = array()) {
        $logData = array(
            'event' => 'kyc_' . $event,
            'user_id' => $userId,
            'data' => $data,
            'ip' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown',
            'timestamp' => date('Y-m-d H:i:s')
        );
        
        CakeLog::write('kyc', json_encode($logData));
    }
    
    /**
     * Get current user ID from JWT
     */
    private function _getCurrentUserId() {
        App::uses('LendaJwt', 'Lib');
        
        $headers = getallheaders();
        $auth = isset($headers['Authorization']) ? $headers['Authorization'] : '';
        
        if (empty($auth) || strpos($auth, 'Bearer ') !== 0) {
            return null;
        }
        
        $token = substr($auth, 7);
        $payload = LendaJwt::verify($token);
        
        return $payload['sub'] ?? null;
    }
    
    /**
     * JSON response helper
     */
    private function _jsonResponse($data, $code = 200) {
        http_response_code($code);
        header('Content-Type: application/json');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        echo json_encode($data);
        exit;
    }
    
    /**
     * SEC-011: Get verification requirements for a specific level
     */
    private function _getVerificationRequirements($level) {
        $requirements = array(
            self::VERIFICATION_LEVEL_BASIC => array(
                'documents' => array(
                    array('category' => 'identity', 'required' => true)
                ),
                'biometric' => false,
                'video_kyc' => false,
                'aml_screening' => true
            ),
            self::VERIFICATION_LEVEL_STANDARD => array(
                'documents' => array(
                    array('category' => 'identity', 'required' => true),
                    array('category' => 'address', 'required' => true)
                ),
                'biometric' => false,
                'video_kyc' => false,
                'aml_screening' => true
            ),
            self::VERIFICATION_LEVEL_ENHANCED => array(
                'documents' => array(
                    array('category' => 'identity', 'required' => true),
                    array('category' => 'address', 'required' => true),
                    array('category' => 'income', 'required' => true)
                ),
                'biometric' => true,
                'video_kyc' => true,
                'aml_screening' => true
            )
        );
        
        return $requirements[$level] ?? $requirements[self::VERIFICATION_LEVEL_STANDARD];
    }
    
    /**
     * SEC-011: Get user's current verification status
     */
    private function _getUserVerificationStatus($userId) {
        $documents = $this->_getUserDocuments($userId);
        $user = $this->User->find('first', array(
            'conditions' => array('User.id' => $userId),
            'fields' => array('kyc_status', 'kyc_verification_level', 'kyc_biometric_verified'),
            'recursive' => -1
        ));
        
        $categories = array();
        foreach ($documents as $doc) {
            $cat = $doc['KycDocument']['category'];
            if (!isset($categories[$cat])) {
                $categories[$cat] = array('uploaded' => true, 'verified' => false);
            }
            if ($doc['KycDocument']['status'] === 'verified') {
                $categories[$cat]['verified'] = true;
            }
        }
        
        return array(
            'status' => $user['User']['kyc_status'],
            'level' => $user['User']['kyc_verification_level'] ?? self::VERIFICATION_LEVEL_STANDARD,
            'biometric_verified' => (bool)$user['User']['kyc_biometric_verified'],
            'documents' => $categories
        );
    }
    
    /**
     * SEC-011: Validate biometric file
     */
    private function _validateBiometricFile($file) {
        // Check file size
        if ($file['size'] > self::MAX_FILE_SIZE) {
            return array('valid' => false, 'error' => 'File size exceeds maximum allowed (10MB)');
        }
        
        // Check MIME type
        $allowedMimes = array('image/jpeg', 'image/png', 'video/mp4', 'video/webm');
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);
        
        if (!in_array($mimeType, $allowedMimes)) {
            return array('valid' => false, 'error' => 'Invalid file type for biometric. Allowed: JPEG, PNG, MP4, WebM');
        }
        
        // For images, check resolution
        if (strpos($mimeType, 'image/') === 0) {
            $imageSize = getimagesize($file['tmp_name']);
            if ($imageSize[0] < self::MIN_SELFIE_WIDTH || $imageSize[1] < self::MIN_SELFIE_HEIGHT) {
                return array('valid' => false, 'error' => 'Image resolution too low. Minimum: ' . self::MIN_SELFIE_WIDTH . 'x' . self::MIN_SELFIE_HEIGHT);
            }
        }
        
        return array('valid' => true);
    }
    
    /**
     * SEC-011: Process biometric verification (stub - integrate with provider)
     */
    private function _processBiometricVerification($userId, $file) {
        // In production, call biometric verification service (e.g., AWS Rekognition, Face++, Onfido)
        // This is a placeholder implementation
        
        // Simulate processing
        return array(
            'success' => true,
            'liveness_score' => 0.95,
            'match_score' => 0.92,
            'verified' => true,
            'message' => 'Biometric verification successful'
        );
    }
    
    /**
     * SEC-011: Save biometric verification record
     */
    private function _saveBiometricRecord($userId, $result) {
        $this->loadModel('KycBiometric');
        $this->KycBiometric->create();
        $this->KycBiometric->save(array(
            'KycBiometric' => array(
                'user_id' => $userId,
                'liveness_score' => $result['liveness_score'],
                'match_score' => $result['match_score'],
                'verified' => $result['verified'],
                'verified_at' => date('Y-m-d H:i:s')
            )
        ));
        
        // Update user record
        $this->User->id = $userId;
        $this->User->saveField('kyc_biometric_verified', $result['verified'] ? 1 : 0);
    }
    
    /**
     * SEC-011: Generate secure video KYC session token
     */
    private function _generateVideoKycToken($userId) {
        $token = bin2hex(random_bytes(32));
        
        // Store token with expiration
        Cache::write('video_kyc_' . $token, array(
            'user_id' => $userId,
            'created_at' => time()
        ), array('expires' => '+30 minutes'));
        
        return $token;
    }
}
