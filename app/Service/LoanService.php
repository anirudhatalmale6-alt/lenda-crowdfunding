<?php
App::uses('AppModel', 'Model');

/**
 * Loan Service
 * 
 * Extracted business logic from ApiLoansController
 * Handles loan creation, funding, repayment, and status management
 * 
 * @package Lenda.Service
 */
class LoanService {
    
    /**
     * Database connection
     */
    private $db;
    
    /**
     * Models
     */
    private $LoanRequest;
    private $LoanFunding;
    private $Repayment;
    private $CollateralAsset;
    private $User;
    private $ReserveFund;
    private $WalletAccount;
    private $WalletTransaction;
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->db = ConnectionManager::getDataSource('default');
        
        App::uses('LoanRequest', 'Model');
        App::uses('LoanFunding', 'Model');
        App::uses('Repayment', 'Model');
        App::uses('CollateralAsset', 'Model');
        App::uses('User', 'Model');
        App::uses('ReserveFund', 'Model');
        App::uses('WalletAccount', 'Model');
        App::uses('WalletTransaction', 'Model');
        
        $this->LoanRequest = ClassRegistry::init('LoanRequest');
        $this->LoanFunding = ClassRegistry::init('LoanFunding');
        $this->Repayment = ClassRegistry::init('Repayment');
        $this->CollateralAsset = ClassRegistry::init('CollateralAsset');
        $this->User = ClassRegistry::init('User');
        $this->ReserveFund = ClassRegistry::init('ReserveFund');
        $this->WalletAccount = ClassRegistry::init('WalletAccount');
        $this->WalletTransaction = ClassRegistry::init('WalletTransaction');
    }
    
    /**
     * Create a new loan request
     * 
     * @param int $borrowerId
     * @param array $loanData
     * @return array
     */
    public function createLoan($borrowerId, $loanData) {
        // Validate required fields
        $required = ['title', 'loan_amount', 'interest_rate', 'duration_months'];
        foreach ($required as $field) {
            if (empty($loanData[$field])) {
                return ['success' => false, 'message' => "Missing required field: $field"];
            }
        }
        
        // Validate loan amount
        $amount = floatval($loanData['loan_amount']);
        if ($amount <= 0 || $amount > 10000000) {
            return ['success' => false, 'message' => 'Invalid loan amount'];
        }
        
        // Validate interest rate
        $rate = floatval($loanData['interest_rate']);
        if ($rate < 0 || $rate > 100) {
            return ['success' => false, 'message' => 'Invalid interest rate'];
        }
        
        // Validate duration
        $duration = intval($loanData['duration_months']);
        if ($duration < 1 || $duration > 360) {
            return ['success' => false, 'message' => 'Invalid loan duration'];
        }
        
        // Create loan request
        $this->LoanRequest->create();
        $result = $this->LoanRequest->save([
            'borrower_id' => $borrowerId,
            'title' => htmlspecialchars($loanData['title'], ENT_QUOTES, 'UTF-8'),
            'description' => htmlspecialchars($loanData['description'] ?? '', ENT_QUOTES, 'UTF-8'),
            'loan_amount' => $amount,
            'interest_rate' => $rate,
            'duration_months' => $duration,
            'status' => 'requested',
            'version' => 0
        ]);
        
        if ($result) {
            return [
                'success' => true,
                'loan_id' => $this->LoanRequest->getLastInsertID(),
                'status' => 'requested'
            ];
        }
        
        return ['success' => false, 'message' => 'Failed to create loan'];
    }
    
    /**
     * Calculate monthly payment using standard amortization formula
     * 
     * @param float $principal
     * @param float $annualRate
     * @param int $months
     * @return float
     */
    public function calculateMonthlyPayment($principal, $annualRate, $months) {
        if ($annualRate == 0) {
            return $principal / $months;
        }
        
        $monthlyRate = $annualRate / 100 / 12;
        $payment = $principal * $monthlyRate * pow(1 + $monthlyRate, $months) / (pow(1 + $monthlyRate, $months) - 1);
        
        return round($payment, 2);
    }
    
    /**
     * Generate repayment schedule for a loan
     * 
     * @param int $loanId
     * @return array
     */
    public function getRepaymentSchedule($loanId) {
        $loan = $this->LoanRequest->find('first', [
            'conditions' => ['LoanRequest.id' => $loanId]
        ]);
        
        if (!$loan) {
            return ['success' => false, 'message' => 'Loan not found'];
        }
        
        $amount = floatval($loan['LoanRequest']['loan_amount']);
        $rate = floatval($loan['LoanRequest']['interest_rate']) / 100 / 12;
        $months = intval($loan['LoanRequest']['duration_months']);
        
        $monthlyPayment = $this->calculateMonthlyPayment($amount, $rate * 12, $months);
        
        $schedule = [];
        for ($i = 1; $i <= $months; $i++) {
            $schedule[] = [
                'payment_number' => $i,
                'amount' => $monthlyPayment,
                'due_date' => date('Y-m-d', strtotime("+" . $i . " months")),
                'principal' => round($monthlyPayment - ($amount * $rate), 2),
                'interest' => round($amount * $rate, 2)
            ];
        }
        
        return [
            'success' => true,
            'schedule' => $schedule,
            'total_payment' => round($monthlyPayment * $months, 2),
            'total_interest' => round(($monthlyPayment * $months) - $amount, 2)
        ];
    }
    
    /**
     * Calculate LTV ratio
     * 
     * @param float $loanAmount
     * @param float $collateralValue
     * @return float
     */
    public function calculateLTV($loanAmount, $collateralValue) {
        if ($collateralValue <= 0) {
            return 100; // Max risk if no collateral
        }
        return round(($loanAmount / $collateralValue) * 100, 2);
    }
    
    /**
     * Validate loan against risk rules
     * 
     * @param array $loanData
     * @return array
     */
    public function validateLoanForApproval($loanData) {
        $errors = [];
        
        // Check LTV
        $ltv = $this->calculateLTV(
            floatval($loanData['loan_amount']),
            floatval($loanData['collateral_value'] ?? 0)
        );
        
        $maxLTV = $this->getMaxLTV($loanData['risk_category'] ?? 'A');
        
        if ($ltv > $maxLTV) {
            $errors[] = "LTV ($ltv%) exceeds maximum allowed ($maxLTV%)";
        }
        
        // Check borrower exposure
        $exposureCheck = $this->checkBorrowerExposure(
            $loanData['borrower_id'],
            floatval($loanData['loan_amount'])
        );
        
        if (!$exposureCheck['valid']) {
            $errors[] = $exposureCheck['message'];
        }
        
        return [
            'valid' => count($errors) === 0,
            'errors' => $errors,
            'ltv' => $ltv,
            'max_ltv' => $maxLTV
        ];
    }
    
    /**
     * Get maximum LTV by risk category
     * 
     * @param string $category
     * @return int
     */
    private function getMaxLTV($category) {
        $ltvConfig = [
            'AAA' => 70,
            'AA' => 65,
            'A' => 60,
            'BBB' => 55,
            'BB' => 50,
            'high_risk' => 40
        ];
        
        return $ltvConfig[$category] ?? 60;
    }
    
    /**
     * Check borrower exposure limits
     * 
     * @param int $borrowerId
     * @param float $newAmount
     * @return array
     */
    private function checkBorrowerExposure($borrowerId, $newAmount) {
        // FIN-02 FIX: Use configurable reserve fund minimum
        App::uses('SecurityConfig', 'Config');
        $reserveFundMinimum = SecurityConfig::getReserveFundMinimum();
        
        $reserveFund = $this->ReserveFund->find('first');
        $totalCapital = floatval($reserveFund['ReserveFund']['balance'] ?? $reserveFundMinimum);
        
        // Get current exposure
        $loans = $this->LoanRequest->find('all', [
            'conditions' => [
                'LoanRequest.borrower_id' => $borrowerId,
                'LoanRequest.status' => ['funded', 'active']
            ]
        ]);
        
        $currentExposure = 0;
        foreach ($loans as $loan) {
            $currentExposure += floatval($loan['LoanRequest']['loan_amount']);
        }
        
        $newExposure = $currentExposure + $newAmount;
        $maxExposure = $totalCapital * 0.05; // 5% max
        
        if ($newExposure > $maxExposure) {
            return [
                'valid' => false,
                'message' => "Borrower exposure would exceed limit ($newExposure > $maxExposure)"
            ];
        }
        
        return ['valid' => true];
    }
    
    /**
     * Approve a loan
     * 
     * @param int $loanId
     * @return array
     */
    public function approveLoan($loanId) {
        $loan = $this->LoanRequest->find('first', [
            'conditions' => ['LoanRequest.id' => $loanId]
        ]);
        
        if (!$loan) {
            return ['success' => false, 'message' => 'Loan not found'];
        }
        
        if ($loan['LoanRequest']['status'] !== 'requested') {
            return ['success' => false, 'message' => 'Loan cannot be approved'];
        }
        
        $this->LoanRequest->id = $loanId;
        $result = $this->LoanRequest->save([
            'status' => 'approved',
            'approved_at' => date('Y-m-d H:i:s'),
            'version' => $loan['LoanRequest']['version'] + 1
        ]);
        
        return $result 
            ? ['success' => true, 'message' => 'Loan approved']
            : ['success' => false, 'message' => 'Failed to approve loan'];
    }
    
    /**
     * Reject a loan
     * 
     * @param int $loanId
     * @param string $reason
     * @return array
     */
    public function rejectLoan($loanId, $reason = '') {
        $loan = $this->LoanRequest->find('first', [
            'conditions' => ['LoanRequest.id' => $loanId]
        ]);
        
        if (!$loan) {
            return ['success' => false, 'message' => 'Loan not found'];
        }
        
        $this->LoanRequest->id = $loanId;
        $result = $this->LoanRequest->save([
            'status' => 'rejected',
            'rejection_reason' => htmlspecialchars($reason, ENT_QUOTES, 'UTF-8'),
            'version' => $loan['LoanRequest']['version'] + 1
        ]);
        
        return $result
            ? ['success' => true, 'message' => 'Loan rejected']
            : ['success' => false, 'message' => 'Failed to reject loan'];
    }
    
    /**
     * Get loan statistics
     * 
     * @return array
     */
    public function getStatistics() {
        $totalLoans = $this->LoanRequest->find('count');
        $activeLoans = $this->LoanRequest->find('count', [
            'conditions' => ['LoanRequest.status' => 'active']
        ]);
        
        $totalFunded = $this->LoanRequest->find('first', [
            'fields' => ['SUM(funded_amount) as total']
        ]);
        
        return [
            'total_loans' => $totalLoans,
            'active_loans' => $activeLoans,
            'total_funded' => floatval($totalFunded[0]['total'] ?? 0)
        ];
    }
}
