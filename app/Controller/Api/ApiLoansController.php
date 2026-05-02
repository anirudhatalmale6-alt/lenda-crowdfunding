<?php
App::uses("AppController", "Controller");
App::uses('ConnectionManager', 'Core');
App::uses('LoanService', 'Service');
App::uses('FundingService', 'Service');

class ApiLoansController extends AppController {
    use ApiBaseControllerTrait;
    
    public $name = "ApiLoans";
    public $uses = array("LoanRequest", "LoanFunding", "Repayment", "CollateralAsset", "User", "ReserveFund", "ReserveFundTransaction");
    public $layout = null;
    public $autoRender = false;
    
    /**
     * Service instances
     */
    protected $loanService;
    protected $fundingService;
    
    /**
     * Components for security
     */
    public $components = array(
        'RateLimit' => array('className' => 'RateLimit'),
        'InputValidation' => array('className' => 'InputValidation')
    );
    
    /**
     * Constructor - Initialize services
     */
    public function __construct($request = null, $response = null) {
        parent::__construct($request, $response);
        $this->loanService = new LoanService();
        $this->fundingService = new FundingService();
    }
    
    public function beforeFilter() {
        parent::beforeFilter();
        // Allow public endpoints without authentication
        $this->Auth->allow(array('index', 'view', 'calculateLTV', 'getRiskScore', 'matches', 'repaymentSchedule', 'statistics'));
    }
    
    /**
     * Get all loans or create new loan
     */
    public function index() {
        // Apply rate limiting
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        // Check for cursor-based pagination (PERF-02)
        $cursor = $this->request->query['cursor'] ?? null;
        if ($cursor !== null) {
            return $this->getLoansCursor();
        }
        
        if ($this->request->is("post")) {
            return $this->createLoan();
        }
        return $this->getLoans();
    }
    
    /**
     * Get loans with cursor-based pagination (PERF-02)
     * GET /api/loans?cursor=xxx&limit=20
     */
    private function getLoansCursor() {
        App::uses('CursorPaginationTrait', 'Lib/Pagination');
        
        $cursor = $this->request->query['cursor'] ?? null;
        $limit = isset($this->request->query['limit']) ? intval($this->request->query['limit']) : 20;
        
        // Build conditions
        $status = $this->request->query['status'] ?? null;
        $conditions = array();
        
        if ($status) {
            $allowedStatuses = array('draft', 'requested', 'approved', 'rejected', 'funded', 'active', 'repaid', 'defaulted');
            if (in_array($status, $allowedStatuses)) {
                $conditions['LoanRequest.status'] = $status;
            }
        } else {
            // Default to approved/active for public marketplace
            $conditions['LoanRequest.status'] = array('approved', 'active');
        }
        
        // Use cursor pagination with eager loading (PERF-03)
        $result = $this->paginateWithCursor(
            $this->LoanRequest,
            $cursor,
            $limit,
            $conditions,
            array('LoanRequest.id' => 'DESC'),
            array('BorrowerProfile', 'CollateralAsset')
        );
        
        return $this->_cursorPaginatedResponse(
            $result['data'],
            $result['pagination']['cursor'],
            $result['pagination']['has_more'],
            $result['pagination']['limit']
        );
    }
    
    /**
     * Get user's loans (borrower)
     */
    public function myLoans() {
        // Apply rate limiting
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        // Pagination parameters
        $page = isset($this->request->query['page']) ? max(1, intval($this->request->query['page'])) : 1;
        $limit = isset($this->request->query['limit']) ? min(max(1, intval($this->request->query['limit'])), 100) : 20;
        $offset = ($page - 1) * $limit;
        
        // Get total count
        $total = $this->LoanRequest->find('count', array(
            'conditions' => array('LoanRequest.borrower_id' => $userId)
        ));
        
        $loans = $this->LoanRequest->find('all', array(
            'conditions' => array('LoanRequest.borrower_id' => $userId),
            'contain' => array('BorrowerProfile', 'CollateralAsset', 'LoanFunding'),
            'order' => array('LoanRequest.created_at' => 'DESC'),
            'limit' => $limit,
            'offset' => $offset
        ));
        
        return $this->_paginatedResponse($loans, $page, $limit, $total);
    }
    
    /**
     * Get user's funded loans (lender)
     */
    public function myFundedLoans() {
        // Apply rate limiting
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        // Pagination parameters
        $page = isset($this->request->query['page']) ? max(1, intval($this->request->query['page'])) : 1;
        $limit = isset($this->request->query['limit']) ? min(max(1, intval($this->request->query['limit'])), 100) : 20;
        $offset = ($page - 1) * $limit;
        
        // Get total count
        $total = $this->LoanFunding->find('count', array(
            'conditions' => array('LoanFunding.lender_id' => $userId)
        ));
        
        $funded = $this->LoanFunding->find('all', array(
            'conditions' => array('LoanFunding.lender_id' => $userId),
            'contain' => array('LoanRequest'),
            'order' => array('LoanFunding.created_at' => 'DESC'),
            'limit' => $limit,
            'offset' => $offset
        ));
        
        return $this->_paginatedResponse($funded, $page, $limit, $total);
    }
    
    /**
     * View single loan
     */
    public function view() {
        // Apply rate limiting
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $id = $this->request->params["id"] ?? null;
        if (!$id) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan ID required'), 400);
        }
        
        // Validate ID is numeric
        if (!is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid loan ID'), 400);
        }
        
        $loan = $this->LoanRequest->find("first", array(
            "conditions" => array("LoanRequest.id" => $id),
            "contain" => array("BorrowerProfile", "CollateralAsset")
        ));
        
