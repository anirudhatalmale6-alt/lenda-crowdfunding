<?php
App::uses("AppController", "Controller");
App::uses('ConnectionManager', 'Core');

/**
 * LENDA Risk Engine API Controller
 * 
 * Provides endpoints for:
 * - Borrower Risk Scoring
 * - Collateral Valuation
 * - Loan-to-Value Enforcement
 * - Exposure Limit Controller
 * - Default Prediction Model
 * - Risk Monitoring Dashboard
 */
class ApiRiskEngineController extends AppController {
    use ApiBaseControllerTrait;
    
    public $name = "ApiRiskEngine";
    public $layout = null;
    public $autoRender = false;
    
    // Risk Categories
    const CATEGORY_AAA = 'AAA';
    const CATEGORY_AA = 'AA';
    const CATEGORY_A = 'A';
    const CATEGORY_BBB = 'BBB';
    const CATEGORY_BB = 'BB';
    const CATEGORY_HIGH_RISK = 'high_risk';
    
    // Risk Status
    const STATUS_HEALTHY = 'healthy';
    const STATUS_WATCHLIST = 'watchlist';
    const STATUS_HIGH_RISK = 'high_risk';
    const STATUS_DEFAULT_IMMINENT = 'default_imminent';
    const STATUS_DEFAULTED = 'defaulted';
    
    // Default LTV by risk category
    private $ltvConfig = [
        'AAA' => 70,
        'AA' => 65,
        'A' => 60,
        'BBB' => 55,
        'BB' => 50,
        'high_risk' => 40
    ];
    
    // Exposure limits (percentages)
    private $exposureConfig = [
        'max_borrower_exposure' => 5, // 5% of total marketplace capital
        'max_loan_exposure' => 2     // 2% max per loan
    ];
    
    public function beforeFilter() {
        parent::beforeFilter();
        // Public endpoints
        $this->Auth->allow([
            'getBorrowerRiskScore',
            'getCollateralValuation',
            'calculateLTV',
            'getLoanRiskStatus',
            'validateLoanRequest'
        ]);
    }
    
    /**
     * ============================================================
     * BORROWER RISK SCORING ENGINE
     * ============================================================
     */
    
    /**
     * GET /api/risk/borrower/score/:userId
     * Get borrower risk score and category
     */
    public function getBorrowerRiskScore() {
        $userId = $this->request->params["userId"] ?? null;
        
        if (!$userId || !is_numeric($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid User ID required'], 400);
        }
        
        // Try to get existing risk profile
        App::uses('BorrowerRiskProfile', 'Model');
        $this->BorrowerRiskProfile = new BorrowerRiskProfile();
        
        $profile = $this->BorrowerRiskProfile->find('first', [
            'conditions' => ['BorrowerRiskProfile.user_id' => $userId]
        ]);
        
        if (!$profile) {
            // Calculate new risk score
            return $this->_jsonResponse($this->_calculateBorrowerRiskScore($userId));
        }
        
        return $this->_jsonResponse([
            'success' => true,
            'user_id' => $userId,
            'risk_score' => intval($profile['BorrowerRiskProfile']['risk_score']),
            'risk_category' => $profile['BorrowerRiskProfile']['risk_category'],
            'positive_factors' => json_decode($profile['BorrowerRiskProfile']['positive_factors'] ?? '[]', true),
            'risk_factors' => json_decode($profile['BorrowerRiskProfile']['risk_factors'] ?? '[]', true),
            'factors' => [
                'repayment_history' => floatval($profile['BorrowerRiskProfile']['repayment_history_score']),
                'collateral_strength' => floatval($profile['BorrowerRiskProfile']['collateral_strength_score']),
                'income_verification' => floatval($profile['BorrowerRiskProfile']['income_verification_score']),
                'platform_reputation' => floatval($profile['BorrowerRiskProfile']['platform_reputation_score'])
            ],
            'last_updated' => $profile['BorrowerRiskProfile']['last_calculated_at']
        ]);
    }
    
    /**
     * POST /api/risk/borrower/calculate
     * Calculate/Recalculate borrower risk score
     */
    public function calculateBorrowerRiskScore() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        return $this->_jsonResponse($this->_calculateBorrowerRiskScore($userId));
    }
    
