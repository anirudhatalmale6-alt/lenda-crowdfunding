<?php
/**
 * Risk API Controller
 * 
 * Handles API endpoints for risk management:
 * - RISK-05: Risk recalculation during refinancing
 * - RISK-06: Refinancing terms validation
 * - Real-time risk analysis
 * 
 * @package    Lenda
 * @subpackage Controller
 */
App::uses('AppController', 'Controller');
App::uses('CakeNumber', 'Utility');

class RiskApiController extends AppController
{
    public $name = 'RiskApi';
    public $uses = array('Loan', 'User', 'Collateral', 'LoanRisk', 'RefinancingRequest', 'RiskWatchlist');
    public $components = array('RequestHandler');
    
    /**
     * Before filter
     * SEC-007: Removed blanket auth allow - endpoints require authentication
     */
    public function beforeFilter()
    {
        parent::beforeFilter();
        // SEC-007: No blanket allow - require authentication for risk endpoints
        // Only public endpoints should be explicitly allowed
    }
    
    /**
     * Validate refinancing terms (RISK-05, RISK-06)
     * 
     * @url /api/risk/validate-refinancing
     * @method POST
     */
    public function validateRefinancing()
    {
        $this->autoRender = false;
        
        if (!$this->request->is('post')) {
            $this->response->statusCode(405);
            $this->response->body(json_encode(array(
                'success' => false,
                'error' => 'Method not allowed'
            )));
            return;
        }
        
        $data = $this->request->data;
        
        // Required fields
        if (empty($data['loan_id'])) {
            $this->response->statusCode(400);
            $this->response->body(json_encode(array(
                'success' => false,
                'error' => 'Loan ID is required'
            )));
            return;
        }
        
        $loanId = $data['loan_id'];
        $newInterestRate = isset($data['new_interest_rate']) ? floatval($data['new_interest_rate']) : null;
        $newDuration = isset($data['new_duration_months']) ? intval($data['new_duration_months']) : null;
        
        // Get loan details
        $loan = $this->Loan->findById($loanId);
        
        if (!$loan) {
            $this->response->statusCode(404);
            $this->response->body(json_encode(array(
                'success' => false,
                'error' => 'Loan not found'
            )));
            return;
        }
        
        $validationResult = $this->_validateRefinancingTerms($loan, $newInterestRate, $newDuration);
        
        // RISK-05: Get risk assessment for refinancing
        $riskAssessment = $this->_getRefinancingRiskAssessment($loan);
        
        $this->response->body(json_encode(array(
            'success' => true,
            'validation' => $validationResult,
            'risk_assessment' => $riskAssessment,
            'loan_details' => array(
                'id' => $loan['Loan']['id'],
                'current_balance' => $loan['Loan']['loan_amount'],
                'current_rate' => $loan['Loan']['interest_rate'],
                'current_duration' => $loan['Loan']['duration_months'],
                'ltv' => $this->_calculateCurrentLTV($loan)
            )
        )));
    }
    
    /**
     * Validate refinancing terms (RISK-06)
     */
    private function _validateRefinancingTerms($loan, $newRate, $newDuration)
    {
        $errors = array();
        $warnings = array();
        
        // Rate validation (RISK-06)
        if ($newRate !== null) {
            if ($newRate < 5) {
                $errors['new_interest_rate'] = 'Interest rate must be at least 5%';
            } elseif ($newRate > 30) {
                $errors['new_interest_rate'] = 'Interest rate cannot exceed 30%';
            }
            
            // Warning if rate is significantly higher
            if ($newRate > $loan['Loan']['interest_rate'] * 1.5) {
                $warnings['new_interest_rate'] = 'New rate is significantly higher than current rate';
            }
        }
        
        // Duration validation (RISK-06)
        if ($newDuration !== null) {
            if ($newDuration < 6) {
                $errors['new_duration_months'] = 'Duration must be at least 6 months';
            } elseif ($newDuration > 60) {
                $errors['new_duration_months'] = 'Duration cannot exceed 60 months';
            }
            
            // Warning if extending significantly
            if ($newDuration > $loan['Loan']['duration_months'] * 2) {
                $warnings['new_duration_months'] = 'New duration significantly extends the loan term';
            }
        }
        
        // LTV validation
        $ltv = $this->_calculateCurrentLTV($loan);
        if ($ltv > 80) {
            $warnings['ltv'] = 'Current LTV is high - refinancing may be challenging';
        }
        
        return array(
            'valid' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings
        );
    }
    
