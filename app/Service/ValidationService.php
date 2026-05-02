<?php
/**
 * LENDA Validation Service
 * 
 * Shared validation logic for controllers
 * Eliminates duplicate validation across controllers
 * 
 * CODE-004: Create shared ValidationService for duplicate validation logic
 */

App::uses('AppService', 'Service');

class ValidationService extends AppService {
    
    /**
     * Service name for logging
     */
    protected $serviceName = 'ValidationService';
    
    /**
     * Common validation rules
     */
    const MIN_PASSWORD_LENGTH = 6;
    const MIN_USERNAME_LENGTH = 3;
    const MAX_USERNAME_LENGTH = 30;
    const MIN_LOAN_AMOUNT = 100;
    const MAX_LOAN_AMOUNT = 1000000;
    const MIN_INTEREST_RATE = 0;
    const MAX_INTEREST_RATE = 100;
    const MIN_DURATION_MONTHS = 1;
    const MAX_DURATION_MONTHS = 360;
    
    /**
     * Validate email address
     * 
     * @param string $email Email to validate
     * @return array Validation result
     */
    public function validateEmail($email) {
        if (empty($email)) {
            return $this->errorResult('Email is required', 'EMAIL_REQUIRED');
        }
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->errorResult('Invalid email format', 'INVALID_EMAIL');
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate username
     * 
     * @param string $username Username to validate
     * @return array Validation result
     */
    public function validateUsername($username) {
        if (empty($username)) {
            return $this->errorResult('Username is required', 'USERNAME_REQUIRED');
        }
        
        $length = strlen($username);
        if ($length < self::MIN_USERNAME_LENGTH) {
            return $this->errorResult(
                sprintf('Username must be at least %d characters', self::MIN_USERNAME_LENGTH),
                'USERNAME_TOO_SHORT'
            );
        }
        
        if ($length > self::MAX_USERNAME_LENGTH) {
            return $this->errorResult(
                sprintf('Username must be no more than %d characters', self::MAX_USERNAME_LENGTH),
                'USERNAME_TOO_LONG'
            );
        }
        
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
            return $this->errorResult(
                'Username can only contain letters, numbers, and underscores',
                'INVALID_USERNAME_FORMAT'
            );
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate password
     * 
     * @param string $password Password to validate
     * @return array Validation result
     */
    public function validatePassword($password) {
        if (empty($password)) {
            return $this->errorResult('Password is required', 'PASSWORD_REQUIRED');
        }
        
        $length = strlen($password);
        if ($length < self::MIN_PASSWORD_LENGTH) {
            return $this->errorResult(
                sprintf('Password must be at least %d characters', self::MIN_PASSWORD_LENGTH),
                'PASSWORD_TOO_SHORT'
            );
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate password match
     * 
     * @param string $password Password
     * @param string $confirmPassword Confirmation password
     * @return array Validation result
     */
    public function validatePasswordMatch($password, $confirmPassword) {
        if ($password !== $confirmPassword) {
            return $this->errorResult('Passwords do not match', 'PASSWORD_MISMATCH');
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate loan amount
     * 
     * @param float $amount Loan amount
     * @return array Validation result
     */
    public function validateLoanAmount($amount) {
        if (!is_numeric($amount)) {
            return $this->errorResult('Loan amount must be a number', 'INVALID_AMOUNT');
        }
        
        $amount = floatval($amount);
        
        if ($amount < self::MIN_LOAN_AMOUNT) {
            return $this->errorResult(
                sprintf('Minimum loan amount is %s', number_format(self::MIN_LOAN_AMOUNT, 2)),
                'AMOUNT_TOO_LOW'
            );
        }
        
        if ($amount > self::MAX_LOAN_AMOUNT) {
            return $this->errorResult(
                sprintf('Maximum loan amount is %s', number_format(self::MAX_LOAN_AMOUNT, 2)),
                'AMOUNT_TOO_HIGH'
            );
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate interest rate
     * 
     * @param float $rate Interest rate
     * @return array Validation result
     */
    public function validateInterestRate($rate) {
        if (!is_numeric($rate)) {
            return $this->errorResult('Interest rate must be a number', 'INVALID_RATE');
        }
        
        $rate = floatval($rate);
        
        if ($rate < self::MIN_INTEREST_RATE || $rate > self::MAX_INTEREST_RATE) {
            return $this->errorResult(
                sprintf('Interest rate must be between %d and %d', self::MIN_INTEREST_RATE, self::MAX_INTEREST_RATE),
                'INVALID_RATE_RANGE'
            );
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate loan duration
     * 
     * @param int $months Duration in months
     * @return array Validation result
     */
    public function validateLoanDuration($months) {
        if (!is_numeric($months)) {
            return $this->errorResult('Duration must be a number', 'INVALID_DURATION');
        }
        
        $months = intval($months);
        
        if ($months < self::MIN_DURATION_MONTHS || $months > self::MAX_DURATION_MONTHS) {
            return $this->errorResult(
                sprintf('Duration must be between %d and %d months', self::MIN_DURATION_MONTHS, self::MAX_DURATION_MONTHS),
                'INVALID_DURATION_RANGE'
            );
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate phone number
     * 
     * @param string $phone Phone number
     * @return array Validation result
     */
    public function validatePhone($phone) {
        if (empty($phone)) {
            return $this->successResult(); // Phone is optional
        }
        
        // Remove common formatting characters
        $cleaned = preg_replace('/[\s\-\(\)\+]/', '', $phone);
        
        if (!preg_match('/^[0-9]{10,15}$/', $cleaned)) {
            return $this->errorResult('Invalid phone number format', 'INVALID_PHONE');
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate URL
     * 
     * @param string $url URL to validate
     * @return array Validation result
     */
    public function validateUrl($url) {
        if (empty($url)) {
            return $this->successResult(); // URL is optional
        }
        
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            return $this->errorResult('Invalid URL format', 'INVALID_URL');
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate required fields
     * 
     * @param array $data Data to validate
     * @param array $requiredFields List of required field names
     * @return array Validation result
     */
    public function validateRequiredFields($data, $requiredFields) {
        $missing = [];
        
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && empty(trim($data[$field])))) {
                $missing[] = $field;
            }
        }
        
        if (!empty($missing)) {
            return $this->errorResult(
                'Missing required fields: ' . implode(', ', $missing),
                'MISSING_REQUIRED_FIELDS',
                ['missing_fields' => $missing]
            );
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate IP address
     * 
     * @param string $ip IP address
     * @return array Validation result
     */
    public function validateIpAddress($ip) {
        if (empty($ip)) {
            return $this->errorResult('IP address is required', 'IP_REQUIRED');
        }
        
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return $this->errorResult('Invalid IP address', 'INVALID_IP');
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate date
     * 
     * @param string $date Date string
     * @param string $format Expected format (Y-m-d, etc.)
     * @return array Validation result
     */
    public function validateDate($date, $format = 'Y-m-d') {
        if (empty($date)) {
            return $this->errorResult('Date is required', 'DATE_REQUIRED');
        }
        
        $d = DateTime::createFromFormat($format, $date);
        if (!$d || $d->format($format) !== $date) {
            return $this->errorResult(
                sprintf('Invalid date format. Expected: %s', $format),
                'INVALID_DATE_FORMAT'
            );
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate date range
     * 
     * @param string $startDate Start date
     * @param string $endDate End date
     * @param string $format Date format
     * @return array Validation result
     */
    public function validateDateRange($startDate, $endDate, $format = 'Y-m-d') {
        $start = DateTime::createFromFormat($format, $startDate);
        $end = DateTime::createFromFormat($format, $endDate);
        
        if (!$start || !$end) {
            return $this->errorResult('Invalid date format', 'INVALID_DATE');
        }
        
        if ($start > $end) {
            return $this->errorResult('Start date must be before end date', 'INVALID_DATE_RANGE');
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate numeric range
     * 
     * @param float $value Value to check
     * @param float $min Minimum value
     * @param float $max Maximum value
     * @param string $fieldName Field name for error message
     * @return array Validation result
     */
    public function validateNumericRange($value, $min, $max, $fieldName = 'Value') {
        if (!is_numeric($value)) {
            return $this->errorResult(
                sprintf('%s must be a number', $fieldName),
                'INVALID_NUMBER'
            );
        }
        
        $value = floatval($value);
        
        if ($value < $min || $value > $max) {
            return $this->errorResult(
                sprintf('%s must be between %s and %s', $fieldName, $min, $max),
                'OUT_OF_RANGE'
            );
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate currency amount
     * 
     * @param float $amount Amount
     * @param bool $allowZero Whether to allow zero
     * @return array Validation result
     */
    public function validateCurrencyAmount($amount, $allowZero = false) {
        if (!is_numeric($amount)) {
            return $this->errorResult('Amount must be a number', 'INVALID_AMOUNT');
        }
        
        $amount = floatval($amount);
        
        if (!$allowZero && $amount <= 0) {
            return $this->errorResult('Amount must be greater than zero', 'INVALID_AMOUNT');
        }
        
        if ($amount < 0) {
            return $this->errorResult('Amount cannot be negative', 'NEGATIVE_AMOUNT');
        }
        
        // Check for reasonable precision (max 2 decimal places for currency)
        if (strlen(substr(strrchr((string)$amount, "."), 1)) > 2) {
            return $this->errorResult('Amount cannot have more than 2 decimal places', 'PRECISION_TOO_HIGH');
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate file upload
     * 
     * @param array $file File data from $_FILES
     * @param array $allowedTypes Allowed MIME types
     * @param int $maxSize Maximum file size in bytes
     * @return array Validation result
     */
    public function validateFileUpload($file, $allowedTypes = [], $maxSize = null) {
        if (empty($file) || $file['error'] === UPLOAD_ERR_NO_FILE) {
            return $this->errorResult('No file uploaded', 'NO_FILE');
        }
        
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return $this->errorResult('File upload error', 'UPLOAD_ERROR');
        }
        
        if ($maxSize && $file['size'] > $maxSize) {
            return $this->errorResult(
                sprintf('File size exceeds maximum allowed (%s)', number_format($maxSize / 1024) . 'KB'),
                'FILE_TOO_LARGE'
            );
        }
        
        if (!empty($allowedTypes)) {
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mimeType = $finfo->file($file['tmp_name']);
            
            if (!in_array($mimeType, $allowedTypes)) {
                return $this->errorResult('File type not allowed', 'INVALID_FILE_TYPE');
            }
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate Ethereum address
     * 
     * @param string $address Ethereum address
     * @return array Validation result
     */
    public function validateEthereumAddress($address) {
        if (empty($address)) {
            return $this->errorResult('Address is required', 'ADDRESS_REQUIRED');
        }
        
        // Check if it starts with 0x and is 42 characters long
        if (!preg_match('/^0x[a-fA-F0-9]{40}$/', $address)) {
            return $this->errorResult('Invalid Ethereum address format', 'INVALID_ADDRESS');
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate collateral value vs loan amount (LTV)
     * 
     * @param float $loanAmount Loan amount
     * @param float $collateralValue Collateral value
     * @param float $maxLtv Maximum LTV ratio (default 80%)
     * @return array Validation result
     */
    public function validateCollateralLtv($loanAmount, $collateralValue, $maxLtv = 80) {
        if ($collateralValue <= 0) {
            return $this->errorResult('Collateral value must be greater than zero', 'INVALID_COLLATERAL');
        }
        
        $ltv = ($loanAmount / $collateralValue) * 100;
        
        if ($ltv > $maxLtv) {
            return $this->errorResult(
                sprintf('Loan-to-value ratio exceeds maximum of %d%% (current: %d%%)', $maxLtv, round($ltv, 2)),
                'LTV_EXCEEDED'
            );
        }
        
        return $this->successResult(['ltv' => $ltv]);
    }
    
    /**
     * Validate captcha
     * 
     * @param string $captchaResponse Captcha response
     * @return array Validation result
     */
    public function validateCaptcha($captchaResponse) {
        // Implement based on captcha provider (reCAPTCHA, Solve Media, etc.)
        // This is a placeholder - implement based on your captcha solution
        if (empty($captchaResponse)) {
            return $this->errorResult('Captcha verification required', 'CAPTCHA_REQUIRED');
        }
        
        return $this->successResult();
    }
    
    /**
     * Validate array of IDs
     * 
     * @param array $ids Array of IDs
     * @return array Validation result
     */
    public function validateIdArray($ids) {
        if (!is_array($ids)) {
            return $this->errorResult('Value must be an array', 'INVALID_ARRAY');
        }
        
        foreach ($ids as $id) {
            if (!is_numeric($id) || intval($id) <= 0) {
                return $this->errorResult('All IDs must be positive integers', 'INVALID_ID');
            }
        }
        
        return $this->successResult();
    }
    
    /**
     * Create success result
     * 
     * @param mixed $data Optional data
     * @return array
     */
    protected function successResult($data = null) {
        return [
            'success' => true,
            'valid' => true,
            'data' => $data
        ];
    }
    
    /**
     * Create error result
     * 
     * @param string $message Error message
     * @param string $code Error code
     * @param mixed $details Additional details
     * @return array
     */
    protected function errorResult($message, $code, $details = null) {
        $result = [
            'success' => false,
            'valid' => false,
            'error' => [
                'message' => $message,
                'code' => $code
            ]
        ];
        
        if ($details !== null) {
            $result['error']['details'] = $details;
        }
        
        return $result;
    }
}