    /**
     * Internal: Calculate borrower risk score
     */
    private function _calculateBorrowerRiskScore($userId) {
        App::uses('User', 'Model');
        App::uses('BorrowerProfile', 'Model');
        App::uses('LoanRequest', 'Model');
        App::uses('CollateralAsset', 'Model');
        App::uses('BorrowerRiskProfile', 'Model');
        
        $this->User = new User();
        $this->BorrowerProfile = new BorrowerProfile();
        $this->LoanRequest = new LoanRequest();
        $this->CollateralAsset = new CollateralAsset();
        $this->BorrowerRiskProfile = new BorrowerRiskProfile();
        
        // Get user data
        $user = $this->User->find('first', [
            'conditions' => ['User.id' => $userId],
            'recursive' => -1
        ]);
        
        if (!$user) {
            return ['success' => false, 'message' => 'User not found'];
        }
        
        // Initialize scores
        $identityVerified = ($user['User']['kyc_status'] === 'approved');
        $identityScore = $identityVerified ? 100 : 20;
        
        // Get borrower profile for income
        $borrowerProfile = $this->BorrowerProfile->find('first', [
            'conditions' => ['BorrowerProfile.user_id' => $userId]
        ]);
        
        $incomeVerified = $borrowerProfile && $borrowerProfile['BorrowerProfile']['income_verified'];
        $monthlyIncome = floatval($borrowerProfile['BorrowerProfile']['annual_revenue'] ?? 0) / 12;
        $incomeScore = $incomeVerified ? ($monthlyIncome > 10000 ? 100 : $monthlyIncome > 5000 ? 80 : 60) : 30;
        
        // Calculate repayment history score
        $loans = $this->LoanRequest->find('all', [
            'conditions' => [
                'LoanRequest.borrower_id' => $userId,
                'LoanRequest.status' => ['repaid', 'active', 'funded']
            ]
        ]);
        
        $totalLoans = count($loans);
        $repaidLoans = 0;
        $defaultedLoans = 0;
        $totalBorrowed = 0;
        $totalRepaid = 0;
        
        foreach ($loans as $loan) {
            $totalBorrowed += floatval($loan['LoanRequest']['loan_amount']);
            if ($loan['LoanRequest']['status'] === 'repaid') {
                $repaidLoans++;
                $totalRepaid += floatval($loan['LoanRequest']['loan_amount']);
            } elseif ($loan['LoanRequest']['status'] === 'defaulted') {
                $defaultedLoans++;
            }
        }
        
        // Repayment history score (0-100)
        if ($totalLoans === 0) {
            $repaymentScore = 50; // Neutral for new borrowers
        } else {
            $successRate = ($repaidLoans / $totalLoans) * 100;
            $repaymentScore = min(100, $successRate);
        }
        
        // Get collateral
        $collateral = $this->CollateralAsset->find('all', [
            'conditions' => [
                'CollateralAsset.borrower_id' => $userId,
                'CollateralAsset.verification_status' => 'verified'
            ]
        ]);
        
        $collateralValue = 0;
        foreach ($collateral as $c) {
            $collateralValue += floatval($c['CollateralAsset']['estimated_value']);
        }
        
        $collateralScore = count($collateral) > 0 ? min(100, ($collateralValue / max(1, $totalBorrowed)) * 100) : 20;
        
        // Loan size relative to income
        $debtToIncomeRatio = $totalBorrowed > 0 && $monthlyIncome > 0 
            ? ($totalBorrowed / 12) / $monthlyIncome 
            : 0;
        
        // Calculate overall score (weighted average)
        $overallScore = round(
            ($identityScore * 0.15) +
            ($incomeScore * 0.20) +
            ($repaymentScore * 0.30) +
            ($collateralScore * 0.25) +
            ($totalLoans > 0 ? min(100, ($repaidLoans / $totalLoans) * 100) * 0.10 : 50 * 0.10)
        );
        
        // Determine risk category
        $category = $this->_getRiskCategory($overallScore);
        
        // Collect positive and risk factors
        $positiveFactors = [];
        $riskFactors = [];
        
        if ($identityVerified) {
            $positiveFactors[] = 'Verified identity';
        }
        if ($incomeVerified) {
            $positiveFactors[] = 'Verified income';
        }
        if ($repaidLoans > 0) {
            $positiveFactors[] = "Successfully repaid $repaidLoans loan(s)";
        }
        if ($collateralValue > $totalBorrowed * 0.5) {
            $positiveFactors[] = 'Strong collateral coverage';
        }
        
        if ($defaultedLoans > 0) {
            $riskFactors[] = "$defaultedLoans previous default(s)";
        }
        if ($debtToIncomeRatio > 0.4) {
            $riskFactors[] = 'High debt-to-income ratio';
        }
        if ($totalLoans === 0 && $monthlyIncome > 0) {
            $riskFactors[] = 'New borrower with no history';
        }
        if ($collateralScore < 50) {
            $riskFactors[] = 'Weak or no collateral';
        }
        
        // Save or update risk profile
        $existingProfile = $this->BorrowerRiskProfile->find('first', [
            'conditions' => ['BorrowerRiskProfile.user_id' => $userId]
        ]);
        
        if ($existingProfile) {
            $this->BorrowerRiskProfile->id = $existingProfile['BorrowerRiskProfile']['id'];
        } else {
            $this->BorrowerRiskProfile->create();
        }
        
        $this->BorrowerRiskProfile->save([
            'user_id' => $userId,
            'risk_score' => $overallScore,
            'risk_category' => $category,
            'identity_verified' => $identityVerified,
            'income_verified' => $incomeVerified,
            'repayment_history_score' => $repaymentScore,
            'collateral_strength_score' => $collateralScore,
            'income_verification_score' => $incomeScore,
            'platform_reputation_score' => $totalLoans > 0 ? ($repaidLoans / $totalLoans) * 100 : 50,
            'total_loans' => $totalLoans,
            'successful_loans' => $repaidLoans,
            'defaulted_loans' => $defaultedLoans,
            'current_total_debt' => $totalBorrowed - $totalRepaid,
            'monthly_income' => $monthlyIncome,
            'positive_factors' => json_encode($positiveFactors),
            'risk_factors' => json_encode($riskFactors)
        ]);
        
        return [
            'success' => true,
            'user_id' => $userId,
            'risk_score' => $overallScore,
            'risk_category' => $category,
            'positive_factors' => $positiveFactors,
            'risk_factors' => $riskFactors,
            'factors' => [
                'identity' => $identityScore,
                'income' => $incomeScore,
                'repayment_history' => $repaymentScore,
                'collateral_strength' => $collateralScore
            ]
        ];
    }
    
    /**
     * Get risk category from score
     */
    private function _getRiskCategory($score) {
        if ($score >= 80) return self::CATEGORY_AAA;
        if ($score >= 65) return self::CATEGORY_AA;
        if ($score >= 50) return self::CATEGORY_A;
        if ($score >= 35) return self::CATEGORY_BBB;
        if ($score >= 20) return self::CATEGORY_BB;
        return self::CATEGORY_HIGH_RISK;
    }
    
    /**
     * ============================================================
     * COLLATERAL VALUATION ENGINE
     * ============================================================
     */
    
    /**
     * POST /api/risk/collateral/verify
     * Verify collateral and create valuation
     */
    public function verifyCollateral() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        $collateralId = $this->request->params["id"] ?? null;
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$collateralId || !is_numeric($collateralId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid collateral ID required'], 400);
        }
        
        App::uses('CollateralAsset', 'Model');
        App::uses('CollateralValuation', 'Model');
        
        $this->CollateralAsset = new CollateralAsset();
        $this->CollateralValuation = new CollateralValuation();
        
        $collateral = $this->CollateralAsset->find('first', [
            'conditions' => ['CollateralAsset.id' => $collateralId]
        ]);
        