    /**
     * Get refinancing risk assessment (RISK-05)
     */
    private function _getRefinancingRiskAssessment($loan)
    {
        // Calculate default probability
        $defaultProbability = $this->_calculateDefaultProbability($loan);
        
        // Get current LTV
        $ltvPercentage = $this->_calculateCurrentLTV($loan);
        
        // Get borrower credit score
        $creditScore = !empty($loan['User']['credit_score']) 
            ? $loan['User']['credit_score'] 
            : null;
        
        // Determine risk category
        $riskCategory = $this->_determineRiskCategory($defaultProbability, $ltvPercentage, $creditScore);
        
        return array(
            'default_probability' => $defaultProbability,
            'ltv_percentage' => $ltvPercentage,
            'credit_score' => $creditScore,
            'risk_category' => $riskCategory,
            'can_refinance' => $defaultProbability < 40 && $ltvPercentage < 80,
            'recommendations' => $this->_getRefinancingRecommendations($defaultProbability, $ltvPercentage)
        );
    }
    
    /**
     * Calculate default probability (RISK-05)
     */
    private function _calculateDefaultProbability($loan)
    {
        $probability = 0;
        
        // Payment history (0-30%)
        $paymentHistory = $this->_getPaymentHistoryScore($loan);
        $probability += (30 - $paymentHistory) * 0.3;
        
        // LTV (0-25%)
        $ltv = $this->_calculateCurrentLTV($loan);
        if ($ltv > 80) {
            $probability += 25;
        } elseif ($ltv > 70) {
            $probability += 15;
        } elseif ($ltv > 60) {
            $probability += 10;
        }
        
        // Credit score (0-20%)
        if (!empty($loan['User']['credit_score'])) {
            $creditScore = $loan['User']['credit_score'];
            if ($creditScore < 600) {
                $probability += 20;
            } elseif ($creditScore < 700) {
                $probability += 10;
            }
        } else {
            $probability += 10;
        }
        
        // Overdue status (0-25%)
        if (!empty($loan['Loan']['is_overdue'])) {
            $daysOverdue = !empty($loan['Loan']['days_overdue']) ? $loan['Loan']['days_overdue'] : 1;
            $probability += min(25, $daysOverdue * 5);
        }
        
        return min(100, round($probability));
    }
    
    /**
     * Get payment history score
     */
    private function _getPaymentHistoryScore($loan)
    {
        // This would query repayment history
        // Simplified version
        $this->Loan->id = $loan['Loan']['id'];
        $repayments = $this->Loan->Repayment->find('all', array(
            'conditions' => array(
                'Repayment.loan_id' => $loan['Loan']['id'],
                'Repayment.status' => 'PAID'
            )
        ));
        
        if (empty($repayments)) {
            return 15; // Neutral
        }
        
        $latePayments = 0;
        foreach ($repayments as $repayment) {
            if (strtotime($repayment['Repayment']['paid_date']) > strtotime($repayment['Repayment']['due_date'])) {
                $latePayments++;
            }
        }
        
        $onTimeRatio = (count($repayments) - $latePayments) / count($repayments);
        
        if ($onTimeRatio >= 0.9) return 30;
        if ($onTimeRatio >= 0.7) return 20;
        if ($onTimeRatio >= 0.5) return 10;
        return 0;
    }
    
    /**
     * Calculate current LTV
     */
    private function _calculateCurrentLTV($loan)
    {
        $collateralValue = 0;
        
        if (!empty($loan['Collateral'])) {
            foreach ($loan['Collateral'] as $collateral) {
                $collateralValue += !empty($collateral['current_value']) 
                    ? $collateral['current_value'] 
                    : $collateral['estimated_value'];
            }
        }
        
        if ($collateralValue == 0) {
            return 100; // Maximum risk if no collateral
        }
        
        return ($loan['Loan']['loan_amount'] / $collateralValue) * 100;
    }
    
    /**
     * Determine risk category
     */
    private function _determineRiskCategory($defaultProbability, $ltvPercentage, $creditScore)
    {
        if ($defaultProbability < 20 && $ltvPercentage < 60) {
            return 'AAA';
        }
        if ($defaultProbability < 30 && $ltvPercentage < 70) {
            return 'AA';
        }
        if ($defaultProbability < 40 && $ltvPercentage < 75) {
            return 'A';
        }
        if ($defaultProbability < 50 && $ltvPercentage < 80) {
            return 'BBB';
        }
        if ($defaultProbability < 60) {
            return 'BB';
        }
        return 'high_risk';
    }
    
