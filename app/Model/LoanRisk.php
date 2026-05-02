<?php
/**
 * LoanRisk Model
 * 
 * Model for managing loan risk data (RISK-05, RISK-14)
 * 
 * @package    Lenda
 * @subpackage Model
 */
App::uses('AppModel', 'Model');

class LoanRisk extends AppModel
{
    public $name = 'LoanRisk';
    public $useTable = 'loan_risks';
    
    public $belongsTo = array(
        'Loan' => array(
            'className' => 'Loan',
            'foreignKey' => 'loan_id'
        )
    );
    
    /**
     * Risk status constants
     */
    const STATUS_HEALTHY = 'healthy';
    const STATUS_WATCHLIST = 'watchlist';
    const STATUS_HIGH_RISK = 'high_risk';
    const STATUS_DEFAULT_IMMINENT = 'default_imminent';
    const STATUS_DEFAULTED = 'defaulted';
    
    /**
     * Validation rules
     */
    public $validate = array(
        'loan_id' => array(
            'notBlank' => array(
                'rule' => 'notBlank',
                'message' => 'Loan ID is required'
            )
        ),
        'risk_score' => array(
            'numeric' => array(
                'rule' => 'numeric',
                'message' => 'Risk score must be a number'
            ),
            'range' => array(
                'rule' => array('range', -1, 101),
                'message' => 'Risk score must be between 0 and 100'
            )
        ),
        'default_probability' => array(
            'numeric' => array(
                'rule' => 'numeric',
                'message' => 'Default probability must be a number'
            ),
            'range' => array(
                'rule' => array('range', -1, 101),
                'message' => 'Default probability must be between 0 and 100'
            )
        )
    );
    
    /**
     * Update loan risk score
     * 
     * @param int $loanId Loan ID
     * @param array $riskData Risk data to update
     * @return bool
     */
    public function updateRiskScore($loanId, $riskData)
    {
        $existing = $this->findByLoanId($loanId);
        
        if ($existing) {
            $this->id = $existing['LoanRisk']['id'];
        } else {
            $this->create();
            $riskData['loan_id'] = $loanId;
        }
        
        $riskData['last_calculated'] = date('Y-m-d H:i:s');
        
        return $this->save($riskData);
    }
    
    /**
     * Calculate and update default probability
     * 
     * @param int $loanId Loan ID
     * @param array $loanData Loan data for calculation
     * @return int Calculated default probability
     */
    public function calculateDefaultProbability($loanId, $loanData)
    {
        $probability = 0;
        
        // Payment history impact (0-30%)
        $paymentHistoryScore = $this->_calculatePaymentHistoryScore($loanData);
        $probability += (30 - $paymentHistoryScore) * 0.3;
        
        // LTV impact (0-25%)
        $ltvPercentage = !empty($loanData['ltv_percentage']) 
            ? $loanData['ltv_percentage'] 
            : $this->_calculateLTVPercentage($loanData);
        
        if ($ltvPercentage > 80) {
            $probability += 25;
        } elseif ($ltvPercentage > 70) {
            $probability += 15;
        } elseif ($ltvPercentage > 60) {
            $probability += 10;
        }
        
        // Credit score impact (0-20%)
        if (!empty($loanData['credit_score'])) {
            $creditScore = $loanData['credit_score'];
            if ($creditScore < 600) {
                $probability += 20;
            } elseif ($creditScore < 700) {
                $probability += 10;
            }
        } else {
            $probability += 10;
        }
        
        // Overdue status impact (0-25%)
        if (!empty($loanData['is_overdue'])) {
            $daysOverdue = !empty($loanData['days_overdue']) ? $loanData['days_overdue'] : 1;
            $probability += min(25, $daysOverdue * 5);
        }
        
        $probability = min(100, round($probability));
        
        // Update the record
        $this->updateRiskScore($loanId, array(
            'default_probability' => $probability,
            'payment_history_score' => $paymentHistoryScore,
            'ltv_percentage' => $ltvPercentage,
            'risk_score' => 100 - $probability,
            'risk_status' => $this->_determineRiskStatus($probability)
        ));
        
        return $probability;
    }
    
