<?php
/**
 * API Error Codes
 * Standardized error codes for all API endpoints
 * Format: CATEGORY_CODE (e.g., AUTH_001, LOAN_001)
 */

class ApiErrorCodes {
    
    // ==================== AUTHENTICATION ERRORS (AUTH_xxx) ====================
    const AUTH_001 = 'AUTH_001'; // Invalid credentials
    const AUTH_002 = 'AUTH_002'; // Account locked
    const AUTH_003 = 'AUTH_003'; // Account suspended
    const AUTH_004 = 'AUTH_004'; // Email not verified
    const AUTH_005 = 'AUTH_005'; // Invalid/expired token
    const AUTH_006 = 'AUTH_006'; // Token required
    const AUTH_007 = 'AUTH_007'; // Invalid 2FA code
    const AUTH_008 = 'AUTH_008'; // 2FA not enabled
    const AUTH_009 = 'AUTH_009'; // Password reset expired
    const AUTH_010 = 'AUTH_010'; // Invalid API key
    const AUTH_011 = 'AUTH_011'; // Rate limit exceeded
    const AUTH_012 = 'AUTH_012'; // Invalid request signature
    
    // ==================== USER ERRORS (USER_xxx) ====================
    const USER_001 = 'USER_001'; // User not found
    const USER_002 = 'USER_002'; // Email already exists
    const USER_003 = 'USER_003'; // Invalid user role
    const USER_004 = 'USER_004'; // Profile update failed
    const USER_005 = 'USER_005'; // KYC verification failed
    const USER_006 = 'USER_006'; // KYC already verified
    const USER_007 = 'USER_007'; // Insufficient permissions
    
    // ==================== LOAN ERRORS (LOAN_xxx) ====================
    const LOAN_001 = 'LOAN_001'; // Loan not found
    const LOAN_002 = 'LOAN_002'; // Invalid loan status
    const LOAN_003 = 'LOAN_003'; // Loan amount too low
    const LOAN_004 = 'LOAN_004'; // Loan amount exceeds limit
    const LOAN_005 = 'LOAN_005'; // Loan already funded
    const LOAN_006 = 'LOAN_006'; // Insufficient funds
    const LOAN_007 = 'LOAN_007'; // Loan cancelled
    const LOAN_008 = 'LOAN_008'; // Loan expired
    const LOAN_009 = 'LOAN_009'; // Cannot fund own loan
    const LOAN_010 = 'LOAN_010'; // Loan already repaid
    const LOAN_011 = 'LOAN_011'; // Repayment failed
    const LOAN_012 = 'LOAN_012'; // Invalid repayment amount
    const LOAN_013 = 'LOAN_013'; // Collateral required
    const LOAN_014 = 'LOAN_014'; // Collateral insufficient
    const LOAN_015 = 'LOAN_015'; // Loan already in default
    const LOAN_016 = 'LOAN_016'; // Cannot cancel funded loan
    
    // ==================== WALLET ERRORS (WALLET_xxx) ====================
    const WALLET_001 = 'WALLET_001'; // Wallet not found
    const WALLET_002 = 'WALLET_002'; // Insufficient balance
    const WALLET_003 = 'WALLET_003'; // Invalid amount
    const WALLET_004 = 'WALLET_004'; // Transfer failed
    const WALLET_005 = 'WALLET_005'; // Cannot transfer to self
    const WALLET_006 = 'WALLET_006'; // Withdrawal pending
    const WALLET_007 = 'WALLET_007'; // Withdrawal cancelled
    const WALLET_008 = 'WALLET_008'; // Deposit failed
    const WALLET_009 = 'WALLET_009'; // Invalid currency
    const WALLET_010 = 'WALLET_010'; // Wallet frozen
    
    // ==================== ESCROW ERRORS (ESCROW_xxx) ====================
    const ESCROW_001 = 'ESCROW_001'; // Escrow not found
    const ESCROW_002 = 'ESCROW_002'; // Invalid escrow status
    const ESCROW_003 = 'ESCROW_003'; // Escrow already funded
    const ESCROW_004 = 'ESCROW_004'; // Escrow not funded
    const ESCROW_005 = 'ESCROW_005'; // Cannot release funds
    const ESCROW_006 = 'ESCROW_006'; // Dispute already open
    const ESCROW_007 = 'ESCROW_007'; // No dispute to resolve
    const ESCROW_008 = 'ESCROW_008'; // Escrow expired
    