        if (!$collateral) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Collateral not found'], 404);
        }
        
        // Get valuation data from request
        $estimatedValue = floatval($data['estimated_value'] ?? $collateral['CollateralAsset']['estimated_value']);
        $liquidationValue = floatval($data['liquidation_value'] ?? $estimatedValue * 0.7);
        $marketValue = floatval($data['market_value'] ?? $estimatedValue);
        
        // Determine verification status
        $status = $data['status'] ?? 'verified';
        
        // Update collateral
        $this->CollateralAsset->id = $collateralId;
        $this->CollateralAsset->save([
            'verification_status' => $status,
            'verified_at' => $status === 'verified' ? date('Y-m-d H:i:s') : null,
            'estimated_value' => $estimatedValue,
            'rejection_reason' => $status === 'rejected' ? ($data['rejection_reason'] ?? 'Verification failed') : null
        ]);
        
        // Create valuation record
        $this->CollateralValuation->create();
        $this->CollateralValuation->save([
            'collateral_id' => $collateralId,
            'valuation_type' => 'initial',
            'estimated_value' => $estimatedValue,
            'liquidation_value' => $liquidationValue,
            'market_value' => $marketValue,
            'appraiser_name' => $data['appraiser_name'] ?? 'LENDA Verification System',
            'appraisal_method' => $data['appraisal_method'] ?? 'automated',
            'valuation_notes' => $data['notes'] ?? 'Initial collateral verification'
        ]);
        
        return $this->_jsonResponse([
            'success' => true,
            'message' => 'Collateral verified successfully',
            'collateral_id' => $collateralId,
            'estimated_value' => $estimatedValue,
            'liquidation_value' => $liquidationValue,
            'verification_status' => $status
        ]);
    }
    
    /**
     * GET /api/risk/collateral/valuation/:collateralId
     * Get collateral valuation details
     */
    public function getCollateralValuation() {
        $collateralId = $this->request->params["collateralId"] ?? null;
        
        if (!$collateralId || !is_numeric($collateralId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid collateral ID required'], 400);
        }
        
        App::uses('CollateralAsset', 'Model');
        App::uses('CollateralValuation', 'Model');
        
        $this->CollateralAsset = new CollateralAsset();
        $this->CollateralValuation = new CollateralValuation();
        
        $collateral = $this->CollateralAsset->find('first', [
            'conditions' => ['CollateralAsset.id' => $collateralId]
        ]);
        
        if (!$collateral) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Collateral not found'], 404);
        }
        
        $valuations = $this->CollateralValuation->find('all', [
            'conditions' => ['CollateralValuation.collateral_id' => $collateralId],
            'order' => ['CollateralValuation.created_at' => 'DESC']
        ]);
        
        $latestValuation = !empty($valuations) ? $valuations[0]['CollateralValuation'] : null;
        
        return $this->_jsonResponse([
            'success' => true,
            'collateral' => [
                'id' => $collateral['CollateralAsset']['id'],
                'type' => $collateral['CollateralAsset']['type'],
                'description' => $collateral['CollateralAsset']['description'],
                'verification_status' => $collateral['CollateralAsset']['verification_status'],
                'estimated_value' => floatval($collateral['CollateralAsset']['estimated_value']),
                'storage_location' => $collateral['CollateralAsset']['storage_location'],
                'images' => json_decode($collateral['CollateralAsset']['images'] ?? '[]', true),
                'documents' => json_decode($collateral['CollateralAsset']['documents'] ?? '[]', true)
            ],
            'latest_valuation' => $latestValuation ? [
                'estimated_value' => floatval($latestValuation['estimated_value']),
                'liquidation_value' => floatval($latestValuation['liquidation_value']),
                'market_value' => floatval($latestValuation['market_value']),
                'depreciation_rate' => floatval($latestValuation['depreciation_rate']),
                'appraiser' => $latestValuation['appraiser_name'],
                'method' => $latestValuation['appraisal_method'],
                'valuation_date' => $latestValuation['valuation_date'],
                'notes' => $latestValuation['valuation_notes']
            ] : null,
            'valuation_history' => array_map(function($v) {
                return [
                    'valuation_type' => $v['CollateralValuation']['valuation_type'],
                    'estimated_value' => floatval($v['CollateralValuation']['estimated_value']),
                    'liquidation_value' => floatval($v['CollateralValuation']['liquidation_value']),
                    'valuation_date' => $v['CollateralValuation']['valuation_date']
                ];
            }, $valuations)
        ]);
    }
    
    /**
     * ============================================================
     * LOAN-TO-VALUE ENFORCEMENT
     * ============================================================
     */
    
    /**
     * GET /api/risk/ltv/calculate
     * Calculate LTV ratio
     */
    public function calculateLTV() {
        $loanAmount = floatval($this->request->query["loanAmount"] ?? 0);
        $collateralValue = floatval($this->request->query["collateralValue"] ?? 0);
        $riskCategory = $this->request->query["riskCategory"] ?? 'A';
        
        if ($loanAmount <= 0 || $collateralValue <= 0) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Invalid values'], 400);
        }
        
        $ltv = ($loanAmount / $collateralValue) * 100;
        $maxLtv = $this->ltvConfig[$riskCategory] ?? 60;
        
        $status = 'safe';
        if ($ltv > $maxLtv) {
            $status = 'exceeds';
        } elseif ($ltv > $maxLtv - 10) {
            $status = 'caution';
        }
        
        return $this->_jsonResponse([
            'success' => true,
            'ltv_ratio' => round($ltv, 2),
            'max_allowed_ltv' => $maxLtv,
            'status' => $status,
            'collateral_value' => $collateralValue,
            'loan_amount' => $loanAmount,
            'risk_category' => $riskCategory
        ]);
    }
    
    /**
     * POST /api/risk/ltv/validate
     * Validate loan request against LTV rules
     */
    public function validateLTV() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $loanAmount = floatval($data['loan_amount'] ?? 0);
        $collateralValue = floatval($data['collateral_value'] ?? 0);
        $riskCategory = $data['risk_category'] ?? 'A';
        
        if ($loanAmount <= 0 || $collateralValue <= 0) {
            return $this->_jsonResponse([
                'success' => false,
                'valid' => false,
                'message' => 'Invalid loan or collateral values'
            ], 400);
        }
        
        $ltv = ($loanAmount / $collateralValue) * 100;
        $maxLtv = $this->ltvConfig[$riskCategory] ?? 60;
        
        $isValid = $ltv <= $maxLtv;
        
        return $this->_jsonResponse([
            'success' => true,
            'valid' => $isValid,
            'ltv_ratio' => round($ltv, 2),
            'max_allowed_ltv' => $maxLtv,
            'message' => $isValid 
                ? 'LTV is within acceptable range' 
                : "LTV ($ltv%) exceeds maximum allowed ($maxLtv%) for $riskCategory risk category",
            'recommendation' => $isValid 
                ? null 
                : [
                    'reduce_loan_by' => round($loanAmount - ($collateralValue * $maxLtv / 100), 2),
                    'increase_collateral_by' => round(($loanAmount / ($maxLtv / 100)) - $collateralValue, 2)
                ]
        ]);
    }
    
    /**
     * ============================================================
     * EXPOSURE LIMIT CONTROLLER
     * ============================================================
     */
    
    /**
     * POST /api/risk/exposure/validate
     * Validate loan against exposure limits
     */
    public function validateExposure() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        $loanAmount = floatval($data['loan_amount'] ?? 0);
        $borrowerId = intval($data['borrower_id'] ?? $userId);
        
        App::uses('LoanRequest', 'Model');
        App::uses('ReserveFund', 'Model');
        
        $this->LoanRequest = new LoanRequest();
        $this->ReserveFund = new ReserveFund();
        
        // FIN-02 FIX: Get total marketplace capital using configurable reserve fund minimum
        App::uses('SecurityConfig', 'Config');
        $reserveFundMinimum = SecurityConfig::getReserveFundMinimum();
        
        $reserveFund = $this->ReserveFund->find('first');
        $totalCapital = floatval($reserveFund['ReserveFund']['balance'] ?? $reserveFundMinimum);
        
        // Get borrower's current total exposure
        $borrowerLoans = $this->LoanRequest->find('all', [
            'conditions' => [
                'LoanRequest.borrower_id' => $borrowerId,
                'LoanRequest.status' => ['funded', 'active']
            ]
        ]);
        
        $borrowerCurrentExposure = 0;
        foreach ($borrowerLoans as $loan) {
            $borrowerCurrentExposure += floatval($loan['LoanRequest']['loan_amount']);
        }
        
        $borrowerNewExposure = $borrowerCurrentExposure + $loanAmount;
        $borrowerExposureLimit = $totalCapital * ($this->exposureConfig['max_borrower_exposure'] / 100);
        
        $borrowerValid = $borrowerNewExposure <= $borrowerExposureLimit;
        
        // Check loan exposure limit
        $loanExposureLimit = $totalCapital * ($this->exposureConfig['max_loan_exposure'] / 100);
        $loanValid = $loanAmount <= $loanExposureLimit;
        
        return $this->_jsonResponse([
            'success' => true,
            'valid' => $borrowerValid && $loanValid,
            'borrower_exposure' => [
                'current' => round($borrowerCurrentExposure, 2),
                'requested' => round($loanAmount, 2),
                'new_total' => round($borrowerNewExposure, 2),
                'limit' => round($borrowerExposureLimit, 2),
                'limit_percentage' => $this->exposureConfig['max_borrower_exposure'],
                'valid' => $borrowerValid
            ],
            'loan_exposure' => [
                'requested' => round($loanAmount, 2),
                'limit' => round($loanExposureLimit, 2),
                'limit_percentage' => $this->exposureConfig['max_loan_exposure'],
                'valid' => $loanValid
            ],
            'message' => ($borrowerValid && $loanValid) 
                ? 'Exposure limits validated successfully' 
                : 'Exposure limits exceeded'
        ]);
    }
    
    /**
     * ============================================================
     * DEFAULT PREDICTION MODEL
     * ============================================================
     */
    
    /**
     * GET /api/risk/loan/status/:loanId
     * Get loan risk status
     */
    public function getLoanRiskStatus() {
        $loanId = $this->request->params["loanId"] ?? null;
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid loan ID required'], 400);
        }
        
        App::uses('LoanRiskStatus', 'Model');
        $this->LoanRiskStatus = new LoanRiskStatus();
        
        $riskStatus = $this->LoanRiskStatus->find('first', [
            'conditions' => ['LoanRiskStatus.loan_id' => $loanId]
        ]);
        
        if (!$riskStatus) {
            // Calculate risk status
            return $this->_jsonResponse($this->_calculateLoanRiskStatus($loanId));
        }
        
        return $this->_jsonResponse([
            'success' => true,
            'loan_id' => $loanId,
            'risk_status' => $riskStatus['LoanRiskStatus']['risk_status'],
            'default_probability' => floatval($riskStatus['LoanRiskStatus']['default_probability']),
            'risk_score' => floatval($riskStatus['LoanRiskStatus']['risk_score']),
            'risk_trend' => $riskStatus['LoanRiskStatus']['risk_trend'],
            'missed_payments' => intval($riskStatus['LoanRiskStatus']['missed_payments']),
            'days_past_due' => intval($riskStatus['LoanRiskStatus']['days_past_due']),
            'debt_to_income_ratio' => floatval($riskStatus['LoanRiskStatus']['debt_to_income_ratio']),
            'risk_factors' => json_decode($riskStatus['LoanRiskStatus']['risk_factors'] ?? '[]', true),
            'last_analysis' => $riskStatus['LoanRiskStatus']['last_analysis_at']
        ]);
    }
    
    /**
     * POST /api/risk/loan/analyze/:loanId
     * Analyze and update loan risk status
     */
    public function analyzeLoanRisk() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        $loanId = $this->request->params["loanId"] ?? null;
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid loan ID required'], 400);
        }
        
        return $this->_jsonResponse($this->_calculateLoanRiskStatus($loanId));
    }
    
    /**
     * Internal: Calculate loan risk status
     */
    private function _calculateLoanRiskStatus($loanId) {
        App::uses('LoanRequest', 'Model');
        App::uses('Repayment', 'Model');
        App::uses('CollateralAsset', 'Model');
        App::uses('LoanRiskStatus', 'Model');
        App::uses('BorrowerProfile', 'Model');
        
        $this->LoanRequest = new LoanRequest();
        $this->Repayment = new Repayment();
        $this->CollateralAsset = new CollateralAsset();
        $this->LoanRiskStatus = new LoanRiskStatus();
        $this->BorrowerProfile = new BorrowerProfile();
        
        $loan = $this->LoanRequest->find('first', [
            'conditions' => ['LoanRequest.id' => $loanId]
        ]);
        
        if (!$loan) {
            return ['success' => false, 'message' => 'Loan not found'];
        }
        
        // Get repayments
        $repayments = $this->Repayment->find('all', [
            'conditions' => ['Repayment.loan_id' => $loanId],
            'order' => ['Repayment.due_date' => 'DESC']
        ]);
        
        $missedPayments = 0;
        $latePayments = 0;
        $totalPaid = 0;
        $lastPaymentDate = null;
        
        foreach ($repayments as $payment) {
            if ($payment['Repayment']['status'] === 'defaulted') {
                $missedPayments++;
            } elseif ($payment['Repayment']['status'] === 'late') {
                $latePayments++;
            }
            
            if ($payment['Repayment']['status'] === 'paid') {
                $totalPaid += floatval($payment['Repayment']['amount']);
                $lastPaymentDate = $payment['Repayment']['paid_at'];
            }
        }
        
        // Get collateral
        $collateral = null;
        $collateralValue = 0;
        if ($loan['LoanRequest']['collateral_id']) {
            $collateral = $this->CollateralAsset->find('first', [
                'conditions' => ['CollateralAsset.id' => $loan['LoanRequest']['collateral_id']]
            ]);
            $collateralValue = floatval($collateral['CollateralAsset']['estimated_value'] ?? 0);
        }
        
        // Get borrower income
        $borrowerProfile = $this->BorrowerProfile->find('first', [
            'conditions' => ['BorrowerProfile.user_id' => $loan['LoanRequest']['borrower_id']]
        ]);
        
        $monthlyIncome = floatval($borrowerProfile['BorrowerProfile']['annual_revenue'] ?? 0) / 12;
        $loanAmount = floatval($loan['LoanRequest']['loan_amount']);
        
        // Calculate debt-to-income ratio
        $debtToIncomeRatio = $monthlyIncome > 0 ? ($loanAmount / 12) / $monthlyIncome : 1;
        
        // Calculate default probability
        $defaultProbability = 0;
        $riskFactors = [];
        
        // Missed payments factor (0-40%)
        $defaultProbability += $missedPayments * 10;
        
        // Late payments factor (0-15%)
        $defaultProbability += $latePayments * 5;
        
        // LTV factor
        $ltv = $collateralValue > 0 ? ($loanAmount / $collateralValue) * 100 : 100;
        if ($ltv > 70) {
            $defaultProbability += 15;
            $riskFactors[] = 'High LTV ratio';
        } elseif ($ltv > 60) {
            $defaultProbability += 8;
        }
        
        // Debt-to-income factor
        if ($debtToIncomeRatio > 0.5) {
            $defaultProbability += 20;
            $riskFactors[] = 'High debt-to-income ratio';
        } elseif ($debtToIncomeRatio > 0.4) {
            $defaultProbability += 10;
        }
        
        // Payment progress factor
        $expectedPaid = $loanAmount * 0.3; // Assume 30% should be paid by now
        if ($totalPaid < $expectedPaid * 0.5) {
            $defaultProbability += 15;
            $riskFactors[] = 'Behind on payments';
        }
        
        // Collateral verification factor
        if (!$collateral || $collateral['CollateralAsset']['verification_status'] !== 'verified') {
            $defaultProbability += 10;
            $riskFactors[] = 'Collateral not verified';
        }
        
        // Determine risk status
        $riskStatus = self::STATUS_HEALTHY;
        if ($defaultProbability >= 70) {
            $riskStatus = self::STATUS_DEFAULT_IMMINENT;
        } elseif ($defaultProbability >= 50) {
            $riskStatus = self::STATUS_HIGH_RISK;
        } elseif ($defaultProbability >= 30 || $missedPayments > 0) {
            $riskStatus = self::STATUS_WATCHLIST;
        }
        
        // Calculate days past due
        $daysPastDue = 0;
        if (!empty($repayments)) {
            $nextPayment = $repayments[0];
            if ($nextPayment['Repayment']['status'] !== 'paid') {
                $dueDate = strtotime($nextPayment['Repayment']['due_date']);
                $daysPastDue = max(0, (time() - $dueDate) / (60 * 60 * 24));
            }
        }
        
        // Determine risk trend (simplified - compare with previous if exists)
        $riskTrend = 'stable';
        $existingStatus = $this->LoanRiskStatus->find('first', [
            'conditions' => ['LoanRiskStatus.loan_id' => $loanId]
        ]);
        
        if ($existingStatus) {
            $prevProbability = floatval($existingStatus['LoanRiskStatus']['default_probability']);
            if ($defaultProbability > $prevProbability + 10) {
                $riskTrend = 'deteriorating';
            } elseif ($defaultProbability < $prevProbability - 10) {
                $riskTrend = 'improving';
            }
        }
        
        // Save risk status
        if ($existingStatus) {
            $this->LoanRiskStatus->id = $existingStatus['LoanRiskStatus']['id'];
        } else {
            $this->LoanRiskStatus->create();
        }
        
        $this->LoanRiskStatus->save([
            'loan_id' => $loanId,
            'risk_status' => $riskStatus,
            'default_probability' => min(100, $defaultProbability),
            'risk_score' => max(0, 100 - $defaultProbability),
            'risk_trend' => $riskTrend,
            'missed_payments' => $missedPayments,
            'days_past_due' => $daysPastDue,
            'debt_to_income_ratio' => $debtToIncomeRatio,
            'risk_factors' => json_encode($riskFactors),
            'last_payment_date' => $lastPaymentDate
        ]);
        
        // Log risk event
        $this->_logRiskEvent($loanId, $loan['LoanRequest']['borrower_id'], 'risk_upgraded', 'medium', 
            $existingStatus ? floatval($existingStatus['LoanRiskStatus']['default_probability']) : 0, 
            $defaultProbability, $riskStatus);
        
        return [
            'success' => true,
            'loan_id' => $loanId,
            'risk_status' => $riskStatus,
            'default_probability' => min(100, round($defaultProbability, 2)),
            'risk_score' => max(0, round(100 - $defaultProbability, 2)),
            'risk_trend' => $riskTrend,
            'missed_payments' => $missedPayments,
            'late_payments' => $latePayments,
            'days_past_due' => round($daysPastDue),
            'ltv_ratio' => round($ltv, 2),
            'debt_to_income_ratio' => round($debtToIncomeRatio * 100, 2),
            'risk_factors' => $riskFactors
        ];
    }
    
    /**
     * ============================================================
     * DEFAULT PROTECTION WORKFLOW
     * ============================================================
     */
    
    /**
     * POST /api/risk/default/start-workflow/:loanId
     * Start default protection workflow
     */
    public function startDefaultWorkflow() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        $loanId = $this->request->params["loanId"] ?? null;
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid loan ID required'], 400);
        }
        
        App::uses('DefaultWorkflow', 'Model');
        $this->DefaultWorkflow = new DefaultWorkflow();
        
        // Check if workflow already exists
        $existing = $this->DefaultWorkflow->find('first', [
            'conditions' => [
                'DefaultWorkflow.loan_id' => $loanId,
                'DefaultWorkflow.status' => 'active'
            ]
        ]);
        
        if ($existing) {
            return $this->_jsonResponse([
                'success' => false,
                'message' => 'Default workflow already active',
                'current_stage' => $existing['DefaultWorkflow']['stage']
            ]);
        }
        
        // Start with grace period
        $this->DefaultWorkflow->create();
        $this->DefaultWorkflow->save([
            'loan_id' => $loanId,
            'stage' => 'grace_period',
            'status' => 'active',
            'days_in_stage' => 0,
            'next_action_date' => date('Y-m-d', strtotime('+7 days'))
        ]);
        
        return $this->_jsonResponse([
            'success' => true,
            'message' => 'Default workflow started',
            'stage' => 'grace_period',
            'next_action' => 'Payment reminder sent to borrower'
        ]);
    }
    
    /**
     * POST /api/risk/default/advance-workflow/:loanId
     * Advance default workflow to next stage
     */
    public function advanceDefaultWorkflow() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        $loanId = $this->request->params["loanId"] ?? null;
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid loan ID required'], 400);
        }
        
        App::uses('DefaultWorkflow', 'Model');
        $this->DefaultWorkflow = new DefaultWorkflow();
        
        $workflow = $this->DefaultWorkflow->find('first', [
            'conditions' => [
                'DefaultWorkflow.loan_id' => $loanId,
                'DefaultWorkflow.status' => 'active'
            ]
        ]);
        
        if (!$workflow) {
            return $this->_jsonResponse(['success' => false, 'message' => 'No active workflow found'], 404);
        }
        
        $currentStage = $workflow['DefaultWorkflow']['stage'];
        $nextStage = null;
        $nextAction = null;
        
        switch ($currentStage) {
            case 'grace_period':
                $nextStage = 'refinance_attempt';
                $nextAction = 'Borrower can request refinancing';
                break;
            case 'refinance_attempt':
                $nextStage = 'pre_liquidation';
                $nextAction = 'Pre-liquidation warning issued';
                break;
            case 'pre_liquidation':
                $nextStage = 'liquidation';
                $nextAction = 'Collateral liquidation initiated';
                break;
            case 'liquidation':
                $nextStage = 'recovery';
                $nextAction = 'Recovery process in progress';
                break;
            default:
                return $this->_jsonResponse(['success' => false, 'message' => 'Workflow already complete']);
        }
        
        $this->DefaultWorkflow->id = $workflow['DefaultWorkflow']['id'];
        $this->DefaultWorkflow->save([
            'stage' => $nextStage,
            'completed_at' => date('Y-m-d H:i:s'),
            'next_action_date' => date('Y-m-d', strtotime('+5 days'))
        ]);
        
        // Update loan status if entering liquidation
        if ($nextStage === 'liquidation') {
            App::uses('LoanRequest', 'Model');
            $this->LoanRequest = new LoanRequest();
            $this->LoanRequest->id = $loanId;
            $this->LoanRequest->saveField('status', 'platform_settled');
            
            // Trigger liquidation
            $this->_initiateLiquidation($loanId);
        }
        
        return $this->_jsonResponse([
            'success' => true,
            'message' => 'Workflow advanced',
            'previous_stage' => $currentStage,
            'current_stage' => $nextStage,
            'next_action' => $nextAction
        ]);
    }
    
    /**
     * Internal: Initiate liquidation process
     */
    private function _initiateLiquidation($loanId) {
        App::uses('LoanRequest', 'Model');
        App::uses('CollateralAsset', 'Model');
        App::uses('RecoveryItem', 'Model');
        
        $this->LoanRequest = new LoanRequest();
        $this->CollateralAsset = new CollateralAsset();
        $this->RecoveryItem = new RecoveryItem();
        
        $loan = $this->LoanRequest->find('first', [
            'conditions' => ['LoanRequest.id' => $loanId]
        ]);
        
        if (!$loan || !$loan['LoanRequest']['collateral_id']) {
            return;
        }
        
        $collateral = $this->CollateralAsset->find('first', [
            'conditions' => ['CollateralAsset.id' => $loan['LoanRequest']['collateral_id']]
        ]);
        
        if (!$collateral) {
            return;
        }
        
        // Create recovery marketplace item
        $this->RecoveryItem->create();
        $this->RecoveryItem->save([
            'collateral_id' => $collateral['CollateralAsset']['id'],
            'loan_id' => $loanId,
            'title' => 'Recovered: ' . ($collateral['CollateralAsset']['description'] ?? 'Collateral Asset'),
            'description' => $collateral['CollateralAsset']['description'],
            'type' => $collateral['CollateralAsset']['type'],
            'market_value' => $collateral['CollateralAsset']['estimated_value'],
            'starting_price' => $collateral['CollateralAsset']['estimated_value'] * 0.7,
            'current_price' => $collateral['CollateralAsset']['estimated_value'] * 0.7,
            'status' => 'active'
        ]);
        
        // Update collateral status
        $this->CollateralAsset->id = $collateral['CollateralAsset']['id'];
        $this->CollateralAsset->saveField('storage_status', 'in_storage');
    }
    
    /**
     * ============================================================
     * RISK MONITORING DASHBOARD
     * ============================================================
     */
    
    /**
     * GET /api/risk/admin/dashboard
     * Get risk monitoring dashboard data
     */
    public function getRiskDashboard() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        App::uses('LoanRequest', 'Model');
        App::uses('LoanRiskStatus', 'Model');
        App::uses('ReserveFund', 'Model');
        App::uses('RiskDashboardSummary', 'Model');
        
        $this->LoanRequest = new LoanRequest();
        $this->LoanRiskStatus = new LoanRiskStatus();
        $this->ReserveFund = new ReserveFund();
        $this->RiskDashboardSummary = new RiskDashboardSummary();
        
        // Get active loans count
        $totalActiveLoans = $this->LoanRequest->find('count', [
            'conditions' => ['LoanRequest.status' => ['funded', 'active']]
        ]);
        
        // Get loans by risk status
        $healthyCount = $this->LoanRiskStatus->find('count', [
            'conditions' => ['LoanRiskStatus.risk_status' => 'healthy']
        ]);
        
        $watchlistCount = $this->LoanRiskStatus->find('count', [
            'conditions' => ['LoanRiskStatus.risk_status' => 'watchlist']
        ]);
        
        $highRiskCount = $this->LoanRiskStatus->find('count', [
            'conditions' => ['LoanRiskStatus.risk_status' => ['high_risk', 'default_imminent']]
        ]);
        
        // Get default rate
        $totalLoans = $this->LoanRequest->find('count');
        $defaultedLoans = $this->LoanRequest->find('count', [
            'conditions' => ['LoanRequest.status' => 'defaulted']
        ]);
        
        $defaultRate = $totalLoans > 0 ? ($defaultedLoans / $totalLoans) * 100 : 0;
        
        // Get reserve fund status
        $reserveFund = $this->ReserveFund->find('first');
        $activeLoansValue = $this->LoanRequest->find('first', [
            'fields' => ['SUM(loan_amount) as total'],
            'conditions' => ['LoanRequest.status' => ['funded', 'active']]
        ]);
        
        // FIN-02 FIX: Use configurable reserve fund minimum
        App::uses('SecurityConfig', 'Config');
        $reserveFundMinimum = SecurityConfig::getReserveFundMinimum();
        
        $totalActiveLoansValue = floatval($activeLoansValue[0]['total'] ?? 0);
        $reserveBalance = floatval($reserveFund['ReserveFund']['balance'] ?? $reserveFundMinimum);
        $coverageRatio = $totalActiveLoansValue > 0 
            ? ($reserveBalance / $totalActiveLoansValue) * 100 
            : 0;
        
        // Get average risk score
        $avgRiskScore = $this->LoanRiskStatus->find('first', [
            'fields' => ['AVG(risk_score) as avg_score']
        ]);
        
        $averageRiskScore = floatval($avgRiskScore[0]['avg_score'] ?? 75);
        
        // Get loans at risk value
        $atRiskLoans = $this->LoanRequest->find('first', [
            'fields' => ['SUM(loan_amount) as total'],
            'conditions' => [
                'LoanRequest.status' => ['funded', 'active'],
                'LoanRequest.id IN (SELECT loan_id FROM loan_risk_status WHERE risk_status IN ("watchlist", "high_risk", "default_imminent"))'
            ]
        ]);
        
        $totalLoansAtRisk = floatval($atRiskLoans[0]['total'] ?? 0);
        
        // Update dashboard summary
        $summary = $this->RiskDashboardSummary->find('first');
        if ($summary) {
            $this->RiskDashboardSummary->id = $summary['RiskDashboardSummary']['id'];
        } else {
            $this->RiskDashboardSummary->create();
        }
        
        $this->RiskDashboardSummary->save([
            'total_active_loans' => $totalActiveLoans,
            'total_default_rate' => $defaultRate,
            'reserve_coverage_ratio' => $coverageRatio,
            'high_risk_loans' => $highRiskCount,
            'watchlist_loans' => $watchlistCount,
            'healthy_loans' => $healthyCount,
            'total_loans_at_risk' => $totalLoansAtRisk,
            'average_risk_score' => $averageRiskScore
        ]);
        
        return $this->_jsonResponse([
            'success' => true,
            'dashboard' => [
                'total_active_loans' => $totalActiveLoans,
                'total_default_rate' => round($defaultRate, 2),
                'reserve_coverage_ratio' => round($coverageRatio, 2),
                'high_risk_loans' => $highRiskCount,
                'watchlist_loans' => $watchlistCount,
                'healthy_loans' => $healthyCount,
                'total_loans_at_risk' => $totalLoansAtRisk,
                'average_risk_score' => round($averageRiskScore, 2),
                'reserve_balance' => $reserveBalance,
                'total_active_loans_value' => $totalActiveLoansValue
            ],
            'alerts' => $this->_generateRiskAlerts($coverageRatio, $highRiskCount, $defaultRate)
        ]);
    }
    
    /**
     * GET /api/risk/admin/default-monitoring
     * Get default monitoring data
     */
    public function getDefaultMonitoring() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        App::uses('LoanRiskStatus', 'Model');
        App::uses('DefaultWorkflow', 'Model');
        
        $this->LoanRiskStatus = new LoanRiskStatus();
        $this->DefaultWorkflow = new DefaultWorkflow();
        
        // Get loans by status
        $watchlistLoans = $this->LoanRiskStatus->find('all', [
            'conditions' => ['LoanRiskStatus.risk_status' => 'watchlist'],
            'limit' => 20
        ]);
        
        $highRiskLoans = $this->LoanRiskStatus->find('all', [
            'conditions' => ['LoanRiskStatus.risk_status' => ['high_risk', 'default_imminent']],
            'limit' => 20
        ]);
        
        // Get active workflows
        $activeWorkflows = $this->DefaultWorkflow->find('all', [
            'conditions' => ['DefaultWorkflow.status' => 'active'],
            'order' => ['DefaultWorkflow.started_at' => 'DESC']
        ]);
        
        return $this->_jsonResponse([
            'success' => true,
            'monitoring' => [
                'watchlist_count' => count($watchlistLoans),
                'watchlist_loans' => array_map(function($l) {
                    return [
                        'loan_id' => $l['LoanRiskStatus']['loan_id'],
                        'risk_status' => $l['LoanRiskStatus']['risk_status'],
                        'default_probability' => floatval($l['LoanRiskStatus']['default_probability']),
                        'days_past_due' => intval($l['LoanRiskStatus']['days_past_due'])
                    ];
                }, $watchlistLoans),
                'high_risk_count' => count($highRiskLoans),
                'high_risk_loans' => array_map(function($l) {
                    return [
                        'loan_id' => $l['LoanRiskStatus']['loan_id'],
                        'risk_status' => $l['LoanRiskStatus']['risk_status'],
                        'default_probability' => floatval($l['LoanRiskStatus']['default_probability']),
                        'risk_trend' => $l['LoanRiskStatus']['risk_trend']
                    ];
                }, $highRiskLoans),
                'active_workflows' => array_map(function($w) {
                    return [
                        'loan_id' => $w['DefaultWorkflow']['loan_id'],
                        'stage' => $w['DefaultWorkflow']['stage'],
                        'started_at' => $w['DefaultWorkflow']['started_at'],
                        'days_in_stage' => $w['DefaultWorkflow']['days_in_stage']
                    ];
                }, $activeWorkflows)
            ]
        ]);
    }
    
    /**
     * Generate risk alerts
     */
    private function _generateRiskAlerts($coverageRatio, $highRiskCount, $defaultRate) {
        $alerts = [];
        
        if ($coverageRatio < 200) {
            $alerts[] = [
                'type' => 'critical',
                'title' => 'Low Reserve Coverage',
                'message' => 'Reserve coverage is below 200%. Consider replenishing the reserve fund.'
            ];
        }
        
        if ($highRiskCount > 10) {
            $alerts[] = [
                'type' => 'warning',
                'title' => 'High Risk Loans',
                'message' => "$highRiskCount loans are classified as high risk or default imminent."
            ];
        }
        
        if ($defaultRate > 10) {
            $alerts[] = [
                'type' => 'error',
                'title' => 'High Default Rate',
                'message' => 'Default rate has exceeded 10%. Review lending criteria.'
            ];
        }
        
        return $alerts;
    }
    
    /**
     * ============================================================
     * UTILITY METHODS
     * ============================================================
     */
    
    /**
     * Log risk event
     */
    private function _logRiskEvent($loanId, $userId, $eventType, $severity, $previousProbability, $newProbability, $newStatus) {
        App::uses('RiskEvent', 'Model');
        $this->RiskEvent = new RiskEvent();
        
        $this->RiskEvent->create();
        $this->RiskEvent->save([
            'loan_id' => $loanId,
            'user_id' => $userId,
            'event_type' => $eventType,
            'severity' => $severity,
            'risk_score_change' => $newProbability - $previousProbability,
            'new_status' => $newStatus,
            'description' => "Risk status changed: $newStatus (probability: $newProbability%)"
        ]);
    }
    
    /**
     * Validate complete loan request against all risk rules
     */
    public function validateLoanRequest() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $loanAmount = floatval($data['loan_amount'] ?? 0);
        $collateralValue = floatval($data['collateral_value'] ?? 0);
        $borrowerId = intval($data['borrower_id'] ?? 0);
        $riskCategory = $data['risk_category'] ?? 'A';
        
        $errors = [];
        $warnings = [];
        
        // LTV Validation
        $ltv = $collateralValue > 0 ? ($loanAmount / $collateralValue) * 100 : 100;
        $maxLtv = $this->ltvConfig[$riskCategory] ?? 60;
        
        if ($ltv > $maxLtv) {
            $errors[] = [
                'field' => 'ltv',
                'message' => "LTV ($ltv%) exceeds maximum allowed ($maxLtv%) for $riskCategory category"
            ];
        }
        
        // Exposure Validation
        $exposureResult = $this->_validateExposureInternal($loanAmount, $borrowerId);
        if (!$exposureResult['valid']) {
            $errors[] = [
                'field' => 'exposure',
                'message' => $exposureResult['message']
            ];
        }
        
        // Collateral validation
        if (!$collateralValue || $collateralValue <= 0) {
            $errors[] = [
                'field' => 'collateral',
                'message' => 'Collateral is required'
            ];
        }
        
        return $this->_jsonResponse([
            'success' => count($errors) === 0,
            'valid' => count($errors) === 0,
            'errors' => $errors,
            'warnings' => $warnings,
            'checks' => [
                'ltv_check' => ['valid' => $ltv <= $maxLtv, 'value' => $ltv, 'max' => $maxLtv],
                'exposure_check' => $exposureResult,
                'collateral_check' => ['valid' => $collateralValue > 0, 'value' => $collateralValue]
            ]
        ]);
    }
    
    private function _validateExposureInternal($loanAmount, $borrowerId) {
        App::uses('LoanRequest', 'Model');
        App::uses('ReserveFund', 'Model');
        
        $this->LoanRequest = new LoanRequest();
        $this->ReserveFund = new ReserveFund();
        
        // FIN-02 FIX: Use configurable reserve fund minimum
        App::uses('SecurityConfig', 'Config');
        $reserveFundMinimum = SecurityConfig::getReserveFundMinimum();
        
        $reserveFund = $this->ReserveFund->find('first');
        $totalCapital = floatval($reserveFund['ReserveFund']['balance'] ?? $reserveFundMinimum);
        
        $borrowerLoans = $this->LoanRequest->find('all', [
            'conditions' => [
                'LoanRequest.borrower_id' => $borrowerId,
                'LoanRequest.status' => ['funded', 'active']
            ]
        ]);
        
        $borrowerCurrentExposure = 0;
        foreach ($borrowerLoans as $loan) {
            $borrowerCurrentExposure += floatval($loan['LoanRequest']['loan_amount']);
        }
        
        $borrowerNewExposure = $borrowerCurrentExposure + $loanAmount;
        $borrowerExposureLimit = $totalCapital * ($this->exposureConfig['max_borrower_exposure'] / 100);
        
        $loanExposureLimit = $totalCapital * ($this->exposureConfig['max_loan_exposure'] / 100);
        
        $valid = $borrowerNewExposure <= $borrowerExposureLimit && $loanAmount <= $loanExposureLimit;
        
        return [
            'valid' => $valid,
            'message' => $valid ? 'OK' : 'Exposure limits exceeded',
            'borrower_exposure' => round($borrowerNewExposure, 2),
            'borrower_limit' => round($borrowerExposureLimit, 2),
            'loan_limit' => round($loanExposureLimit, 2)
        ];
    }
    
    /**
     * Get current user ID from JWT token
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
        
        if (!$payload) {
            return null;
        }
        
        return $payload['sub'] ?? null;
    }
    
    /**
     * Check if user is admin
     */
    private function _isAdmin($userId) {
        App::uses('User', 'Model');
        $this->User = new User();
        
        $user = $this->User->find('first', [
            'conditions' => ['User.id' => $userId],
            'fields' => ['role'],
            'recursive' => -1
        ]);
        
        return $user && $user['User']['role'] === 'admin';
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