    /**
     * Get refinancing recommendations
     */
    private function _getRefinancingRecommendations($defaultProbability, $ltvPercentage)
    {
        $recommendations = array();
        
        if ($defaultProbability > 40) {
            $recommendations[] = 'Consider improving payment history before refinancing';
        }
        
        if ($ltvPercentage > 80) {
            $recommendations[] = 'Reduce loan amount or provide additional collateral';
        }
        
        if ($defaultProbability < 30 && $ltvPercentage < 60) {
            $recommendations[] = 'Good candidate for favorable refinancing terms';
        }
        
        return $recommendations;
    }
    
    /**
     * Submit refinancing request with risk recalculation (RISK-05)
     * 
     * @url /api/risk/submit-refinancing
     * @method POST
     */
    public function submitRefinancing()
    {
        $this->autoRender = false;
        
        if (!$this->request->is('post')) {
            $this->response->statusCode(405);
            return;
        }
        
        $data = $this->request->data;
        
        // Validate required fields
        if (empty($data['loan_id']) || empty($data['new_interest_rate']) || empty($data['new_duration_months'])) {
            $this->response->statusCode(400);
            $this->response->body(json_encode(array(
                'success' => false,
                'error' => 'Missing required fields'
            )));
            return;
        }
        
        // Validate terms first
        $validationResult = $this->_validateRefinancingTerms(
            $this->Loan->findById($data['loan_id']),
            $data['new_interest_rate'],
            $data['new_duration_months']
        );
        
        if (!$validationResult['valid']) {
            $this->response->statusCode(400);
            $this->response->body(json_encode(array(
                'success' => false,
                'validation' => $validationResult
            )));
            return;
        }
        
        // RISK-05: Perform risk recalculation for refinancing
        $riskAssessment = $this->_getRefinancingRiskAssessment(
            $this->Loan->findById($data['loan_id'])
        );
        
        // Check if risk is acceptable
        if ($riskAssessment['default_probability'] > 40) {
            $this->response->statusCode(400);
            $this->response->body(json_encode(array(
                'success' => false,
                'error' => 'Risk assessment failed - default probability too high',
                'risk_assessment' => $riskAssessment
            )));
            return;
        }
        
        // Create refinancing request
        $refinancingData = array(
            'loan_id' => $data['loan_id'],
            'new_interest_rate' => $data['new_interest_rate'],
            'new_duration_months' => $data['new_duration_months'],
            'requested_date' => date('Y-m-d H:i:s'),
            'status' => 'pending',
            'risk_assessment' => json_encode($riskAssessment)
        );
        
        $this->RefinancingRequest->create();
        
        if ($this->RefinancingRequest->save($refinancingData)) {
            $this->response->body(json_encode(array(
                'success' => true,
                'refinancing_id' => $this->RefinancingRequest->id,
                'risk_assessment' => $riskAssessment
            )));
        } else {
            $this->response->statusCode(500);
            $this->response->body(json_encode(array(
                'success' => false,
                'error' => 'Failed to submit refinancing request'
            )));
        }
    }
    
    /**
     * Analyze loan risk (RISK-05)
     * 
     * @url /api/risk/loan/analyze/:loanId
     * @method POST
     */
    public function analyzeLoanRisk()
    {
        $this->autoRender = false;
        
        $loanId = $this->request->params['loanId'];
        
        $loan = $this->Loan->findById($loanId);
        
        if (!$loan) {
            $this->response->statusCode(404);
            $this->response->body(json_encode(array(
                'success' => false,
                'error' => 'Loan not found'
            )));
            return;
        }
        
        // Calculate comprehensive risk metrics
        $defaultProbability = $this->_calculateDefaultProbability($loan);
        $ltvPercentage = $this->_calculateCurrentLTV($loan);
        
        // Get risk score
        $riskScore = 100 - $defaultProbability;
        
        // Get payment history
        $paymentHistory = $this->_getPaymentHistoryScore($loan);
        
        $this->response->body(json_encode(array(
            'success' => true,
            'loan_id' => $loanId,
            'default_probability' => $defaultProbability,
            'ltv_percentage' => $ltvPercentage,
            'risk_score' => $riskScore,
            'payment_history_score' => $paymentHistory,
            'risk_category' => $this->_determineRiskCategory($defaultProbability, $ltvPercentage, null),
            'analyzed_at' => date('Y-m-d H:i:s')
        )));
    }
    
