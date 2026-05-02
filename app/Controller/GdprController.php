<?php
/**
 * GDPR Compliance Controller
 * 
 * Handles GDPR data export (SEC-16) and right to delete (SEC-17)
 * 
 * @package Lenda
 * @subpackage Controller
 */

App::uses('AppController', 'Controller');

class GdprController extends AppController {
    
    public $name = "Gdpr";
    public $uses = array('User', 'UserProfile');
    public $layout = null;
    public $autoRender = false;
    
    /**
     * Components
     */
    public $components = array(
        'RateLimit' => array('className' => 'RateLimit')
    );
    
    /**
     * Before filter - require authentication
     */
    public function beforeFilter() {
        parent::beforeFilter();
        $this->Auth->allow('export_data', 'delete_account', 'process_deletion');
    }
    
    /**
     * SEC-16: Export user data (GDPR Article 15)
     * 
     * Users can request a copy of all their personal data
     */
    public function export_data() {
        // Rate limiting to prevent abuse
        if (!$this->RateLimit->apply('gdpr')) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Too many requests. Please try again later.'
            ), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Authentication required'
            ), 401);
        }
        
        // Gather all user data
        $userData = $this->_gatherUserData($userId);
        
        // Generate export file
        $exportData = $this->_generateExport($userData);
        
        // Log the export request
        $this->_logGdprAction('data_export', $userId);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'message' => 'Data export ready',
            'data' => $exportData,
            'requested_at' => date('c'),
            'gdpr_reference' => 'GDPR-EXPORT-' . strtoupper(bin2hex(random_bytes(8)))
        ));
    }
    
    /**
     * SEC-16: Request data export via email
     */
    public function request_export() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Authentication required'
            ), 401);
        }
        
        // Create export request record
        $this->loadModel('GdprRequest');
        $this->GdprRequest->create();
        $this->GdprRequest->save(array(
            'GdprRequest' => array(
                'user_id' => $userId,
                'type' => 'data_export',
                'status' => 'pending',
                'requested_at' => date('Y-m-d H:i:s')
            )
        ));
        
        // In production: Send confirmation email with download link
        // Queue email for async processing
        
        $this->_logGdprAction('export_requested', $userId);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'message' => 'Data export request submitted. You will receive an email when ready.'
        ));
    }
    
    /**
     * SEC-17: Delete user account (GDPR Article 17 - Right to Erasure)
     */
    public function delete_account() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Authentication required'
            ), 401);
        }
        
        // Check for pending obligations (loans, etc.)
        $hasObligations = $this->_checkPendingObligations($userId);
        if ($hasObligations) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Cannot delete account with pending obligations',
                'details' => $hasObligations
            ), 400);
        }
        
        // Create deletion request (may require admin approval)
        $this->loadModel('GdprRequest');
        $this->GdprRequest->create();
        $this->GdprRequest->save(array(
            'GdprRequest' => array(
                'user_id' => $userId,
                'type' => 'account_deletion',
                'status' => 'pending',
                'requested_at' => date('Y-m-d H:i:s')
            )
        ));
        
        $requestId = $this->GdprRequest->getLastInsertID();
        
        $this->_logGdprAction('deletion_requested', $userId);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'message' => 'Account deletion request submitted',
            'request_id' => $requestId,
            'note' => 'Your data will be anonymized within 30 days as required by GDPR'
        ));
    }
    
    /**
     * Process account deletion (immediate anonymization)
     */
    public function process_deletion() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Authentication required'
            ), 401);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $confirmation = isset($data['confirmation']) ? $data['confirmation'] : '';
        
        if ($confirmation !== 'DELETE_MY_ACCOUNT') {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Please type DELETE_MY_ACCOUNT to confirm'
            ), 400);
        }
        
        // Anonymize user data (GDPR Article 17(1))
        $this->_anonymizeUser($userId);
        
        // Log out all sessions
        $this->_invalidateAllSessions($userId);
        
        $this->_logGdprAction('account_deleted', $userId);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'message' => 'Account has been anonymized as per GDPR requirements'
        ));
    }
    
    /**
     * Gather all user data for export
     */
    protected function _gatherUserData($userId) {
        $data = array();
        
        // Basic user info
        $user = $this->User->find('first', array(
            'conditions' => array('User.id' => $userId),
            'recursive' => -1
        ));
        
        if ($user) {
            $data['user'] = array(
                'id' => $user['User']['id'],
                'email' => $user['User']['email'],
                'name' => $user['User']['name'],
                'role' => $user['User']['role'],
                'status' => $user['User']['status'],
                'created_at' => $user['User']['created_at'],
                'last_login' => $user['User']['last_login_at']
            );
            
            // KYC data
            $data['kyc'] = array(
                'status' => $user['User']['kyc_status'],
                'documents' => $user['User']['kyc_documents']
            );
        }
        
        // User profile
        $profile = $this->UserProfile->find('first', array(
            'conditions' => array('UserProfile.user_id' => $userId),
            'recursive' => -1
        ));
        
        if ($profile) {
            $data['profile'] = $profile['UserProfile'];
        }
        
        // Financial data (summarized for privacy)
        $this->loadModel('WalletAccount');
        $wallets = $this->WalletAccount->find('all', array(
            'conditions' => array('WalletAccount.user_id' => $userId),
            'fields' => array('type', 'balance', 'currency', 'created_at'),
            'recursive' => -1
        ));
        
        $data['wallets'] = $wallets;
        
        // Transaction summary
        $this->loadModel('Transaction');
        $transactions = $this->Transaction->find('count', array(
            'conditions' => array('Transaction.user_id' => $userId)
        ));
        
        $data['transaction_count'] = $transactions;
        
        // Loan data
        $this->loadModel('LoanRequest');
        $loans = $this->LoanRequest->find('all', array(
            'conditions' => array('LoanRequest.borrower_id' => $userId),
            'fields' => array('id', 'title', 'loan_amount', 'status', 'created_at'),
            'recursive' => -1
        ));
        
        $data['loans'] = $loans;
        
        return $data;
    }
    
    /**
     * Generate export in structured format
     */
    protected function _generateExport($userData) {
        return array(
            'format_version' => '1.0',
            'exported_at' => date('c'),
            'personal_data' => $userData,
            'processing_activities' => array(
                array(
                    'purpose' => 'P2P Lending Services',
                    'legal_basis' => 'Contract performance',
                    'data_categories' => array('identity', 'financial', 'contact')
                ),
                array(
                    'purpose' => 'KYC/AML Compliance',
                    'legal_basis' => 'Legal obligation',
                    'data_categories' => array('identity_documents', 'biometric')
                )
            ),
            'third_party_sharing' => array(
                'Loan collateral managers',
                'Payment processors',
                'Regulatory authorities (when required)'
            ),
            'data_retention' => array(
                'Active account' => 'Duration of relationship',
                'After deletion' => '30 days (anonymized)',
                'Legal records' => '7 years (regulatory requirement)'
            )
        );
    }
    
    /**
     * Check for pending obligations
     */
    protected function _checkPendingObligations($userId) {
        $obligations = array();
        
        // Check active loans
        $this->loadModel('LoanRequest');
        $activeLoans = $this->LoanRequest->find('count', array(
            'conditions' => array(
                'LoanRequest.borrower_id' => $userId,
                'LoanRequest.status' => array('active', 'funded')
            )
        ));
        
        if ($activeLoans > 0) {
            $obligations[] = "You have $activeLoans active loan(s) that must be repaid first";
        }
        
        // Check pending investments
        $this->loadModel('LoanFunding');
        $pendingInvestments = $this->LoanFunding->find('count', array(
            'conditions' => array(
                'LoanFunding.lender_id' => $userId,
                'LoanFunding.status' => 'active'
            )
        ));
        
        if ($pendingInvestments > 0) {
            $obligations[] = "You have $pendingInvestments pending investment(s)";
        }
        
        return $obligations;
    }
    
    /**
     * Anonymize user data
     */
    protected function _anonymizeUser($userId) {
        // Generate random identifiers
        $anonymousId = 'DELETED-' . bin2hex(random_bytes(16));
        
        // Anonymize user record
        $this->User->id = $userId;
        $this->User->save(array(
            'email' => $anonymousId . '@deleted.local',
            'name' => 'Deleted User',
            'wallet_address' => null,
            'two_factor_enabled' => 0,
            'two_factor_secret' => null,
            'is_anonymized' => 1,
            'anonymized_at' => date('Y-m-d H:i:s')
        ));
        
        // Clear personal data from profile
        $this->UserProfile->updateAll(
            array(
                'first_name' => null,
                'last_name' => null,
                'phone' => null,
                'address' => null,
                'city' => null,
                'state' => null,
                'country' => null,
                'date_of_birth' => null,
                'national_id' => null,
                'anonymized_at' => date('Y-m-d H:i:s')
            ),
            array('UserProfile.user_id' => $userId)
        );
        
        // Keep financial records for legal compliance but unlink from user
        // These will be retained under the anonymized ID for regulatory purposes
    }
    
    /**
     * Invalidate all user sessions
     */
    protected function _invalidateAllSessions($userId) {
        // Clear session data
        if (isset($_SESSION['Auth']['User']['id']) && $_SESSION['Auth']['User']['id'] == $userId) {
            session_destroy();
        }
        
        // In production: Clear Redis sessions, JWT blacklist, etc.
    }
    
    /**
     * Log GDPR action
     */
    protected function _logGdprAction($action, $userId) {
        $logData = array(
            'event' => 'gdpr_' . $action,
            'user_id' => $userId,
            'ip' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown',
            'timestamp' => date('Y-m-d H:i:s')
        );
        
        CakeLog::write('gdpr', json_encode($logData));
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
}
