-- LENDA Revenue Engine Database Schema
-- PostgreSQL / MySQL Compatible

-- ============================================================
-- PLATFORM REVENUE TRACKING
-- ============================================================

-- Platform Revenue Table
CREATE TABLE IF NOT EXISTS platform_revenue (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    revenue_type ENUM(
        'loan_origination', 
        'investor_service', 
        'secondary_market_trading', 
        'escrow_service',
        'liquidation_commission'
    ) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    related_transaction_type VARCHAR(50),
    related_transaction_id BIGINT UNSIGNED,
    loan_id BIGINT UNSIGNED,
    lender_id BIGINT UNSIGNED,
    borrower_id BIGINT UNSIGNED,
    fee_percentage DECIMAL(5, 2),
    gross_amount DECIMAL(15, 2),
    status ENUM('pending', 'collected', 'refunded', 'cancelled') DEFAULT 'collected',
    description VARCHAR(255),
    metadata JSON,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_revenue_type (revenue_type),
    INDEX idx_loan (loan_id),
    INDEX idx_lender (lender_id),
    INDEX idx_borrower (borrower_id),
    INDEX idx_created (created_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PLATFORM FEE CONFIGURATION
-- ============================================================

-- Platform Fee Configuration Table
CREATE TABLE IF NOT EXISTS platform_fee_config (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fee_type ENUM(
        'origination_fee',
        'investor_service_fee',
        'trading_fee',
        'escrow_fee',
        'liquidation_commission'
    ) NOT NULL UNIQUE,
    percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
    fixed_amount DECIMAL(15, 2) DEFAULT 0,
    min_amount DECIMAL(15, 2) DEFAULT 0,
    max_amount DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    description VARCHAR(255),
    updated_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fee_type (fee_type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- REVENUE SUMMARY CACHE (for faster dashboard queries)
-- ============================================================

-- Daily Revenue Summary
CREATE TABLE IF NOT EXISTS daily_revenue_summary (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    revenue_date DATE NOT NULL,
    revenue_type ENUM(
        'loan_origination', 
        'investor_service', 
        'secondary_market_trading', 
        'escrow_service',
        'liquidation_commission'
    ) NOT NULL,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    transaction_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_date_type (revenue_date, revenue_type),
    INDEX idx_date (revenue_date),
    INDEX idx_type (revenue_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Monthly Revenue Summary
CREATE TABLE IF NOT EXISTS monthly_revenue_summary (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    revenue_year INT NOT NULL,
    revenue_month INT NOT NULL,
    revenue_type ENUM(
        'loan_origination', 
        'investor_service', 
        'secondary_market_trading', 
        'escrow_service',
        'liquidation_commission'
    ) NOT NULL,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    transaction_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_year_month_type (revenue_year, revenue_month, revenue_type),
    INDEX idx_year_month (revenue_year, revenue_month),
    INDEX idx_type (revenue_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INITIAL FEE CONFIGURATION DATA
-- ============================================================

INSERT INTO platform_fee_config (fee_type, percentage, fixed_amount, description) VALUES
('origination_fee', 2.00, 0, 'Fee charged to borrowers when loan is successfully funded'),
('investor_service_fee', 5.00, 0, 'Percentage of investor profits charged as service fee'),
('trading_fee', 1.00, 0, 'Fee charged on secondary market token trades'),
('escrow_fee', 1.50, 0, 'Fee charged for escrow service transactions'),
('liquidation_commission', 10.00, 0, 'Commission on collateral liquidation sales');

-- ============================================================
-- REVENUE WALLET (Platform Earnings Wallet)
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_wallet (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    wallet_type ENUM('platform', 'reserve', 'operations') DEFAULT 'platform',
    balance DECIMAL(15, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize platform wallet
INSERT INTO platform_wallet (wallet_type, balance) VALUES ('platform', 0);
