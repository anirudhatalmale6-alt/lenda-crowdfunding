<?php
App::uses('AppModel', 'Model');

/**
 * Risk Service
 * 
 * Handles borrower risk scoring, LTV calculations, default prediction,
 * and risk-based loan approval logic
 * 
 * @package Lenda.Service
 */
class RiskService {
    
    /**
     * Models
     */
    private $LoanRequest;
    private $CollateralAsset;
    private $User;
    private $Repayment;
    private $LoanFunding;
    
    /**
     * Risk score weights
     */
    const WEIGHT_CREDIT_HISTORY = 0.30;
    const WEIGHT_INCOME = 0.25;
    const WEIGHT_COLLATERAL = 0.20;
    const WEIGHT_DTI = 0.15;
    const WEIGHT_EMPLOYMENT = 0.10;
    
    /**
     * Default probability thresholds
     */
    const DEFAULT_THRESHOLD_LOW = 0.15;    // 15%
    const DEFAULT_THRESHOLD_MEDIUM = 0.30; // 30%
    const DEFAULT_THRESHOLD_HIGH = 0.50;   // 50%
    
    /**
     * Constructor
     */
    public function __construct() {
        App::uses('LoanRequest', 'Model');
        App::uses('CollateralAsset', 'Model');
        App::uses('User', 'Model');
        App::uses('Repayment', 'Model');
        App::uses('LoanFunding', 'Model');
        
        $this->LoanRequest = ClassRegistry::init('LoanRequest');
        $this->CollateralAsset = ClassRegistry::init('CollateralAsset');
        $this->User = ClassRegistry::init('User');
        $this->Repayment = ClassRegistry::init('Repayment');
        $this->LoanFunding = ClassRegistry::init('LoanFunding');
    }
    
    /**
     * Calculate borrower risk score
     * 
     * @param int $borrowerId
     * @return array
     */
    public function calculateRiskScore($borrowerId) {
        $user = $this->User->find('first', [
            'conditions' => ['User.id' => $borrowerId]
        ]);
        
        if (!$user) {
            return ['success' => false, 'message' => 'User not found'];
        }
        
        // Get credit history score (0-100)
        $creditScore = $this->getCreditHistoryScore($borrowerId);
        
        // Get income verification score (0-100)
        $incomeScore = $this->getIncomeScore($user);
        
        // Get collateral score (0-100)
        $collateralScore = $this->getCollateralScore($borrowerId);
        
        // Get DTI score (0-100)
        $dtiScore = $this->getDTIScore($borrowerId);
        
        // Get employment score (0-100)
        $employmentScore = $this->getEmploymentScore($user);
        
        // Calculate weighted risk score
        $riskScore = (
            ($creditScore * self::WEIGHT_CREDIT_HISTORY) +
            ($incomeScore * self::WEIGHT_INCOME) +
            ($collateralScore * self::WEIGHT_COLLATERAL) +
            ($dtiScore * self::WEIGHT_DTI) +
            ($employmentScore * self::WEIGHT_EMPLOYMENT)
        );
        
        // Determine risk category
        $category = $this->getRiskCategory($riskScore);
        
        // Calculate default probability
        $defaultProbability = $this->calculateDefaultProbability($riskScore, $category);
        
        return [
            'success' => true,
            'borrower_id' => $borrowerId,
            'risk_score' => round($riskScore, 2),
            'risk_category' => $category,
            'default_probability' => round($defaultProbability * 100, 2) . '%',
            'components' => [
                'credit_history' => $creditScore,
                'income' => $incomeScore,
                'collateral' => $collateralScore,
                'dti' => $dtiScore,
                'employment' => $employmentScore
            ]
        ];
    }
    
