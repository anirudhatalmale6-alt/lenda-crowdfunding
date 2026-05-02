-- ============================================================
-- DATA INTEGRITY SCHEMA EXTENSIONS
-- Phase 9: Transaction Consistency, Ledger Balances, Token Ownership
-- ============================================================

-- ============================================================
-- IDEMPOTENCY KEYS (DATA-03)
-- Prevents duplicate API operations
-- ============================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    endpoint VARCHAR(100) NOT NULL,
    user_id BIGINT UNSIGNED,
    request_hash VARCHAR(64) NOT NULL,
    response_status INT,
    response_body JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_key_hash (key_hash),
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- OPTIMISTIC LOCKING (DATA-04)
-- Version control for concurrent operations
-- ============================================================

CREATE TABLE IF NOT EXISTS operation_locks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT UNSIGNED NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    lock_token VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP NULL,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_lock_token (lock_token),
    INDEX idx_expires (expires_at),
    UNIQUE KEY uk_entity_operation (entity_type, entity_id, operation_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DOUBLE-ENTRY LEDGER (DATA-05)
-- Ensures debits equal credits
-- ============================================================

CREATE TABLE IF NOT EXISTS ledger_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_id BIGINT UNSIGNED NOT NULL,
    entry_type ENUM('debit', 'credit') NOT NULL,
    account_type ENUM('wallet', 'loan', 'reserve', 'revenue', 'fee') NOT NULL,
    account_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    reference_type VARCHAR(50),
    reference_id BIGINT UNSIGNED,
    description VARCHAR(255),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified TINYINT(1) DEFAULT 0,
    verified_at TIMESTAMP NULL,
    INDEX idx_transaction (transaction_id),
    INDEX idx_account (account_type, account_id),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_verified (verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ledger verification status
CREATE TABLE IF NOT EXISTS ledger_verifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_id BIGINT UNSIGNED NOT NULL UNIQUE,
    total_debits DECIMAL(15, 2) NOT NULL,
    total_credits DECIMAL(15, 2) NOT NULL,
    is_balanced TINYINT(1) DEFAULT 0,
    discrepancy DECIMAL(15, 2) DEFAULT 0,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_transaction (transaction_id),
    INDEX idx_balanced (is_balanced)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- WALLET BALANCE RECONCILIATION (DATA-02, DATA-06)
-- Track all balance changes with audit trail
-- ============================================================

CREATE TABLE IF NOT EXISTS balance_adjustments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    wallet_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    adjustment_type ENUM('deposit', 'withdrawal', 'transfer', 'loan_funding', 'repayment', 'earning', 'fee', 'reconciliation', 'manual') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    balance_before DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT UNSIGNED,
    reason VARCHAR(255),
    is_auto TINYINT(1) DEFAULT 1,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_wallet (wallet_id),
    INDEX idx_user (user_id),
    INDEX idx_type (adjustment_type),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reconciliation tracking
CREATE TABLE IF NOT EXISTS reconciliation_snapshots (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    snapshot_type ENUM('daily', 'weekly', 'monthly', 'manual') NOT NULL,
    wallet_id BIGINT UNSIGNED,
    balance_before DECIMAL(15, 2),
    balance_after DECIMAL(15, 2),
    transaction_count INT DEFAULT 0,
    total_debits DECIMAL(15, 2) DEFAULT 0,
    total_credits DECIMAL(15, 2) DEFAULT 0,
    discrepancies_found INT DEFAULT 0,
    discrepancies_resolved INT DEFAULT 0,
    status ENUM('in_progress', 'completed', 'failed') DEFAULT 'in_progress',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    created_by BIGINT UNSIGNED,
    notes TEXT,
    INDEX idx_type (snapshot_type),
    INDEX idx_wallet (wallet_id),
    INDEX idx_status (status),
    INDEX idx_completed (completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TOKEN OWNERSHIP SYNC (DATA-08)
-- Track token holdings with blockchain sync
-- ============================================================

CREATE TABLE IF NOT EXISTS token_ownership_sync (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contract_id BIGINT UNSIGNED NOT NULL,
    holder_id BIGINT UNSIGNED NOT NULL,
    db_token_count DECIMAL(20, 0) DEFAULT 0,
    blockchain_token_count DECIMAL(20, 0) DEFAULT 0,
    last_sync_at TIMESTAMP NULL,
    last_verified_at TIMESTAMP NULL,
    sync_status ENUM('synced', 'pending', 'mismatch', 'error') DEFAULT 'synced',
    sync_errors JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES loan_token_contracts(id),
    FOREIGN KEY (holder_id) REFERENCES users(id),
    UNIQUE KEY uk_contract_holder_sync (contract_id, holder_id),
    INDEX idx_sync_status (sync_status),
    INDEX idx_last_sync (last_sync_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- OWNERSHIP HISTORY TRACKING (DATA-09)
-- Full history of token ownership changes
-- ============================================================

CREATE TABLE IF NOT EXISTS ownership_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contract_id BIGINT UNSIGNED NOT NULL,
    token_id BIGINT UNSIGNED,
    from_holder_id BIGINT UNSIGNED,
    to_holder_id BIGINT UNSIGNED NOT NULL,
    token_count DECIMAL(20, 0) NOT NULL,
    transfer_type ENUM('issuance', 'purchase', 'sale', 'transfer', 'distribution', 'refinancing', 'liquidation', 'sync_correction') NOT NULL,
    tx_hash VARCHAR(100),
    db_recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blockchain_timestamp TIMESTAMP NULL,
    verification_status ENUM('verified', 'pending', 'failed') DEFAULT 'verified',
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES loan_token_contracts(id),
    FOREIGN KEY (from_holder_id) REFERENCES users(id),
    FOREIGN KEY (to_holder_id) REFERENCES users(id),
    INDEX idx_contract (contract_id),
    INDEX idx_from_holder (from_holder_id),
    INDEX idx_to_holder (to_holder_id),
    INDEX idx_transfer_type (transfer_type),
    INDEX idx_created (created_at),
    INDEX idx_verification (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Add version column to loan_requests for optimistic locking (DATA-04)
-- ============================================================

ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS version INT UNSIGNED DEFAULT 0 AFTER status;
ALTER TABLE loan_fundings ADD COLUMN IF NOT EXISTS version INT UNSIGNED DEFAULT 0 AFTER status;
ALTER TABLE wallet_accounts ADD COLUMN IF NOT EXISTS version INT UNSIGNED DEFAULT 0 AFTER balance;

-- ============================================================
-- Add idempotency key support to wallet_transactions
-- ============================================================

ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) AFTER reference;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS related_entry_id BIGINT UNSIGNED AFTER reference_id;
ALTER TABLE wallet_transactions ADD INDEX IF NOT EXISTS idx_idempotency (idempotency_key);

-- ============================================================
-- Add reconciliation status to wallet_accounts
-- ============================================================

ALTER TABLE wallet_accounts ADD COLUMN IF NOT EXISTS last_reconciled_at TIMESTAMP NULL AFTER version;
ALTER TABLE wallet_accounts ADD COLUMN IF NOT EXISTS reconciliation_status ENUM('ok', 'pending', 'mismatch') DEFAULT 'ok' AFTER last_reconciled_at;

-- ============================================================
-- Add sync tracking columns to token_holdings
-- ============================================================

ALTER TABLE token_holdings ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP NULL AFTER current_value;
ALTER TABLE token_holdings ADD COLUMN IF NOT EXISTS sync_version INT UNSIGNED DEFAULT 0 AFTER last_synced_at;

-- ============================================================
-- Add required columns to loan_fundings for transaction consistency
-- ============================================================

ALTER TABLE loan_fundings ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) AFTER earned_amount;
ALTER TABLE loan_fundings ADD COLUMN IF NOT EXISTS ledger_transaction_id BIGINT UNSIGNED AFTER idempotency_key;
ALTER TABLE loan_fundings ADD INDEX IF NOT EXISTS idx_loan_funding_idempotency (idempotency_key);
