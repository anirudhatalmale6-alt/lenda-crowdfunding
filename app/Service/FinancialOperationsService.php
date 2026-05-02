<?php
/**
 * Financial Operations Service (FIN-04)
 * 
 * Consolidated service for all financial calculations and operations.
 * Eliminates code duplication across the codebase.
 * 
 * Supported Operations:
 * - Fee calculations (origination, trading, escrow, investor service)
 * - Interest calculations (simple, compound, APR)
 * - Loan amortization
 * - Payment scheduling
 * - Profit distribution
 * 
 * @package Lenda
 * @subpackage Service
 */

App::uses('AppModel', 'Model');

class FinancialOperationsService extends AppModel
{
    public $name = 'FinancialOperations';
    
    /**
     * Fee Types
     */
    const FEE_ORIGINATION = 'origination';
    const FEE_TRADING = 'trading';
    const FEE_ESCROW = 'escrow';
    const FEE_INVESTOR_SERVICE = 'investor_service';
    const FEE_LIQUIDATION = 'liquidation';
    const FEE_PLATFORM = 'platform';
    
    /**
     * Interest Calculation Methods
     */
    const INTEREST_SIMPLE = 'simple';
    const INTEREST_COMPOUND = 'compound';
    const INTEREST_DAILY = 'daily';
    
    /**
     * Default fee configurations (in basis points)
     */
    private $defaultFees = array(
        self::FEE_ORIGINATION => 200,        // 2%
        self::FEE_TRADING => 100,             // 1%
        self::FEE_ESCROW => 150,             // 1.5%
        self::FEE_INVESTOR_SERVICE => 500,   // 5%
        self::FEE_LIQUIDATION => 1000,       // 10%
        self::FEE_PLATFORM => 100,           // 1%
    );
    
    /**
     * Calculate fee amount
     * 
     * @param float $amount Base amount
     * @param float $feePercentage Fee percentage (or basis points / 100)
     * @return float Calculated fee
     */
    public function calculateFee($amount, $feePercentage)
    {
        return round($amount * ($feePercentage / 100), 2);
    }
    
    /**
     * Calculate fee in basis points
     * 
     * @param float $amount Base amount
     * @param int $feeBps Fee in basis points (1bps = 0.01%)
     * @return float Calculated fee
     */
    public function calculateFeeBps($amount, $feeBps)
    {
        return round($amount * ($feeBps / 10000), 2);
    }
    
    /**
     * Calculate origination fee for a loan
     * 
     * @param float $loanAmount The loan principal amount
     * @param float $feePercentage Origination fee percentage (default 2%)
     * @param array $options Additional options (fixed_fee, deduct_from_disbursement)
     * @return array Fee calculation result
     */
    public function calculateOriginationFee($loanAmount, $feePercentage = null, $options = array())
    {
        $feePercentage = $feePercentage ?? ($this->defaultFees[self::FEE_ORIGINATION] / 100);
        $fixedFee = $options['fixed_fee'] ?? 0;
        
        // Calculate percentage-based fee
        $percentageFee = $this->calculateFee($loanAmount, $feePercentage);
        
        // Add fixed fee if applicable
        $totalFee = $percentageFee + $fixedFee;
        
        // Calculate what borrower receives (loan amount minus fee)
        $borrowerReceives = $loanAmount - $totalFee;
        
        return array(
            'loan_amount' => $loanAmount,
            'fee_percentage' => $feePercentage,
            'percentage_fee' => $percentageFee,
            'fixed_fee' => $fixedFee,
            'total_fee' => $totalFee,
            'borrower_receives' => $borrowerReceives,
            'deduct_from_disbursement' => $options['deduct_from_disbursement'] ?? true
        );
    }
    
    /**
     * Calculate trading fee for secondary market transactions
     * 
     * @param float $tradeAmount The trade amount
     * @param float $feePercentage Trading fee percentage (default 1%)
     * @return array Fee calculation result
     */
    public function calculateTradingFee($tradeAmount, $feePercentage = null)
    {
        $feePercentage = $feePercentage ?? ($this->defaultFees[self::FEE_TRADING] / 100);
        $fee = $this->calculateFee($tradeAmount, $feePercentage);
        
        return array(
            'trade_amount' => $tradeAmount,
            'fee_percentage' => $feePercentage,
            'fee' => $fee,
            'net_received' => $tradeAmount - $fee
        );
    }
    
