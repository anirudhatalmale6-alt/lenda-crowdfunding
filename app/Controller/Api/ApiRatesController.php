<?php
/**
 * Rates Controller
 * 
 * Handles rate adjustments, platform rate settings, and interest rate management
 * 
 * @package Lenda.Controller
 * @subpackage Lenda.Controller.Api
 */
App::uses('ApiBaseController', 'Controller');

class ApiRatesController extends ApiBaseController
{
    public $name = 'ApiRates';
    public $uses = array('Loan', 'LoanRequest', 'User', 'LoanRisk');
    
    /**
     * Rate limits configuration
     */
    const MIN_INTEREST_RATE = 1;
    const MAX_INTEREST_RATE = 50;
    const DEFAULT_INTEREST_RATE = 10;
    const MAX_RATE_INCREASE = 5;
    const MAX_RATE_DECREASE = 10;
    
    /**
     * Initialize controller
     */
    public function initialize()
    {
        parent::initialize();
        $this->Auth->allow('platformSettings', 'suggested', 'calculate', 'validate', 'averageByCategory');
    }
    
    /**
     * Get platform rate settings
     * GET /api/rates/platform-settings
     */
    public function platformSettings()
    {
        $this->autoRender = false;
        
        $settings = array(
            'min_rate' => $this->_getRateConfig('min', self::MIN_INTEREST_RATE),
            'max_rate' => $this->_getRateConfig('max', self::MAX_INTEREST_RATE),
            'default_rate' => $this->_getRateConfig('default', self::DEFAULT_INTEREST_RATE),
            'max_increase' => $this->_getRateConfig('max_increase', self::MAX_RATE_INCREASE),
            'max_decrease' => $this->_getRateConfig('max_decrease', self::MAX_RATE_DECREASE),
            'adjustment_frequency_days' => 30,
            'allow_borrower_adjustment' => true,
            'require_admin_approval' => Configure::read('Loan.rateAdjustRequireApproval') ?: false
        );
        
        $this->response->body(json_encode(array(
            'success' => true,
            'settings' => $settings
        )));
    }
    
    /**
     * Get rate configuration from environment/config
     */
    private function _getRateConfig($key, $default)
    {
        $envKey = 'LENDA_' . strtoupper($key) . '_INTEREST_RATE';
        $value = getenv($envKey);
        
        if ($value !== false) {
            return floatval($value);
        }
        
        $configValue = Configure::read('Loan.' . $key . 'Rate');
        return $configValue ? floatval($configValue) : $default;
    }
    
    /**
     * Update platform rate settings (admin only)
     * PUT /api/rates/platform-settings
     */
    public function updatePlatformSettings()
    {
        $this->autoRender = false;
        
        // Check admin permission
        if (!$this->isAdmin()) {
            $this->response->statusCode(403);
            $this->response->body(json_encode(array(
                'success' => false,
                'error' => 'Admin access required'
            )));
            return;
        }
        
        $data = $this->request->data;
        
        // Validate and save settings
        if (isset($data['min_rate'])) {
            $minRate = floatval($data['min_rate']);
            if ($minRate < self::MIN_INTEREST_RATE || $minRate > self::MAX_INTEREST_RATE) {
                $this->_error('Invalid minimum rate');
                return;
            }
            Configure::write('Loan.minRate', $minRate);
        }
        
        if (isset($data['max_rate'])) {
            $maxRate = floatval($data['max_rate']);
            if ($maxRate < self::MIN_INTEREST_RATE || $maxRate > self::MAX_INTEREST_RATE) {
                $this->_error('Invalid maximum rate');
                return;
            }
            Configure::write('Loan.maxRate', $maxRate);
        }
        
        if (isset($data['default_rate'])) {
            $defaultRate = floatval($data['default_rate']);
            Configure::write('Loan.defaultRate', $defaultRate);
        }
        
        if (isset($data['require_admin_approval'])) {
            Configure::write('Loan.rateAdjustRequireApproval', (bool)$data['require_admin_approval']);
        }
        
        $this->response->body(json_encode(array(
            'success' => true,
            'message' => 'Settings updated'
        )));
    }
    
