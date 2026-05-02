-- Migration: Add version fields for optimistic locking and composite indexes
-- Version: 013
-- Date: 2026-03-19
-- Description: Addresses ARCH-06 (missing version fields) and ARCH-07 (composite indexes)

-- ============================================================
-- ARCH-06: Add version fields for optimistic locking
-- ============================================================

-- Add version field to loan_requests table
ALTER TABLE loan_requests 
ADD COLUMN IF NOT EXISTS version INT UNSIGNED DEFAULT 0 AFTER status;

-- Add version field to loan_fundings table
ALTER TABLE loan_fundings 
ADD COLUMN IF NOT EXISTS version INT UNSIGNED DEFAULT 0 AFTER status;

-- Add version field to repayments table
ALTER TABLE repayments 
ADD COLUMN IF NOT EXISTS version INT UNSIGNED DEFAULT 0 AFTER status;

-- Add version field to wallet_accounts table
ALTER TABLE wallet_accounts 
ADD COLUMN IF NOT EXISTS version INT UNSIGNED DEFAULT 0 AFTER balance;

-- Add version field to wallet_transactions table
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS version INT UNSIGNED DEFAULT 0 AFTER status;

-- Add version field to collateral_assets table
ALTER TABLE collateral_assets 
ADD COLUMN IF NOT EXISTS version INT UNSIGNED DEFAULT 0 AFTER verification_status;

-- Add version field to reserve_funds table
ALTER TABLE reserve_funds 
ADD COLUMN IF NOT EXISTS version INT UNSIGNED DEFAULT 0 AFTER balance;

-- Add version field to reserve_fund_transactions table
ALTER TABLE reserve_fund_transactions 
ADD COLUMN IF NOT EXISTS version INT UNSIGNED DEFAULT 0 AFTER type;

-- Add version field to escrow_transactions table
ALTER TABLE escrow_transactions 
ADD COLUMN IF NOT EXISTS version INT UNSIGNED DEFAULT 0 AFTER status;

-- ============================================================
-- ARCH-07: Add composite indexes for common query patterns
-- ============================================================

-- Composite index for loan status filtering with date range
CREATE INDEX IF NOT EXISTS idx_loan_requests_status_created 
ON loan_requests (status, created_at DESC);

-- Composite index for borrower loans with status
CREATE INDEX IF NOT EXISTS idx_loan_requests_borrower_status 
ON loan_requests (borrower_id, status);

-- Composite index for lender funded loans
CREATE INDEX IF NOT EXISTS idx_loan_fundings_lender_status 
ON loan_fundings (lender_id, status);

-- Composite index for loan funding lookup
CREATE INDEX IF NOT EXISTS idx_loan_fundings_loan_lender 
ON loan_fundings (loan_id, lender_id);

-- Composite index for repayment lookups
CREATE INDEX IF NOT EXISTS idx_repayments_loan_status 
ON repayments (loan_id, status);

-- Composite index for collateral by owner
CREATE INDEX IF NOT EXISTS idx_collateral_assets_owner_status 
ON collateral_assets (borrower_id, verification_status);

-- Composite index for wallet transactions by wallet
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_type 
ON wallet_transactions (wallet_id, type);

-- Composite index for wallet transactions by user
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_type 
ON wallet_transactions (user_id, type, created_at DESC);

-- Composite index for reserve fund transactions
CREATE INDEX IF NOT EXISTS idx_reserve_fund_transactions_type_date 
ON reserve_fund_transactions (type, created_at DESC);

-- Composite index for escrow by buyer
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_buyer_status 
ON escrow_transactions (buyer_id, status);

-- Composite index for escrow by seller
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_seller_status 
ON escrow_transactions (seller_id, status);

-- Composite index for risk profiles by user
CREATE INDEX IF NOT EXISTS idx_borrower_risk_profile_user 
ON borrower_risk_profiles (user_id, last_calculated_at DESC);

-- Composite index for loan risk status
CREATE INDEX IF NOT EXISTS idx_loan_risk_status_risk 
ON loan_risk_status (risk_status, default_probability DESC);

-- Composite index for default workflow by loan
CREATE INDEX IF NOT EXISTS idx_default_workflow_loan_status 
ON default_workflows (loan_id, status);

-- Composite index for token holdings
CREATE INDEX IF NOT EXISTS idx_loan_token_holdings_token_owner 
ON loan_token_holdings (token_id, owner_id);

-- Composite index for discovery engine
CREATE INDEX IF NOT EXISTS idx_discovery_recommendations_user_score 
ON discovery_recommendations (user_id, relevance_score DESC);

-- Composite index for accelerator logs
CREATE INDEX IF NOT EXISTS idx_accelerator_logs_loan_stage 
ON accelerator_logs (loan_id, stage_triggered);

-- ============================================================
-- ARCH-05: Add blockchain sync tracking
-- ============================================================

-- Add blockchain sync status table
CREATE TABLE IF NOT EXISTS blockchain_sync_log (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT UNSIGNED NOT NULL,
    blockchain_id VARCHAR(100),
    operation VARCHAR(20) NOT NULL,
    status ENUM('pending', 'confirmed', 'failed') DEFAULT 'pending',
    tx_hash VARCHAR(100),
    confirmed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at),
    INDEX idx_tx_hash (tx_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add sync status columns to key tables
ALTER TABLE loan_requests 
ADD COLUMN IF NOT EXISTS blockchain_synced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(100),
ADD COLUMN IF NOT EXISTS blockchain_confirmed_at DATETIME;

ALTER TABLE loan_fundings 
ADD COLUMN IF NOT EXISTS blockchain_synced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(100);

ALTER TABLE repayments 
ADD COLUMN IF NOT EXISTS blockchain_synced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(100);

-- ============================================================
-- Add unique constraint for idempotency
-- ============================================================

ALTER TABLE loan_fundings 
ADD CONSTRAINT IF NOT EXISTS uk_idempotency_key 
UNIQUE (idempotency_key);

ALTER TABLE wallet_transactions 
ADD CONSTRAINT IF NOT EXISTS uk_wallet_idempotency 
UNIQUE (idempotency_key);

-- ============================================================
-- Verification query
-- ============================================================

-- Verify version columns were added
SELECT TABLE_NAME, COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND COLUMN_NAME = 'version'
AND TABLE_NAME IN ('loan_requests', 'loan_fundings', 'repayments', 
                   'wallet_accounts', 'wallet_transactions', 
                   'collateral_assets', 'reserve_funds', 
                   'reserve_fund_transactions', 'escrow_transactions');

-- Verify composite indexes
SELECT INDEX_NAME, TABLE_NAME, COLUMN_NAME, SEQ_IN_INDEX 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND INDEX_NAME LIKE 'idx_%'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