    /**
     * Get credit history score
     * 
     * @param int $borrowerId
     * @return int
     */
    private function getCreditHistoryScore($borrowerId) {
        // Get previous loans
        $loans = $this->LoanRequest->find('all', [
            'conditions' => ['LoanRequest.borrower_id' => $borrowerId],
            'order' => ['LoanRequest.created_at' => 'DESC']
        ]);
        
        if (empty($loans)) {
            return 50; // Neutral for new borrowers
        }
        
        $completed = 0;
        $defaulted = 0;
        
        foreach ($loans as $loan) {
            $status = $loan['LoanRequest']['status'];
            if ($status === 'repaid') {
                $completed++;
            } elseif ($status === 'defaulted') {
                $defaulted++;
            }
        }
        
        $total = count($loans);
        $successRate = $completed / $total;
        
        // Deduct for defaults
        $penalty = ($defaulted / $total) * 50;
        
        return max(0, min(100, round($successRate * 100 - $penalty)));
    }
    
    /**
     * Get income score based on user data
     * 
     * @param array $user
     * @return int
     */
    private function getIncomeScore($user) {
        $income = floatval($user['User']['monthly_income'] ?? 0);
        
        if ($income <= 0) {
            return 0;
        }
        
        // Score based on income levels (customize based on requirements)
        if ($income >= 10000) return 100;
        if ($income >= 5000) return 85;
        if ($income >= 3000) return 70;
        if ($income >= 2000) return 55;
        if ($income >= 1000) return 40;
        
        return 25;
    }
    
    /**
     * Get collateral score
     * 
     * @param int $borrowerId
     * @return int
     */
    private function getCollateralScore($borrowerId) {
        $collateral = $this->CollateralAsset->find('all', [
            'conditions' => [
                'CollateralAsset.borrower_id' => $borrowerId,
                'CollateralAsset.status' => 'verified'
            ]
        ]);
        
        if (empty($collateral)) {
            return 0; // No collateral
        }
        
        $totalValue = 0;
        foreach ($collateral as $asset) {
            $totalValue += floatval($asset['CollateralAsset']['estimated_value']);
        }
        
        // Score based on collateral value
        if ($totalValue >= 100000) return 100;
        if ($totalValue >= 50000) return 85;
        if ($totalValue >= 25000) return 70;
        if ($totalValue >= 10000) return 55;
        if ($totalValue >= 5000) return 40;
        
        return 25;
    }
    
    /**
     * Get DTI (Debt-to-Income) score
     * 
     * @param int $borrowerId
     * @return int
     */
    private function getDTIScore($borrowerId) {
        $user = $this->User->find('first', [
            'conditions' => ['User.id' => $borrowerId]
        ]);
        
        $monthlyIncome = floatval($user['User']['monthly_income'] ?? 0);
        
        if ($monthlyIncome <= 0) {
            return 0;
        }
        
        // Get existing debt payments
        $loans = $this->LoanRequest->find('all', [
            'conditions' => [
                'LoanRequest.borrower_id' => $borrowerId,
                'LoanRequest.status' => ['funded', 'active']
            ]
        ]);
        
        $monthlyDebt = 0;
        foreach ($loans as $loan) {
            $amount = floatval($loan['LoanRequest']['loan_amount']);
            $rate = floatval($loan['LoanRequest']['interest_rate']) / 100 / 12;
            $months = intval($loan['LoanRequest']['duration_months']);
            if ($months > 0) {
                $monthlyDebt += $amount * $rate * pow(1 + $rate, $months) / (pow(1 + $rate, $months) - 1);
            }
        }
        
        $dti = $monthlyDebt / $monthlyIncome;
        
        // Lower DTI is better
        if ($dti <= 0.10) return 100;
        if ($dti <= 0.20) return 85;
        if ($dti <= 0.30) return 70;
        if ($dti <= 0.40) return 55;
        if ($dti <= 0.50) return 40;
        
        return 20;
    }
    
    /**
     * Get employment score
     * 
     * @param array $user
     * @return int
     */
    private function getEmploymentScore($user) {
        $employmentStatus = $user['User']['employment_status'] ?? '';
        
        switch ($employmentStatus) {
            case 'employed':
                return 85;
            case 'self_employed':
                return 75;
            case 'business_owner':
                return 70;
            case 'retired':
                return 60;
            default:
                return 30;
        }
    }
    