    /**
     * Get loan risk status
     * 
     * @url /api/risk/loan/status/:loanId
     * @method GET
     */
    public function getLoanRiskStatus()
    {
        $this->autoRender = false;
        
        $loanId = $this->request->params['loanId'];
        
        $loan = $this->Loan->findById($loanId);
        
        if (!$loan) {
            $this->response->statusCode(404);
            return;
        }
        
        // Get existing risk record
        $loanRisk = $this->LoanRisk->findByLoanId($loanId);
        
        $defaultProbability = $this->_calculateDefaultProbability($loan);
        $ltvPercentage = $this->_calculateCurrentLTV($loan);
        
        // Determine risk status
        $riskStatus = 'healthy';
        if ($defaultProbability > 60 || $ltvPercentage > 90) {
            $riskStatus = 'default_imminent';
        } elseif ($defaultProbability > 40 || $ltvPercentage > 80) {
            $riskStatus = 'high_risk';
        } elseif ($defaultProbability > 20 || $ltvPercentage > 70) {
            $riskStatus = 'watchlist';
        }
        
        $this->response->body(json_encode(array(
            'success' => true,
            'loan_id' => $loanId,
            'status' => $riskStatus,
            'default_probability' => $defaultProbability,
            'ltv_percentage' => $ltvPercentage,
            'is_on_watchlist' => $this->_isOnWatchlist($loanId),
            'updated_at' => date('Y-m-d H:i:s')
        )));
    }
    
    /**
     * Check if loan is on watchlist
     */
    private function _isOnWatchlist($loanId)
    {
        $watchlist = $this->RiskWatchlist->findByLoanId($loanId);
        return !empty($watchlist);
    }
    
    /**
     * Get grace period configuration
     * 
     * @url /api/risk/grace-period/config
     * @method GET
     */
    public function getGracePeriodConfig()
    {
        $this->autoRender = false;
        
        $config = array(
            'default_days' => Configure::read('Loan.grace_period_days') ?: 7,
            'min_days' => 1,
            'max_days' => 30,
            'warning_days' => array(3, 5, 7)
        );
        
        $this->response->body(json_encode(array(
            'success' => true,
            'config' => $config
        )));
    }
    
    /**
     * Update grace period configuration (admin)
     * 
     * @url /api/risk/grace-period/config
     * @method PUT
     */
    public function updateGracePeriodConfig()
    {
        $this->autoRender = false;
        
        if (!$this->Auth->user('is_admin')) {
            $this->response->statusCode(403);
            $this->response->body(json_encode(array(
                'success' => false,
                'error' => 'Admin access required'
            )));
            return;
        }
        
        $data = $this->request->data;
        
        if (isset($data['default_days'])) {
            $days = intval($data['default_days']);
            if ($days < 1 || $days > 30) {
                $this->response->statusCode(400);
                $this->response->body(json_encode(array(
                    'success' => false,
                    'error' => 'Grace period must be between 1 and 30 days'
                )));
                return;
            }
            
            Configure::write('Loan.grace_period_days', $days);
        }
        
        $this->response->body(json_encode(array(
            'success' => true,
            'config' => array(
                'default_days' => Configure::read('Loan.grace_period_days')
            )
        )));
    }
    
    /**
     * Check grace period status for a loan
     * 
     * @url /api/risk/grace-period/status/:loanId
     * @method GET
     */
    public function getGracePeriodStatus()
    {
        $this->autoRender = false;
        
        $loanId = $this->request->params['loanId'];
        
        $loan = $this->Loan->findById($loanId);
        
        if (!$loan) {
            $this->response->statusCode(404);
            return;
        }
        
        $gracePeriodDays = Configure::read('Loan.grace_period_days') ?: 7;
        
        $isInGracePeriod = !empty($loan['Loan']['is_in_grace_period']);
        $gracePeriodStart = !empty($loan['Loan']['grace_period_start_date']) 
            ? $loan['Loan']['grace_period_start_date'] 
            : null;
        $gracePeriodEnd = null;
        
        if ($gracePeriodStart) {
            $gracePeriodEnd = date('Y-m-d', strtotime($gracePeriodStart . ' +' . $gracePeriodDays . ' days'));
        }
        
        $daysRemaining = 0;
        if ($isInGracePeriod && $gracePeriodEnd) {
            $daysRemaining = max(0, (strtotime($gracePeriodEnd) - time()) / 86400);
        }
        
        $this->response->body(json_encode(array(
            'success' => true,
            'loan_id' => $loanId,
            'is_in_grace_period' => $isInGracePeriod,
            'grace_period_days' => $gracePeriodDays,
            'grace_period_start' => $gracePeriodStart,
            'grace_period_end' => $gracePeriodEnd,
            'days_remaining' => floor($daysRemaining),
            'next_payment_date' => $loan['Loan']['next_payment_date']
        )));
    }
    
