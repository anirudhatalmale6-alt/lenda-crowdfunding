<?php
/**
 * LENDA Input Validation Component
 * 
 * Provides comprehensive server-side input validation for API endpoints
 * 
 * @package Lenda
 * @subpackage Controller/Component
 */

App::uses('Component', 'Controller');

class InputValidationComponent extends Component {
    
    /**
     * Validation rules configuration
     */
    protected $_rules = array();
    
    /**
     * Error messages
     */
    protected $_errors = array();
    
    /**
     * Initialize component
     * 
     * @param Controller $controller
     * @param array $settings
     */
    public function initialize(Controller $controller, $settings = array()) {
        $this->Controller = $controller;
        $this->_errors = array();
        
        // Set default validation rules
        $this->_rules = array(
            'email' => array(
                'pattern' => '/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/',
                'message' => 'Invalid email address'
            ),
            'password' => array(
                'min_length' => 8,
                'max_length' => 128,
                'message' => 'Password must be between 8 and 128 characters'
            ),
            'loan_amount' => array(
                'min' => 100,
                'max' => 10000000,
                'message' => 'Loan amount must be between 100 and 10,000,000'
            ),
            'interest_rate' => array(
                'min' => 0.1,
                'max' => 100,
                'message' => 'Interest rate must be between 0.1% and 100%'
            ),
            'duration_months' => array(
                'min' => 1,
                'max' => 360,
                'message' => 'Duration must be between 1 and 360 months'
            ),
            'amount' => array(
                'min' => 0.01,
                'max' => 10000000,
                'message' => 'Amount must be between 0.01 and 10,000,000'
            ),
            'name' => array(
                'min_length' => 2,
                'max_length' => 255,
                'pattern' => '/^[a-zA-Z\s\-\.\']+$/',
                'message' => 'Name must be 2-255 characters, letters only'
            ),
            'phone' => array(
                'pattern' => '/^\+?[1-9]\d{6,14}$/',
                'message' => 'Invalid phone number format'
            ),
            'wallet_address' => array(
                'pattern' => '/^0x[a-fA-F0-9]{40}$/',
                'message' => 'Invalid Ethereum wallet address'
            ),
            'currency' => array(
                'allowed' => array('NGN', 'USD', 'EUR', 'GBP', 'BTC', 'ETH'),
                'message' => 'Invalid currency code'
            )
        );
    }
    
    /**
     * Validate input data against rules
     * 
     * @param array $data Input data to validate
     * @param array $rules Validation rules
     * @return bool True if valid, false otherwise
     */
    public function validate($data, $rules) {
        $this->_errors = array();
        
        foreach ($rules as $field => $rule) {
            $value = isset($data[$field]) ? $data[$field] : null;
            
            if (!$this->_validateField($field, $value, $rule, $data)) {
                $this->_errors[$field] = $rule['message'] ?? 'Validation failed for ' . $field;
            }
        }
        
        return empty($this->_errors);
    }
    
    /**
     * Validate a single field
     * 
     * @param string $field Field name
     * @param mixed $value Field value
     * @param array $rule Validation rule
     * @param array $data Full data array
     * @return bool
     */
    protected function _validateField($field, $value, $rule, $data) {
        // Check required
        if (isset($rule['required']) && $rule['required']) {
            if ($value === null || $value === '' || $value === false) {
                return false;
            }
        }
        
        // Skip validation if value is empty and not required
        if ($value === null || $value === '') {
            return true;
        }
        
        // Type validation
        if (isset($rule['type'])) {
            switch ($rule['type']) {
                case 'email':
                    if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                        return false;
                    }
                    break;
                    
                case 'integer':
                    if (!filter_var($value, FILTER_VALIDATE_INT)) {
                        return false;
                    }
                    break;
                    
                case 'float':
                case 'number':
                    if (!is_numeric($value)) {
                        return false;
                    }
                    break;
                    
                case 'boolean':
                    if (!is_bool($value) && $value !== 'true' && $value !== 'false' && $value !== 0 && $value !== 1) {
                        return false;
                    }
                    break;
                    
                case 'array':
                    if (!is_array($value)) {
                        return false;
                    }
                    break;
                    
                case 'string':
                    if (!is_string($value)) {
                        return false;
                    }
                    break;
                    
                case 'url':
                    if (!filter_var($value, FILTER_VALIDATE_URL)) {
                        return false;
                    }
                    break;
                    
                case 'ip':
                    if (!filter_var($value, FILTER_VALIDATE_IP)) {
                        return false;
                    }
                    break;
            }
        }
        
        // Min value validation
        if (isset($rule['min'])) {
            if (is_numeric($value) && $value < $rule['min']) {
                return false;
            }
        }
        
        // Max value validation
        if (isset($rule['max'])) {
            if (is_numeric($value) && $value > $rule['max']) {
                return false;
            }
        }
        
        // Min length validation
        if (isset($rule['min_length'])) {
            if (strlen($value) < $rule['min_length']) {
                return false;
            }
        }
        
        // Max length validation
        if (isset($rule['max_length'])) {
            if (strlen($value) > $rule['max_length']) {
                return false;
            }
        }
        
        // Pattern validation
        if (isset($rule['pattern'])) {
            if (!preg_match($rule['pattern'], $value)) {
                return false;
            }
        }
        
        // Allowed values validation
        if (isset($rule['allowed']) && is_array($rule['allowed'])) {
            if (!in_array($value, $rule['allowed'])) {
                return false;
            }
        }
        