    /**
     * Get suggested rate for borrower
     * GET /api/rates/suggested
     */
    public function suggested()
    {
        $this->autoRender = false;
        
        $borrowerId = $this->request->query('borrower_id');
        $loanAmount = floatval($this->request->query('loan_amount'));
        $duration = intval($this->request->query('duration'));
        
        if (!$borrowerId) {
            $this->_error('Borrower ID required');
            return;
        }
        
        // Get borrower credit score
        $creditScore = $this->_getBorrowerCreditScore($borrowerId);
        
        // Calculate suggested rate based on credit and risk
        $baseRate = $this->_getRateConfig('default', self::DEFAULT_INTEREST_RATE);
        $suggestedRate = $this->_calculateSuggestedRate($creditScore, $loanAmount, $duration);
        
        $this->response->body(json_encode(array(
            'success' => true,
            'suggested_rate' => $suggestedRate,
            'base_rate' => $baseRate,
            'credit_score' => $creditScore,
            'rate_range' => array(
                'min' => max($this->_getRateConfig('min', self::MIN_INTEREST_RATE), $suggestedRate - 5),
                'max' => min($this->_getRateConfig('max', self::MAX_INTEREST_RATE), $suggestedRate + 5)
            )
        )));
    }
    
    /**
     * Calculate suggested rate based on borrower profile
     */
    private function _calculateSuggestedRate($creditScore, $loanAmount, $duration)
    {
        $baseRate = $this->_getRateConfig('default', self::DEFAULT_INTEREST_RATE);
        
        // Adjust based on credit score
        if ($creditScore >= 750) {
            $rateAdjustment = -3;
        } elseif ($creditScore >= 700) {
            $rateAdjustment = -2;
        } elseif ($creditScore >= 650) {
            $rateAdjustment = 0;
        } elseif ($creditScore >= 600) {
            $rateAdjustment = 2;
        } else {
            $rateAdjustment = 4;
        }
        
        // Adjust based on loan amount (smaller loans may have higher rates)
        if ($loanAmount < 5000) {
            $rateAdjustment += 2;
        } elseif ($loanAmount > 50000) {
            $rateAdjustment -= 1;
        }
        
        // Adjust based on duration
        if ($duration > 36) {
            $rateAdjustment += 1;
        } elseif ($duration < 12) {
            $rateAdjustment -= 1;
        }
        
        $suggestedRate = $baseRate + $rateAdjustment;
        
        // Clamp to valid range
        $minRate = $this->_getRateConfig('min', self::MIN_INTEREST_RATE);
        $maxRate = $this->_getRateConfig('max', self::MAX_INTEREST_RATE);
        
        return max($minRate, min($maxRate, $suggestedRate));
    }
    
    /**
     * Get borrower credit score
     */
    private function _getBorrowerCreditScore($borrowerId)
    {
        $user = $this->User->findById($borrowerId);
        
        if (empty($user)) {
            return 650; // Default neutral score
        }
        
        return !empty($user['User']['credit_score']) 
            ? intval($user['User']['credit_score']) 
            : 650;
    }
    