    /**
     * Get loans approaching grace period
     * 
     * @url /api/risk/grace-period/upcoming
     * @method GET
     */
    public function getUpcomingGracePeriod()
    {
        $this->autoRender = false;
        
        $daysAhead = isset($this->request->query['daysAhead']) 
            ? intval($this->request->query['daysAhead']) 
            : 7;
        
        $loans = $this->Loan->find('all', array(
            'conditions' => array(
                'Loan.status' => array('ACTIVE', 'OVERDUE'),
                'Loan.is_in_grace_period' => 0,
                'Loan.next_payment_date <=' => date('Y-m-d', strtotime("+{$daysAhead} days")),
                'Loan.next_payment_date >=' => date('Y-m-d')
            ),
            'contain' => array('User'),
            'limit' => 100
        ));
        
        $this->response->body(json_encode(array(
            'success' => true,
            'loans' => $loans,
            'count' => count($loans)
        )));
    }
    
    /**
     * Get loans at risk (RISK-15)
     * 
     * @url /api/risk/loans-at-risk
     * @method GET
     */
    public function getLoansAtRisk()
    {
        $this->autoRender = false;
        
        $daysAhead = isset($this->request->query['daysAhead']) 
            ? intval($this->request->query['daysAhead']) 
            : 7;
        
        $loans = $this->Loan->find('all', array(
            'conditions' => array(
                'Loan.status' => array('ACTIVE', 'OVERDUE', 'IN_GRACE_PERIOD')
            ),
            'contain' => array('User', 'Collateral', 'LoanRisk'),
            'limit' => 500
        ));
        
        $loansAtRisk = array();
        
        foreach ($loans as $loan) {
            $defaultProbability = $this->_calculateDefaultProbability($loan);
            
            if ($defaultProbability > 20) {
                $loansAtRisk[] = array(
                    'loan' => $loan,
                    'default_probability' => $defaultProbability,
                    'ltv_percentage' => $this->_calculateCurrentLTV($loan)
                );
            }
        }
        
        $this->response->body(json_encode(array(
            'success' => true,
            'loans_at_risk' => $loansAtRisk,
            'count' => count($loansAtRisk)
        )));
    }
    
    /**
     * Get default prediction stats
     * 
     * @url /api/risk/default-prediction/stats
     * @method GET
     */
    public function getDefaultPredictionStats()
    {
        $this->autoRender = false;
        
        // Get counts by probability range
        $loans = $this->Loan->find('all', array(
            'conditions' => array(
                'Loan.status' => array('ACTIVE', 'OVERDUE', 'IN_GRACE_PERIOD')
            ),
            'contain' => array('LoanRisk')
        ));
        
        $stats = array(
            'total_active_loans' => count($loans),
            'probability_ranges' => array(
                '0-20' => 0,
                '21-40' => 0,
                '41-60' => 0,
                '61-80' => 0,
                '81-100' => 0
            ),
            'on_watchlist' => 0,
            'high_risk' => 0
        );
        
        foreach ($loans as $loan) {
            $probability = $this->_calculateDefaultProbability($loan);
            
            if ($probability <= 20) {
                $stats['probability_ranges']['0-20']++;
            } elseif ($probability <= 40) {
                $stats['probability_ranges']['21-40']++;
            } elseif ($probability <= 60) {
                $stats['probability_ranges']['41-60']++;
            } elseif ($probability <= 80) {
                $stats['probability_ranges']['61-80']++;
            } else {
                $stats['probability_ranges']['81-100']++;
            }
            
            if ($this->_isOnWatchlist($loan['Loan']['id'])) {
                $stats['on_watchlist']++;
            }
            
            if ($probability > 40) {
                $stats['high_risk']++;
            }
        }
        
        $this->response->body(json_encode(array(
            'success' => true,
            'stats' => $stats
        )));
    }
    
    /**
     * Validate minimum coverage ratio (RISK-11)
     * 
     * @url /api/risk/validate-coverage
     * @method GET
     */
    public function validateCoverageRatio()
    {
        $this->autoRender = false;
        
        // This would calculate from actual reserve pool data
        $currentRatio = 2500; // Example: 25%
        $minRequired = 1500; // Example: 15%
        
        $this->response->body(json_encode(array(
            'success' => true,
            'current_ratio' => $currentRatio,
            'min_required' => $minRequired,
            'is_valid' => $currentRatio >= $minRequired
        )));
    }
}