        // Custom callback validation
        if (isset($rule['callback']) && is_callable($rule['callback'])) {
            if (!$rule['callback']($value, $data)) {
                return false;
            }
        }
        
        // In list validation
        if (isset($rule['in'])) {
            if (!in_array($value, $rule['in'])) {
                return false;
            }
        }
        
        // Compare with another field
        if (isset($rule['equals'])) {
            if ($value != $data[$rule['equals']]) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Get validation errors
     * 
     * @return array
     */
    public function getErrors() {
        return $this->_errors;
    }
    
    /**
     * Get error message for a field
     * 
     * @param string $field
     * @return string|null
     */
    public function getError($field) {
        return isset($this->_errors[$field]) ? $this->_errors[$field] : null;
    }
    
    /**
     * Check if there are any validation errors
     * 
     * @return bool
     */
    public function hasErrors() {
        return !empty($this->_errors);
    }
    
    /**
     * Validate loan creation data
     * 
     * @param array $data
     * @return bool
     */
    public function validateLoan($data) {
        $rules = array(
            'title' => array(
                'required' => true,
                'type' => 'string',
                'min_length' => 3,
                'max_length' => 255,
                'message' => 'Title must be between 3 and 255 characters'
            ),
            'description' => array(
                'required' => false,
                'type' => 'string',
                'max_length' => 5000,
                'message' => 'Description cannot exceed 5000 characters'
            ),
            'loan_amount' => array(
                'required' => true,
                'type' => 'number',
                'min' => 100,
                'max' => 10000000,
                'message' => 'Loan amount must be between 100 and 10,000,000'
            ),
            'interest_rate' => array(
                'required' => true,
                'type' => 'number',
                'min' => 0.1,
                'max' => 100,
                'message' => 'Interest rate must be between 0.1% and 100%'
            ),
            'duration_months' => array(
                'required' => true,
                'type' => 'integer',
                'min' => 1,
                'max' => 360,
                'message' => 'Duration must be between 1 and 360 months'
            )
        );
        
        return $this->validate($data, $rules);
    }
    
    /**
     * Validate funding data
     * 
     * @param array $data
     * @return bool
     */
    public function validateFunding($data) {
        $rules = array(
            'amount' => array(
                'required' => true,
                'type' => 'number',
                'min' => 100,
                'max' => 10000000,
                'message' => 'Funding amount must be between 100 and 10,000,000'
            ),
            'loan_id' => array(
                'required' => true,
                'type' => 'integer',
                'message' => 'Valid loan ID is required'
            )
        );
        
        return $this->validate($data, $rules);
    }
    
    /**
     * Validate wallet transaction
     * 
     * @param array $data
     * @return bool
     */
    public function validateTransaction($data) {
        $rules = array(
            'amount' => array(
                'required' => true,
                'type' => 'number',
                'min' => 0.01,
                'max' => 10000000,
                'message' => 'Amount must be between 0.01 and 10,000,000'
            ),
            'recipient_id' => array(
                'required' => false,
                'type' => 'integer',
                'message' => 'Valid recipient ID is required'
            )
        );
        
        return $this->validate($data, $rules);
    }
    
    /**
     * Validate collateral data
     * 
     * @param array $data
     * @return bool
     */
    public function validateCollateral($data) {
        $rules = array(
            'type' => array(
                'required' => true,
                'allowed' => array('real_estate', 'vehicle', 'equipment', 'jewelry', 'stocks', 'crypto', 'other'),
                'message' => 'Invalid collateral type'
            ),
            'estimated_value' => array(
                'required' => true,
                'type' => 'number',
                'min' => 100,
                'max' => 100000000,
                'message' => 'Estimated value must be between 100 and 100,000,000'
            ),
            'description' => array(
                'required' => false,
                'type' => 'string',
                'max_length' => 2000,
                'message' => 'Description cannot exceed 2000 characters'
            )
        );
        
        return $this->validate($data, $rules);
    }
    
    /**
     * Validate user registration
     * 
     * @param array $data
     * @return bool
     */
    public function validateRegistration($data) {
        $rules = array(
            'email' => array(
                'required' => true,
                'type' => 'email',
                'message' => 'Valid email address is required'
            ),
            'password' => array(
                'required' => true,
                'min_length' => 8,
                'max_length' => 128,
                'message' => 'Password must be between 8 and 128 characters'
            ),
            'name' => array(
                'required' => true,
                'min_length' => 2,
                'max_length' => 255,
                'message' => 'Name must be between 2 and 255 characters'
            ),
            'role' => array(
                'required' => false,
                'allowed' => array('borrower', 'lender', 'both'),
                'message' => 'Invalid role'
            )
        );
        
        return $this->validate($data, $rules);
    }
    
    /**
     * Sanitize input data
     * 
     * @param array $data
     * @return array
     */
    public function sanitize($data) {
        $sanitized = array();
        
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                // Remove null bytes
                $value = str_replace("\0", '', $value);
                
                // Trim whitespace
                $value = trim($value);
                
                // Convert special characters to HTML entities
                $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
            }
            
            $sanitized[$key] = $value;
        }
        
        return $sanitized;
    }
    
    /**
     * Add custom validation rule
     * 
     * @param string $name
     * @param array $rule
     */
    public function addRule($name, $rule) {
        $this->_rules[$name] = $rule;
    }
}