    /**
     * Calculate escrow fee
     * 
     * @param float $amount Escrow amount
     * @param float $feePercentage Escrow fee percentage (default 1.5%)
     * @return array Fee calculation result
     */
    public function calculateEscrowFee($amount, $feePercentage = null)
    {
        $feePercentage = $feePercentage ?? ($this->defaultFees[self::FEE_ESCROW] / 100);
        $fee = $this->calculateFee($amount, $feePercentage);
        
        return array(
            'amount' => $amount,
            'fee_percentage' => $feePercentage,
            'fee' => $fee,
            'net_settlement' => $amount - $fee
        );
    }
    
    /**
     * Calculate investor service fee
     * 
     * @param float $interestEarned Total interest earned
     * @param float $feePercentage Service fee percentage (default 5%)
     * @return array Fee calculation result
     */
    public function calculateInvestorServiceFee($interestEarned, $feePercentage = null)
    {
        $feePercentage = $feePercentage ?? ($this->defaultFees[self::FEE_INVESTOR_SERVICE] / 100);
        $fee = $this->calculateFee($interestEarned, $feePercentage);
        
        return array(
            'interest_earned' => $interestEarned,
            'fee_percentage' => $feePercentage,
            'fee' => $fee,
            'net_profit' => $interestEarned - $fee
        );
    }
    
    /**
     * Calculate liquidation commission
     * 
     * @param float $winningBid The winning bid amount
     * @param float $commissionPercentage Commission percentage (default 10%)
     * @return array Fee calculation result
     */
    public function calculateLiquidationCommission($winningBid, $commissionPercentage = null)
    {
        $commissionPercentage = $commissionPercentage ?? ($this->defaultFees[self::FEE_LIQUIDATION] / 100);
        $commission = $this->calculateFee($winningBid, $commissionPercentage);
        
        return array(
            'winning_bid' => $winningBid,
            'commission_percentage' => $commissionPercentage,
            'commission' => $commission,
            'net_proceeds' => $winningBid - $commission
        );
    }
    
    /**
     * Calculate simple interest
     * 
     * @param float $principal Principal amount
     * @param float $annualRate Annual interest rate (as decimal or percentage)
     * @param int $days Number of days
     * @param array $options Options (rate_as_percentage, exact_days)
     * @return float Calculated interest
     */
    public function calculateSimpleInterest($principal, $annualRate, $days, $options = array())
    {
        $rateAsPercentage = $options['rate_as_percentage'] ?? true;
        $rate = $rateAsPercentage ? ($annualRate / 100) : $annualRate;
        $divisor = $options['exact_days'] ? 365 : 360;
        
        return round($principal * $rate * ($days / $divisor), 2);
    }
    
    /**
     * Calculate compound interest
     * 
     * @param float $principal Principal amount
     * @param float $annualRate Annual interest rate
     * @param int $periods Number of compounding periods
     * @param array $options Options (rate_as_percentage, compounding_frequency)
     * @return float Final amount (principal + interest)
     */
    public function calculateCompoundInterest($principal, $annualRate, $periods, $options = array())
    {
        $rateAsPercentage = $options['rate_as_percentage'] ?? true;
        $rate = $rateAsPercentage ? ($annualRate / 100) : $annualRate;
        $frequency = $options['compounding_frequency'] ?? 12; // Monthly by default
        
        // A = P(1 + r/n)^(nt)
        $amount = $principal * pow(1 + ($rate / $frequency), $frequency * $periods);
        
        return round($amount, 2);
    }
    
    /**
     * Calculate APR (Annual Percentage Rate)
     * 
     * @param float $principal Loan amount
     * @param float $totalInterest Total interest over loan term
     * @param int $termDays Loan term in days
     * @return float APR as percentage
     */
    public function calculateAPR($principal, $totalInterest, $termDays)
    {
        if ($principal <= 0 || $termDays <= 0) {
            return 0;
        }
        
        $annualizedInterest = ($totalInterest / $principal) * (365 / $termDays) * 100;
        return round($annualizedInterest, 2);
    }
    
    /**
     * Calculate loan amortization (monthly payments)
     * 
     * @param float $principal Loan principal
     * @param float $annualRate Annual interest rate (as percentage)
     * @param int $termMonths Loan term in months
     * @return array Amortization schedule
     */
    public function calculateAmortization($principal, $annualRate, $termMonths)
    {
        if ($annualRate <= 0) {
            // No interest - simple division
            $monthlyPayment = $principal / $termMonths;
            return array(
                'principal' => $principal,
                'monthly_payment' => $monthlyPayment,
                'total_payment' => $principal,
                'total_interest' => 0,
                'schedule' => $this->_generateZeroInterestSchedule($principal, $monthlyPayment, $termMonths)
            );
        }
        
        // Standard amortization formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
        $monthlyRate = ($annualRate / 100) / 12;
        $monthlyPayment = $principal * ($monthlyRate * pow(1 + $monthlyRate, $termMonths)) / (pow(1 + $monthlyRate, $termMonths) - 1);
        
        $totalPayment = $monthlyPayment * $termMonths;
        $totalInterest = $totalPayment - $principal;
        
        // Generate amortization schedule
        $schedule = $this->_generateAmortizationSchedule(
            $principal,
            $monthlyRate,
            $monthlyPayment,
            $termMonths
        );
        
        return array(
            'principal' => $principal,
            'monthly_payment' => round($monthlyPayment, 2),
            'total_payment' => round($totalPayment, 2),
            'total_interest' => round($totalInterest, 2),
            'apr' => $annualRate,
            'schedule' => $schedule
        );
    }
    