    /**
     * Get risk category based on score
     * 
     * @param float $score
     * @return string
     */
    private function getRiskCategory($score) {
        if ($score >= 80) return 'AAA';
        if ($score >= 70) return 'AA';
        if ($score >= 60) return 'A';
        if ($score >= 50) return 'BBB';
        if ($score >= 40) return 'BB';
        return 'B';
    }
    
    /**
     * Calculate default probability
     * 
     * @param float $riskScore
     * @param string $category
     * @return float
     */
    private function calculateDefaultProbability($riskScore, $category) {
        // Base probability from risk score
        $baseProbability = (100 - $riskScore) / 100;
        
        // Adjustments based on category
        $adjustments = [
            'AAA' => -0.05,
            'AA' => -0.03,
            'A' => 0,
            'BBB' => 0.03,
            'BB' => 0.05,
            'B' => 0.10
        ];
        
        $adjustment = $adjustments[$category] ?? 0;
        
        return max(0, min(1, $baseProbability + $adjustment));
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
     * Check if loan passes LTV requirements
     * 
     * @param float $ltv
     * @param string $riskCategory
     * @return array
     */
    public function checkLTVRequirements($ltv, $riskCategory) {
        $maxLTV = $this->getMaxLTV($riskCategory);
        
        return [
            'passes' => $ltv <= $maxLTV,
            'ltv' => $ltv,
            'max_ltv' => $maxLTV,
            'excess' => max(0, $ltv - $maxLTV)
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
            'AAA' => 80,
            'AA' => 75,
            'A' => 70,
            'BBB' => 65,
            'BB' => 60,
            'B' => 50
        ];
        
        return $ltvConfig[$category] ?? 60;
    }
    
    /**
     * Assess loan risk
     * 
     * @param array $loanData
     * @return array
     */
    public function assessLoanRisk($loanData) {
        $borrowerId = $loanData['borrower_id'];
        
        // Get borrower risk score
        $riskScore = $this->calculateRiskScore($borrowerId);
        
        if (!$riskScore['success']) {
            return $riskScore;
        }
        
        // Calculate LTV
        $ltv = $this->calculateLTV(
            floatval($loanData['loan_amount']),
            floatval($loanData['collateral_value'] ?? 0)
        );
        
        // Check LTV requirements
        $ltvCheck = $this->checkLTVRequirements($ltv, $riskScore['risk_category']);
        
        // Overall risk assessment
        $approved = $ltvCheck['passes'] && 
                    floatval($riskScore['default_probability']) < self::DEFAULT_THRESHOLD_MEDIUM * 100;
        
        return [
            'success' => true,
            'approved' => $approved,
            'risk_score' => $riskScore['risk_score'],
            'risk_category' => $riskScore['risk_category'],
            'default_probability' => $riskScore['default_probability'],
            'ltv' => $ltv,
            'ltv_check' => $ltvCheck,
            'recommendations' => $this->getRecommendations($approved, $ltvCheck, $riskScore)
        ];
    }
    
    /**
     * Get risk recommendations
     * 
     * @param bool $approved
     * @param array $ltvCheck
     * @param array $riskScore
     * @return array
     */
    private function getRecommendations($approved, $ltvCheck, $riskScore) {
        $recommendations = [];
        
        if (!$approved) {
            if (!$ltvCheck['passes']) {
                $recommendations[] = "Reduce loan amount or provide more collateral. Current LTV: {$ltvCheck['ltv']}%, Max: {$ltvCheck['max_ltv']}%";
            }
            
            $defaultProb = floatval($riskScore['default_probability']);
            if ($defaultProb >= self::DEFAULT_THRESHOLD_MEDIUM * 100) {
                $recommendations[] = "Borrower has high default probability ({$riskScore['default_probability']}). Consider additional collateral or co-signer.";
            }
        }
        
        if ($approved && $ltvCheck['ltv'] > 50) {
            $recommendations[] = "Approved with elevated LTV. Monitor collateral value closely.";
        }
        
        return $recommendations;
    }
}
