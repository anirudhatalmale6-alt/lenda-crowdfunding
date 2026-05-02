-- LENDA P2P Lending Platform Database Schema
-- PostgreSQL / MySQL Compatible

-- ============================================================
-- USERS & AUTHENTICATION
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'borrower', 'lender', 'both') DEFAULT 'lender',
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    wallet_address VARCHAR(100),
    kyc_status ENUM('none', 'pending', 'approved', 'rejected') DEFAULT 'none',
    kyc_documents JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Borrower Profiles
CREATE TABLE IF NOT EXISTS borrower_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    business_name VARCHAR(255),
    business_type VARCHAR(100),
    registration_number VARCHAR(100),
    annual_revenue DECIMAL(15, 2),
    credit_score INT,
    income_verified BOOLEAN DEFAULT FALSE,
    risk_score DECIMAL(5, 2),
    total_borrowed DECIMAL(15, 2) DEFAULT 0,
    total_repaid DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lender Profiles
CREATE TABLE IF NOT EXISTS lender_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    total_invested DECIMAL(15, 2) DEFAULT 0,
    total_earned DECIMAL(15, 2) DEFAULT 0,
    preferred_min_rate DECIMAL(5, 2) DEFAULT 0,
    preferred_max_rate DECIMAL(5, 2) DEFAULT 30,
    preferred_min_amount DECIMAL(15, 2) DEFAULT 1000,
    preferred_max_amount DECIMAL(15, 2) DEFAULT 100000,
    preferred_duration_months JSON,
    risk_tolerance ENUM('low', 'medium', 'high') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- LOAN MANAGEMENT
-- ============================================================

-- Loan Requests
-- ARCH-04: Consolidated schema - now includes FIN-01 origination fee fields
CREATE TABLE IF NOT EXISTS loan_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    borrower_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    loan_amount DECIMAL(15, 2) NOT NULL,
    net_amount DECIMAL(15, 2) DEFAULT 0 COMMENT 'Amount after origination fee deduction',
    origination_fee DECIMAL(15, 2) DEFAULT 0 COMMENT 'Origination fee deducted from loan (FIN-01)',
    interest_rate DECIMAL(5, 2) NOT NULL,
    duration_months INT NOT NULL,
    repayment_schedule ENUM('monthly', 'weekly', 'daily') DEFAULT 'monthly',
    status ENUM('draft', 'requested', 'approved', 'rejected', 'funded', 'active', 'repaid', 'defaulted', 'platform_settled') DEFAULT 'requested',
    risk_score DECIMAL(5, 2),
    ltv_ratio DECIMAL(5, 2),
    collateral_id BIGINT UNSIGNED,
    funded_amount DECIMAL(15, 2) DEFAULT 0,
    funder_count INT DEFAULT 0,
    version INT UNSIGNED DEFAULT 0, -- Optimistic locking (ARCH-04)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    funded_at TIMESTAMP,
    fully_funded_at TIMESTAMP,
    repaid_at TIMESTAMP,
    defaulted_at TIMESTAMP,
    FOREIGN KEY (borrower_id) REFERENCES users(id),
    INDEX idx_borrower (borrower_id),
    INDEX idx_status (status),
    INDEX idx_risk_score (risk_score),
    INDEX idx_created (created_at),
    INDEX idx_status_created (status, created_at),
    INDEX idx_borrower_status (borrower_id, status),
    INDEX idx_origination_fee (origination_fee)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Loan Fundings (Lender investments in loans)
CREATE TABLE IF NOT EXISTS loan_fundings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    lender_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    status ENUM('pending', 'active', 'repaid', 'defaulted', 'settled') DEFAULT 'pending',
    earned_amount DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (lender_id) REFERENCES users(id),
    INDEX idx_loan (loan_id),
    INDEX idx_lender (lender_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Repayments
CREATE TABLE IF NOT EXISTS repayments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    borrower_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    principal DECIMAL(15, 2) NOT NULL,
    interest DECIMAL(15, 2) NOT NULL,
    status ENUM('pending', 'paid', 'late', 'defaulted') DEFAULT 'pending',
    due_date DATE NOT NULL,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (borrower_id) REFERENCES users(id),
    INDEX idx_loan (loan_id),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- COLLATERAL MANAGEMENT
-- ============================================================

-- Collateral Assets
CREATE TABLE IF NOT EXISTS collateral_assets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    borrower_id BIGINT UNSIGNED NOT NULL,
    loan_id BIGINT UNSIGNED,
    type ENUM('real_estate', 'vehicle', 'equipment', 'jewelry', 'stocks', 'other') NOT NULL,
    description TEXT,
    estimated_value DECIMAL(15, 2) NOT NULL,
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    storage_location VARCHAR(255),
    storage_status ENUM('with_borrower', 'in_storage', 'released') DEFAULT 'with_borrower',
    documents JSON,
    images JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    FOREIGN KEY (borrower_id) REFERENCES users(id),
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id),
    INDEX idx_borrower (borrower_id),
    INDEX idx_loan (loan_id),
    INDEX idx_type (type),
    INDEX idx_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RECOVERY MARKETPLACE
