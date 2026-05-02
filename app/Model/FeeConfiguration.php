<?php
/**
 * FeeConfiguration Model
 * 
 * Handles dynamic fee structure configuration
 * 
 * @package Lenda
 * @subpackage Model
 */
App::uses('AppModel', 'Model');
class FeeConfiguration extends AppModel {
    public $name = 'FeeConfiguration';
    public $useTable = 'fee_configurations';
    
    public $belongsTo = array(
        'Creator' => array(
            'className' => 'User',
            'foreignKey' => 'created_by'
        )
    );
    
    public $validate = array(
        'fee_type' => array(
            'notEmpty' => array(
                'rule' => 'notEmpty',
                'message' => 'Fee type is required'
            ),
            'unique' => array(
                'rule' => array('feeTypeUnique'),
                'message' => 'Active fee configuration already exists for this type'
            )
        ),
        'fee_name' => array(
            'notEmpty' => array(
                'rule' => 'notEmpty',
                'message' => 'Fee name is required'
            )
        )
    );
    
    /**
     * Custom validation for unique fee type
     */
    function feeTypeUnique() {
        if (isset($this->data['FeeConfiguration']['fee_type']) && 
            isset($this->data['FeeConfiguration']['is_active']) && 
            $this->data['FeeConfiguration']['is_active'] == 1) {
            
            $conditions = array(
                'FeeConfiguration.fee_type' => $this->data['FeeConfiguration']['fee_type'],
                'FeeConfiguration.is_active' => 1
            );
            
            if (!empty($this->data['FeeConfiguration']['id'])) {
                $conditions['FeeConfiguration.id !='] = $this->data['FeeConfiguration']['id'];
            }
            
            $count = $this->find('count', array('conditions' => $conditions));
            return $count == 0;
        }
        return true;
    }
    
    /**
     * Get active fee configurations
     * 
     * @return array Active fees
     */
    public function getActiveFees() {
        return $this->find('all', array(
            'conditions' => array(
                'FeeConfiguration.is_active' => 1
            ),
            'order' => array('FeeConfiguration.fee_type' => 'ASC')
        ));
    }
    
    /**
     * Get fee by type
     * 
     * @param string $feeType Fee type
     * @return array Fee configuration
     */
    public function getFeeByType($feeType) {
        return $this->find('first', array(
            'conditions' => array(
                'FeeConfiguration.fee_type' => $feeType,
                'FeeConfiguration.is_active' => 1
            )
        ));
    }
    
    /**
     * Calculate fee amount
     * 
     * @param string $feeType Fee type
     * @param float $amount Transaction amount
     * @return float Calculated fee
     */
    public function calculateFee($feeType, $amount) {
        $fee = $this->getFeeByType($feeType);
        
        if (empty($fee)) {
            return 0;
        }
        
        $feeConfig = $fee['FeeConfiguration'];
        
        // Check amount limits
        if ($feeConfig['min_amount'] && $amount < $feeConfig['min_amount']) {
            return 0;
        }
        if ($feeConfig['max_amount'] && $amount > $feeConfig['max_amount']) {
            return 0;
        }
        
        $calculatedFee = 0;
        
        // Calculate percentage fee
        if ($feeConfig['fee_percentage']) {
            $calculatedFee += $amount * ($feeConfig['fee_percentage'] / 100);
        }
        
        // Add fixed fee
        if ($feeConfig['fee_fixed']) {
            $calculatedFee += $feeConfig['fee_fixed'];
        }
        
        return round($calculatedFee, 2);
    }
    
    /**
     * Get fee types
     * 
     * @return array Fee types
     */
    public function getFeeTypes() {
        return array(
            'lending' => 'Lending/Loan Fee',
            'withdrawal' => 'Withdrawal Fee',
            'transfer' => 'Fund Transfer Fee',
            'registration' => 'Registration Fee',
            'late_payment' => 'Late Payment Fee',
            'early_repayment' => 'Early Repayment Fee',
            'processing' => 'Processing Fee'
        );
    }
    
    /**
     * Get fee type options for select
     * 
     * @return array Options
     */
    public function getFeeTypeOptions() {
        $types = $this->getFeeTypes();
        $options = array();
        foreach ($types as $key => $label) {
            $options[] = array('value' => $key, 'label' => $label);
        }
        return $options;
    }
}