    // ==================== COLLATERAL ERRORS (COLLATERAL_xxx) ====================
    const COLLATERAL_001 = 'COLLATERAL_001'; // Collateral not found
    const COLLATERAL_002 = 'COLLATERAL_002'; // Collateral already verified
    const COLLATERAL_003 = 'COLLATERAL_003'; // Collateral rejected
    const COLLATERAL_004 = 'COLLATERAL_004'; // Invalid collateral type
    const COLLATERAL_005 = 'COLLATERAL_005'; // Collateral valuation failed
    const COLLATERAL_006 = 'COLLATERAL_006'; // LTV exceeds maximum
    
    // ==================== RISK ERRORS (RISK_xxx) ====================
    const RISK_001 = 'RISK_001'; // Risk score too high
    const RISK_002 = 'RISK_002'; // Exposure limit exceeded
    const RISK_003 = 'RISK_003'; // Default prediction triggered
    const RISK_004 = 'RISK_004'; // Grace period expired
    const RISK_005 = 'RISK_005'; // Liquidation triggered
    const RISK_006 = 'RISK_006'; // Invalid risk parameters
    
    // ==================== BLOCKCHAIN ERRORS (BLOCKCHAIN_xxx) ====================
    const BLOCKCHAIN_001 = 'BLOCKCHAIN_001'; // Transaction failed
    const BLOCKCHAIN_002 = 'BLOCKCHAIN_002'; // Invalid transaction hash
    const BLOCKCHAIN_003 = 'BLOCKCHAIN_003'; // Smart contract error
    const BLOCKCHAIN_004 = 'BLOCKCHAIN_004'; // Network unavailable
    const BLOCKCHAIN_005 = 'BLOCKCHAIN_005'; // Insufficient gas
    const BLOCKCHAIN_006 = 'BLOCKCHAIN_006'; // Confirmation timeout
    
    // ==================== GENERAL ERRORS (GEN_xxx) ====================
    const GEN_001 = 'GEN_001'; // Validation error
    const GEN_002 = 'GEN_002'; // Invalid request
    const GEN_003 = 'GEN_003'; // Resource not found
    const GEN_004 = 'GEN_004'; // Method not allowed
    const GEN_005 = 'GEN_005'; // Internal server error
    const GEN_006 = 'GEN_006'; // Service unavailable
    const GEN_007 = 'GEN_007'; // Database error
    const GEN_008 = 'GEN_008'; // Cache error
    const GEN_009 = 'GEN_009'; // Rate limit exceeded
    const GEN_010 = 'GEN_010'; // Maintenance mode
    
    // ==================== ADMIN ERRORS (ADMIN_xxx) ====================
    const ADMIN_001 = 'ADMIN_001'; // Invalid admin action
    const ADMIN_002 = 'ADMIN_002'; // Permission denied
    const ADMIN_003 = 'ADMIN_003'; // Configuration error
    const ADMIN_004 = 'ADMIN_004'; // System error
    