    /**
     * Update loan interest rate (borrower adjustment)
     * PUT /api/rates/:loanId/rate
     */
    public function updateLoanRate()
    {
        $this->autoRender = false;
        
        $loanId = $this->request->params['id'];
        $newRate = floatval($this->request->data('newRate'));
        $reason = $this->request->data('reason', '');
        
        // Get loan
        $loan = $this->LoanRequest->findById($loanId);
        
        if (!$loan) {
            $this->_error('Loan not found');
            return;
        }
        
        // Check ownership
        $userId = $this->_getCurrentUserId();
        if ($loan['LoanRequest']['borrower_id'] != $userId) {
            $this->response->statusCode(403);
            $this->_error('Access denied');
            return;
        }
        
        // Validate new rate
        $currentRate = floatval($loan['LoanRequest']['interest_rate']);
        $minRate = $this->_getRateConfig('min', self::MIN_INTEREST_RATE);
        $maxRate = $this->_getRateConfig('max', self::MAX_INTEREST_RATE);
        
        if ($newRate < $minRate || $newRate > $maxRate) {
            $this->_error('Rate outside allowed range');
            return;
        }
        
        // Check rate change limits
        $rateChange = $newRate - $currentRate;
        
        if ($rateChange > $this->_getRateConfig('max_increase', self::MAX_RATE_INCREASE)) {
            $this->_error('Rate increase exceeds maximum');
            return;
        }
        
        if ($rateChange < -$this->_getRateConfig('max_decrease', self::MAX_RATE_DECREASE)) {
            $this->_error('Rate decrease exceeds maximum');
            return;
        }
        
        // Check if admin approval required
        $requireApproval = Configure::read('Loan.rateAdjustRequireApproval');
        
        if ($requireApproval) {
            // Create approval request
            $this->LoanRequest->id = $loanId;
            $this->LoanRequest->save(array(
                'pending_rate' => $newRate,
                'rate_change_reason' => $reason,
                'rate_change_status' => 'pending'
            ));
            
            $this->response->body(json_encode(array(
                'success' => true,
                'status' => 'pending_approval',
                'message' => 'Rate change pending admin approval'
            )));
        } else {
            // Apply rate change directly
            $this->LoanRequest->id = $loanId;
            $this->LoanRequest->save(array(
                'interest_rate' => $newRate,
                'rate_changed_at' => date('Y-m-d H:i:s'),
                'rate_change_reason' => $reason
            ));
            
            // Record rate history
            $this->_recordRateHistory($loanId, $currentRate, $newRate, $reason);
            
            $this->response->body(json_encode(array(
                'success' => true,
                'status' => 'applied',
                'previous_rate' => $currentRate,
                'new_rate' => $newRate
            )));
        }
    }
    
    /**
     * Preview rate adjustment impact
     * POST /api/rates/:loanId/preview-adjustment
     */
    public function previewRateAdjustment()
    {
        $this->autoRender = false;
        
        $loanId = $this->request->params['id'];
        $newRate = floatval($this->request->data('newRate'));
        
        $loan = $this->LoanRequest->findById($loanId);
        
        if (!$loan) {
            $this->_error('Loan not found');
            return;
        }
        
        $currentRate = floatval($loan['LoanRequest']['interest_rate']);
        $loanAmount = floatval($loan['LoanRequest']['loan_amount']);
        $duration = intval($loan['LoanRequest']['duration_months']);
        
        // Calculate monthly payment with current rate
        $currentMonthly = $this->_calculateMonthlyPayment($loanAmount, $currentRate, $duration);
        
        // Calculate monthly payment with new rate
        $newMonthly = $this->_calculateMonthlyPayment($loanAmount, $newRate, $duration);
        
        // Calculate total interest difference
        $currentTotalInterest = ($currentMonthly * $duration) - $loanAmount;
        $newTotalInterest = ($newMonthly * $duration) - $loanAmount;
        
        $this->response->body(json_encode(array(
            'success' => true,
            'preview' => array(
                'current_rate' => $currentRate,
                'new_rate' => $newRate,
                'current_monthly_payment' => round($currentMonthly, 2),
                'new_monthly_payment' => round($newMonthly, 2),
                'monthly_difference' => round($newMonthly - $currentMonthly, 2),
                'total_interest_current' => round($currentTotalInterest, 2),
                'total_interest_new' => round($newTotalInterest, 2),
                'total_difference' => round($newTotalInterest - $currentTotalInterest, 2)
            )
        )));
    }
    
    /**
     * Calculate monthly payment
     */
    private function _calculateMonthlyPayment($principal, $annualRate, $months)
    {
        if ($annualRate == 0) {
            return $principal / $months;
        }
        
        $monthlyRate = $annualRate / 100 / 12;
        $payment = $principal * $monthlyRate * pow(1 + $monthlyRate, $months) / (pow(1 + $monthlyRate, $months) - 1);
        
        return round($payment, 2);
    }
    
