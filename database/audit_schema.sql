-- ============================================================
-- Audit and Double-Entry Bookkeeping Schema
-- 
-- FIN-15: Double-entry bookkeeping verification
-- FIN-17: Audit trail for balance changes
-- ============================================================

-- Audit Transactions Table
-- Stores all double-entry transactions for audit trail
CREATE TABLE IF NOT EXISTS audit_transactions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(255) NOT NULL UNIQUE,
    entries_json TEXT NOT NULL COMMENT 'JSON array of debit/credit entries',
    description VARCHAR(500) DEFAULT '',
    total_amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
    validated TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether double-entry was validated',
    reconciled TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether transaction is reconciled',
    reconciled_at DATETIME DEFAULT NULL,
    reconciled_by INT UNSIGNED DEFAULT NULL,
    created_at DATETIME NOT NULL,
    created_by INT UNSIGNED DEFAULT NULL,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_created_at (created_at),
    INDEX idx_reconciled (reconciled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Account Balances Table
-- Tracks current balance for each account type (double-entry)
CREATE TABLE IF NOT EXISTS account_balances (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    account_type VARCHAR(50) NOT NULL COMMENT 'e.g., LENDER_WALLET, RESERVE_FUND',
    account_address VARCHAR(100) NOT NULL COMMENT 'Wallet or contract address',
    current_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
    last_transaction_id VARCHAR(255) DEFAULT NULL,
    last_updated DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY uk_account (account_type, account_address),
    INDEX idx_account_type (account_type),
    INDEX idx_account_address (account_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Balance Change History
-- Tracks all changes to account balances for audit
CREATE TABLE IF NOT EXISTS balance_changes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    account_type VARCHAR(50) NOT NULL,
    account_address VARCHAR(100) NOT NULL,
    transaction_id VARCHAR(255) NOT NULL,
    change_type VARCHAR(50) NOT NULL COMMENT 'DEBIT or CREDIT',
    amount DECIMAL(20, 8) NOT NULL,
    balance_before DECIMAL(20, 8) NOT NULL,
    balance_after DECIMAL(20, 8) NOT NULL,
    reference_type VARCHAR(50) DEFAULT NULL COMMENT 'e.g., LOAN, ESCROW',
    reference_id VARCHAR(100) DEFAULT NULL,
    description VARCHAR(500) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_account (account_type, account_address),
    INDEX idx_transaction (transaction_id),
    INDEX idx_created_at (created_at),
    INDEX idx_reference (reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reserve Fund Ledger
-- Specific ledger for reserve fund tracking
CREATE TABLE IF NOT EXISTS reserve_fund_ledger (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_type VARCHAR(50) NOT NULL COMMENT 'DEPOSIT, WITHDRAWAL, PAYOUT, INTEREST, FEE',
    amount DECIMAL(20, 8) NOT NULL,
    balance_before DECIMAL(20, 8) NOT NULL,
    balance_after DECIMAL(20, 8) NOT NULL,
    source_account VARCHAR(100) DEFAULT NULL,
    destination_account VARCHAR(100) DEFAULT NULL,
    loan_id INT UNSIGNED DEFAULT NULL,
    reference VARCHAR(255) DEFAULT NULL,
    transaction_hash VARCHAR(100) DEFAULT NULL COMMENT 'Blockchain transaction hash',
    created_at DATETIME NOT NULL,
    created_by INT UNSIGNED DEFAULT NULL,
    INDEX idx_type (transaction_type),
    INDEX idx_loan_id (loan_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fee Collection History
-- Tracks platform fee collections for audit
CREATE TABLE IF NOT EXISTS fee_collections (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fee_type VARCHAR(50) NOT NULL COMMENT 'PLATFORM_FEE, ESCROW_FEE, etc.',
    amount DECIMAL(20, 8) NOT NULL,
    percentage DECIMAL(5, 2) DEFAULT NULL COMMENT 'Percentage applied',
    source_type VARCHAR(50) NOT NULL COMMENT 'LOAN, ESCROW, etc.',
    source_id INT UNSIGNED NOT NULL,
    transaction_id VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_source (source_type, source_id),
    INDEX idx_type (fee_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Daily Balance Summary
-- Snapshot of balances for reconciliation
CREATE TABLE IF NOT EXISTS daily_balance_summaries (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    snapshot_date DATE NOT NULL UNIQUE,
    total_assets DECIMAL(20, 8) NOT NULL DEFAULT 0,
    total_liabilities DECIMAL(20, 8) NOT NULL DEFAULT 0,
    total_equity DECIMAL(20, 8) NOT NULL DEFAULT 0,
    reserve_fund_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
    active_loans_total DECIMAL(20, 8) NOT NULL DEFAULT 0,
    total_lenders DECIMAL(20, 8) NOT NULL DEFAULT 0,
    total_borrowers DECIMAL(20, 8) NOT NULL DEFAULT 0,
    platform_fees_collected DECIMAL(20, 8) NOT NULL DEFAULT 0,
    reconciliation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL,
    INDEX idx_date (snapshot_date),
    INDEX idx_status (reconciliation_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default account balance records
INSERT INTO account_balances (account_type, account_address, current_balance, last_updated, created_at) VALUES
    ('RESERVE_FUND', 'RESERVE_CONTRACT', 0, NOW(), NOW()),
    ('PLATFORM_OPERATIONS', 'PLATFORM', 0, NOW(), NOW()),
    ('INTEREST_INCOME', 'PLATFORM', 0, NOW(), NOW()),
    ('PLATFORM_FEE_INCOME', 'PLATFORM', 0, NOW(), NOW()),
    ('BAD_DEBT_EXPENSE', 'PLATFORM', 0, NOW(), NOW()),
    ('PENDING_SETTLEMENTS', 'PENDING', 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE last_updated = NOW();
