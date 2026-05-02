-- Performance Optimization Migrations
-- Addresses Gap Analysis: PERF-001, PERF-003
-- Generated: March 2026

-- ============================================================
-- PERF-001: Add composite index on loan_fundings (lender_id, status)
-- ============================================================

-- Check if loan_fundings table exists
CREATE TABLE IF NOT EXISTS loan_fundings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    lender_id INT NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    status ENUM('pending', 'active', 'completed', 'defaulted', 'cancelled') DEFAULT 'pending',
    funded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_loan_id (loan_id),
    INDEX idx_lender_id (lender_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add composite index for lender status queries (addresses PERF-001)
ALTER TABLE loan_fundings 
ADD INDEX idx_lender_status (lender_id, status);

-- Add index for loan status queries
ALTER TABLE loan_fundings 
ADD INDEX idx_loan_status (loan_id, status);

-- ============================================================
-- PERF-003: Add indexes for eager loading optimization
-- ============================================================

-- Index for loan repayment queries (reduces N+1)
CREATE TABLE IF NOT EXISTS loan_repayments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    borrower_id INT NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    principal DECIMAL(20, 8) NOT NULL,
    interest DECIMAL(20, 8) NOT NULL,
    payment_date DATE NOT NULL,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
    transaction_hash VARCHAR(66) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_loan_id (loan_id),
    INDEX idx_borrower_id (borrower_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_loan_payment (loan_id, payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for loan_collateral joins
CREATE TABLE IF NOT EXISTS loan_collaterals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    collateral_type VARCHAR(50) NOT NULL,
    collateral_value DECIMAL(20, 2) NOT NULL,
    status ENUM('pending', 'verified', 'rejected', 'released') DEFAULT 'pending',
    verification_notes TEXT NULL,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_loan_id (loan_id),
    INDEX idx_status (status),
    INDEX idx_loan_status (loan_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Additional performance indexes for marketplace queries
-- ============================================================

-- Index for loan_requests marketplace queries
CREATE TABLE IF NOT EXISTS loan_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    borrower_id INT NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    duration_months INT NOT NULL,
    status ENUM('pending', 'active', 'funded', 'rejected', 'cancelled', 'defaulted') DEFAULT 'pending',
    funded_amount DECIMAL(20, 2) DEFAULT 0,
    tokenized BOOLEAN DEFAULT FALSE,
    risk_rating VARCHAR(5) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_borrower_status (borrower_id, status),
    INDEX idx_status_active (status, created_at),
    INDEX idx_risk_rating (risk_rating),
    INDEX idx_tokenized (tokenized),
    INDEX idx_funded_amount (funded_amount, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for blockchain event logs archival
CREATE TABLE IF NOT EXISTS blockchain_event_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    loan_id INT NULL,
    lender_id INT NULL,
    borrower_id INT NULL,
    amount DECIMAL(20, 8) NULL,
    status VARCHAR(20) NULL,
    event_data JSON NULL,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_transaction_hash (transaction_hash),
    INDEX idx_block_number (block_number),
    INDEX idx_loan_id (loan_id),
    INDEX idx_indexed_at (indexed_at),
    INDEX idx_event_loan (event_type, loan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Composite indexes for common query patterns
-- ============================================================

-- For dashboard queries: lender's active investments
ALTER TABLE loan_fundings
ADD INDEX idx_lender_active (lender_id, status, funded_at);

-- For marketplace: active loans sorted by date
ALTER TABLE loan_requests
ADD INDEX idx_marketplace (status, created_at DESC);

-- For analytics: loans by risk rating and status
ALTER TABLE loan_requests
ADD INDEX idx_risk_status (risk_rating, status);

-- ============================================================
-- Foreign key constraints (for data integrity)
-- ============================================================

ALTER TABLE loan_fundings
ADD CONSTRAINT fk_loan_fundings_loan 
FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE;

ALTER TABLE loan_fundings
ADD CONSTRAINT fk_loan_fundings_lender 
FOREIGN KEY (lender_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE loan_repayments
ADD CONSTRAINT fk_loan_repayments_loan 
FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE;

ALTER TABLE loan_collaterals
ADD CONSTRAINT fk_loan_collaterals_loan 
FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE;

-- ============================================================
-- Note: Run these migrations in order
-- 1. Create tables if they don't exist
-- 2. Add indexes to existing tables
-- 3. Add foreign key constraints
-- ============================================================