        if (!$loan) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan not found'), 404);
        }
        
        return $this->_jsonResponse(array("success" => true, "loan" => $loan));
    }
    
    /**
     * Fund a loan - with full data integrity guarantees
     * - ACID transactions
     * - Idempotency support
     * - Optimistic locking
     * - Double-entry ledger verification
     */
    public function fund() {
        // Apply rate limiting for write operations
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $loanId = $this->request->params["id"] ?? null;
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Get idempotency key from headers
        $idempotencyKey = $this->request->header('X-Idempotency-Key') ?? ($data['idempotency_key'] ?? null);
        
        // Validate funding data
        if (!$this->InputValidation->validateFunding(array_merge($data, array('loan_id' => $loanId)))) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $this->InputValidation->getErrors()
            ), 400);
        }
        
        $amount = floatval($data["amount"] ?? 0);
        
        // Validate loan ID
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid loan ID'), 400);
        }
        
        // Check idempotency key if provided
        if ($idempotencyKey) {
            App::uses('DataIntegrity', 'Model');
            $this->DataIntegrity = new DataIntegrity();
            
            $idempotencyCheck = $this->DataIntegrity->checkIdempotency(
                $idempotencyKey,
                '/api/loans/:id/fund',
                $userId,
                array('loan_id' => $loanId, 'amount' => $amount)
            );
            
            if (!$idempotencyCheck['success']) {
                return $this->_jsonResponse($idempotencyCheck['error'], 409);
            }
            
            if ($idempotencyCheck['cached']) {
                // Return cached response
                $response = $idempotencyCheck['response_body'];
                $response['cached'] = true;
                return $this->_jsonResponse($response, $idempotencyCheck['response_status']);
            }
        }
        
        // Load models for transaction
        App::uses('LoanRequest', 'Model');
        App::uses('LoanFunding', 'Model');
        App::uses('WalletAccount', 'Model');
        App::uses('WalletTransaction', 'Model');
        
        $LoanRequest = ClassRegistry::init('LoanRequest');
        $LoanFunding = ClassRegistry::init('LoanFunding');
        $WalletAccount = ClassRegistry::init('WalletAccount');
        $WalletTransaction = ClassRegistry::init('WalletTransaction');
        
        // Acquire optimistic lock for loan
        if (!isset($this->DataIntegrity)) {
            App::uses('DataIntegrity', 'Model');
            $this->DataIntegrity = new DataIntegrity();
        }
        
        $lockResult = $this->DataIntegrity->acquireLock('loan', $loanId, 'funding', $userId);
        
        if (!$lockResult['success']) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Loan is currently being funded by another user',
                'retry_after' => 30
            ), 409);
        }
        
        // Execute funding in a transaction
        $db = ConnectionManager::getDataSource('default');
        $fundingSuccess = false;
        $responseData = null;
        
        try {
            $db->begin();
            
            // Get loan with lock
            $loan = $LoanRequest->find("first", array(
                "conditions" => array("LoanRequest.id" => $loanId),
                "for update" => true  // Select for update
            ));
            
            if (!$loan) {
                throw new Exception('Loan not found');
            }
            
            if ($loan["LoanRequest"]["status"] !== "approved") {
                throw new Exception('Loan not available for funding');
            }
            
            $remaining = $loan["LoanRequest"]["loan_amount"] - $loan["LoanRequest"]["funded_amount"];
            if ($amount > $remaining) $amount = $remaining;
            
            // Get lender's wallet
            $wallet = $WalletAccount->find("first", array(
                "conditions" => array(
                    "WalletAccount.user_id" => $userId,
                    "WalletAccount.type" => "main"
                ),
                "for update" => true
            ));
            
            if (!$wallet || floatval($wallet["WalletAccount"]["balance"]) < $amount) {
                throw new Exception('Insufficient wallet balance');
            }
            
            // Create funding record
            $LoanFunding->create();
            $fundingData = array(
                "LoanFunding" => array(
                    "loan_id" => $loanId,
                    "lender_id" => $userId,
                    "amount" => $amount,
                    "interest_rate" => $loan["LoanRequest"]["interest_rate"],
                    "status" => "active",
                    "idempotency_key" => $idempotencyKey
                )
            );
            
            if (!$LoanFunding->save($fundingData)) {
                throw new Exception('Failed to create funding record');
            }
            
            $fundingId = $LoanFunding->getLastInsertID();
            $balanceBefore = floatval($wallet["WalletAccount"]["balance"]);
            
            // Deduct from wallet
            $WalletAccount->id = $wallet["WalletAccount"]["id"];
            $WalletAccount->saveField("balance", $balanceBefore - $amount);
            $WalletAccount->saveField("version", $wallet["WalletAccount"]["version"] + 1);
            
            // Record wallet transaction
            $WalletTransaction->create();
            $WalletTransaction->save(array(
                "wallet_id" => $wallet["WalletAccount"]["id"],
                "user_id" => $userId,
                "type" => "loan_funding",
                "amount" => $amount,
                "status" => "completed",
                "reference_type" => "loan_funding",
                "reference_id" => $fundingId,
                "completed_at" => date("Y-m-d H:i:s"),
                "idempotency_key" => $idempotencyKey
            ));
            
            // Update loan
            $newFunded = $loan["LoanRequest"]["funded_amount"] + $amount;
            $newFunderCount = $loan["LoanRequest"]["funder_count"] + 1;
            $newStatus = ($newFunded >= $loan["LoanRequest"]["loan_amount"]) ? "funded" : $loan["LoanRequest"]["status"];
            
            $LoanRequest->id = $loanId;
            $LoanRequest->saveField("funded_amount", $newFunded);
            $LoanRequest->saveField("funder_count", $newFunderCount);
            $LoanRequest->saveField("status", $newStatus);
            $LoanRequest->saveField("version", $loan["LoanRequest"]["version"] + 1);
            
            if ($newStatus === "funded") {
                $LoanRequest->saveField("funded_at", date("Y-m-d H:i:s"));
            }
            
            // Create double-entry ledger entries
            $ledgerEntries = array(
                // Debit from lender's wallet
                array(
                    'type' => 'debit',
                    'account_type' => 'wallet',
                    'account_id' => $wallet["WalletAccount"]["id"],
                    'amount' => $amount,
                    'reference_type' => 'loan_funding',
                    'reference_id' => $fundingId,
                    'description' => "Loan funding for loan #{$loanId}"
                ),
                // Credit to loan account (representing borrower's obligation)
                array(
                    'type' => 'credit',
                    'account_type' => 'loan',
                    'account_id' => $loanId,
                    'amount' => $amount,
                    'reference_type' => 'loan_funding',
                    'reference_id' => $fundingId,
                    'description' => "Funds received for loan #{$loanId}"
                )
            );
            
            $ledgerResult = $this->DataIntegrity->createLedgerEntries($fundingId, $ledgerEntries);
            
            if (!$ledgerResult['balanced']) {
                throw new Exception('Ledger balance verification failed');
            }
            
            // Record balance adjustment
            $this->DataIntegrity->recordBalanceAdjustment(
                $wallet["WalletAccount"]["id"],
                $userId,
                'loan_funding',
                -$amount,
                $balanceBefore,
                $balanceBefore - $amount,
                'loan_funding',
                $fundingId,
                "Funding for loan #{$loanId}",
                true
            );
            
            $db->commit();
            $fundingSuccess = true;
            
            $responseData = array(
                "success" => true,
                "message" => "Loan funded successfully",
                "amount" => $amount,
                "funding_id" => $fundingId,
                "funded_amount" => $newFunded,
                "loan_status" => $newStatus
            );
            
        } catch (Exception $e) {
            $db->rollback();
            
            $responseData = array(
                "success" => false,
                "message" => $e->getMessage()
            );
        }
        
        // Release lock
        $this->DataIntegrity->releaseLock($lockResult['lock_token']);
        
        // Store idempotency key if provided
        if ($idempotencyKey && $responseData) {
            $this->DataIntegrity->storeIdempotency(
                $idempotencyKey,
                '/api/loans/:id/fund',
                $userId,
                array('loan_id' => $loanId, 'amount' => $amount),
                $fundingSuccess ? 200 : 500,
                $responseData
            );
        }
        
        // Trigger accelerator if successful
        if ($fundingSuccess) {
            $this->_triggerAccelerator($loanId);
            return $this->_jsonResponse($responseData);
        }
        
        return $this->_jsonResponse($responseData, 500);
    }
    
    /**
     * Repay a loan with proper distribution to lenders (PERF-03)
     * Uses eager loading to avoid N+1 queries
     */
    public function repay() {
        // Apply rate limiting for write operations
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $loanId = $this->request->params["id"] ?? null;
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validate transaction data
        if (!$this->InputValidation->validateTransaction($data)) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $this->InputValidation->getErrors()
            ), 400);
        }
        
        $amount = floatval($data["amount"] ?? 0);
        
        // Validate loan ID
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid loan ID'), 400);
        }
        
        // Get loan with eager loading to avoid N+1 (PERF-03)
        $loan = $this->LoanRequest->find("first", array(
            "conditions" => array("LoanRequest.id" => $loanId, "LoanRequest.borrower_id" => $userId),
            "contain" => array(
                'LoanFunding' => array(
                    'conditions' => array('LoanFunding.status' => 'active'),
                    'contain' => false
                )
            )
        ));
        
        if (!$loan) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan not found'), 404);
        }
        
        // Execute repayment distribution in a transaction
        $db = ConnectionManager::getDataSource('default');
        
        try {
            $db->begin();
            
            // Create repayment record
            $this->Repayment->create();
            
            // Calculate principal and interest based on actual loan rate (FIN-01 FIX)
            // Use the loan's interest rate for proper interest calculation
            // Using bcmath for precise decimal arithmetic to avoid floating-point precision errors
            $loanInterestRate = floatval($loan['LoanRequest']['interest_rate']) / 100 / 12; // Monthly rate
            $monthsElapsed = 1; // For single payment
            
            // Use bcmath for precise decimal calculations (FIN-01 FIX)
            $amountStr = number_format($amount, 4, '.', '');
            $rateStr = number_format($loanInterestRate, 8, '.', '');
            
            // Calculate interest with precision using bcmath
            $interest = round(bcmul($amountStr, $rateStr, 4), 2);
            $principal = round(bcsub($amountStr, $interest, 4), 2);
            
            // Ensure principal is not negative (handles edge cases)
            if ($principal < 0) {
                $principal = 0;
                $interest = $amount;
            }
            
            $repaymentData = array(
                "Repayment" => array(
                    "loan_id" => $loanId,
                    "borrower_id" => $userId,
                    "amount" => $amount,
                    "principal" => $principal,
                    "interest" => $interest,
                    "status" => "paid",
                    "due_date" => date("Y-m-d"),
                    "paid_at" => date("Y-m-d H:i:s")
                )
            );
            
            if (!$this->Repayment->save($repaymentData)) {
                throw new Exception('Failed to record repayment');
            }
            
            $repaymentId = $this->Repayment->getLastInsertID();
            
            // Distribute repayment to lenders using eager loaded data (PERF-03 fix)
            $distributions = $this->_distributeRepayment($loan, $amount, $db);
            
            // Check if loan is fully repaid
            $totalRepaid = $this->Repayment->find("first", array(
                "conditions" => array("Repayment.loan_id" => $loanId),
                "fields" => array("SUM(amount) as total")
            ));
            
            $total = floatval($totalRepaid[0]["total"] ?? 0);
            if ($total >= $loan["LoanRequest"]["loan_amount"]) {
                $this->LoanRequest->id = $loanId;
                $this->LoanRequest->saveField("status", "repaid");
                $this->LoanRequest->saveField("repaid_at", date("Y-m-d H:i:s"));
                
                // Update all fundings to repaid status
                $this->LoanFunding->updateAll(
                    array('LoanFunding.status' => "'repaid'"),
                    array('LoanFunding.loan_id' => $loanId, 'LoanFunding.status' => 'active')
                );
            }
            
            $db->commit();
            
            return $this->_jsonResponse(array(
                "success" => true, 
                "message" => "Repayment recorded and distributed",
                "distributions" => $distributions
            ));
            
        } catch (Exception $e) {
            $db->rollback();
            return $this->_jsonResponse(array("success" => false, "message" => $e->getMessage()), 500);
        }
    }
    
    /**
     * Distribute repayment to lenders proportionally (PERF-03)
     * Uses eager loaded data to avoid N+1 queries
     * 
     * @param array $loan The loan with eager loaded fundings
     * @param float $amount Total repayment amount
     * @param DataSource $db Database connection
     * @return array Distribution details
     */
    private function _distributeRepayment($loan, $amount, $db) {
        $distributions = array();
        $totalFunded = 0;
        
        // Calculate total funded amount from eager loaded data
        $fundings = $loan['LoanFunding'] ?? array();
        foreach ($fundings as $funding) {
            $totalFunded += floatval($funding['amount']);
        }
        
        if ($totalFunded <= 0) {
            return $distributions;
        }
        
        // Load wallet models
        App::uses('WalletAccount', 'Model');
        App::uses('WalletTransaction', 'Model');
        $WalletAccount = ClassRegistry::init('WalletAccount');
        $WalletTransaction = ClassRegistry::init('WalletTransaction');
        
        // Distribute proportionally to each lender
        foreach ($fundings as $funding) {
            $lenderId = $funding['lender_id'];
            $fundedAmount = floatval($funding['amount']);
            
            // Calculate proportional share
            $share = ($fundedAmount / $totalFunded) * $amount;
            
            // Get lender's wallet
            $wallet = $WalletAccount->find("first", array(
                "conditions" => array(
                    "WalletAccount.user_id" => $lenderId,
                    "WalletAccount.type" => "main"
                )
            ));
            
            if ($wallet) {
                // Add funds to lender's wallet
                $currentBalance = floatval($wallet['WalletAccount']['balance']);
                $WalletAccount->id = $wallet['WalletAccount']['id'];
                $WalletAccount->saveField("balance", $currentBalance + $share);
                
                // Record transaction
                $WalletTransaction->create();
                $WalletTransaction->save(array(
                    "wallet_id" => $wallet['WalletAccount']['id'],
                    "user_id" => $lenderId,
                    "type" => "earning",
                    "amount" => $share,
                    "status" => "completed",
                    "reference_type" => "loan_repayment",
                    "reference_id" => $funding['id'],
                    "completed_at" => date("Y-m-d H:i:s")
                ));
                
                $distributions[] = array(
                    'lender_id' => $lenderId,
                    'amount' => round($share, 2),
                    'funding_id' => $funding['id']
                );
            }
        }
        
        return $distributions;
    }
    
    /**
     * Cancel a loan
     */
    public function cancel() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $loanId = $this->request->params["id"] ?? null;
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid loan ID'), 400);
        }
        
        $loan = $this->LoanRequest->find("first", array("conditions" => array("LoanRequest.id" => $loanId, "LoanRequest.borrower_id" => $userId)));
        if (!$loan) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan not found'), 404);
        }
        
        if (!in_array($loan["LoanRequest"]["status"], array("draft", "requested"))) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Cannot cancel this loan'), 400);
        }
        
        $this->LoanRequest->id = $loanId;
        $this->LoanRequest->saveField("status", "rejected");
        
        return $this->_jsonResponse(array("success" => true, "message" => "Loan cancelled"));
    }
    
    /**
     * Calculate LTV ratio
     */
    public function calculateLTV() {
        $loanAmount = floatval($this->request->query["loanAmount"] ?? 0);
        $collateralValue = floatval($this->request->query["collateralValue"] ?? 0);
        
        if ($collateralValue <= 0) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid values'), 400);
        }
        
        // Validate input ranges
        if ($loanAmount < 0 || $loanAmount > 10000000) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan amount out of range'), 400);
        }
        
        if ($collateralValue < 0 || $collateralValue > 100000000) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Collateral value out of range'), 400);
        }
        
        $ltv = ($loanAmount / $collateralValue) * 100;
        
        return $this->_jsonResponse(array("success" => true, "ltv" => round($ltv, 2), "loan_amount" => $loanAmount, "collateral_value" => $collateralValue));
    }
    
    /**
     * Get risk score for a user
     */
    public function getRiskScore() {
        $userId = $this->request->params["userId"] ?? null;
        
        if (!$userId || !is_numeric($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Valid User ID required'), 400);
        }
        
        $user = $this->User->find("first", array("conditions" => array("User.id" => $userId), "recursive" => -1));
        
        $score = 75;
        if ($user) {
            if ($user["User"]["kyc_status"] === "approved") $score += 10;
            if ($user["User"]["kyc_status"] === "pending") $score += 5;
        }
        
        return $this->_jsonResponse(array("success" => true, "risk_score" => $score, "user_id" => $userId));
    }
    
    /**
     * Get loan matches
     */
    public function matches() {
        $loanId = $this->request->params["id"] ?? null;
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Valid loan ID required'), 400);
        }
        
        $loan = $this->LoanRequest->find("first", array("conditions" => array("LoanRequest.id" => $loanId)));
        if (!$loan) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan not found'), 404);
        }
        
        return $this->_jsonResponse(array("success" => true, "matches" => array()));
    }
    
    /**
     * Get repayment schedule
     */
    public function repaymentSchedule() {
        $loanId = $this->request->params["id"] ?? null;
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Valid loan ID required'), 400);
        }
        
        $loan = $this->LoanRequest->find("first", array("conditions" => array("LoanRequest.id" => $loanId)));
        if (!$loan) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan not found'), 404);
        }
        
        $schedule = array();
        $amount = $loan["LoanRequest"]["loan_amount"];
        $rate = $loan["LoanRequest"]["interest_rate"] / 100 / 12;
        $months = $loan["LoanRequest"]["duration_months"] ?? 12;
        
        $monthlyPayment = $amount * $rate * pow(1 + $rate, $months) / (pow(1 + $rate, $months) - 1);
        
        for ($i = 1; $i <= $months; $i++) {
            $schedule[] = array(
                "payment_number" => $i,
                "amount" => round($monthlyPayment, 2),
                "due_date" => date("Y-m-d", strtotime("+" . $i . " months"))
            );
        }
        
        return $this->_jsonResponse(array("success" => true, "schedule" => $schedule));
    }
    
    /**
     * Upload collateral for a loan
     */
    public function uploadCollateral() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $loanId = $this->request->params["id"] ?? null;
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validate collateral data
        if (!$this->InputValidation->validateCollateral($data)) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $this->InputValidation->getErrors()
            ), 400);
        }
        
        $this->CollateralAsset->create();
        $collateralData = array(
            "CollateralAsset" => array(
                "borrower_id" => $userId,
                "loan_id" => $loanId,
                "type" => $data["type"] ?? "other",
                "description" => htmlspecialchars($data["description"] ?? "", ENT_QUOTES, 'UTF-8'),
                "estimated_value" => floatval($data["estimated_value"] ?? 0),
                "verification_status" => "pending"
            )
        );
        
        if ($this->CollateralAsset->save($collateralData)) {
            return $this->_jsonResponse(array("success" => true, "message" => "Collateral uploaded", "collateral_id" => $this->CollateralAsset->getLastInsertID()));
        }
        
        return $this->_jsonResponse(array("success" => false, "message" => "Upload failed"), 500);
    }
    
    /**
     * Get loan statistics - Uses LoanService
     */
    public function statistics() {
        // Try to get from cache first (PERF-01)
        $cacheKey = 'api:loans:statistics';
        App::uses('RedisCache', 'Lib');
        $cached = RedisCache::get($cacheKey);
        
        if ($cached !== null) {
            return $this->_jsonResponse(array(
                'success' => true,
                'statistics' => $cached,
                'cached' => true
            ));
        }
        
        // Use LoanService for business logic
        $statistics = $this->loanService->getStatistics();
        
        // Cache for 5 minutes
        RedisCache::set($cacheKey, $statistics, 300);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'statistics' => $statistics,
            'cached' => false
        ));
    }
    
    /**
     * Loan top-up
     */
    public function topup() {
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $loanId = $this->request->params["id"] ?? null;
        $data = json_decode(file_get_contents("php://input"), true);
        
        $amount = floatval($data["amount"] ?? 0);
        
        if (!$loanId || !is_numeric($loanId) || $amount <= 0) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid data'), 400);
        }
        
        // Validate amount
        if ($amount > 1000000) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Amount exceeds maximum allowed'), 400);
        }
        
        $loan = $this->LoanRequest->find("first", array("conditions" => array("LoanRequest.id" => $loanId, "LoanRequest.borrower_id" => $userId)));
        if (!$loan) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan not found'), 404);
        }
        
        $newAmount = $loan["LoanRequest"]["loan_amount"] + $amount;
        $this->LoanRequest->id = $loanId;
        $this->LoanRequest->saveField("loan_amount", $newAmount);
        
        return $this->_jsonResponse(array("success" => true, "message" => "Loan topup successful", "new_amount" => $newAmount));
    }
    
    // Admin endpoints - require admin role
    public function adminDashboardStats() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $pendingLoans = $this->LoanRequest->find("count", array("conditions" => array("LoanRequest.status" => "requested")));
        $pendingCollateral = $this->CollateralAsset->find("count", array("conditions" => array("CollateralAsset.verification_status" => "pending")));
        
        return $this->_jsonResponse(array("success" => true, "stats" => array("pending_loans" => $pendingLoans, "pending_collateral" => $pendingCollateral)));
    }
    
    public function adminPlatformStats() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        return $this->_jsonResponse(array("success" => true, "platform_stats" => array("total_volume" => 0, "active_users" => 0)));
    }
    
    public function reserveFundStatus() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        // FIN-02 FIX: Get reserve fund minimum from configuration
        App::uses('SecurityConfig', 'Config');
        $reserveFundMinimum = SecurityConfig::getReserveFundMinimum();
        
        $reserveFund = $this->ReserveFund->find('first');
        if (!$reserveFund) {
            $this->ReserveFund->create();
            // FIN-02 FIX: Use configurable minimum instead of hardcoded value
            $this->ReserveFund->save(array('balance' => $reserveFundMinimum, 'locked_balance' => 0, 'total_claims_paid' => 0, 'total_replenished' => $reserveFundMinimum, 'coverage_ratio' => 25.00));
            $reserveFund = $this->ReserveFund->find('first');
        }
        
        $activeLoansValue = $this->LoanRequest->find('first', array('fields' => array('SUM(loan_amount) as total'), 'conditions' => array('LoanRequest.status' => array('funded', 'active'))));
        $totalActiveLoans = floatval($activeLoansValue[0]['total'] ?? 0);
        $currentBalance = floatval($reserveFund['ReserveFund']['balance']);
        $calculatedCoverage = $totalActiveLoans > 0 ? round(($currentBalance / $totalActiveLoans) * 100, 2) : 0;
        
        $recentTransactions = $this->ReserveFundTransaction->find('all', array('order' => array('created_at' => 'DESC'), 'limit' => 10));
        
        return $this->_jsonResponse(array('success' => true, 'reserve_fund' => array(
            'balance' => $currentBalance,
            'locked_balance' => floatval($reserveFund['ReserveFund']['locked_balance']),
            'total_claims_paid' => floatval($reserveFund['ReserveFund']['total_claims_paid']),
            'total_replenished' => floatval($reserveFund['ReserveFund']['total_replenished']),
            'coverage_ratio' => $calculatedCoverage,
            'total_active_loans' => $totalActiveLoans,
            'recent_transactions' => $recentTransactions
        )));
    }
    
    public function depositToReserveFund() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $amount = floatval($data['amount'] ?? 0);
        
        if ($amount <= 0) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid amount'), 400);
        }
        
        $reserveFund = $this->ReserveFund->find('first');
        if (!$reserveFund) {
            $this->ReserveFund->create();
            $this->ReserveFund->save(array('balance' => $amount, 'locked_balance' => 0, 'total_claims_paid' => 0, 'total_replenished' => $amount, 'coverage_ratio' => 0));
        } else {
            $newBalance = floatval($reserveFund['ReserveFund']['balance']) + $amount;
            $newTotalReplenished = floatval($reserveFund['ReserveFund']['total_replenished']) + $amount;
            $this->ReserveFund->id = $reserveFund['ReserveFund']['id'];
            $this->ReserveFund->save(array('balance' => $newBalance, 'total_replenished' => $newTotalReplenished));
        }
        
        $this->ReserveFundTransaction->create();
        $this->ReserveFundTransaction->save(array('type' => 'deposit', 'amount' => $amount, 'description' => 'Manual deposit to reserve fund'));
        
        return $this->_jsonResponse(array('success' => true, 'message' => 'Deposit successful', 'amount' => $amount));
    }
    
    public function analyticsData() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $months = isset($this->request->query['months']) ? intval($this->request->query['months']) : 6;
        $monthlyData = array();
        
        for ($i = $months - 1; $i >= 0; $i--) {
            $monthStart = date('Y-m-01', strtotime("-" . $i . " months"));
            $monthEnd = date('Y-m-t', strtotime("-" . $i . " months"));
            
            $loanCount = $this->LoanRequest->find('count', array(
                'conditions' => array('LoanRequest.created_at >=' => $monthStart, 'LoanRequest.created_at <=' => $monthEnd, 'LoanRequest.status' => array('funded', 'active', 'repaid'))
            ));
            
            $loanVolume = $this->LoanRequest->find('first', array(
                'fields' => array('SUM(loan_amount) as total'),
                'conditions' => array('LoanRequest.created_at >=' => $monthStart, 'LoanRequest.created_at <=' => $monthEnd, 'LoanRequest.status' => array('funded', 'active', 'repaid'))
            ));
            
            $monthlyData[] = array('month' => date('M', strtotime("-" . $i . " months")), 'loans' => $loanCount, 'volume' => floatval($loanVolume[0]['total'] ?? 0));
        }
        
        return $this->_jsonResponse(array('success' => true, 'analytics' => array('monthly_data' => $monthlyData)));
    }
    
    public function pendingLoans() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        // Pagination parameters
        $page = isset($this->request->query['page']) ? max(1, intval($this->request->query['page'])) : 1;
        $limit = isset($this->request->query['limit']) ? min(max(1, intval($this->request->query['limit'])), 100) : 20;
        $offset = ($page - 1) * $limit;
        
        // Get total count
        $total = $this->LoanRequest->find('count', array(
            'conditions' => array('LoanRequest.status' => 'requested')
        ));
        
        $loans = $this->LoanRequest->find('all', array(
            'conditions' => array('LoanRequest.status' => 'requested'),
            'contain' => array('BorrowerProfile', 'CollateralAsset'),
            'limit' => $limit,
            'offset' => $offset,
            'order' => array('LoanRequest.created_at' => 'DESC')
        ));
        
        return $this->_paginatedResponse($loans, $page, $limit, $total);
    }
    
    public function approve() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $loanId = $this->request->params["id"] ?? null;
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid loan ID'), 400);
        }
        
        // Use LoanService for business logic
        $result = $this->loanService->approveLoan($loanId);
        
        return $this->_jsonResponse($result, $result['success'] ? 200 : 400);
    }
    
    public function reject() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $loanId = $this->request->params["id"] ?? null;
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid loan ID'), 400);
        }
        
        // Use LoanService for business logic
        $reason = $this->request->data['reason'] ?? '';
        $result = $this->loanService->rejectLoan($loanId, $reason);
        
        return $this->_jsonResponse($result, $result['success'] ? 200 : 400);
    }
    
    public function pendingCollateral() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        // Pagination parameters
        $page = isset($this->request->query['page']) ? max(1, intval($this->request->query['page'])) : 1;
        $limit = isset($this->request->query['limit']) ? min(max(1, intval($this->request->query['limit'])), 100) : 20;
        $offset = ($page - 1) * $limit;
        
        // Get total count
        $total = $this->CollateralAsset->find('count', array(
            'conditions' => array('CollateralAsset.verification_status' => 'pending')
        ));
        
        $collateral = $this->CollateralAsset->find('all', array(
            'conditions' => array('CollateralAsset.verification_status' => 'pending'),
            'limit' => $limit,
            'offset' => $offset,
            'order' => array('CollateralAsset.created_at' => 'DESC')
        ));
        
        return $this->_paginatedResponse($collateral, $page, $limit, $total);
    }
    
    public function verifyCollateral() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $id = $this->request->params["id"] ?? null;
        
        if (!$id || !is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid collateral ID'), 400);
        }
        
        $this->CollateralAsset->id = $id;
        $this->CollateralAsset->saveField("verification_status", "verified");
        $this->CollateralAsset->saveField("verified_at", date("Y-m-d H:i:s"));
        
        return $this->_jsonResponse(array("success" => true, "message" => "Collateral verified"));
    }
    
    public function rejectCollateral() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $id = $this->request->params["id"] ?? null;
        
        if (!$id || !is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid collateral ID'), 400);
        }
        
        $this->CollateralAsset->id = $id;
        $this->CollateralAsset->saveField("verification_status", "rejected");
        
        return $this->_jsonResponse(array("success" => true, "message" => "Collateral rejected"));
    }
    
    public function defaultedLoans() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        // Pagination parameters
        $page = isset($this->request->query['page']) ? max(1, intval($this->request->query['page'])) : 1;
        $limit = isset($this->request->query['limit']) ? min(max(1, intval($this->request->query['limit'])), 100) : 20;
        $offset = ($page - 1) * $limit;
        
        // Get total count
        $total = $this->LoanRequest->find('count', array(
            'conditions' => array('LoanRequest.status' => 'defaulted')
        ));
        
        $loans = $this->LoanRequest->find('all', array(
            'conditions' => array('LoanRequest.status' => 'defaulted'),
            'contain' => array('BorrowerProfile', 'CollateralAsset', 'Repayment'),
            'limit' => $limit,
            'offset' => $offset,
            'order' => array('LoanRequest.defaulted_at' => 'DESC')
        ));
        
        return $this->_paginatedResponse($loans, $page, $limit, $total);
    }
    
    public function initiateDefault() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $loanId = $this->request->params["id"] ?? null;
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid loan ID'), 400);
        }
        
        $this->LoanRequest->id = $loanId;
        $this->LoanRequest->saveField("status", "defaulted");
        $this->LoanRequest->saveField("defaulted_at", date("Y-m-d H:i:s"));
        
        return $this->_jsonResponse(array("success" => true, "message" => "Default proceedings initiated"));
    }
    
    public function sendToRecovery() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $loanId = $this->request->params["id"] ?? null;
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid loan ID'), 400);
        }
        
        $this->LoanRequest->id = $loanId;
        $this->LoanRequest->saveField("status", "platform_settled");
        
        return $this->_jsonResponse(array("success" => true, "message" => "Sent to recovery"));
    }
    
    public function processClaim() {
        return $this->_jsonResponse(array("success" => true, "message" => "Claim processed"));
    }
    
    /**
     * Create new loan - Delegates to LoanService
     */
    private function createLoan() {
        // Apply rate limiting for write operations
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validate loan data
        if (!$this->InputValidation->validateLoan($data)) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $this->InputValidation->getErrors()
            ), 400);
        }
        
        // Use LoanService for business logic
        $result = $this->loanService->createLoan($userId, $data);
        
        if ($result['success']) {
            // Calculate origination fee for response
            $loanAmount = floatval($data["loan_amount"]);
            App::uses('SecurityConfig', 'Config');
            $originationFeePercent = SecurityConfig::getOriginationFeePercent();
            $originationFee = round($loanAmount * ($originationFeePercent / 100), 2);
            $netLoanAmount = $loanAmount - $originationFee;
            
            // Record origination fee
            $this->_recordOriginationFee($result['loan_id'], $originationFee, $loanAmount);
            
            return $this->_jsonResponse(array(
                "success" => true, 
                "loan_id" => $result['loan_id'],
                "loan_amount" => $loanAmount,
                "origination_fee" => $originationFee,
                "origination_fee_percent" => $originationFeePercent,
                "net_amount" => $netLoanAmount,
                "status" => $result['status']
            ));
        }
        
        return $this->_jsonResponse(array("success" => false, "message" => $result['message'] ?? "Failed to create loan"), 500);
    }
    
    /**
     * FIN-01 FIX: Record origination fee transaction
     */
    private function _recordOriginationFee($loanId, $feeAmount, $loanAmount) {
        if ($feeAmount <= 0) {
            return;
        }
        
        App::uses('ReserveFund', 'Model');
        $this->ReserveFund = ClassRegistry::init('ReserveFund');
        
        // Add to reserve fund as income
        $reserveFund = $this->ReserveFund->find('first');
        if ($reserveFund) {
            $currentBalance = floatval($reserveFund['ReserveFund']['balance'] ?? 0);
            $this->ReserveFund->id = $reserveFund['ReserveFund']['id'];
            $this->ReserveFund->saveField('balance', $currentBalance + $feeAmount);
        }
        
        // Record transaction
        App::uses('ReserveFundTransaction', 'Model');
        $this->ReserveFundTransaction = ClassRegistry::init('ReserveFundTransaction');
        $this->ReserveFundTransaction->create();
        $this->ReserveFundTransaction->save(array(
            'type' => 'fee_income',
            'amount' => $feeAmount,
            'loan_id' => $loanId,
            'description' => "Origination fee from loan #$loanId (loan amount: $loanAmount)"
        ));
    }
    
    /**
     * Get all loans with optional filtering
     */
    private function getLoans() {
        $status = $this->request->query['status'] ?? null;
        $conditions = array();
        
        // Only show approved/active loans to public
        if ($status) {
            // Validate status
            $allowedStatuses = array('draft', 'requested', 'approved', 'rejected', 'funded', 'active', 'repaid', 'defaulted');
            if (!in_array($status, $allowedStatuses)) {
                return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid status'), 400);
            }
            $conditions['LoanRequest.status'] = $status;
        }
        
        // Pagination parameters
        $page = isset($this->request->query['page']) ? max(1, intval($this->request->query['page'])) : 1;
        $limit = isset($this->request->query['limit']) ? min(max(1, intval($this->request->query['limit'])), 100) : 20;
        $offset = ($page - 1) * $limit;
        
        // Get total count
        $total = $this->LoanRequest->find('count', array('conditions' => $conditions));
        
        $loans = $this->LoanRequest->find('all', array(
            'conditions' => $conditions,
            'contain' => array('BorrowerProfile', 'CollateralAsset'),
            'order' => array('LoanRequest.created_at' => 'DESC'),
            'limit' => $limit,
            'offset' => $offset
        ));
        
        return $this->_paginatedResponse($loans, $page, $limit, $total);
    }
    
    /**
     * Get current user ID from JWT token
     * Uses the trait method from ApiBaseControllerTrait
     */
    private function _getCurrentUserId() {
        return parent::_getCurrentUserId();
    }
    
    /**
     * Check if user is admin
     * Uses the trait method from ApiBaseControllerTrait
     */
    private function _isAdmin($userId) {
        $user = $this->User->find("first", array(
            "conditions" => array("User.id" => $userId),
            "fields" => array("role"),
            "recursive" => -1
        ));
        
        return $user && $user['User']['role'] === 'admin';
    }
    
    /**
     * Trigger accelerator for a loan after funding update
     */
    private function _triggerAccelerator($loanId) {
        // Load accelerator model if not already loaded
        if (!isset($this->LoanFundingAccelerator)) {
            App::uses('LoanFundingAccelerator', 'Model');
            $this->LoanFundingAccelerator = new LoanFundingAccelerator();
        }
        if (!isset($this->AcceleratorLog)) {
            App::uses('AcceleratorLog', 'Model');
            $this->AcceleratorLog = new AcceleratorLog();
        }
        
        $loan = $this->LoanRequest->find("first", array(
            "conditions" => array("LoanRequest.id" => $loanId)
        ));
        
        if (!$loan) {
            return false;
        }
        
        $totalAmount = floatval($loan["LoanRequest"]["loan_amount"]);
        $fundedAmount = floatval($loan["LoanRequest"]["funded_amount"]);
        $fundingPercentage = $totalAmount > 0 ? round(($fundedAmount / $totalAmount) * 100, 2) : 0;
        
        // Default thresholds
        $trendingThreshold = 50;
        $notificationThreshold = 75;
        $liquidityPoolThreshold = 90;
        
        // Get or create accelerator record
        $accelerator = $this->LoanFundingAccelerator->find("first", array(
            "conditions" => array("LoanFundingAccelerator.loan_id" => $loanId)
        ));
        
        if (!$accelerator) {
            $this->LoanFundingAccelerator->create();
            $this->LoanFundingAccelerator->save(array(
                "loan_id" => $loanId,
                "total_amount" => $totalAmount,
                "funded_amount" => $fundedAmount,
                "funding_percentage" => $fundingPercentage
            ));
            $acceleratorId = $this->LoanFundingAccelerator->getLastInsertID();
        } else {
            $acceleratorId = $accelerator["LoanFundingAccelerator"]["id"];
            $this->LoanFundingAccelerator->id = $acceleratorId;
            $this->LoanFundingAccelerator->save(array(
                "funded_amount" => $fundedAmount,
                "funding_percentage" => $fundingPercentage
            ));
        }
        
        // Determine new stage
        $newStage = "none";
        $isTrending = false;
        $isFeatured = false;
        
        if ($fundingPercentage >= $liquidityPoolThreshold) {
            $newStage = "almost_funded";
        } elseif ($fundingPercentage >= $notificationThreshold) {
            $newStage = "hot";
            $isFeatured = true;
        } elseif ($fundingPercentage >= $trendingThreshold) {
            $newStage = "trending";
            $isTrending = true;
        }
        
        // Check if stage changed
        $currentStage = $accelerator["LoanFundingAccelerator"]["accelerator_stage"] ?? "none";
        
        if ($newStage !== $currentStage && $newStage !== "none") {
            $this->LoanFundingAccelerator->id = $acceleratorId;
            $this->LoanFundingAccelerator->saveField("accelerator_stage", $newStage);
            
            // Log stage change
            $this->AcceleratorLog->create();
            $this->AcceleratorLog->save(array(
                "loan_id" => $loanId,
                "stage_triggered" => $newStage,
                "funding_percentage" => $fundingPercentage,
                "action_taken" => "Auto-triggered from loan funding",
                "triggered_by" => "system"
            ));
        }
        
        // Update trending/featured status
        $this->LoanFundingAccelerator->id = $acceleratorId;
        $this->LoanFundingAccelerator->save(array(
            "is_trending" => $isTrending,
            "is_featured" => $isFeatured
        ));
        
        return true;
    }
    
    /**
     * JSON response helper
     */
    private function _jsonResponse($data, $code = 200) {
        http_response_code($code);
        header("Content-Type: application/json");
        header("X-Content-Type-Options: nosniff");
        header("X-Frame-Options: DENY");
        header("X-XSS-Protection: 1; mode=block");
        echo json_encode($data);
        exit;
    }
}
