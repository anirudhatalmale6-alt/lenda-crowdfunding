-- ============================================================
-- MARKET-DRIVEN INTEREST RATE SYSTEM
-- ============================================================

-- Platform Rate Settings (Admin controlled)
CREATE TABLE IF NOT EXISTS platform_rate_settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    max_interest_rate DECIMAL(5, 2) NOT NULL DEFAULT 35.00,
    min_interest_rate DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
    -- Risk category minimum rates
    aaa_min_rate DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
    aa_min_rate DECIMAL(5, 2) NOT NULL DEFAULT 7.00,
    a_min_rate DECIMAL(5, 2) NOT NULL DEFAULT 8.00,
    bbb_min_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
    bb_min_rate DECIMAL(5, 2) NOT NULL DEFAULT 12.00,
    b_min_rate DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
    c_min_rate DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    d_min_rate DECIMAL(5, 2) NOT NULL DEFAULT 25.00,
    -- Rate adjustment settings
    allow_rate_increase BOOLEAN DEFAULT TRUE,
    allow_rate_decrease BOOLEAN DEFAULT FALSE,
    min_rate_decrease_interval_hours INT DEFAULT 72,
    -- LTV settings
    max_ltv_ratio DECIMAL(5, 2) NOT NULL DEFAULT 60.00,
    -- Market demand settings
    demand_calculation_enabled BOOLEAN DEFAULT TRUE,
    historical_data_weight DECIMAL(3, 2) DEFAULT 0.30,
    risk_score_weight DECIMAL(3, 2) DEFAULT 0.40,
    rate_competitiveness_weight DECIMAL(3, 2) DEFAULT 0.30,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT UNSIGNED,
    FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Loan Interest Rate History
CREATE TABLE IF NOT EXISTS loan_rate_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    previous_rate DECIMAL(5, 2),
    new_rate DECIMAL(5, 2) NOT NULL,
    rate_change_type ENUM('initial', 'increase', 'decrease', 'admin_override', 'auto_adjust') NOT NULL,
    reason VARCHAR(255),
    funding_progress_at_change DECIMAL(5, 2),
    market_demand_at_change ENUM('very_low', 'low', 'moderate', 'high', 'very_high'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT UNSIGNED,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_loan (loan_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Market Demand Scores (for rate recommendations)
CREATE TABLE IF NOT EXISTS market_demand_scores (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    demand_score DECIMAL(5, 2) NOT NULL,
    demand_level ENUM('very_low', 'low', 'moderate', 'high', 'very_high') NOT NULL,
    funding_speed_prediction ENUM('very_slow', 'slow', 'moderate', 'fast', 'very_fast'),
    historical_funding_rate DECIMAL(5, 2),
    risk_score_factor DECIMAL(5, 2),
    rate_competitiveness_factor DECIMAL(5, 2),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    INDEX idx_loan (loan_id),
    INDEX idx_demand_level (demand_level),
    INDEX idx_calculated (calculated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rate Recommendations Cache
CREATE TABLE IF NOT EXISTS rate_recommendations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    borrower_id BIGINT UNSIGNED NOT NULL,
    loan_amount DECIMAL(15, 2) NOT NULL,
    collateral_value DECIMAL(15, 2) NOT NULL,
    risk_category ENUM('AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'C', 'D') NOT NULL,
    suggested_rate DECIMAL(5, 2) NOT NULL,
    confidence_score DECIMAL(5, 2),
    funding_likelihood ENUM('very_low', 'low', 'moderate', 'high', 'very_high') NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (borrower_id) REFERENCES users(id),
    INDEX idx_borrower (borrower_id),
    INDEX idx_calculated (calculated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tokenized Loan Parts (for fractional investment)
CREATE TABLE IF NOT EXISTS loan_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    token_symbol VARCHAR(20) NOT NULL,
    total_supply DECIMAL(15, 2) NOT NULL,
    price_per_token DECIMAL(15, 4) NOT NULL,
    tokens_sold DECIMAL(15, 2) DEFAULT 0,
    token_price_usd DECIMAL(15, 2),
    status ENUM('pending', 'active', 'sold_out', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id),
    UNIQUE KEY uk_loan_token (loan_id, token_symbol),
    INDEX idx_loan (loan_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Token Holdings (investor ownership)
CREATE TABLE IF NOT EXISTS token_holdings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_token_id BIGINT UNSIGNED NOT NULL,
    investor_id BIGINT UNSIGNED NOT NULL,
    tokens_owned DECIMAL(15, 2) NOT NULL,
    invested_amount DECIMAL(15, 2) NOT NULL,
    expected_return DECIMAL(15, 2),
    actual_return DECIMAL(15, 2),
    status ENUM('active', 'redeemed', 'defaulted') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_token_id) REFERENCES loan_tokens(id),
    FOREIGN KEY (investor_id) REFERENCES users(id),
    UNIQUE KEY uk_investor_token (loan_token_id, investor_id),
    INDEX idx_investor (investor_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INITIAL DATA
-- ============================================================

-- Initialize platform rate settings
INSERT INTO platform_rate_settings (
    max_interest_rate,
    min_interest_rate,
    aaa_min_rate,
    aa_min_rate,
    a_min_rate,
    bbb_min_rate,
    bb_min_rate,
    b_min_rate,
    c_min_rate,
    d_min_rate,
    max_ltv_ratio,
    allow_rate_increase,
    allow_rate_decrease,
    min_rate_decrease_interval_hours,
    demand_calculation_enabled,
    historical_data_weight,
    risk_score_weight,
    rate_competitiveness_weight
) VALUES (
    35.00,  -- max_interest_rate
    5.00,   -- min_interest_rate
    5.00,   -- aaa_min_rate
    7.00,   -- aa_min_rate
    8.00,   -- a_min_rate
    10.00,  -- bbb_min_rate
    12.00,  -- bb_min_rate
    15.00,  -- b_min_rate
    20.00,  -- c_min_rate
    25.00,  -- d_min_rate
    60.00,  -- max_ltv_ratio
    TRUE,   -- allow_rate_increase
    FALSE,  -- allow_rate_decrease
    72,     -- min_rate_decrease_interval_hours
    TRUE,   -- demand_calculation_enabled
    0.30,   -- historical_data_weight
    0.40,   -- risk_score_weight
    0.30    -- rate_competitiveness_weight
);

-- Add indexes to loan_requests for better performance
ALTER TABLE loan_requests ADD INDEX idx_interest_rate (interest_rate);
ALTER TABLE loan_requests ADD INDEX idx_funding_progress (funded_amount, loan_amount);
