-- Migration: Add rate adjustments table and escrow auto-release functionality
-- Version: 014
-- Date: 2026-03-19
-- Description: Addresses UX-02 (rate adjustment backend) and Escrow features

-- ============================================================
-- UX-02: Rate Adjustments Table
-- ============================================================

-- Create loan rate adjustments table
CREATE TABLE IF NOT EXISTS loan_rate_adjustments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id INT UNSIGNED NOT NULL,
    old_rate INT UNSIGNED NOT NULL COMMENT 'Interest rate in basis points',
    new_rate INT UNSIGNED NOT NULL COMMENT 'New interest rate in basis points',
    adjusted_by INT UNSIGNED NOT NULL,
    ip_address VARCHAR(45),
    reason VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_loan_id (loan_id),
    INDEX idx_adjusted_by (adjusted_by),
    INDEX idx_created (created_at),
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (adjusted_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add adjustment columns to loan_requests
ALTER TABLE loan_requests 
ADD COLUMN IF NOT EXISTS rate_adjustments_count INT UNSIGNED DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_rate_adjusted_at DATETIME,
ADD COLUMN IF NOT EXISTS rate_adjustment_deadline DATETIME;

-- ============================================================
-- ESCROW: Auto-release Timeout and Delivery Confirmation
-- ============================================================

-- Add auto-release timeout configuration to escrow_transactions
ALTER TABLE escrow_transactions 
ADD COLUMN IF NOT EXISTS auto_release_days INT UNSIGNED DEFAULT 14 COMMENT 'Days until auto-release',
ADD COLUMN IF NOT EXISTS auto_release_at DATETIME COMMENT 'Scheduled auto-release date',
ADD COLUMN IF NOT EXISTS delivery_confirmed_at DATETIME COMMENT 'Delivery confirmation timestamp',
ADD COLUMN IF NOT EXISTS delivery_proof_url VARCHAR(500) COMMENT 'URL to delivery proof',
ADD COLUMN IF NOT EXISTS delivery_notes TEXT COMMENT 'Delivery notes from seller';

-- Create escrow delivery confirmations table
CREATE TABLE IF NOT EXISTS escrow_delivery_confirmations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    escrow_transaction_id INT UNSIGNED NOT NULL,
    confirmed_by INT UNSIGNED NOT NULL COMMENT 'User who confirmed',
    confirmation_type ENUM('buyer', 'seller', 'system') DEFAULT 'buyer',
    proof_url VARCHAR(500),
    proof_type ENUM('photo', 'signature', 'document', 'auto') DEFAULT 'photo',
    notes TEXT,
    confirmed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    INDEX idx_escrow_id (escrow_transaction_id),
    INDEX idx_confirmed_by (confirmed_by),
    INDEX idx_confirmed_at (confirmed_at),
    FOREIGN KEY (escrow_transaction_id) REFERENCES escrow_transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add delivery status to escrow status history
ALTER TABLE escrow_status_history 
ADD COLUMN IF NOT EXISTS delivery_confirmation_id INT UNSIGNED;

-- ============================================================
-- FEE CONFIGURATION: Make fees configurable (not hardcoded)
-- ============================================================

-- Create fee configurations table
CREATE TABLE IF NOT EXISTS fee_configurations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fee_type VARCHAR(50) NOT NULL UNIQUE COMMENT 'e.g., origination_fee, late_fee, early_repayment_fee',
    fee_name VARCHAR(100) NOT NULL,
    fee_description TEXT,
    fee_amount DECIMAL(15,4) DEFAULT 0 COMMENT 'Fixed amount',
    fee_percentage DECIMAL(5,4) DEFAULT 0 COMMENT 'Percentage in decimal (0.02 = 2%)',
    fee_percentage_cap DECIMAL(15,4) DEFAULT 0 COMMENT 'Maximum fee for percentage-based fees',
    fee_percentage_floor DECIMAL(15,4) DEFAULT 0 COMMENT 'Minimum fee for percentage-based fees',
    is_active BOOLEAN DEFAULT TRUE,
    applies_to ENUM('borrower', 'lender', 'both') DEFAULT 'borrower',
    min_loan_amount DECIMAL(15,4) DEFAULT 0,
    max_loan_amount DECIMAL(15,4) DEFAULT 0,
    created_by INT UNSIGNED,
    approved_by INT UNSIGNED,
    effective_from DATETIME DEFAULT CURRENT_TIMESTAMP,
    effective_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fee_type (fee_type),
    INDEX idx_is_active (is_active),
    INDEX idx_effective (effective_from, effective_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default fee configurations
INSERT INTO fee_configurations (fee_type, fee_name, fee_amount, fee_percentage, fee_percentage_cap, is_active, applies_to) VALUES
('origination_fee', 'Loan Origination Fee', 0, 0.02, 500, TRUE, 'borrower'),
('late_fee', 'Late Payment Fee', 25, 0, 0, TRUE, 'borrower'),
('early_repayment_fee', 'Early Repayment Fee', 0, 0.005, 100, TRUE, 'borrower'),
('transfer_fee', 'Fund Transfer Fee', 10, 0, 0, FALSE, 'lender'),
('withdrawal_fee', 'Withdrawal Fee', 0, 0.001, 50, TRUE, 'lender'),
('escrow_fee', 'Escrow Service Fee', 0, 0.01, 100, TRUE, 'both');

-- ============================================================
-- Update loan_requests to reference fee configuration
-- ============================================================

ALTER TABLE loan_requests 
ADD COLUMN IF NOT EXISTS origination_fee_id INT UNSIGNED,
ADD FOREIGN KEY (origination_fee_id) REFERENCES fee_configurations(id);

-- ============================================================
-- Verification Queries
-- ============================================================

-- Verify rate adjustments table
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'loan_rate_adjustments';

-- Verify escrow tables
SELECT TABLE_NAME, COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'escrow_transactions' 
AND COLUMN_NAME IN ('auto_release_days', 'auto_release_at', 'delivery_confirmed_at', 'delivery_proof_url');

-- Verify fee configurations
SELECT * FROM fee_configurations WHERE is_active = TRUE;
