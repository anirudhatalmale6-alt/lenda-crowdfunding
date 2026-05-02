<?php
/**
 * Loan Rate Adjustment Controller
 * 
 * Handles borrower interest rate adjustments before loan funding
 * Addresses UX-02: Rate Adjustment Panel backend integration
 * 
 * @package Lenda
 * @subpackage Controller.Api
 */
App::uses("AppController", "Controller");

class ApiLoanRateController extends AppController {
    use ApiBaseControllerTrait;
    
    public $name = "ApiLoanRate";
    public $uses = array("LoanRequest", "LoanFunding", "User");
    public $layout = null;
    public $autoRender = false;
    
    /**
     * Rate adjustment configuration
     */
    protected $_rateConfig = array(
        'min_rate' => 100,      // 1% minimum
        'max_rate' => 5000,    // 50% maximum
        'min_adjustment' => 50, // 0.5% minimum adjustment
        'rate_change_window' => 3, // days before funding deadline
        'max_adjustments' => 3    // maximum adjustments per loan
    );
    
    public function beforeFilter() {
        parent::beforeFilter();
        $this->Auth->allow(array('calculatePayment', 'getRateHistory', 'preview'));
    }
    
    /**
     * GET /api/loan-rates/adjust/:loanId
     * Get current rate and adjustment eligibility
     */
    public function getAdjustment() {
        $loanId = $this->request->params["id"] ?? null;
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Valid loan ID required'
            ), 400);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        // Get loan
        $loan = $this->LoanRequest->find("first", array(
            "conditions" => array(
                "LoanRequest.id" => $loanId,
                "LoanRequest.borrower_id" => $userId
            )
        ));
        
        if (!$loan) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan not found'), 404);
        }
        
        // Check if adjustment is allowed
        $canAdjust = $this->_canAdjustRate($loan);
        $adjustmentCount = $this->_getAdjustmentCount($loanId);
        
        // Get payment preview with current rate
        $currentPayment = $this->_calculatePayment(
            $loan['LoanRequest']['loan_amount'],
            $loan['LoanRequest']['interest_rate'],
            $loan['LoanRequest']['duration_months']
        );
        
        return $this->_jsonResponse(array(
            'success' => true,
            'loan' => array(
                'id' => $loan['LoanRequest']['id'],
                'amount' => $loan['LoanRequest']['loan_amount'],
                'current_rate' => $loan['LoanRequest']['interest_rate'],
                'duration_months' => $loan['LoanRequest']['duration_months'],
                'status' => $loan['LoanRequest']['status'],
                'funded_amount' => $loan['LoanRequest']['funded_amount'],
                'created_at' => $loan['LoanRequest']['created_at']
            ),
            'adjustment' => array(
                'can_adjust' => $canAdjust['can_adjust'],
                'reason' => $canAdjust['reason'] ?? null,
                'adjustments_remaining' => $this->_rateConfig['max_adjustments'] - $adjustmentCount,
                'max_adjustments' => $this->_rateConfig['max_adjustments'],
                'min_rate' => $this->_rateConfig['min_rate'],
                'max_rate' => $this->_rateConfig['max_rate']
            ),
            'current_payment' => array(
                'monthly' => $currentPayment,
                'total_interest' => ($currentPayment * $loan['LoanRequest']['duration_months']) - $loan['LoanRequest']['loan_amount'],
                'total_payment' => $currentPayment * $loan['LoanRequest']['duration_months']
            ),
            'rate_history' => $this->_getRateHistory($loanId)
        ));
    }
    
    /**
     * POST /api/loan-rates/adjust/:loanId
     * Adjust the interest rate
     */
    public function adjust() {
        $loanId = $this->request->params["id"] ?? null;
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Valid loan ID required'
            ), 400);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $newRate = isset($data['interest_rate']) ? intval($data['interest_rate']) : 0;
        
        // Validate new rate
        if ($newRate < $this->_rateConfig['min_rate'] || $newRate > $this->_rateConfig['max_rate']) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => "Rate must be between {$this->_rateConfig['min_rate']} and {$this->_rateConfig['max_rate']} basis points"
            ), 400);
        }
        
        // Get loan
        $loan = $this->LoanRequest->find("first", array(
            "conditions" => array(
                "LoanRequest.id" => $loanId,
                "LoanRequest.borrower_id" => $userId
            )
        ));
        
        if (!$loan) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan not found'), 404);
        }
        
        // Check if adjustment is allowed
        $canAdjust = $this->_canAdjustRate($loan);
        if (!$canAdjust['can_adjust']) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => $canAdjust['reason']
            ), 400);
        }
        
        // Check adjustment count
        $adjustmentCount = $this->_getAdjustmentCount($loanId);
        if ($adjustmentCount >= $this->_rateConfig['max_adjustments']) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Maximum rate adjustments reached'
            ), 400);
        }
        
        // Validate minimum adjustment
        $currentRate = $loan['LoanRequest']['interest_rate'];
        $rateChange = abs($newRate - $currentRate);
        
        if ($adjustmentCount > 0 && $rateChange < $this->_rateConfig['min_adjustment']) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => "Minimum rate change is {$this->_rateConfig['min_adjustment']} basis points"
            ), 400);
        }
        
        // Record old rate for history
        $oldRate = $currentRate;
        
        // Update loan with new rate
        $this->LoanRequest->id = $loanId;
        $this->LoanRequest->saveField('interest_rate', $newRate);
        
        // Record rate adjustment in history
        $this->_recordRateAdjustment($loanId, $oldRate, $newRate, $userId);
        
        // Calculate new payment
        $newPayment = $this->_calculatePayment(
            $loan['LoanRequest']['loan_amount'],
            $newRate,
            $loan['LoanRequest']['duration_months']
        );
        
        // Notify investors who have funded
        $this->_notifyFundersOfRateChange($loanId, $oldRate, $newRate);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'message' => 'Interest rate adjusted successfully',
            'adjustment' => array(
                'loan_id' => $loanId,
                'old_rate' => $oldRate,
                'new_rate' => $newRate,
                'rate_change' => $newRate - $oldRate,
                'new_monthly_payment' => $newPayment,
                'adjustment_number' => $adjustmentCount + 1
            )
        ));
    }
    
    /**
     * POST /api/loan-rates/preview
     * Preview payment changes for a new rate
     */
    public function preview() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $loanAmount = floatval($data['loan_amount'] ?? 0);
        $currentRate = intval($data['current_rate'] ?? 0);
        $newRate = intval($data['new_rate'] ?? 0);
        $durationMonths = intval($data['duration_months'] ?? 12);
        
        if ($loanAmount <= 0 || $currentRate <= 0 || $durationMonths <= 0) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Invalid parameters'
            ), 400);
        }
        
        if ($newRate < $this->_rateConfig['min_rate'] || $newRate > $this->_rateConfig['max_rate']) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => "Rate must be between {$this->_rateConfig['min_rate']} and {$this->_rateConfig['max_rate']}"
            ), 400);
        }
        
        $currentPayment = $this->_calculatePayment($loanAmount, $currentRate, $durationMonths);
        $newPayment = $this->_calculatePayment($loanAmount, $newRate, $durationMonths);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'preview' => array(
                'loan_amount' => $loanAmount,
                'duration_months' => $durationMonths,
                'current' => array(
                    'rate' => $currentRate,
                    'monthly_payment' => $currentPayment,
                    'total_interest' => ($currentPayment * $durationMonths) - $loanAmount,
                    'total_payment' => $currentPayment * $durationMonths
                ),
                'new' => array(
                    'rate' => $newRate,
                    'monthly_payment' => $newPayment,
                    'total_interest' => ($newPayment * $durationMonths) - $loanAmount,
                    'total_payment' => $newPayment * $durationMonths
                ),
                'difference' => array(
                    'monthly_payment' => $newPayment - $currentPayment,
                    'total_interest' => (($newPayment * $durationMonths) - $loanAmount) - (($currentPayment * $durationMonths) - $loanAmount),
                    'rate_change' => $newRate - $currentRate
                )
            )
        ));
    }
    
    /**
     * GET /api/loan-rates/history/:loanId
     * Get rate adjustment history
     */
    public function history() {
        $loanId = $this->request->params["id"] ?? null;
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Valid loan ID required'
            ), 400);
        }
        
        $history = $this->_getRateHistory($loanId);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'history' => $history
        ));
    }
    
    /**
     * Calculate monthly payment using standard amortization formula
     */
    protected function _calculatePayment($amount, $rateBps, $months) {
        if ($rateBps == 0) {
            return $amount / $months;
        }
        
        $monthlyRate = $rateBps / 100 / 12;
        $payment = $amount * $monthlyRate * pow(1 + $monthlyRate, $months) / (pow(1 + $monthlyRate, $months) - 1);
        
        return round($payment, 2);
    }
    
    /**
     * Check if rate can be adjusted
     */
    protected function _canAdjustRate($loan) {
        $status = $loan['LoanRequest']['status'];
        
        // Can only adjust before loan is fully funded
        if (!in_array($status, array('requested', 'approved'))) {
            return array(
                'can_adjust' => false,
                'reason' => 'Rate can only be adjusted before funding begins'
            );
        }
        
        // Check if funding has started
        if ($loan['LoanRequest']['funded_amount'] > 0) {
            return array(
                'can_adjust' => false,
                'reason' => 'Cannot adjust rate after funding has started'
            );
        }
        
        // Check time window
        $createdAt = strtotime($loan['LoanRequest']['created_at']);
        $daysSinceCreation = (time() - $createdAt) / (60 * 60 * 24);
        
        if ($daysSinceCreation > $this->_rateConfig['rate_change_window']) {
            return array(
                'can_adjust' => false,
                'reason' => 'Rate adjustment window has closed'
            );
        }
        
        return array('can_adjust' => true);
    }
    
    /**
     * Get adjustment count
     */
    protected function _getAdjustmentCount($loanId) {
        App::uses('LoanRateAdjustment', 'Model');
        $LoanRateAdjustment = ClassRegistry::init('LoanRateAdjustment');
        
        return $LoanRateAdjustment->find('count', array(
            'conditions' => array('LoanRateAdjustment.loan_id' => $loanId)
        ));
    }
    
    /**
     * Get rate adjustment history
     */
    protected function _getRateHistory($loanId) {
        App::uses('LoanRateAdjustment', 'Model');
        $LoanRateAdjustment = ClassRegistry::init('LoanRateAdjustment');
        
        $history = $LoanRateAdjustment->find('all', array(
            'conditions' => array('LoanRateAdjustment.loan_id' => $loanId),
            'order' => array('LoanRateAdjustment.created_at' => 'DESC')
        ));
        
        return array_map(function($h) {
            return array(
                'id' => $h['LoanRateAdjustment']['id'],
                'old_rate' => $h['LoanRateAdjustment']['old_rate'],
                'new_rate' => $h['LoanRateAdjustment']['new_rate'],
                'change' => $h['LoanRateAdjustment']['new_rate'] - $h['LoanRateAdjustment']['old_rate'],
                'adjusted_by' => $h['LoanRateAdjustment']['adjusted_by'],
                'adjusted_at' => $h['LoanRateAdjustment']['created_at']
            );
        }, $history);
    }
    
    /**
     * Record rate adjustment
     */
    protected function _recordRateAdjustment($loanId, $oldRate, $newRate, $userId) {
        App::uses('LoanRateAdjustment', 'Model');
        $LoanRateAdjustment = ClassRegistry::init('LoanRateAdjustment');
        
        $LoanRateAdjustment->create();
        $LoanRateAdjustment->save(array(
            'loan_id' => $loanId,
            'old_rate' => $oldRate,
            'new_rate' => $newRate,
            'adjusted_by' => $userId,
            'ip_address' => $this->request->clientIp()
        ));
    }
    
    /**
     * Notify funders of rate change
     */
    protected function _notifyFundersOfRateChange($loanId, $oldRate, $newRate) {
        // Get funders
        $fundings = $this->LoanFunding->find('all', array(
            'conditions' => array('LoanFunding.loan_id' => $loanId),
            'contain' => array('User')
        ));
        
        // Send notifications (implement notification service)
        foreach ($fundings as $funding) {
            // Notification::send($funding['LoanFunding']['lender_id'], 'rate_change', ...);
        }
    }
    
    /**
     * Get current user ID
     */
    protected function _getCurrentUserId() {
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
    protected function _jsonResponse($data, $code = 200) {
        http_response_code($code);
        header("Content-Type: application/json");
        echo json_encode($data, JSON_PRETTY_PRINT);
        exit;
    }
}
