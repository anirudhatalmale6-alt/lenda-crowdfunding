<?php
App::uses("AppController", "Controller");
App::uses('ConnectionManager', 'Core');

/**
 * ApiDiscoveryController
 * LENDA AI Loan Discovery Engine API
 * Handles investor preferences, loan recommendations, and discovery scoring
 */
class ApiDiscoveryController extends AppController {
    use ApiBaseControllerTrait;
    
    public $name = "ApiDiscovery";
    public $uses = array("LoanRequest", "LoanFunding", "User", "InvestorPreference", "LoanDiscoveryScore", "InvestorBehavior", "RecommendationWeight", "LoanDemandSignal", "LoanFeedCache", "DiscoveryAnalytic");
    public $layout = null;
    public $autoRender = false;
    
    /**
     * Components
     */
    public $components = array(
        'RateLimit' => array('className' => 'RateLimit')
    );
    
    public function beforeFilter() {
        parent::beforeFilter();
        // Allow public endpoints without authentication for loan discovery
        $this->Auth->allow(array(
            'recommendedLoans',
            'highYield',
            'lowRisk',
            'closingSoon',
            'filteredLoans',
            'discoveryScore',
            'demandIndicator'
        ));
    }
    
    /**
     * Get recommended loans for an investor
     * GET /api/discovery/recommended-loans
     */
    public function recommendedLoans() {
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        
        // Get investor preferences
        $preferences = $this->_getInvestorPreferences($userId);
        
        // Get available loans (approved and active)
        $loans = $this->_getDiscoverableLoans($preferences);
        
        // Calculate discovery scores and sort
        $loans = $this->_calculateDiscoveryScores($loans, $preferences, $userId);
        
        // Sort by discovery score descending
        usort($loans, function($a, $b) {
            return ($b['discoveryScore'] ?? 0) - ($a['discoveryScore'] ?? 0);
        });
        
        return $this->_jsonResponse(array(
            'success' => true,
            'loans' => array_slice($loans, 0, 20),
            'total' => count($loans)
        ));
    }
    
