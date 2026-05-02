<?php
/**
 * SEC-015 & SEC-016: Database Encryption Configuration
 * 
 * This file configures database encryption at rest and field-level encryption for PII.
 * 
 * IMPORTANT: Generate a secure encryption key and store it securely!
 * Do not commit this key to version control.
 * 
 * Generate a secure key:
 *   openssl rand -hex 32
 * 
 * The encryption key MUST be set via environment variable: LENDA_ENCRYPTION_KEY
 * or LENDA_FIELD_ENCRYPTION_KEY
 */

// Read encryption key from environment variable
$encryptionKey = getenv('LENDA_ENCRYPTION_KEY') ?: getenv('LENDA_FIELD_ENCRYPTION_KEY');

// Fallback for development only - throw error in production if not set
if (empty($encryptionKey)) {
    $isProduction = getenv('LENDA_ENV') === 'production';
    if ($isProduction) {
        throw new Exception('CRITICAL: Encryption key not configured. Set LENDA_ENCRYPTION_KEY environment variable.');
    }
    error_log('WARNING: Encryption key not set. Using dev key - CHANGE IN PRODUCTION!');
    $encryptionKey = 'dev_encryption_key_change_in_production';
}

// Security configuration for encryption
Configure::write('Security', array(
    // AES-256 encryption key (32 bytes = 64 hex chars)
    // IMPORTANT: This key is loaded from LENDA_ENCRYPTION_KEY environment variable
    'encryptionKey' => $encryptionKey,
    
    // Key rotation settings
    'keyRotation' => array(
        'enabled' => false,
        'keyId' => 'v1',
        'previousKey' => null, // Previous key for decryption during rotation
    ),
    
    // Fields requiring field-level encryption (PII)
    'piiFields' => array(
        // User model
        'User' => array(
            'national_id' => 'National ID Number',
            'ssn' => 'Social Security Number',
            'passport_number' => 'Passport Number',
            'driving_license' => 'Driving License',
            'tax_id' => 'Tax ID',
            'bank_account' => 'Bank Account Number',
            'iban' => 'IBAN',
            'credit_card' => 'Credit Card Number',
            'credit_card_cvv' => 'Credit Card CVV',
            'mother_maiden_name' => "Mother's Maiden Name",
        ),
        
        // Loan application model
        'LoanApplication' => array(
            'annual_income' => 'Annual Income',
            'employer_name' => 'Employer Name',
            'employer_address' => 'Employer Address',
        ),
        
        // Payment model
        'Payment' => array(
            'account_number' => 'Payment Account Number',
            'routing_number' => 'Routing Number',
        ),
    ),
    
    // MySQL database encryption (InnoDB tablespace encryption)
    'databaseEncryption' => array(
        'enabled' => false, // Enable MySQL 8.0+ tablespace encryption
        'keyring' => true, // Use MySQL keyring
    ),
));

// Configure database encryption keyring for MySQL
// Run these SQL commands to enable:
// ALTER INSTANCE ENCRYPTION KEY RING INIT;
// CREATE KEYRING FILE = '/path/to/keyring' IDENTIFIED BY 'password';
