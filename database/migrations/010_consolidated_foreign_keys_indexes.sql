-- ============================================================
-- Database Schema Consolidation & Performance Improvements
-- Addresses DB-01, DB-02, DB-03, DB-04 from Architecture Review
-- ============================================================

-- ============================================================
-- PART 1: ADD MISSING FOREIGN KEY CONSTRAINTS (DB-02)
-- ============================================================

-- loan_fundings: Add ON DELETE CASCADE
ALTER TABLE loan_fundings 
    DROP FOREIGN KEY loan_fundings_ibfk_1,
    DROP FOREIGN KEY loan_fundings_ibfk_2;

ALTER TABLE loan_fundings
    ADD CONSTRAINT fk_loan_fundings_loan 
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_loan_fundings_lender 
    FOREIGN KEY (lender_id) REFERENCES users(id) ON DELETE CASCADE;

-- repayments: Add ON DELETE CASCADE
ALTER TABLE repayments
    DROP FOREIGN KEY repayments_ibfk_1,
    DROP FOREIGN KEY repayments_ibfk_2;

ALTER TABLE repayments
    ADD CONSTRAINT fk_repayments_loan 
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_repayments_borrower 
    FOREIGN KEY (borrower_id) REFERENCES users(id) ON DELETE CASCADE;

-- collateral_assets: Add ON DELETE CASCADE
ALTER TABLE collateral_assets
    DROP FOREIGN KEY collateral_assets_ibfk_1,
    DROP FOREIGN KEY collateral_assets_ibfk_2;

ALTER TABLE collateral_assets
    ADD CONSTRAINT fk_collateral_borrower 
    FOREIGN KEY (borrower_id) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_collateral_loan 
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE SET NULL;

-- recovery_items: Add ON DELETE CASCADE
ALTER TABLE recovery_items
    DROP FOREIGN KEY recovery_items_ibfk_1,
    DROP FOREIGN KEY recovery_items_ibfk_2;