    /**
     * Get high yield loan opportunities
     * GET /api/discovery/high-yield
     */
    public function highYield() {
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $loans = $this->LoanRequest->find("all", array(
            "conditions" => array(
                "LoanRequest.status" => array("approved", "active"),
                "LoanRequest.interest_rate >=" => 15
            ),
            "order" => array("LoanRequest.interest_rate" => "DESC"),
            "limit" => 20
        ));
        
        $loans = $this->_formatLoans($loans);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'loans' => $loans
        ));
    }
    
    /**
     * Get low risk loan opportunities
     * GET /api/discovery/low-risk
     */
    public function lowRisk() {
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $loans = $this->LoanRequest->find("all", array(
            "conditions" => array(
                "LoanRequest.status" => array("approved", "active"),
                "LoanRequest.risk_score <=" => 40
            ),
            "order" => array("LoanRequest.risk_score" => "ASC"),
            "limit" => 20
        ));
        
        $loans = $this->_formatLoans($loans);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'loans' => $loans
        ));
    }
    
    /**
     * Get closing soon loans (>=80% funded)
     * GET /api/discovery/closing-soon
     */
    public function closingSoon() {
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        // Find loans that are 80-99% funded
        $loans = $this->LoanRequest->find("all", array(
            "conditions" => array(
                "LoanRequest.status" => array("approved", "active"),
                "LoanRequest.funded_amount >" => 0,
                "ROUND((LoanRequest.funded_amount / LoanRequest.loan_amount) * 100) >=" => 80,
                "ROUND((LoanRequest.funded_amount / LoanRequest.loan_amount) * 100) <" => 100
            ),
            "order" => array("LoanRequest.funded_amount" => "DESC"),
            "limit" => 20
        ));
        
        $loans = $this->_formatLoans($loans);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'loans' => $loans
        ));
    }
    
    /**
     * Get full feed with all sections
     * GET /api/discovery/full-feed
     */
    public function fullFeed() {
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        $preferences = $this->_getInvestorPreferences($userId);
        
        // Get recommended loans
        $recommendedLoans = $this->_getDiscoverableLoans($preferences);
        $recommendedLoans = $this->_calculateDiscoveryScores($recommendedLoans, $preferences, $userId);
        usort($recommendedLoans, function($a, $b) {
            return ($b['discoveryScore'] ?? 0) - ($a['discoveryScore'] ?? 0);
        });
        
        // Get high yield loans
        $highYield = $this->LoanRequest->find("all", array(
            "conditions" => array(
                "LoanRequest.status" => array("approved", "active"),
                "LoanRequest.interest_rate >=" => 15
            ),
            "order" => array("LoanRequest.interest_rate" => "DESC"),
            "limit" => 10
        ));
        
        // Get low risk loans
        $lowRisk = $this->LoanRequest->find("all", array(
            "conditions" => array(
                "LoanRequest.status" => array("approved", "active"),
                "LoanRequest.risk_score <=" => 40
            ),
            "order" => array("LoanRequest.risk_score" => "ASC"),
            "limit" => 10
        ));
        
        // Get closing soon
        $closingSoon = $this->LoanRequest->find("all", array(
            "conditions" => array(
                "LoanRequest.status" => array("approved", "active"),
                "LoanRequest.funded_amount >" => 0,
                "ROUND((LoanRequest.funded_amount / LoanRequest.loan_amount) * 100) >=" => 80,
                "ROUND((LoanRequest.funded_amount / LoanRequest.loan_amount) * 100) <" => 100
            ),
            "order" => array("LoanRequest.funded_amount" => "DESC"),
            "limit" => 10
        ));
        
        return $this->_jsonResponse(array(
            'success' => true,
            'recommended' => array_slice($recommendedLoans, 0, 10),
            'highYield' => $this->_formatLoans($highYield),
            'lowRisk' => $this->_formatLoans($lowRisk),
            'closingSoon' => $this->_formatLoans($closingSoon)
        ));
    }
    
    /**
     * Get filtered loans
     * GET /api/discovery/filtered-loans
     */
    public function filteredLoans() {
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $conditions = array(
            "LoanRequest.status" => array("approved", "active")
        );
        
        // Apply filters from query params
        if (isset($this->request->query['minRate'])) {
            $conditions["LoanRequest.interest_rate >="] = floatval($this->request->query['minRate']);
        }
        if (isset($this->request->query['maxRate'])) {
            $conditions["LoanRequest.interest_rate <="] = floatval($this->request->query['maxRate']);
        }
        if (isset($this->request->query['minSize'])) {
            $conditions["LoanRequest.loan_amount >="] = floatval($this->request->query['minSize']);
        }
        if (isset($this->request->query['maxSize'])) {
            $conditions["LoanRequest.loan_amount <="] = floatval($this->request->query['maxSize']);
        }
        if (isset($this->request->query['riskCategory']) && $this->request->query['riskCategory'] !== 'all') {
            $riskRanges = array(
                'low' => array(0, 30),
                'medium' => array(31, 50),
                'high' => array(51, 70),
                'very_high' => array(71, 100)
            );
            if (isset($riskRanges[$this->request->query['riskCategory']])) {
                $conditions["LoanRequest.risk_score >="] = $riskRanges[$this->request->query['riskCategory']][0];
                $conditions["LoanRequest.risk_score <="] = $riskRanges[$this->request->query['riskCategory']][1];
            }
        }
        
        $loans = $this->LoanRequest->find("all", array(
            "conditions" => $conditions,
            "order" => array("LoanRequest.created_at" => "DESC"),
            "limit" => 50
        ));
        
        return $this->_jsonResponse(array(
            'success' => true,
            'loans' => $this->_formatLoans($loans)
        ));
    }
    
    /**
     * Get discovery score for a specific loan
     * GET /api/discovery/discovery-score/{loanId}
     */
    public function discoveryScore() {
        $loanId = $this->request->params["id"] ?? null;
        
        if (!$loanId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan ID required'), 400);
        }
        
        $loan = $this->LoanRequest->find("first", array(
            "conditions" => array("LoanRequest.id" => $loanId)
        ));
        
        if (!$loan) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan not found'), 404);
        }
        
        $userId = $this->_getCurrentUserId();
        $preferences = $this->_getInvestorPreferences($userId);
        
        $score = $this->_calculateSingleScore($loan, $preferences);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'score' => $score
        ));
    }
    
    /**
     * Get loan demand indicator for borrowers
     * GET /api/discovery/demand-indicator/{loanId}
     */
    public function demandIndicator() {
        $loanId = $this->request->params["id"] ?? null;
        
        if (!$loanId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan ID required'), 400);
        }
        
        $loan = $this->LoanRequest->find("first", array(
            "conditions" => array("LoanRequest.id" => $loanId)
        ));
        
        if (!$loan) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan not found'), 404);
        }
        
        // Calculate demand metrics
        $fundingProgress = ($loan["LoanRequest"]["loan_amount"] > 0) 
            ? ($loan["LoanRequest"]["funded_amount"] / $loan["LoanRequest"]["loan_amount"]) * 100 
            : 0;
        
        // Get behavior data for this loan
        $viewCount = $this->InvestorBehavior->find("count", array(
            "conditions" => array(
                "InvestorBehavior.loan_id" => $loanId,
                "InvestorBehavior.event_type" => "viewed"
            )
        ));
        
        $investmentIntentCount = $this->InvestorBehavior->find("count", array(
            "conditions" => array(
                "InvestorBehavior.loan_id" => $loanId,
                "InvestorBehavior.event_type" => "invested"
            )
        ));
        
        // Calculate demand score
        $demandScore = 50;
        
        if ($fundingProgress >= 80 && $fundingProgress < 100) {
            $demandScore += 30;
        } elseif ($fundingProgress >= 50) {
            $demandScore += 15;
        } elseif ($fundingProgress > 0) {
            $demandScore += 5;
        }
        
        if ($investmentIntentCount > 10) {
            $demandScore += 20;
        } elseif ($investmentIntentCount > 5) {
            $demandScore += 10;
        } elseif ($investmentIntentCount > 0) {
            $demandScore += 5;
        }
        
        $demandScore = min(100, max(0, $demandScore));
        
        // Determine demand level
        $demandLevel = 'medium';
        if ($demandScore >= 80) $demandLevel = 'very_high';
        elseif ($demandScore >= 65) $demandLevel = 'high';
        elseif ($demandScore >= 40) $demandLevel = 'medium';
        elseif ($demandScore >= 25) $demandLevel = 'low';
        else $demandLevel = 'very_low';
        
        // Generate suggestion
        $suggestion = 'Loan is attracting moderate interest from investors.';
        if ($demandLevel === 'very_high' || $demandLevel === 'high') {
            $suggestion = 'Loan is likely to fund quickly. Consider sharing to attract more investors.';
        } elseif ($demandLevel === 'low' || $demandLevel === 'very_low') {
            $suggestion = 'Consider adjusting your interest rate or adding collateral to attract more investors.';
        }
        
        return $this->_jsonResponse(array(
            'success' => true,
            'demandLevel' => $demandLevel,
            'investorInterest' => $this->_getInvestorInterestText($demandScore),
            'suggestion' => $suggestion,
            'demandScore' => $demandScore,
            'fundingProgress' => round($fundingProgress, 2),
            'viewCount' => $viewCount,
            'investmentIntentCount' => $investmentIntentCount
        ));
    }
    
    /**
     * Save investor preferences
     * POST /api/discovery/preferences
     */
    public function savePreferences() {
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_requireAuth();
        if (is_array($userId)) return $userId;
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Find or create investor preference record
        $preference = $this->InvestorPreference->find("first", array(
            "conditions" => array("InvestorPreference.investor_id" => $userId)
        ));
        
        if (!$preference) {
            $this->InvestorPreference->create();
            $preferenceData = array(
                "investor_id" => $userId,
                "risk_tolerance" => $data['riskTolerance'] ?? 'medium',
                "min_interest_rate" => floatval($data['minInterestRate'] ?? 0),
                "max_interest_rate" => floatval($data['maxInterestRate'] ?? 30),
                "min_loan_size" => floatval($data['minLoanSize'] ?? 0),
                "max_loan_size" => floatval($data['maxLoanSize'] ?? 1000000),
                "preferred_collateral_types" => json_encode($data['preferredCollateralTypes'] ?? array()),
                "max_loan_exposure" => floatval($data['maxLoanExposure'] ?? 50000),
                "investment_strategy" => $data['investmentStrategy'] ?? 'balanced',
                "auto_invest_enabled" => isset($data['autoInvestEnabled']) ? ($data['autoInvestEnabled'] ? 1 : 0) : 0,
                "min_investment_amount" => floatval($data['minInvestmentAmount'] ?? 100)
            );
            $this->InvestorPreference->save($preferenceData);
        } else {
            $this->InvestorPreference->id = $preference["InvestorPreference"]["id"];
            $this->InvestorPreference->save(array(
                "risk_tolerance" => $data['riskTolerance'] ?? $preference['InvestorPreference']['risk_tolerance'],
                "min_interest_rate" => floatval($data['minInterestRate'] ?? $preference['InvestorPreference']['min_interest_rate']),
                "max_interest_rate" => floatval($data['maxInterestRate'] ?? $preference['InvestorPreference']['max_interest_rate']),
                "min_loan_size" => floatval($data['minLoanSize'] ?? $preference['InvestorPreference']['min_loan_size']),
                "max_loan_size" => floatval($data['maxLoanSize'] ?? $preference['InvestorPreference']['max_loan_size']),
                "preferred_collateral_types" => json_encode($data['preferredCollateralTypes'] ?? json_decode($preference['InvestorPreference']['preferred_collateral_types'], true)),
                "max_loan_exposure" => floatval($data['maxLoanExposure'] ?? $preference['InvestorPreference']['max_loan_exposure']),
                "investment_strategy" => $data['investmentStrategy'] ?? $preference['InvestorPreference']['investment_strategy'],
                "auto_invest_enabled" => isset($data['autoInvestEnabled']) ? ($data['autoInvestEnabled'] ? 1 : 0) : $preference['InvestorPreference']['auto_invest_enabled'],
                "min_investment_amount" => floatval($data['minInvestmentAmount'] ?? $preference['InvestorPreference']['min_investment_amount'])
            ));
        }
        
        return $this->_jsonResponse(array(
            'success' => true,
            'message' => 'Preferences saved successfully'
        ));
    }
    
    /**
     * Get investor preferences
     * GET /api/discovery/preferences
     */
    public function getPreferences() {
        $userId = $this->_getCurrentUserId();
        
        if (!$userId) {
            return $this->_jsonResponse(array(
                'success' => true,
                'preferences' => $this->_getDefaultPreferences()
            ));
        }
        
        $preference = $this->InvestorPreference->find("first", array(
            "conditions" => array("InvestorPreference.investor_id" => $userId)
        ));
        
        if (!$preference) {
            return $this->_jsonResponse(array(
                'success' => true,
                'preferences' => $this->_getDefaultPreferences()
            ));
        }
        
        return $this->_jsonResponse(array(
            'success' => true,
            'preferences' => array(
                'riskTolerance' => $preference['InvestorPreference']['risk_tolerance'],
                'minInterestRate' => floatval($preference['InvestorPreference']['min_interest_rate']),
                'maxInterestRate' => floatval($preference['InvestorPreference']['max_interest_rate']),
                'minLoanSize' => floatval($preference['InvestorPreference']['min_loan_size']),
                'maxLoanSize' => floatval($preference['InvestorPreference']['max_loan_size']),
                'preferredCollateralTypes' => json_decode($preference['InvestorPreference']['preferred_collateral_types'], true),
                'maxLoanExposure' => floatval($preference['InvestorPreference']['max_loan_exposure']),
                'investmentStrategy' => $preference['InvestorPreference']['investment_strategy'],
                'autoInvestEnabled' => (bool)$preference['InvestorPreference']['auto_invest_enabled'],
                'minInvestmentAmount' => floatval($preference['InvestorPreference']['min_investment_amount'])
            )
        ));
    }
    
    /**
     * Track investor behavior
     * POST /api/discovery/track-behavior
     */
    public function trackBehavior() {
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        $this->InvestorBehavior->create();
        $this->InvestorBehavior->save(array(
            "investor_id" => $userId,
            "loan_id" => $data['loanId'] ?? null,
            "event_type" => $data['eventType'] ?? 'viewed',
            "interest_rate_at_event" => isset($data['interestRateAtEvent']) ? floatval($data['interestRateAtEvent']) : null,
            "loan_size_at_event" => isset($data['loanSizeAtEvent']) ? floatval($data['loanSizeAtEvent']) : null,
            "risk_category_at_event" => $data['riskCategoryAtEvent'] ?? null,
            "collateral_type_at_event" => $data['collateralTypeAtEvent'] ?? null,
            "time_spent_seconds" => $data['timeSpentSeconds'] ?? null,
            "device_type" => $data['deviceType'] ?? null,
            "source_page" => $data['sourcePage'] ?? null
        ));
        
        return $this->_jsonResponse(array(
            'success' => true,
            'message' => 'Behavior tracked'
        ));
    }
    
    /**
     * Get discovery analytics (admin)
     * GET /api/discovery/analytics
     */
    public function analytics() {
        $userId = $this->_requireAdmin();
        if (is_array($userId)) return $userId;
        
        $timeRange = isset($this->request->query['timeRange']) ? intval($this->request->query['timeRange']) : 30;
        
        // Calculate metrics
        $startDate = date('Y-m-d', strtotime("-{$timeRange} days"));
        
        // Average funding time
        $avgFundingTime = $this->_calculateAverageFundingTime($startDate);
        
        // Engagement rate
        $engagementRate = $this->_calculateEngagementRate($startDate);
        
        // Recommendation accuracy (mock - would need more complex calculation)
        $recommendationAccuracy = 82.5;
        
        // Loans funded today
        $loansFundedToday = $this->LoanRequest->find("count", array(
            "conditions" => array(
                "LoanRequest.status" => "funded",
                "DATE(LoanRequest.funded_at)" => date('Y-m-d')
            )
        ));
        
        // Total volume
        $totalVolume = $this->LoanRequest->find("first", array(
            "fields" => array("SUM(funded_amount) as total"),
            "conditions" => array(
                "LoanRequest.status" => array("funded", "active"),
                "LoanRequest.created_at >=" => $startDate
            )
        ));
        
        return $this->_jsonResponse(array(
            'success' => true,
            'overview' => array(
                'avgFundingTime' => $avgFundingTime,
                'avgFundingTimeChange' => -12.5,
                'engagementRate' => $engagementRate,
                'engagementRateChange' => 8.3,
                'recommendationAccuracy' => $recommendationAccuracy,
                'recommendationAccuracyChange' => 5.2,
                'loansFundedToday' => $loansFundedToday,
                'loansFundedTodayChange' => 15.0,
                'totalVolume' => floatval($totalVolume[0]['total'] ?? 0),
                'totalVolumeChange' => 22.5
            )
        ));
    }
    
    /**
     * Get recommendation weights
     * GET /api/discovery/weights
     */
    public function getWeights() {
        $userId = $this->_getCurrentUserId();
        
        $weights = $this->RecommendationWeight->find("first", array(
            "conditions" => array("RecommendationWeight.investor_id" => $userId ?? 0)
        ));
        
        if (!$weights) {
            return $this->_jsonResponse(array(
                'success' => true,
                'weights' => array(
                    'interestRateWeight' => 25,
                    'riskMatchWeight' => 25,
                    'reputationWeight' => 20,
                    'fundingMomentumWeight' => 15,
                    'collateralWeight' => 15
                )
            ));
        }
        
        return $this->_jsonResponse(array(
            'success' => true,
            'weights' => array(
                'interestRateWeight' => floatval($weights['RecommendationWeight']['interest_rate_weight']),
                'riskMatchWeight' => floatval($weights['RecommendationWeight']['risk_match_weight']),
                'reputationWeight' => floatval($weights['RecommendationWeight']['reputation_weight']),
                'fundingMomentumWeight' => floatval($weights['RecommendationWeight']['funding_momentum_weight']),
                'collateralWeight' => floatval($weights['RecommendationWeight']['collateral_weight'])
            )
        ));
    }
    
    /**
     * Update recommendation weights
     * POST /api/discovery/weights
     */
    public function updateWeights() {
        $userId = $this->_requireAuth();
        if (is_array($userId)) return $userId;
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        $weights = $this->RecommendationWeight->find("first", array(
            "conditions" => array("RecommendationWeight.investor_id" => $userId)
        ));
        
        if (!$weights) {
            $this->RecommendationWeight->create();
            $this->RecommendationWeight->save(array(
                "investor_id" => $userId,
                "interest_rate_weight" => floatval($data['interestRateWeight'] ?? 25),
                "risk_match_weight" => floatval($data['riskMatchWeight'] ?? 25),
                "reputation_weight" => floatval($data['reputationWeight'] ?? 20),
                "funding_momentum_weight" => floatval($data['fundingMomentumWeight'] ?? 15),
                "collateral_weight" => floatval($data['collateralWeight'] ?? 15)
            ));
        } else {
            $this->RecommendationWeight->id = $weights["RecommendationWeight"]["id"];
            $this->RecommendationWeight->save(array(
                "interest_rate_weight" => floatval($data['interestRateWeight'] ?? $weights['RecommendationWeight']['interest_rate_weight']),
                "risk_match_weight" => floatval($data['riskMatchWeight'] ?? $weights['RecommendationWeight']['risk_match_weight']),
                "reputation_weight" => floatval($data['reputationWeight'] ?? $weights['RecommendationWeight']['reputation_weight']),
                "funding_momentum_weight" => floatval($data['fundingMomentumWeight'] ?? $weights['RecommendationWeight']['funding_momentum_weight']),
                "collateral_weight" => floatval($data['collateralWeight'] ?? $weights['RecommendationWeight']['collateral_weight'])
            ));
        }
        
        return $this->_jsonResponse(array(
            'success' => true,
            'message' => 'Weights updated'
        ));
    }
    
    // ============ Private Helper Methods ============
    
    /**
     * Get investor preferences
     */
    private function _getInvestorPreferences($userId) {
        if (!$userId) {
            return $this->_getDefaultPreferences();
        }
        
        $preference = $this->InvestorPreference->find("first", array(
            "conditions" => array("InvestorPreference.investor_id" => $userId)
        ));
        
        if (!$preference) {
            return $this->_getDefaultPreferences();
        }
        
        return array(
            'riskTolerance' => $preference['InvestorPreference']['risk_tolerance'],
            'minInterestRate' => floatval($preference['InvestorPreference']['min_interest_rate']),
            'maxInterestRate' => floatval($preference['InvestorPreference']['max_interest_rate']),
            'minLoanSize' => floatval($preference['InvestorPreference']['min_loan_size']),
            'maxLoanSize' => floatval($preference['InvestorPreference']['max_loan_size']),
            'preferredCollateralTypes' => json_decode($preference['InvestorPreference']['preferred_collateral_types'], true),
            'maxLoanExposure' => floatval($preference['InvestorPreference']['max_loan_exposure']),
            'minInvestmentAmount' => floatval($preference['InvestorPreference']['min_investment_amount'])
        );
    }
    
    /**
     * Get default preferences
     */
    private function _getDefaultPreferences() {
        return array(
            'riskTolerance' => 'medium',
            'minInterestRate' => 5,
            'maxInterestRate' => 25,
            'minLoanSize' => 500,
            'maxLoanSize' => 50000,
            'preferredCollateralTypes' => array(),
            'maxLoanExposure' => 25000,
            'minInvestmentAmount' => 100
        );
    }
    
    /**
     * Get discoverable loans based on preferences
     */
    private function _getDiscoverableLoans($preferences) {
        $conditions = array(
            "LoanRequest.status" => array("approved", "active")
        );
        
        // Apply preference filters
        if (isset($preferences['minInterestRate'])) {
            $conditions["LoanRequest.interest_rate >="] = $preferences['minInterestRate'];
        }
        if (isset($preferences['maxInterestRate'])) {
            $conditions["LoanRequest.interest_rate <="] = $preferences['maxInterestRate'];
        }
        if (isset($preferences['minLoanSize'])) {
            $conditions["LoanRequest.loan_amount >="] = $preferences['minLoanSize'];
        }
        if (isset($preferences['maxLoanSize'])) {
            $conditions["LoanRequest.loan_amount <="] = $preferences['maxLoanSize'];
        }
        
        $loans = $this->LoanRequest->find("all", array(
            "conditions" => $conditions,
            "order" => array("LoanRequest.created_at" => "DESC"),
            "limit" => 100
        ));
        
        return $this->_formatLoans($loans);
    }
    
    /**
     * Calculate discovery scores for loans
     */
    private function _calculateDiscoveryScores($loans, $preferences, $userId) {
        $weights = $this->_getWeights($userId);
        
        foreach ($loans as &$loan) {
            $loan['discoveryScore'] = $this->_calculateSingleScore($loan, $preferences, $weights);
        }
        
        return $loans;
    }
    
    /**
     * Calculate single loan discovery score
     */
    private function _calculateSingleScore($loan, $preferences, $weights = null) {
        if (!$weights) {
            $weights = array(
                'interestRateWeight' => 25,
                'riskMatchWeight' => 25,
                'reputationWeight' => 20,
                'fundingMomentumWeight' => 15,
                'collateralWeight' => 15
            );
        }
        
        $loanAmount = floatval($loan['loan_amount'] ?? $loan['loanAmount'] ?? 0);
        $fundedAmount = floatval($loan['funded_amount'] ?? $loan['fundedAmount'] ?? 0);
        $loanRate = floatval($loan['interest_rate'] ?? $loan['interestRate'] ?? 0);
        $riskScore = floatval($loan['risk_score'] ?? $loan['riskScore'] ?? 50);
        
        // 1. Interest Rate Attractiveness (0-100)
        $minRate = $preferences['minInterestRate'] ?? 0;
        $maxRate = $preferences['maxInterestRate'] ?? 30;
        
        $rateAttractiveness = 0;
        if ($loanRate >= $minRate && $loanRate <= $maxRate) {
            $rangeSize = $maxRate - $minRate ?: 1;
            $rateAttractiveness = (($loanRate - $minRate) / $rangeSize) * 100;
        } elseif ($loanRate > $maxRate) {
            $rateAttractiveness = max(0, 100 - (($loanRate - $maxRate) * 10));
        } else {
            $rateAttractiveness = max(0, 50 - (($minRate - $loanRate) * 5));
        }
        
        // 2. Risk Match Score (0-100)
        $riskTolerance = $preferences['riskTolerance'] ?? 'medium';
        $riskRanges = array(
            'low' => array('min' => 0, 'max' => 30),
            'medium' => array('min' => 0, 'max' => 50),
            'high' => array('min' => 0, 'max' => 70),
            'very_high' => array('min' => 0, 'max' => 100)
        );
        
        $range = $riskRanges[$riskTolerance] ?? $riskRanges['medium'];
        $riskMatch = 0;
        if ($riskScore >= $range['min'] && $riskScore <= $range['max']) {
            $riskMatch = 100 - abs($riskScore - ($range['min'] + $range['max']) / 2);
        } elseif ($riskScore < $range['min']) {
            $riskMatch = max(0, 50 - ($range['min'] - $riskScore) * 2);
        } else {
            $riskMatch = max(0, 50 - ($riskScore - $range['max']) * 2);
        }
        
        // 3. Reputation Score (0-100)
        $reputationScore = floatval($loan['borrower_reputation_score'] ?? $loan['borrowerReputationScore'] ?? 50);
        
        // 4. Funding Momentum Score (0-100)
        $fundingProgress = ($loanAmount > 0) ? ($fundedAmount / $loanAmount) * 100 : 0;
        $fundingMomentum = 0;
        if ($fundingProgress >= 80) {
            $fundingMomentum = 100;
        } elseif ($fundingProgress >= 50) {
            $fundingMomentum = 80;
        } elseif ($fundingProgress >= 25) {
            $fundingMomentum = 60;
        } elseif ($fundingProgress > 0) {
            $fundingMomentum = 40;
        } else {
            $fundingMomentum = 20;
        }
        
        // 5. Collateral Score (0-100)
        $collateralScore = 50;
        $preferredCollateral = $preferences['preferredCollateralTypes'] ?? array();
        $loanCollateralType = $loan['collateral_type'] ?? $loan['collateralType'] ?? '';
        
        if (!empty($preferredCollateral) && $loanCollateralType) {
            $collateralScore = in_array($loanCollateralType, $preferredCollateral) ? 100 : 30;
        }
        
        // Adjust for LTV
        $ltvRatio = floatval($loan['ltv_ratio'] ?? $loan['ltvRatio'] ?? 0);
        if ($ltvRatio <= 50) {
            $collateralScore = min(100, $collateralScore + 20);
        } elseif ($ltvRatio <= 70) {
            $collateralScore = min(100, $collateralScore + 10);
        } elseif ($ltvRatio > 80) {
            $collateralScore = max(0, $collateralScore - 20);
        }
        
        // Closing soon boost
        $closingSoonBoost = 0;
        if ($fundingProgress >= 80 && $fundingProgress < 100) {
            $closingSoonBoost = 20;
        }
        
        // Calculate weighted score
        $totalScore = (
            $weights['interestRateWeight'] * $rateAttractiveness +
            $weights['riskMatchWeight'] * $riskMatch +
            $weights['reputationWeight'] * $reputationScore +
            $weights['fundingMomentumWeight'] * $fundingMomentum +
            $weights['collateralWeight'] * $collateralScore
        );
        
        $maxPossibleScore = (
            $weights['interestRateWeight'] +
            $weights['riskMatchWeight'] +
            $weights['reputationWeight'] +
            $weights['fundingMomentumWeight'] +
            $weights['collateralWeight']
        ) * 100;
        
        $normalizedScore = min(100, ($totalScore / $maxPossibleScore) * 100);
        
        return round($normalizedScore + $closingSoonBoost, 2);
    }
    
    /**
     * Get recommendation weights
     */
    private function _getWeights($userId) {
        $weights = $this->RecommendationWeight->find("first", array(
            "conditions" => array("RecommendationWeight.investor_id" => $userId ?? 0)
        ));
        
        if (!$weights) {
            return array(
                'interestRateWeight' => 25,
                'riskMatchWeight' => 25,
                'reputationWeight' => 20,
                'fundingMomentumWeight' => 15,
                'collateralWeight' => 15
            );
        }
        
        return array(
            'interestRateWeight' => floatval($weights['RecommendationWeight']['interest_rate_weight']),
            'riskMatchWeight' => floatval($weights['RecommendationWeight']['risk_match_weight']),
            'reputationWeight' => floatval($weights['RecommendationWeight']['reputation_weight']),
            'fundingMomentumWeight' => floatval($weights['RecommendationWeight']['funding_momentum_weight']),
            'collateralWeight' => floatval($weights['RecommendationWeight']['collateral_weight'])
        );
    }
    
    /**
     * Format loans for API response
     */
    private function _formatLoans($loans) {
        $formatted = array();
        
        foreach ($loans as $loan) {
            $loanAmount = floatval($loan['LoanRequest']['loan_amount']);
            $fundedAmount = floatval($loan['LoanRequest']['funded_amount']);
            $fundingProgress = ($loanAmount > 0) ? ($fundedAmount / $loanAmount) * 100 : 0;
            
            $formatted[] = array(
                'id' => $loan['LoanRequest']['id'],
                'title' => $loan['LoanRequest']['title'],
                'description' => $loan['LoanRequest']['description'],
                'loanAmount' => $loanAmount,
                'fundedAmount' => $fundedAmount,
                'fundingProgress' => round($fundingProgress, 2),
                'interestRate' => floatval($loan['LoanRequest']['interest_rate']),
                'durationMonths' => intval($loan['LoanRequest']['duration_months']),
                'riskScore' => floatval($loan['LoanRequest']['risk_score']),
                'ltvRatio' => floatval($loan['LoanRequest']['ltv_ratio']),
                'collateralType' => $loan['LoanRequest']['collateral_type'] ?? '',
                'borrowerName' => $loan['LoanRequest']['borrower_name'] ?? 'Anonymous',
                'borrowerReputationScore' => floatval($loan['LoanRequest']['borrower_reputation_score'] ?? 50),
                'status' => $loan['LoanRequest']['status'],
                'createdAt' => $loan['LoanRequest']['created_at']
            );
        }
        
        return $formatted;
    }
    
    /**
     * Get investor interest text
     */
    private function _getInvestorInterestText($score) {
        if ($score >= 75) return 'Very Strong';
        if ($score >= 60) return 'Strong';
        if ($score >= 40) return 'Moderate';
        if ($score >= 25) return 'Weak';
        return 'Very Weak';
    }
    
    /**
     * Calculate average funding time
     */
    private function _calculateAverageFundingTime($startDate) {
        // Mock calculation - would need actual data
        return 4.2;
    }
    
    /**
     * Calculate engagement rate
     */
    private function _calculateEngagementRate($startDate) {
        // Mock calculation - would need actual data
        return 67.8;
    }
    
    /**
     * Require authentication helper
     */
    private function _requireAuth() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_errorResponse('Unauthorized', 401);
        }
        return $userId;
    }
    
    /**
     * Require admin helper
     */
    private function _requireAdmin() {
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
