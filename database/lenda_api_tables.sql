-- LENDA API Additional Database Tables
-- These tables work alongside the existing CakePHP users table

-- Add API-specific columns to users if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled TINYINT(1) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at DATETIME;

-- Loan Requests Table
-- ARCH-04: Consolidated from lenda_schema.sql and lenda_api_tables.sql
CREATE TABLE IF NOT EXISTS loan_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    borrower_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    loan_amount DECIMAL(15, 2) NOT NULL,
    net_amount DECIMAL(15, 2) DEFAULT 0 COMMENT 'Amount after origination fee deduction',
    origination_fee DECIMAL(15, 2) DEFAULT 0 COMMENT 'Origination fee deducted from loan',
    interest_rate DECIMAL(5, 2) NOT NULL,
    duration_months INT NOT NULL,
    repayment_schedule VARCHAR(20) DEFAULT 'monthly',
    status VARCHAR(20) DEFAULT 'requested',
    risk_score DECIMAL(5, 2),
    ltv_ratio DECIMAL(5, 2),
    collateral_id BIGINT UNSIGNED,
    funded_amount DECIMAL(15, 2) DEFAULT 0,
    funder_count INT DEFAULT 0,
    version INT UNSIGNED DEFAULT 0 COMMENT 'Optimistic locking',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    funded_at DATETIME,
    fully_funded_at DATETIME,
    repaid_at DATETIME,
    defaulted_at DATETIME,
    INDEX idx_borrower (borrower_id),
    INDEX idx_status (status),
    INDEX idx_risk_score (risk_score),
    INDEX idx_created (created_at),
    INDEX idx_origination_fee (origination_fee)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Loan Fundings Table
CREATE TABLE IF NOT EXISTS loan_fundings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    lender_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    earned_amount DECIMAL(15, 2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_loan (loan_id),
    INDEX idx_lender (lender_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Repayments Table
CREATE TABLE IF NOT EXISTS repayments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    borrower_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    principal DECIMAL(15, 2) NOT NULL,
    interest DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    due_date DATE NOT NULL,
    paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_loan (loan_id),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Collateral Assets Table
CREATE TABLE IF NOT EXISTS collateral_assets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    borrower_id BIGINT UNSIGNED NOT NULL,
    loan_id BIGINT UNSIGNED,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    estimated_value DECIMAL(15, 2) NOT NULL,
    market_value DECIMAL(15, 2) DEFAULT 0,
    verification_status VARCHAR(20) DEFAULT 'pending',
    storage_location VARCHAR(255),
    location VARCHAR(255),
    storage_status VARCHAR(20) DEFAULT 'with_borrower',
    documents JSON,
    images JSON,
    valuation_status VARCHAR(20) DEFAULT 'pending',
    valuation_date DATE,
    appraiser VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    verified_at DATETIME,
    verified_by BIGINT UNSIGNED,
    rejection_reason TEXT,
    INDEX idx_borrower (borrower_id),
    INDEX idx_loan (loan_id),
    INDEX idx_type (type),
    INDEX idx_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wallet Accounts Table
CREATE TABLE IF NOT EXISTS wallet_accounts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type VARCHAR(20) DEFAULT 'main',
    currency VARCHAR(10) DEFAULT 'NGN',
    balance DECIMAL(15, 2) DEFAULT 0,
    frozen_balance DECIMAL(15, 2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_type (user_id, type),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    wallet_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    recipient_id BIGINT UNSIGNED,
    type VARCHAR(30) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    fee DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    reference VARCHAR(50),
    reference_type VARCHAR(50),
    reference_id BIGINT UNSIGNED,
    description VARCHAR(255),
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    INDEX idx_wallet (wallet_id),
    INDEX idx_user (user_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Escrow Transactions Table
CREATE TABLE IF NOT EXISTS escrow_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_code VARCHAR(50) NOT NULL UNIQUE,
    buyer_id BIGINT UNSIGNED NOT NULL,
    seller_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    shipping_fee DECIMAL(15, 2) DEFAULT 0,
    platform_fee DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'created',
    description TEXT,
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    delivery_proof JSON,
    dispute_reason TEXT,
    dispute_filed_by BIGINT UNSIGNED,
    disputed_at DATETIME,
    dispute_resolution VARCHAR(20),
    resolution_notes TEXT,
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    funded_at DATETIME,
    shipped_at DATETIME,
    delivered_at DATETIME,
    confirmed_at DATETIME,
    released_at DATETIME,
    refunded_at DATETIME,
    INDEX idx_transaction_code (transaction_code),
    INDEX idx_buyer (buyer_id),
    INDEX idx_seller (seller_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recovery Items Table
CREATE TABLE IF NOT EXISTS recovery_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    collateral_id BIGINT UNSIGNED NOT NULL,
    loan_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    market_value DECIMAL(15, 2) NOT NULL,
    starting_price DECIMAL(15, 2),
    current_price DECIMAL(15, 2),
    status VARCHAR(20) DEFAULT 'active',
    buy_now_price DECIMAL(15, 2),
    auction_end_at DATETIME,
    listing_date DATE DEFAULT (CURRENT_DATE),
    sold_at DATETIME,
    sold_to BIGINT UNSIGNED,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_price (current_price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recovery Bids Table
CREATE TABLE IF NOT EXISTS recovery_bids (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_id BIGINT UNSIGNED NOT NULL,
    bidder_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_item (item_id),
    INDEX idx_bidder (bidder_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Risk Scores Table
CREATE TABLE IF NOT EXISTS risk_scores (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    overall_score DECIMAL(5, 2) NOT NULL,
    repayment_history_score DECIMAL(5, 2),
    collateral_strength_score DECIMAL(5, 2),
    income_verification_score DECIMAL(5, 2),
    credit_score INT,
    platform_reputation_score DECIMAL(5, 2),
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_score (overall_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reserve Fund Table
CREATE TABLE IF NOT EXISTS reserve_fund (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    balance DECIMAL(15, 2) DEFAULT 0,
    locked_balance DECIMAL(15, 2) DEFAULT 0,
    total_claims_paid DECIMAL(15, 2) DEFAULT 0,
    total_replenished DECIMAL(15, 2) DEFAULT 0,
    coverage_ratio DECIMAL(5, 2) DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reserve Fund Transactions Table
CREATE TABLE IF NOT EXISTS reserve_fund_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(30) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    loan_id BIGINT UNSIGNED,
    description VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_loan (loan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSON,
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Smart Contracts Table
CREATE TABLE IF NOT EXISTS smart_contracts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contract_type VARCHAR(30) NOT NULL,
    contract_address VARCHAR(100) NOT NULL UNIQUE,
    network VARCHAR(50) NOT NULL,
    loan_id BIGINT UNSIGNED,
    status VARCHAR(20) DEFAULT 'deployed',
    deployed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    INDEX idx_type (contract_type),
    INDEX idx_address (contract_address),
    INDEX idx_network (network)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id BIGINT UNSIGNED,
    old_value JSON,
    new_value JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default data
-- FIN-02: Default value - in production use SecurityConfig::getReserveFundMinimum()
INSERT IGNORE INTO reserve_fund (id, balance, locked_balance, coverage_ratio) VALUES (1, 100000.00, 0, 25.00);