    /**
     * Calculate payment history score
     */
    private function _calculatePaymentHistoryScore($loanData)
    {
        // This would typically query repayment history
        // Simplified version
        if (empty($loanData['repayments'])) {
            return 15; // Neutral
        }
        
        $totalPayments = count($loanData['repayments']);
        $latePayments = 0;
        
        foreach ($loanData['repayments'] as $repayment) {
            if ($repayment['status'] === 'PAID') {
                if (strtotime($repayment['paid_date']) > strtotime($repayment['due_date'])) {
                    $latePayments++;
                }
            }
        }
        
        $onTimeRatio = ($totalPayments - $latePayments) / $totalPayments;
        
        if ($onTimeRatio >= 0.9) return 30;
        if ($onTimeRatio >= 0.7) return 20;
        if ($onTimeRatio >= 0.5) return 10;
        return 0;
    }
    
    /**
     * Calculate LTV percentage
     */
    private function _calculateLTVPercentage($loanData)
    {
        $loanAmount = !empty($loanData['loan_amount']) 
            ? $loanData['loan_amount'] 
            : 0;
        
        $collateralValue = 0;
        
        if (!empty($loanData['Collateral'])) {
            foreach ($loanData['Collateral'] as $collateral) {
                $collateralValue += !empty($collateral['current_value']) 
                    ? $collateral['current_value'] 
                    : $collateral['estimated_value'];
            }
        }
        
        if ($collateralValue == 0) {
            return 100; // Maximum risk
        }
        
        return ($loanAmount / $collateralValue) * 100;
    }
    
    /**
     * Determine risk status based on probability
     */
    private function _determineRiskStatus($probability)
    {
        if ($probability > 60) {
            return self::STATUS_DEFAULT_IMMINENT;
        }
        if ($probability > 40) {
            return self::STATUS_HIGH_RISK;
        }
        if ($probability > 20) {
            return self::STATUS_WATCHLIST;
        }
        return self::STATUS_HEALTHY;
    }
    
    /**
     * Get loan risk status
     * 
     * @param int $loanId Loan ID
     * @return array|null
     */
    public function getRiskStatus($loanId)
    {
        return $this->findByLoanId($loanId);
    }
    
    /**
     * Get loans by risk status
     * 
     * @param string $status Risk status
     * @return array
     */
    public function getLoansByStatus($status)
    {
        return $this->find('all', array(
            'conditions' => array(
                'LoanRisk.risk_status' => $status
            ),
            'contain' => array('Loan', 'Loan.User'),
            'order' => array('LoanRisk.default_probability DESC')
        ));
    }
    
    /**
     * Get high probability loans
     * 
     * @param int $threshold Probability threshold
     * @return array
     */
    public function getHighProbabilityLoans($threshold = 40)
    {
        return $this->find('all', array(
            'conditions' => array(
                'LoanRisk.default_probability >=' => $threshold,
                'LoanRisk.risk_status !=' => self::STATUS_DEFAULTED
            ),
            'contain' => array('Loan', 'Loan.User'),
            'order' => array('LoanRisk.default_probability DESC')
        ));
    }
    
    /**
     * Get risk statistics
     * 
     * @return array
     */
    public function getStatistics()
    {
        return array(
            'healthy' => $this->find('count', array(
                'conditions' => array('LoanRisk.risk_status' => self::STATUS_HEALTHY)
            )),
            'watchlist' => $this->find('count', array(
                'conditions' => array('LoanRisk.risk_status' => self::STATUS_WATCHLIST)
            )),
            'high_risk' => $this->find('count', array(
                'conditions' => array('LoanRisk.risk_status' => self::STATUS_HIGH_RISK)
            )),
            'default_imminent' => $this->find('count', array(
                'conditions' => array('LoanRisk.risk_status' => self::STATUS_DEFAULT_IMMINENT)
            )),
            'defaulted' => $this->find('count', array(
                'conditions' => array('LoanRisk.risk_status' => self::STATUS_DEFAULTED)
            ))
        );
    }
}