    /**
     * Record rate change history
     */
    private function _recordRateHistory($loanId, $oldRate, $newRate, $reason)
    {
        // This would save to a rate_history table
        // For now, log the change
        CakeLog::write('info', "Rate changed for loan $loanId: $oldRate% -> $newRate% ($reason)");
    }
    
    /**
     * Get rate history for a loan
     * GET /api/rates/:loanId/history
     */
    public function rateHistory()
    {
        $this->autoRender = false;
        
        $loanId = $this->request->params['id'];
        
        // This would fetch from rate_history table
        $this->response->body(json_encode(array(
            'success' => true,
            'history' => array()
        )));
    }
    
    /**
     * Get average funded rates by risk category
     * GET /api/rates/average-by-category
     */
    public function averageByCategory()
    {
        $this->autoRender = false;
        
        // Calculate average rates by risk category from completed loans
        $loans = $this->LoanRequest->find('all', array(
            'conditions' => array(
                'LoanRequest.status' => array('paid', 'completed', 'active')
            ),
            'fields' => array(
                'AVG(LoanRequest.interest_rate) as avg_rate',
                'LoanRequest.risk_category'
            ),
            'group' => 'LoanRequest.risk_category'
        ));
        
        $averages = array();
        foreach ($loans as $loan) {
            if (!empty($loan['LoanRequest']['risk_category'])) {
                $averages[$loan['LoanRequest']['risk_category']] = round(floatval($loan[0]['avg_rate']), 2);
            }
        }
        
        $this->response->body(json_encode(array(
            'success' => true,
            'averages' => $averages
        )));
    }
    
    /**
     * Validate rate
     * POST /api/rates/validate
     */
    public function validate()
    {
        $this->autoRender = false;
        
        $rate = floatval($this->request->data('rate'));
        $riskCategory = $this->request->data('risk_category', 'A');
        
        $minRate = $this->_getRateConfig('min', self::MIN_INTEREST_RATE);
        $maxRate = $this->_getRateConfig('max', self::MAX_INTEREST_RATE);
        
        $errors = array();
        
        if ($rate < $minRate) {
            $errors[] = "Rate must be at least $minRate%";
        }
        
        if ($rate > $maxRate) {
            $errors[] = "Rate cannot exceed $maxRate%";
        }
        
        $this->response->body(json_encode(array(
            'success' => count($errors) === 0,
            'valid' => count($errors) === 0,
            'errors' => $errors
        )));
    }
    
    /**
     * Get rate statistics for admin dashboard
     * GET /api/rates/statistics
     */
    public function statistics()
    {
        $this->autoRender = false;
        
        if (!$this->isAdmin()) {
            $this->response->statusCode(403);
            $this->_error('Admin access required');
            return;
        }
        
        $timeRange = intval($this->request->query('timeRange')) ?: 30;
        
        // Get rate statistics
        $stats = $this->LoanRequest->find('all', array(
            'conditions' => array(
                'LoanRequest.created >=' => date('Y-m-d', strtotime("-{$timeRange} days"))
            ),
            'fields' => array(
                'AVG(LoanRequest.interest_rate) as avg_rate',
                'MIN(LoanRequest.interest_rate) as min_rate',
                'MAX(LoanRequest.interest_rate) as max_rate',
                'COUNT(*) as total_loans'
            )
        ));
        
        $this->response->body(json_encode(array(
            'success' => true,
            'statistics' => array(
                'average_rate' => round(floatval($stats[0][0]['avg_rate']), 2),
                'min_rate' => round(floatval($stats[0][0]['min_rate']), 2),
                'max_rate' => round(floatval($stats[0][0]['max_rate']), 2),
                'total_loans' => intval($stats[0][0]['total_loans']),
                'time_range_days' => $timeRange
            )
        )));
    }
    
    /**
     * Check if current user is admin
     */
    private function isAdmin()
    {
        $user = $this->Auth->user();
        return !empty($user) && (
            $user['role'] === 'admin' || 
            $user['role'] === 'super_admin' ||
            isset($user['is_admin']) && $user['is_admin']
        );
    }
}