    /**
     * Get error message by code
     * 
     * @param string $code Error code
     * @return string Error message
     */
    public static function getMessage($code) {
        $messages = array(
            // Auth
            self::AUTH_001 => 'Invalid email or password',
            self::AUTH_002 => 'Account is locked. Please contact support',
            self::AUTH_003 => 'Account is suspended',
            self::AUTH_004 => 'Please verify your email address',
            self::AUTH_005 => 'Invalid or expired authentication token',
            self::AUTH_006 => 'Authentication token required',
            self::AUTH_007 => 'Invalid two-factor authentication code',
            self::AUTH_008 => 'Two-factor authentication not enabled',
            self::AUTH_009 => 'Password reset link has expired',
            self::AUTH_010 => 'Invalid API key',
            self::AUTH_011 => 'Rate limit exceeded. Please try again later',
            self::AUTH_012 => 'Invalid request signature',
            
            // User
            self::USER_001 => 'User not found',
            self::USER_002 => 'Email address already registered',
            self::USER_003 => 'Invalid user role',
            self::USER_004 => 'Failed to update profile',
            self::USER_005 => 'KYC verification failed',
            self::USER_006 => 'KYC already verified',
            self::USER_007 => 'Insufficient permissions',
            
            // Loan
            self::LOAN_001 => 'Loan not found',
            self::LOAN_002 => 'Invalid loan status',
            self::LOAN_003 => 'Loan amount is below minimum',
            self::LOAN_004 => 'Loan amount exceeds maximum limit',
            self::LOAN_005 => 'Loan has already been fully funded',
            self::LOAN_006 => 'Insufficient funds',
            self::LOAN_007 => 'Loan has been cancelled',
            self::LOAN_008 => 'Loan has expired',
            self::LOAN_009 => 'Cannot fund your own loan',
            self::LOAN_010 => 'Loan has already been repaid',
            self::LOAN_011 => 'Repayment processing failed',
            self::LOAN_012 => 'Invalid repayment amount',
            self::LOAN_013 => 'Collateral is required for this loan',
            self::LOAN_014 => 'Collateral value is insufficient',
            self::LOAN_015 => 'Loan is already in default status',
            self::LOAN_016 => 'Cannot cancel a funded loan',
            
            // Wallet
            self::WALLET_001 => 'Wallet not found',
            self::WALLET_002 => 'Insufficient balance',
            self::WALLET_003 => 'Invalid amount',
            self::WALLET_004 => 'Transfer failed',
            self::WALLET_005 => 'Cannot transfer to yourself',
            self::WALLET_006 => 'Withdrawal is already pending',
            self::WALLET_007 => 'Withdrawal has been cancelled',
            self::WALLET_008 => 'Deposit failed',
            self::WALLET_009 => 'Unsupported currency',
            self::WALLET_010 => 'Wallet is frozen',
            
            // Escrow
            self::ESCROW_001 => 'Escrow transaction not found',
            self::ESCROW_002 => 'Invalid escrow status',
            self::ESCROW_003 => 'Escrow has already been funded',
            self::ESCROW_004 => 'Escrow has not been funded',
            self::ESCROW_005 => 'Cannot release funds at this time',
            self::ESCROW_006 => 'Dispute is already open',
            self::ESCROW_007 => 'No dispute to resolve',
            self::ESCROW_008 => 'Escrow has expired',
            
            // Collateral
            self::COLLATERAL_001 => 'Collateral not found',
            self::COLLATERAL_002 => 'Collateral already verified',
            self::COLLATERAL_003 => 'Collateral verification rejected',
            self::COLLATERAL_004 => 'Invalid collateral type',
            self::COLLATERAL_005 => 'Collateral valuation failed',
            self::COLLATERAL_006 => 'Loan-to-value ratio exceeds maximum',
            
            // Risk
            self::RISK_001 => 'Risk score exceeds acceptable threshold',
            self::RISK_002 => 'Exposure limit exceeded',
            self::RISK_003 => 'Default prediction triggered',
            self::RISK_004 => 'Grace period has expired',
            self::RISK_005 => 'Liquidation has been triggered',
            self::RISK_006 => 'Invalid risk parameters',
            
            // Blockchain
            self::BLOCKCHAIN_001 => 'Blockchain transaction failed',
            self::BLOCKCHAIN_002 => 'Invalid transaction hash',
            self::BLOCKCHAIN_003 => 'Smart contract execution error',
            self::BLOCKCHAIN_004 => 'Blockchain network unavailable',
            self::BLOCKCHAIN_005 => 'Inufficient gas for transaction',
            self::BLOCKCHAIN_006 => 'Transaction confirmation timeout',
            
            // General
            self::GEN_001 => 'Validation error',
            self::GEN_002 => 'Invalid request',
            self::GEN_003 => 'Resource not found',
            self::GEN_004 => 'Method not allowed',
            self::GEN_005 => 'Internal server error',
            self::GEN_006 => 'Service temporarily unavailable',
            self::GEN_007 => 'Database error',
            self::GEN_008 => 'Cache error',
            self::GEN_009 => 'Rate limit exceeded',
            self::GEN_010 => 'System under maintenance',
            
            // Admin
            self::ADMIN_001 => 'Invalid admin action',
            self::ADMIN_002 => 'Admin permission denied',
            self::ADMIN_003 => 'Configuration error',
            self::ADMIN_004 => 'System error',
        );
        
        return isset($messages[$code]) ? $messages[$code] : 'Unknown error';
    }
    