-- ============================================================

-- Recovery Items
CREATE TABLE IF NOT EXISTS recovery_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    collateral_id BIGINT UNSIGNED NOT NULL,
    loan_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('vehicle', 'property', 'equipment', 'jewelry', 'other') NOT NULL,
    market_value DECIMAL(15, 2) NOT NULL,
    starting_price DECIMAL(15, 2),
    current_price DECIMAL(15, 2),
    status ENUM('active', 'auction', 'sold', 'negotiation', 'removed') DEFAULT 'active',
    buy_now_price DECIMAL(15, 2),
    auction_end_at TIMESTAMP,
    listing_date DATE DEFAULT (CURRENT_DATE),
    sold_at TIMESTAMP,
    sold_to BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (collateral_id) REFERENCES collateral_assets(id),
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id),
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_price (current_price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recovery Bids
CREATE TABLE IF NOT EXISTS recovery_bids (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_id BIGINT UNSIGNED NOT NULL,
    bidder_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    status ENUM('active', 'winning', 'outbid', 'won', 'lost') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES recovery_items(id),
    FOREIGN KEY (bidder_id) REFERENCES users(id),
    INDEX idx_item (item_id),
    INDEX idx_bidder (bidder_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- WALLET & TRANSACTIONS
-- ============================================================

-- Wallet Accounts
CREATE TABLE IF NOT EXISTS wallet_accounts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type ENUM('main', 'escrow', 'investment') DEFAULT 'main',
    currency VARCHAR(10) DEFAULT 'USD',
    balance DECIMAL(15, 2) DEFAULT 0,
    locked_balance DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY uk_user_type (user_id, type),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wallet Transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    wallet_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    type ENUM('deposit', 'withdrawal', 'transfer', 'loan_funding', 'repayment', 'earning', 'escrow_hold', 'escrow_release', 'escrow_refund') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    fee DECIMAL(15, 2) DEFAULT 0,
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    reference_type VARCHAR(50),
    reference_id BIGINT UNSIGNED,
    description VARCHAR(255),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES wallet_accounts(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_wallet (wallet_id),
    INDEX idx_user (user_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ESCROW SERVICE
-- ============================================================

-- Escrow Transactions
CREATE TABLE IF NOT EXISTS escrow_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_code VARCHAR(50) NOT NULL UNIQUE,
    buyer_id BIGINT UNSIGNED NOT NULL,
    seller_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    shipping_fee DECIMAL(15, 2) DEFAULT 0,
    platform_fee DECIMAL(15, 2) DEFAULT 0,
    status ENUM('created', 'funded', 'shipped', 'delivered', 'disputed', 'released', 'refunded', 'cancelled') DEFAULT 'created',
    description TEXT,
    tracking_number VARCHAR(100),
    shipping_carrier VARCHAR(100),
    delivery_proof JSON,
    dispute_reason TEXT,
    dispute_resolution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    funded_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    released_at TIMESTAMP,
    refunded_at TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id),
    FOREIGN KEY (seller_id) REFERENCES users(id),
    INDEX idx_transaction_code (transaction_code),
    INDEX idx_buyer (buyer_id),
    INDEX idx_seller (seller_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RISK & SCORING
-- ============================================================

-- Risk Scores
CREATE TABLE IF NOT EXISTS risk_scores (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    overall_score DECIMAL(5, 2) NOT NULL,
    repayment_history_score DECIMAL(5, 2),
    collateral_strength_score DECIMAL(5, 2),
    income_verification_score DECIMAL(5, 2),
    credit_score INT,
    platform_reputation_score DECIMAL(5, 2),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user (user_id),
    INDEX idx_score (overall_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RESERVE FUND (LENDA GUARANTEE)
-- ============================================================

-- Reserve Fund
CREATE TABLE IF NOT EXISTS reserve_fund (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    balance DECIMAL(15, 2) DEFAULT 0,
    locked_balance DECIMAL(15, 2) DEFAULT 0,
    total_claims_paid DECIMAL(15, 2) DEFAULT 0,
    total_replenished DECIMAL(15, 2) DEFAULT 0,
    coverage_ratio DECIMAL(5, 2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reserve Fund Transactions
CREATE TABLE IF NOT EXISTS reserve_fund_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type ENUM('claim_paid', 'replenishment', 'fee_income', 'investment_income') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    loan_id BIGINT UNSIGNED,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_loan (loan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ADMIN & AUDIT
-- ============================================================

-- Audit Log
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SMART CONTRACTS (Off-chain Reference)
-- ============================================================

-- Smart Contract Records
CREATE TABLE IF NOT EXISTS smart_contracts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contract_type ENUM('loan', 'escrow', 'collateral') NOT NULL,
    contract_address VARCHAR(100) NOT NULL UNIQUE,
    network VARCHAR(50) NOT NULL,
    loan_id BIGINT UNSIGNED,
    status ENUM('deployed', 'active', 'completed', 'terminated') DEFAULT 'deployed',
    deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id),
    INDEX idx_type (contract_type),
    INDEX idx_address (contract_address),
    INDEX idx_network (network)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blockchain Event Logs (for sync tracking)
CREATE TABLE IF NOT EXISTS blockchain_event_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contract_type VARCHAR(50) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    block_number BIGINT UNSIGNED NOT NULL,
    transaction_hash VARCHAR(100) NOT NULL,
    log_index INT UNSIGNED DEFAULT 0,
    event_data JSON,
    processing_result JSON,
    processed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_contract_event (contract_type, event_name),
    INDEX idx_block (block_number),
    INDEX idx_tx_hash (transaction_hash),
    INDEX idx_processed (processed),
    UNIQUE KEY uk_event_unique (transaction_hash, log_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INITIAL DATA
-- ============================================================

-- Event Queue Table for EventBus
CREATE TABLE IF NOT EXISTS event_queues (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_payload TEXT NOT NULL,
    priority INT DEFAULT 5,
    status ENUM('pending', 'processing', 'completed', 'failed', 'retry') DEFAULT 'pending',
    scheduled_at TIMESTAMP NULL,
    max_retries INT DEFAULT 3,
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_event_type (event_type),
    INDEX idx_priority (priority),
    INDEX idx_scheduled_at (scheduled_at),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize Reserve Fund
-- FIN-02: Default value - in production use SecurityConfig::getReserveFundMinimum()
INSERT INTO reserve_fund (balance, locked_balance, coverage_ratio) 
VALUES (100000.00, 0, 25.00);

-- Create default admin user - DO NOT include in production!
-- Admin creation should be done via secure first-run setup or migration
-- See: app/Console/Command/AdminSetupShell.php
-- This placeholder ensures the table structure exists

-- ============================================================
-- TOKENIZED LOANS (ARCH-05 - Missing tokenization table)
-- ============================================================

CREATE TABLE IF NOT EXISTS loan_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    investor_id BIGINT UNSIGNED NOT NULL,
    token_percentage DECIMAL(8, 4) NOT NULL,
    purchase_price DECIMAL(15, 2) NOT NULL,
    status ENUM('active', 'sold', 'transferred', 'redeemed') DEFAULT 'active',
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id),
    FOREIGN KEY (investor_id) REFERENCES users(id),
    INDEX idx_loan (loan_id),
    INDEX idx_investor (investor_id),
    INDEX idx_status (status),
    INDEX idx_loan_investor (loan_id, investor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- COMPOSITE INDEXES FOR PERFORMANCE (ARCH-05)
-- ============================================================

-- Loan marketplace queries
CREATE INDEX idx_marketplace_active ON loan_requests(status, created_at);
CREATE INDEX idx_marketplace_risk ON loan_requests(status, risk_score);
CREATE INDEX idx_marketplace_funded ON loan_requests(status, funded_amount);

-- Investor portfolio queries
CREATE INDEX idx_portfolio_investor ON loan_tokens(investor_id, status);
CREATE INDEX idx_portfolio_loan ON loan_tokens(loan_id, investor_id);

-- Repayment schedule queries
CREATE INDEX idx_repayment_loan ON repayments(loan_id, due_date);
CREATE INDEX idx_repayment_status ON repayments(status, due_date);

-- User activity queries
CREATE INDEX idx_user_activity ON user_activities(user_id, created_at);
CREATE INDEX idx_user_activity_type ON user_activities(user_id, activity_type);

-- Transaction queries
CREATE INDEX idx_wallet_transaction ON wallet_transactions(wallet_id, created_at);
CREATE INDEX idx_wallet_type ON wallet_transactions(type, status);

-- Audit trail queries
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at);
