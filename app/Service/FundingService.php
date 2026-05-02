<?php
App::uses('AppModel', 'Model');

/**
 * Funding Service
 * 
 * Handles loan funding, token distribution, and funding-related calculations
 * 
 * @package Lenda.Service
 */
class FundingService {
    
    /**
     * Database connection
     */
    private $db;
    
    /**
     * Models
     */
    private $LoanRequest;
    private $LoanFunding;
    private $LoanToken;
    private $User;
    private $WalletAccount;
    private $WalletTransaction;
    private $ReserveFund;
    
    /**
     * Origination fee percentage - loaded from configuration
     */
    private static $originationFee = null;
    
    /**
     * Platform interest share percentage - loaded from configuration
     */
    private static $platformInterestShare = null;
    
    /**
     * Get origination fee from configuration
     * @return float
     */
    private static function getOriginationFee() {
        if (self::$originationFee === null) {
            // Check environment variable first
            $envFee = getenv('LENDA_ORIGINATION_FEE');
            if ($envFee !== false) {
                self::$originationFee = floatval($envFee) / 100;
            } else {
                // Fall back to Configure or default
                self::$originationFee = Configure::read('Loan.originationFee') 
                    ? floatval(Configure::read('Loan.originationFee')) / 100 
                    : 0.02; // 2% default
            }
        }
        return self::$originationFee;
    }
    
    /**
     * Get platform interest share from configuration
     * @return float
     */
    private static function getPlatformInterestShare() {
        if (self::$platformInterestShare === null) {
            // Check environment variable first
            $envShare = getenv('LENDA_PLATFORM_INTEREST_SHARE');
            if ($envShare !== false) {
                self::$platformInterestShare = floatval($envShare) / 100;
            } else {
                // Fall back to Configure or default
                self::$platformInterestShare = Configure::read('Loan.platformInterestShare') 
                    ? floatval(Configure::read('Loan.platformInterestShare')) / 100 
                    : 0.30; // 30% default
            }
        }
        return self::$platformInterestShare;
    }
    
    /**
     * Minimum funding amount
     */
    const MIN_FUNDING_AMOUNT = 10;
    
    /**
     * Constructor
     */
    public function __construct() {
        App::uses('LoanRequest', 'Model');
        App::uses('LoanFunding', 'Model');
        App::uses('LoanToken', 'Model');
        App::uses('User', 'Model');
        App::uses('WalletAccount', 'Model');
        App::uses('WalletTransaction', 'Model');
        App::uses('ReserveFund', 'Model');
        
        $this->LoanRequest = ClassRegistry::init('LoanRequest');
        $this->LoanFunding = ClassRegistry::init('LoanFunding');
        $this->LoanToken = ClassRegistry::init('LoanToken');
        $this->User = ClassRegistry::init('User');
        $this->WalletAccount = ClassRegistry::init('WalletAccount');
        $this->WalletTransaction = ClassRegistry::init('WalletTransaction');
        $this->ReserveFund = ClassRegistry::init('ReserveFund');
    }
    