    /**
     * Get HTTP status code by error code
     * 
     * @param string $code Error code
     * @return int HTTP status code
     */
    public static function getHttpStatus($code) {
        $httpStatuses = array(
            // Auth - 401
            self::AUTH_001 => 401,
            self::AUTH_002 => 403,
            self::AUTH_003 => 403,
            self::AUTH_004 => 401,
            self::AUTH_005 => 401,
            self::AUTH_006 => 401,
            self::AUTH_007 => 401,
            self::AUTH_008 => 400,
            self::AUTH_009 => 400,
            self::AUTH_010 => 401,
            self::AUTH_011 => 429,
            self::AUTH_012 => 401,
            
            // User - 400, 403, 404
            self::USER_001 => 404,
            self::USER_002 => 400,
            self::USER_003 => 400,
            self::USER_004 => 500,
            self::USER_005 => 400,
            self::USER_006 => 400,
            self::USER_007 => 403,
            
            // Loan - 400, 404
            self::LOAN_001 => 404,
            self::LOAN_002 => 400,
            self::LOAN_003 => 400,
            self::LOAN_004 => 400,
            self::LOAN_005 => 400,
            self::LOAN_006 => 400,
            self::LOAN_007 => 400,
            self::LOAN_008 => 400,
            self::LOAN_009 => 400,
            self::LOAN_010 => 400,
            self::LOAN_011 => 500,
            self::LOAN_012 => 400,
            self::LOAN_013 => 400,
            self::LOAN_014 => 400,
            self::LOAN_015 => 400,
            self::LOAN_016 => 400,
            
            // Wallet - 400, 404
            self::WALLET_001 => 404,
            self::WALLET_002 => 400,
            self::WALLET_003 => 400,
            self::WALLET_004 => 500,
            self::WALLET_005 => 400,
            self::WALLET_006 => 400,
            self::WALLET_007 => 400,
            self::WALLET_008 => 500,
            self::WALLET_009 => 400,
            self::WALLET_010 => 403,
            
            // Escrow
            self::ESCROW_001 => 404,
            self::ESCROW_002 => 400,
            self::ESCROW_003 => 400,
            self::ESCROW_004 => 400,
            self::ESCROW_005 => 400,
            self::ESCROW_006 => 400,
            self::ESCROW_007 => 400,
            self::ESCROW_008 => 400,
            
            // Collateral
            self::COLLATERAL_001 => 404,
            self::COLLATERAL_002 => 400,
            self::COLLATERAL_003 => 400,
            self::COLLATERAL_004 => 400,
            self::COLLATERAL_005 => 500,
            self::COLLATERAL_006 => 400,
            
            // Risk
            self::RISK_001 => 400,
            self::RISK_002 => 400,
            self::RISK_003 => 400,
            self::RISK_004 => 400,
            self::RISK_005 => 400,
            self::RISK_006 => 400,
            
            // Blockchain
            self::BLOCKCHAIN_001 => 500,
            self::BLOCKCHAIN_002 => 400,
            self::BLOCKCHAIN_003 => 500,
            self::BLOCKCHAIN_004 => 503,
            self::BLOCKCHAIN_005 => 400,
            self::BLOCKCHAIN_006 => 504,
            
            // General
            self::GEN_001 => 400,
            self::GEN_002 => 400,
            self::GEN_003 => 404,
            self::GEN_004 => 405,
            self::GEN_005 => 500,
            self::GEN_006 => 503,
            self::GEN_007 => 500,
            self::GEN_008 => 500,
            self::GEN_009 => 429,
            self::GEN_010 => 503,
            
            // Admin
            self::ADMIN_001 => 400,
            self::ADMIN_002 => 403,
            self::ADMIN_003 => 500,
            self::ADMIN_004 => 500,
        );
        
        return isset($httpStatuses[$code]) ? $httpStatuses[$code] : 500;
    }
}
