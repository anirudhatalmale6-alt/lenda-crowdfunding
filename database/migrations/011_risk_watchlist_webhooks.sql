-- Migration: Risk Watchlist and Webhooks
-- Phase 5: RISK AND DEFAULT MANAGEMENT
-- RISK-14: Webhooks for default probability
-- RISK-15: Automatic watchlist updates

-- ============================================================
-- Risk Watchlist Table (RISK-15)
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_watchlists (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    risk_score INT DEFAULT 0,
    status ENUM('active', 'removed', 'resolved') DEFAULT 'active',
    reason TEXT,
    added_date DATETIME DEFAULT NULL,
    removed_date DATETIME DEFAULT NULL,
    last_updated DATETIME DEFAULT NULL,
    auto_added TINYINT(1) DEFAULT 0,
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_loan_id (loan_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_auto_added (auto_added),
    INDEX idx_risk_score (risk_score),
    UNIQUE KEY unique_loan_watchlist (loan_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Loan Risk Table (RISK-05, RISK-14)
-- ============================================================
CREATE TABLE IF NOT EXISTS loan_risks (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id INT UNSIGNED NOT NULL,
    risk_status ENUM('healthy', 'watchlist', 'high_risk', 'default_imminent', 'defaulted') DEFAULT 'healthy',
    risk_score INT DEFAULT 100,
    default_probability INT DEFAULT 0,
    ltv_percentage DECIMAL(5,2) DEFAULT 0,
    payment_history_score INT DEFAULT 30,
    credit_score INT DEFAULT NULL,
    last_calculated DATETIME DEFAULT NULL,
    workflow_stage VARCHAR(50) DEFAULT NULL,
    grace_period_start DATE DEFAULT NULL,
    grace_period_end DATE DEFAULT NULL,
    default_date DATE DEFAULT NULL,
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_loan_id (loan_id),
    INDEX idx_risk_status (risk_status),
    INDEX idx_default_probability (default_probability),
    INDEX idx_last_calculated (last_calculated),
    UNIQUE KEY unique_loan_risk (loan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Refinancing Requests Table (RISK-05, RISK-06)
-- ============================================================
CREATE TABLE IF NOT EXISTS refinancing_requests (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    original_interest_rate DECIMAL(5,2) NOT NULL,
    original_duration_months INT NOT NULL,
    new_interest_rate DECIMAL(5,2) NOT NULL,
    new_duration_months INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'funded', 'cancelled') DEFAULT 'pending',
    requested_date DATETIME DEFAULT NULL,
    reviewed_date DATETIME DEFAULT NULL,
    approved_by INT UNSIGNED DEFAULT NULL,
    risk_assessment JSON,
    rejection_reason TEXT,
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_loan_id (loan_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_requested_date (requested_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Webhooks Registry Table (RISK-14)
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_webhooks (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    url VARCHAR(500) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    secret_key VARCHAR(255) DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    retry_count INT DEFAULT 3,
    last_triggered DATETIME DEFAULT NULL,
    last_status INT DEFAULT NULL,
    created_by INT UNSIGNED DEFAULT NULL,
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_is_active (is_active),
    UNIQUE KEY unique_webhook_url_event (url(255), event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Webhook Delivery Logs Table (RISK-14)
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_webhook_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    webhook_id INT UNSIGNED NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSON,
    response_status INT DEFAULT NULL,
    response_body TEXT,
    attempts INT DEFAULT 0,
    delivered_at DATETIME DEFAULT NULL,
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_webhook_id (webhook_id),
    INDEX idx_delivered_at (delivered_at),
    INDEX idx_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Grace Period Configuration Table (RISK-02)
-- ============================================================
CREATE TABLE IF NOT EXISTS grace_period_configs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_type VARCHAR(50) DEFAULT 'default',
    grace_period_days INT DEFAULT 7,
    warning_days JSON,
    is_active TINYINT(1) DEFAULT 1,
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_loan_type (loan_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default grace period configuration
INSERT INTO grace_period_configs (loan_type, grace_period_days, warning_days, is_active) 
VALUES ('default', 7, '[3, 5, 7]', 1);

-- ============================================================
-- Collateral Valuation History Table (RISK-07)
-- ============================================================
CREATE TABLE IF NOT EXISTS collateral_valuations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    collateral_id INT UNSIGNED NOT NULL,
    valuation_type ENUM('oracle', 'manual', 'auction') DEFAULT 'oracle',
    value DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    price_source VARCHAR(50) DEFAULT NULL,
    ltv_percentage DECIMAL(5,2) DEFAULT 0,
    liquidation_threshold DECIMAL(5,2) DEFAULT 90.00,
    is_liquidatable TINYINT(1) DEFAULT 0,
    valuation_date DATETIME DEFAULT NULL,
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_collateral_id (collateral_id),
    INDEX idx_valuation_type (valuation_type),
    INDEX idx_valuation_date (valuation_date),
    INDEX idx_is_liquidatable (is_liquidatable)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Risk Notifications Table (RISK-02, RISK-14, RISK-15)
-- ============================================================
-- Note: This extends the existing notifications table
-- Add new notification types for risk management
ALTER TABLE notifications ADD INDEX idx_type (type);
ALTER TABLE notifications ADD INDEX idx_reference (reference_type, reference_id);