    /**
     * Fund a loan
     * 
     * @param int $loanId
     * @param int $investorId
     * @param float $amount
     * @return array
     */
    public function fundLoan($loanId, $investorId, $amount) {
        // Validate amount
        if ($amount < self::MIN_FUNDING_AMOUNT) {
            return ['success' => false, 'message' => 'Minimum funding amount is ' . self::MIN_FUNDING_AMOUNT];
        }
        
        // Get loan details
        $loan = $this->LoanRequest->find('first', [
            'conditions' => ['LoanRequest.id' => $loanId]
        ]);
        
        if (!$loan) {
            return ['success' => false, 'message' => 'Loan not found'];
        }
        
        if (!in_array($loan['LoanRequest']['status'], ['approved', 'funded'])) {
            return ['success' => false, 'message' => 'Loan is not available for funding'];
        }
        
        // Check available amount
        $available = floatval($loan['LoanRequest']['loan_amount']) - floatval($loan['LoanRequest']['funded_amount']);
        
        if ($amount > $available) {
            $amount = $available; // Cap at available
        }
        
        // Check investor wallet balance
        $wallet = $this->WalletAccount->find('first', [
            'conditions' => ['WalletAccount.user_id' => $investorId]
        ]);
        
        $balance = floatval($wallet['WalletAccount']['available_balance'] ?? 0);
        
        if ($balance < $amount) {
            return ['success' => false, 'message' => 'Insufficient funds'];
        }
        
        // Start transaction
        $this->db->begin();
        
        try {
            // Deduct from investor wallet
            $this->WalletAccount->updateAll(
                ['available_balance' => 'available_balance - ' . $amount],
                ['user_id' => $investorId]
            );
            
            // Record transaction
            $this->WalletTransaction->create();
            $this->WalletTransaction->save([
                'wallet_account_id' => $wallet['WalletAccount']['id'],
                'transaction_type' => 'loan_investment',
                'amount' => -$amount,
                'reference_type' => 'loan_funding',
                'reference_id' => $loanId,
                'status' => 'completed'
            ]);
            
            // Record funding
            $this->LoanFunding->create();
            $this->LoanFunding->save([
                'loan_id' => $loanId,
                'investor_id' => $investorId,
                'amount' => $amount,
                'funding_date' => date('Y-m-d H:i:s')
            ]);
            
            // Update loan funded amount
            $this->LoanRequest->id = $loanId;
            $newFundedAmount = floatval($loan['LoanRequest']['funded_amount']) + $amount;
            $funderCount = $loan['LoanRequest']['funder_count'] + 1;
            
            // Check if fully funded
            $newStatus = 'funded';
            $fullyFundedAt = null;
            
            if ($newFundedAmount >= floatval($loan['LoanRequest']['loan_amount'])) {
                $newStatus = 'active';
                $fullyFundedAt = date('Y-m-d H:i:s');
            }
            
            $this->LoanRequest->save([
                'funded_amount' => $newFundedAmount,
                'funder_count' => $funderCount,
                'status' => $newStatus,
                'fully_funded_at' => $fullyFundedAt,
                'version' => $loan['LoanRequest']['version'] + 1
            ]);
            
            // Create token for investor
            $this->createToken($loanId, $investorId, $amount);
            
            // Commit transaction
            $this->db->commit();
            
            return [
                'success' => true,
                'funded_amount' => $amount,
                'total_funded' => $newFundedAmount,
                'loan_amount' => floatval($loan['LoanRequest']['loan_amount']),
                'status' => $newStatus,
                'token_amount' => $amount
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            return ['success' => false, 'message' => 'Funding failed: ' . $e->getMessage()];
        }
    }
    
    /**
     * Create loan token for investor
     * 
     * @param int $loanId
     * @param int $investorId
     * @param float $amount
     * @return array
     */
    private function createToken($loanId, $investorId, $amount) {
        $loan = $this->LoanRequest->find('first', [
            'conditions' => ['LoanRequest.id' => $loanId]
        ]);
        
        // Calculate token percentage
        $tokenPercentage = ($amount / floatval($loan['LoanRequest']['loan_amount'])) * 100;
        
        $this->LoanToken->create();
        $this->LoanToken->save([
            'loan_id' => $loanId,
            'investor_id' => $investorId,
            'token_percentage' => round($tokenPercentage, 4),
            'purchase_price' => $amount,
            'status' => 'active',
            'purchase_date' => date('Y-m-d H:i:s')
        ]);
        
        return $this->LoanToken->getLastInsertID();
    }
    
    /**
     * Distribute repayment to investors
     * 
     * @param int $loanId
     * @param float $repaymentAmount
     * @return array
     */
    public function distributeRepayment($loanId, $repaymentAmount) {
        // Get loan details
        $loan = $this->LoanRequest->find('first', [
            'conditions' => ['LoanRequest.id' => $loanId]
        ]);
        
        if (!$loan) {
            return ['success' => false, 'message' => 'Loan not found'];
        }
        
        // Calculate origination fee (FIN-01 fix - use actual interest rate)
        $interestRate = floatval($loan['LoanRequest']['interest_rate']);
        $loanAmount = floatval($loan['LoanRequest']['loan_amount']);
        
        // Fee based on loan amount, configurable via ENV or Configure
        $originationFee = $loanAmount * self::getOriginationFee();
        
        // Interest to platform (dynamic based on rate, configurable)
        $platformInterestShare = $repaymentAmount * ($interestRate / 100) * self::getPlatformInterestShare();
        
        // Remaining for investors (principal + their share of interest)
        $investorPayment = $repaymentAmount - $originationFee - $platformInterestShare;
        
        // Get all investors for this loan
        $investors = $this->LoanToken->find('all', [
            'conditions' => [
                'LoanToken.loan_id' => $loanId,
                'LoanToken.status' => 'active'
            ]
        ]);
        
        $distributions = [];
        
        foreach ($investors as $token) {
            $percentage = floatval($token['LoanToken']['token_percentage']) / 100;
            $investorAmount = $investorPayment * $percentage;
            
            // Add to investor wallet
            $this->WalletAccount->updateAll(
                ['available_balance' => 'available_balance + ' . $investorAmount],
                ['user_id' => $token['LoanToken']['investor_id']]
            );
            
            // Record transaction
            $wallet = $this->WalletAccount->find('first', [
                'conditions' => ['WalletAccount.user_id' => $token['LoanToken']['investor_id']]
            ]);
            
            $this->WalletTransaction->create();
            $this->WalletTransaction->save([
                'wallet_account_id' => $wallet['WalletAccount']['id'],
                'transaction_type' => 'loan_repayment',
                'amount' => $investorAmount,
                'reference_type' => 'loan_repayment',
                'reference_id' => $loanId,
                'status' => 'completed'
            ]);
            
            $distributions[] = [
                'investor_id' => $token['LoanToken']['investor_id'],
                'amount' => round($investorAmount, 2),
                'percentage' => round($percentage * 100, 2)
            ];
        }
        
        // Update reserve fund with platform fees
        $reserveFund = $this->ReserveFund->find('first');
        $this->ReserveFund->id = $reserveFund['ReserveFund']['id'];
        $this->ReserveFund->save([
            'balance' => $reserveFund['ReserveFund']['balance'] + $originationFee + $platformInterestShare
        ]);
        
        return [
            'success' => true,
            'total_repayment' => $repaymentAmount,
            'origination_fee' => round($originationFee, 2),
            'platform_interest' => round($platformInterestShare, 2),
            'investor_total' => round($investorPayment, 2),
            'distributions' => $distributions
        ];
    }
    
    /**
     * Calculate funding progress
     * 
     * @param int $loanId
     * @return array
     */
    public function getFundingProgress($loanId) {
        $loan = $this->LoanRequest->find('first', [
            'conditions' => ['LoanRequest.id' => $loanId]
        ]);
        
        if (!$loan) {
            return ['success' => false, 'message' => 'Loan not found'];
        }
        
        $loanAmount = floatval($loan['LoanRequest']['loan_amount']);
        $fundedAmount = floatval($loan['LoanRequest']['funded_amount']);
        
        $progress = ($loanAmount > 0) ? ($fundedAmount / $loanAmount) * 100 : 0;
        
        return [
            'success' => true,
            'loan_id' => $loanId,
            'loan_amount' => $loanAmount,
            'funded_amount' => $fundedAmount,
            'remaining_amount' => $loanAmount - $fundedAmount,
            'progress_percentage' => round($progress, 2),
            'funder_count' => $loan['LoanRequest']['funder_count']
        ];
    }
}
