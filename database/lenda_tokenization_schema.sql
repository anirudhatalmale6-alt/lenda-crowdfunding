-- LENDA Tokenized Lending Platform - Database Schema Extensions
-- This file extends the existing schema with tokenization, secondary markets, and reserve management

-- ============================================================
-- TOKENIZED LOAN SECURITIES
-- ============================================================

-- Loan Token Contracts (One per loan)
CREATE TABLE IF NOT EXISTS loan_token_contracts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    token_symbol VARCHAR(20) NOT NULL,
    token_name VARCHAR(100) NOT NULL,
    contract_address VARCHAR(100) UNIQUE,
    network VARCHAR(50) NOT NULL DEFAULT 'ethereum',
    total_supply DECIMAL(20, 0) NOT NULL,
    tokens_issued DECIMAL(20, 0) DEFAULT 0,
    token_price DECIMAL(15, 8) NOT NULL,
    issuance_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'issued', 'active', 'trading', 'completed', 'cancelled') DEFAULT 'pending',
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    INDEX idx_loan (loan_id),
    INDEX idx_status (status),
    INDEX idx_contract_address (contract_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Token Holdings (Who owns what tokens)
CREATE TABLE IF NOT EXISTS token_holdings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contract_id BIGINT UNSIGNED NOT NULL,
    holder_id BIGINT UNSIGNED NOT NULL,
    holder_type ENUM('investor', 'reserve', 'market_maker', 'platform') DEFAULT 'investor',
    token_count DECIMAL(20, 0) NOT NULL DEFAULT 0,
    cost_basis DECIMAL(15, 2) DEFAULT 0,
    current_value DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES loan_token_contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (holder_id) REFERENCES users(id),
    UNIQUE KEY uk_contract_holder (contract_id, holder_id),
    INDEX idx_holder (holder_id),
    INDEX idx_contract (contract_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Token Transactions (Transfer history)
CREATE TABLE IF NOT EXISTS token_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contract_id BIGINT UNSIGNED NOT NULL,
    from_holder_id BIGINT UNSIGNED,
    to_holder_id BIGINT UNSIGNED NOT NULL,
    token_count DECIMAL(20, 0) NOT NULL,
    price_per_token DECIMAL(15, 8),
    total_value DECIMAL(15, 2),
    transaction_type ENUM('issuance', 'purchase', 'sale', 'transfer', 'distribution', 'refinancing', 'liquidation') NOT NULL,
    tx_hash VARCHAR(100),
    status ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES loan_token_contracts(id),
    FOREIGN KEY (from_holder_id) REFERENCES users(id),
    FOREIGN KEY (to_holder_id) REFERENCES users(id),
    INDEX idx_contract (contract_id),
    INDEX idx_from_holder (from_holder_id),
    INDEX idx_to_holder (to_holder_id),
    INDEX idx_type (transaction_type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SECONDARY TOKEN MARKET
-- ============================================================

-- Token Order Book
CREATE TABLE IF NOT EXISTS token_orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contract_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    order_type ENUM('buy', 'sell') NOT NULL,
    token_count DECIMAL(20, 0) NOT NULL,
    filled_count DECIMAL(20, 0) DEFAULT 0,
    price_per_token DECIMAL(15, 8) NOT NULL,
    total_value DECIMAL(15, 2),
    status ENUM('active', 'partial', 'filled', 'cancelled', 'expired') DEFAULT 'active',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    filled_at TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES loan_token_contracts(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_contract (contract_id),
    INDEX idx_user (user_id),
    INDEX idx_type_status (order_type, status),
    INDEX idx_price (price_per_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Token Order Fills
CREATE TABLE IF NOT EXISTS token_order_fills (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    contract_id BIGINT UNSIGNED NOT NULL,
    maker_user_id BIGINT UNSIGNED NOT NULL,
    taker_user_id BIGINT UNSIGNED NOT NULL,
    token_count DECIMAL(20, 0) NOT NULL,
    price_per_token DECIMAL(15, 8) NOT NULL,
    total_value DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES token_orders(id),
    FOREIGN KEY (contract_id) REFERENCES loan_token_contracts(id),
    FOREIGN KEY (maker_user_id) REFERENCES users(id),
    FOREIGN KEY (taker_user_id) REFERENCES users(id),
    INDEX idx_order (order_id),
    INDEX idx_contract (contract_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Token Market Stats
CREATE TABLE IF NOT EXISTS token_market_stats (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contract_id BIGINT UNSIGNED NOT NULL UNIQUE,
    last_price DECIMAL(15, 8),
    volume_24h DECIMAL(15, 2) DEFAULT 0,
    volume_7d DECIMAL(15, 2) DEFAULT 0,
    high_24h DECIMAL(15, 8),
    low_24h DECIMAL(15, 8),
    market_cap DECIMAL(15, 2),
    circulating_supply DECIMAL(20, 0),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES loan_token_contracts(id),
    INDEX idx_contract (contract_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- REPAYMENT GUARANTEE RESERVES
-- ============================================================

-- Reserve Pool (Enhanced from existing reserve_fund)
CREATE TABLE IF NOT EXISTS reserve_pools (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pool_name VARCHAR(100) NOT NULL,
    pool_type ENUM('guarantee', 'insurance', 'liquidity', 'recovery') NOT NULL,
    balance DECIMAL(20, 2) DEFAULT 0,
    locked_balance DECIMAL(20, 2) DEFAULT 0,
    available_balance DECIMAL(20, 2) GENERATED ALWAYS AS (balance - locked_balance) STORED,
    target_coverage_ratio DECIMAL(5, 2) DEFAULT 4.00,
    current_coverage_ratio DECIMAL(5, 2) DEFAULT 0,
    min_coverage_ratio DECIMAL(5, 2) DEFAULT 2.00,
    max_coverage_ratio DECIMAL(5, 2) DEFAULT 10.00,
    total_claims_paid DECIMAL(20, 2) DEFAULT 0,
    total_replenished DECIMAL(20, 2) DEFAULT 0,
    status ENUM('active', 'depleted', 'paused', 'closed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (pool_type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reserve Pool Contributions
CREATE TABLE IF NOT EXISTS reserve_pool_contributions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pool_id BIGINT UNSIGNED NOT NULL,
    source_type ENUM('platform_fee', 'origination_fee', 'recovery_proceeds', 'investment_income', 'manual') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    loan_id BIGINT UNSIGNED,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pool_id) REFERENCES reserve_pools(id),
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id),
    INDEX idx_pool (pool_id),
    INDEX idx_source (source_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reserve Pool Claims
CREATE TABLE IF NOT EXISTS reserve_pool_claims (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pool_id BIGINT UNSIGNED NOT NULL,
    loan_id BIGINT UNSIGNED NOT NULL,
    claimant_id BIGINT UNSIGNED NOT NULL,
    claim_amount DECIMAL(15, 2) NOT NULL,
    approved_amount DECIMAL(15, 2),
    status ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
    claim_reason ENUM('default', 'late_payment', 'bankruptcy', 'refinancing') NOT NULL,
    claim_data JSON,
    reviewed_by BIGINT UNSIGNED,
    reviewed_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pool_id) REFERENCES reserve_pools(id),
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id),
    FOREIGN KEY (claimant_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    INDEX idx_pool (pool_id),
    INDEX idx_loan (loan_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Loan Coverage Tracking
CREATE TABLE IF NOT EXISTS loan_coverage (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    pool_id BIGINT UNSIGNED NOT NULL,
    monthly_payment DECIMAL(15, 2) NOT NULL,
    required_coverage DECIMAL(15, 2) NOT NULL,
    current_coverage DECIMAL(15, 2) DEFAULT 0,
    coverage_ratio DECIMAL(5, 2) DEFAULT 0,
    grace_period_days INT DEFAULT 7,
    liquidation_threshold DECIMAL(5, 2) DEFAULT 2.00,
    status ENUM('active', 'at_risk', 'refinancing', 'liquidating', 'protected') DEFAULT 'active',
    last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id),
    FOREIGN KEY (pool_id) REFERENCES reserve_pools(id),
    UNIQUE KEY uk_loan_pool (loan_id, pool_id),
    INDEX idx_loan (loan_id),
    INDEX idx_status (status),
    INDEX idx_coverage_ratio (coverage_ratio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- REFINANCING SYSTEM
-- ============================================================

-- Refinancing Requests
CREATE TABLE IF NOT EXISTS refinancing_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    borrower_id BIGINT UNSIGNED NOT NULL,
    original_loan_amount DECIMAL(15, 2) NOT NULL,
    current_balance DECIMAL(15, 2) NOT NULL,
    new_interest_rate DECIMAL(5, 2),
    new_duration_months INT,
    new_monthly_payment DECIMAL(15, 2),
    status ENUM('pending', 'marketplace', 'approved', 'rejected', 'expired', 'funded') DEFAULT 'pending',
    marketplace_listing ENUM('active', 'inactive') DEFAULT 'active',
    target_amount DECIMAL(15, 2),
    raised_amount DECIMAL(15, 2) DEFAULT 0,
    investor_count INT DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id),
    FOREIGN KEY (borrower_id) REFERENCES users(id),
    INDEX idx_loan (loan_id),
    INDEX idx_status (status),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refinancing Investments
CREATE TABLE IF NOT EXISTS refinancing_investments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    refinancing_id BIGINT UNSIGNED NOT NULL,
    investor_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    token_count DECIMAL(20, 0),
    status ENUM('pending', 'active', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (refinancing_id) REFERENCES refinancing_requests(id),
    FOREIGN KEY (investor_id) REFERENCES users(id),
    INDEX idx_refinancing (refinancing_id),
    INDEX idx_investor (investor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MARKET MAKER LIQUIDITY ENGINE
-- ============================================================

-- Market Maker Pool
CREATE TABLE IF NOT EXISTS market_maker_pools (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pool_name VARCHAR(100) NOT NULL,
    total_capital DECIMAL(20, 2) DEFAULT 0,
    available_capital DECIMAL(20, 2) DEFAULT 0,
    locked_capital DECIMAL(20, 2) DEFAULT 0,
    target_token_count DECIMAL(20, 0) DEFAULT 0,
    spread_bps INT DEFAULT 50,
    max_slippage_bps INT DEFAULT 200,
    status ENUM('active', 'paused', 'closed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Market Maker Positions
CREATE TABLE IF NOT EXISTS market_maker_positions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pool_id BIGINT UNSIGNED NOT NULL,
    contract_id BIGINT UNSIGNED NOT NULL,
    token_count DECIMAL(20, 0) DEFAULT 0,
    avg_buy_price DECIMAL(15, 8),
    avg_sell_price DECIMAL(15, 8),
    last_trade_price DECIMAL(15, 8),
    total_bought DECIMAL(20, 0) DEFAULT 0,
    total_sold DECIMAL(20, 0) DEFAULT 0,
    realized_pnl DECIMAL(15, 2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pool_id) REFERENCES market_maker_pools(id),
    FOREIGN KEY (contract_id) REFERENCES loan_token_contracts(id),
    UNIQUE KEY uk_pool_contract (pool_id, contract_id),
    INDEX idx_pool (pool_id),
    INDEX idx_contract (contract_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Market Maker Trades
CREATE TABLE IF NOT EXISTS market_maker_trades (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pool_id BIGINT UNSIGNED NOT NULL,
    contract_id BIGINT UNSIGNED NOT NULL,
    trade_type ENUM('buy', 'sell') NOT NULL,
    token_count DECIMAL(20, 0) NOT NULL,
    price DECIMAL(15, 8) NOT NULL,
    total_value DECIMAL(15, 2) NOT NULL,
    slippage_bps INT,
    reason ENUM('liquidity_provision', 'arbitrage', 'rebalance', 'exit') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pool_id) REFERENCES market_maker_pools(id),
    FOREIGN KEY (contract_id) REFERENCES loan_token_contracts(id),
    INDEX idx_pool (pool_id),
    INDEX idx_contract (contract_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RISK SCORING ENGINE
-- ============================================================

-- Loan Risk Assessments
CREATE TABLE IF NOT EXISTS loan_risk_assessments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    risk_rating ENUM('AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D') NOT NULL,
    risk_score DECIMAL(5, 2) NOT NULL,
    probability_of_default DECIMAL(5, 4),
    loss_given_default DECIMAL(5, 4),
    expected_loss DECIMAL(5, 4),
    collateral_score DECIMAL(5, 2),
    borrower_score DECIMAL(5, 2),
    market_score DECIMAL(5, 2),
    assessment_data JSON,
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id),
    UNIQUE KEY uk_loan (loan_id),
    INDEX idx_loan (loan_id),
    INDEX idx_rating (risk_rating),
    INDEX idx_score (risk_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Risk Score History
CREATE TABLE IF NOT EXISTS risk_score_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    score_type ENUM('credit', 'behavioral', 'collateral', 'overall') NOT NULL,
    score_value DECIMAL(5, 2) NOT NULL,
    factors JSON,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user (user_id),
    INDEX idx_type (score_type),
    INDEX idx_calculated (calculated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AUTOMATED LIQUIDATION TRIGGERS
-- ============================================================

-- Liquidation Rules
CREATE TABLE IF NOT EXISTS liquidation_rules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    pool_id BIGINT UNSIGNED,
    trigger_type ENUM('coverage_ratio', 'payment_missed', 'ltv_exceeded', 'market_value', 'manual') NOT NULL,
    threshold_value DECIMAL(10, 2) NOT NULL,
    comparison_operator ENUM('lt', 'lte', 'gt', 'gte', 'eq') NOT NULL,
    action_type ENUM('notify', 'refinance', 'liquidate', 'claim') NOT NULL,
    grace_period_hours INT DEFAULT 48,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pool_id) REFERENCES reserve_pools(id),
    INDEX idx_trigger (trigger_type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Liquidation Events
CREATE TABLE IF NOT EXISTS liquidation_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    rule_id BIGINT UNSIGNED,
    trigger_type ENUM('coverage_ratio', 'payment_missed', 'ltv_exceeded', 'market_value', 'manual') NOT NULL,
    trigger_value DECIMAL(10, 2),
    status ENUM('triggered', 'processing', 'completed', 'failed') DEFAULT 'triggered',
    collateral_recovered DECIMAL(15, 2) DEFAULT 0,
    reserve_used DECIMAL(15, 2) DEFAULT 0,
    proceeds_distributed DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id),
    FOREIGN KEY (rule_id) REFERENCES liquidation_rules(id),
    INDEX idx_loan (loan_id),
    INDEX idx_status (status),
    INDEX idx_triggered (triggered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INVESTOR PORTFOLIO TRACKING
-- ============================================================

-- Investor Portfolio Summary
CREATE TABLE IF NOT EXISTS investor_portfolios (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    total_invested DECIMAL(20, 2) DEFAULT 0,
    total_earned DECIMAL(20, 2) DEFAULT 0,
    total_tokens DECIMAL(20, 0) DEFAULT 0,
    portfolio_value DECIMAL(20, 2) DEFAULT 0,
    realized_gains DECIMAL(20, 2) DEFAULT 0,
    unrealized_gains DECIMAL(20, 2) DEFAULT 0,
    risk_distribution JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Portfolio Performance History
CREATE TABLE IF NOT EXISTS portfolio_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    portfolio_id BIGINT UNSIGNED NOT NULL,
    total_value DECIMAL(20, 2) NOT NULL,
    daily_return DECIMAL(10, 4),
    cumulative_return DECIMAL(10, 4),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolio_id) REFERENCES investor_portfolios(id),
    INDEX idx_portfolio (portfolio_id),
    INDEX idx_recorded (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INITIAL DATA
-- ============================================================

-- Initialize Default Reserve Pools
INSERT INTO reserve_pools (pool_name, pool_type, balance, target_coverage_ratio, min_coverage_ratio, max_coverage_ratio, status) 
VALUES 
('Primary Guarantee Pool', 'guarantee', 500000.00, 4.00, 2.00, 10.00, 'active'),
('Insurance Reserve', 'insurance', 250000.00, 2.00, 1.00, 5.00, 'active'),
('Liquidity Pool', 'liquidity', 100000.00, 1.50, 1.00, 3.00, 'active'),
('Recovery Reserve', 'recovery', 150000.00, 1.00, 0.50, 2.00, 'active');

-- Initialize Default Market Maker Pool
INSERT INTO market_maker_pools (pool_name, total_capital, available_capital, spread_bps, max_slippage_bps, status)
VALUES ('Primary Market Maker', 500000.00, 500000.00, 50, 200, 'active');

-- Default Liquidation Rules
INSERT INTO liquidation_rules (rule_name, trigger_type, threshold_value, comparison_operator, action_type, grace_period_hours, is_active)
VALUES 
('Low Coverage Ratio', 'coverage_ratio', 2.00, 'lte', 'refinance', 48, TRUE),
('Critical Coverage Ratio', 'coverage_ratio', 1.00, 'lte', 'liquidate', 24, TRUE),
('Payment Missed', 'payment_missed', 1, 'gte', 'notify', 72, TRUE),
('High LTV', 'ltv_exceeded', 80, 'gte', 'notify', 24, TRUE);