ALTER TABLE recovery_items
    ADD CONSTRAINT fk_recovery_collateral 
    FOREIGN KEY (collateral_id) REFERENCES collateral_assets(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_recovery_loan 
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE;

-- recovery_bids: Add ON DELETE CASCADE
ALTER TABLE recovery_bids
    DROP FOREIGN KEY recovery_bids_ibfk_1,
    DROP FOREIGN KEY recovery_bids_ibfk_2;

ALTER TABLE recovery_bids
    ADD CONSTRAINT fk_recovery_bids_item 
    FOREIGN KEY (item_id) REFERENCES recovery_items(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_recovery_bids_bidder 
    FOREIGN KEY (bidder_id) REFERENCES users(id) ON DELETE CASCADE;

-- wallet_accounts: Add ON DELETE CASCADE
ALTER TABLE wallet_accounts
    DROP FOREIGN KEY wallet_accounts_ibfk_1;

ALTER TABLE wallet_accounts
    ADD CONSTRAINT fk_wallet_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- wallet_transactions: Add ON DELETE CASCADE
ALTER TABLE wallet_transactions
    DROP FOREIGN KEY wallet_transactions_ibfk_1,
    DROP FOREIGN KEY wallet_transactions_ibfk_2;

ALTER TABLE wallet_transactions
    ADD CONSTRAINT fk_wallet_transactions_wallet 
    FOREIGN KEY (wallet_id) REFERENCES wallet_accounts(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_wallet_transactions_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- escrow_transactions: Add ON DELETE CASCADE
ALTER TABLE escrow_transactions
    DROP FOREIGN KEY escrow_transactions_ibfk_1,
    DROP FOREIGN KEY escrow_transactions_ibfk_2;

ALTER TABLE escrow_transactions
    ADD CONSTRAINT fk_escrow_buyer 
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_escrow_seller 
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE;

-- risk_scores: Add ON DELETE CASCADE
ALTER TABLE risk_scores
    DROP FOREIGN KEY risk_scores_ibfk_1;

ALTER TABLE risk_scores
    ADD CONSTRAINT fk_risk_scores_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- smart_contracts: Add ON DELETE SET NULL
ALTER TABLE smart_contracts
    DROP FOREIGN KEY smart_contracts_ibfk_1;

ALTER TABLE smart_contracts
    ADD CONSTRAINT fk_smart_contracts_loan 
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE SET NULL;

-- reserve_fund_transactions: Add foreign key with ON DELETE SET NULL
ALTER TABLE reserve_fund_transactions
    ADD CONSTRAINT fk_reserve_fund_transactions_loan 
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE SET NULL;

-- audit_logs: Add ON DELETE SET NULL
ALTER TABLE audit_logs
    ADD CONSTRAINT fk_audit_logs_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- PART 2: ADD COMPOSITE INDEXES (DB-03)
-- ============================================================

-- Loan Requests: Composite indexes for common queries
CREATE INDEX idx_loan_requests_status_created ON loan_requests(status, created_at);
CREATE INDEX idx_loan_requests_borrower_status ON loan_requests(borrower_id, status);
CREATE INDEX idx_loan_requests_risk_status ON loan_requests(risk_score, status);
CREATE INDEX idx_loan_requests_ltv_risk ON loan_requests(ltv_ratio, risk_score);

-- Loan Fundings: Composite indexes
CREATE INDEX idx_loan_fundings_lender_status ON loan_fundings(lender_id, status);
CREATE INDEX idx_loan_fundings_loan_status ON loan_fundings(loan_id, status);
CREATE INDEX idx_loan_fundings_status_created ON loan_fundings(status, created_at);

-- Repayments: Composite indexes
CREATE INDEX idx_repayments_borrower_status ON repayments(borrower_id, status);
CREATE INDEX idx_repayments_loan_due_date ON repayments(loan_id, due_date);
CREATE INDEX idx_repayments_status_due_date ON repayments(status, due_date);

-- Collateral: Composite indexes
CREATE INDEX idx_collateral_borrower_status ON collateral_assets(borrower_id, verification_status);
CREATE INDEX idx_collateral_loan_status ON collateral_assets(loan_id, verification_status);

-- Wallet Transactions: Composite indexes
CREATE INDEX idx_wallet_transactions_user_type ON wallet_transactions(user_id, type);
CREATE INDEX idx_wallet_transactions_user_status ON wallet_transactions(user_id, status);
CREATE INDEX idx_wallet_transactions_type_created ON wallet_transactions(type, created_at);
CREATE INDEX idx_wallet_transactions_status_created ON wallet_transactions(status, created_at);

-- Escrow: Composite indexes
CREATE INDEX idx_escrow_buyer_status ON escrow_transactions(buyer_id, status);
CREATE INDEX idx_escrow_seller_status ON escrow_transactions(seller_id, status);
CREATE INDEX idx_escrow_status_created ON escrow_transactions(status, created_at);

-- Risk Scores: Composite indexes
CREATE INDEX idx_risk_scores_score_user ON risk_scores(overall_score, user_id);

-- Notifications: Composite indexes
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at);

-- Audit Logs: Composite indexes
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX idx_audit_logs_entity_created ON audit_logs(entity_type, entity_id, created_at);

-- ============================================================
-- PART 3: STANDARDIZE NAMING CONVENTIONS (DB-04)
-- ============================================================

-- The wallet_accounts table already uses locked_balance (correct)
-- This section documents the naming standard:
-- - Use locked_balance (not frozen_balance) for funds on hold
-- - Use created_at/updated_at for timestamps
-- - Use status enum with consistent values across tables
-- - Use BIGINT UNSIGNED for all ID fields
-- - Use DECIMAL(15, 2) for all monetary values

-- ============================================================
-- PART 4: ADD API AUDIT LOG TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS api_audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED,
    api_key_id BIGINT UNSIGNED,
    method VARCHAR(10) NOT NULL,
    url VARCHAR(500) NOT NULL,
    request_headers JSON,
    request_body JSON,
    response_status INT,
    response_body JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    execution_time_ms DECIMAL(10, 2),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_api_key_created (api_key_id, created_at),
    INDEX idx_url_created (url(255), created_at),
    INDEX idx_response_status (response_status),
    INDEX idx_method_created (method, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PART 5: ADD CACHE KEYS TABLE FOR REDIS
-- ============================================================

CREATE TABLE IF NOT EXISTS cache_registry (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    cache_config VARCHAR(50) DEFAULT 'default',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cache_key (cache_key),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PART 6: ADD EVENT QUEUE TABLE FOR ASYNC OPERATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS event_queue (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_payload JSON NOT NULL,
    priority TINYINT DEFAULT 0,
    status ENUM('pending', 'processing', 'completed', 'failed', 'retry') DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    scheduled_at TIMESTAMP,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_status (status),
    INDEX idx_priority_created (priority DESC, created_at),
    INDEX idx_scheduled (scheduled_at),
    INDEX idx_completed (completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