    /**
     * Calculate payment breakdown (principal + interest + fees)
     * 
     * @param float $principal Remaining principal
     * @param float $interestDue Interest due
     * @param float $fees Any additional fees
     * @return array Payment breakdown
     */
    public function calculatePaymentBreakdown($principal, $interestDue, $fees = 0)
    {
        return array(
            'principal' => $principal,
            'interest' => $interestDue,
            'fees' => $fees,
            'total_due' => $principal + $interestDue + $fees
        );
    }
    
    /**
     * Calculate pro-rata distribution for early withdrawal
     * 
     * @param float $originalAmount Original investment
     * @param int $daysElapsed Days since investment
     * @param float $annualRate Expected annual return
     * @return array Distribution details
     */
    public function calculateEarlyWithdrawalDistribution($originalAmount, $daysElapsed, $annualRate)
    {
        $interestEarned = $this->calculateSimpleInterest($originalAmount, $annualRate, $daysElapsed);
        $earlyWithdrawalFee = $this->calculateFee($originalAmount + $interestEarned, 1); // 1% early withdrawal fee
        
        return array(
            'original_amount' => $originalAmount,
            'days_elapsed' => $daysElapsed,
            'interest_earned' => $interestEarned,
            'early_withdrawal_fee' => $earlyWithdrawalFee,
            'total_distribution' => $originalAmount + $interestEarned - $earlyWithdrawalFee
        );
    }
    
    /**
     * Validate fee configuration against limits
     * 
     * @param string $feeType Fee type constant
     * @param float $feePercentage Fee percentage to validate
     * @param array $limits Min/max limits in basis points
     * @return array Validation result
     */
    public function validateFee($feeType, $feePercentage, $limits = array())
    {
        $defaultLimits = array(
            'min_bps' => 0,
            'max_bps' => 5000, // 50% max
        );
        
        $limits = array_merge($defaultLimits, $limits);
        
        $feeBps = $feePercentage * 100;
        $isValid = $feeBps >= $limits['min_bps'] && $feeBps <= $limits['max_bps'];
        
        return array(
            'valid' => $isValid,
            'provided_bps' => $feeBps,
            'min_bps' => $limits['min_bps'],
            'max_bps' => $limits['max_bps'],
            'message' => $isValid ? 'Fee is within valid range' : 'Fee exceeds allowed limits'
        );
    }
    
    /**
     * Generate amortization schedule
     */
    private function _generateAmortizationSchedule($principal, $monthlyRate, $monthlyPayment, $termMonths)
    {
        $schedule = array();
        $balance = $principal;
        
        for ($month = 1; $month <= $termMonths; $month++) {
            $interestPayment = $balance * $monthlyRate;
            $principalPayment = $monthlyPayment - $interestPayment;
            $balance -= $principalPayment;
            
            $schedule[] = array(
                'month' => $month,
                'payment' => round($monthlyPayment, 2),
                'principal' => round($principalPayment, 2),
                'interest' => round($interestPayment, 2),
                'balance' => round(max(0, $balance), 2)
            );
        }
        
        return $schedule;
    }
    
    /**
     * Generate zero interest schedule
     */
    private function _generateZeroInterestSchedule($principal, $monthlyPayment, $termMonths)
    {
        $schedule = array();
        
        for ($month = 1; $month <= $termMonths; $month++) {
            $schedule[] = array(
                'month' => $month,
                'payment' => round($monthlyPayment, 2),
                'principal' => round($monthlyPayment, 2),
                'interest' => 0,
                'balance' => round($principal - ($monthlyPayment * $month), 2)
            );
        }
        
        return $schedule;
    }
    
    /**
     * Get default fee configuration
     */
    public function getDefaultFees()
    {
        return $this->defaultFees;
    }
    
    /**
     * Set custom fee configuration
     */
    public function setDefaultFees($fees)
    {
        $this->defaultFees = array_merge($this->defaultFees, $fees);
    }
}
