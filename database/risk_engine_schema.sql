-- LENDA Risk Engine Database Schema
-- Additional tables for the Risk Engine module

-- ============================================================
-- LOAN RISK STATUS (Default Prediction Model)
-- ============================================================

CREATE TABLE IF NOT EXISTS loan_risk_status (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL UNIQUE,
    risk_status ENUM('healthy', 'watchlist', 'high_risk', 'default_imminent', 'defaulted') DEFAULT 'healthy',
    default_probability DECIMAL(5, 2) DEFAULT 0,
    risk_score DECIMAL(5, 2),
    risk_trend ENUM('improving', 'stable', 'deteriorating') DEFAULT 'stable',
    missed_payments INT DEFAULT 0,
    days_past_due INT DEFAULT 0,
    collateral_depreciation_rate DECIMAL(5, 2) DEFAULT 0,
    debt_to_income_ratio DECIMAL(5, 2),
    last_payment_date DATE,
    next_payment_date DATE,
    risk_factors JSON,
    last_analysis_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    INDEX idx_loan (loan_id),
    INDEX idx_status (risk_status),
    INDEX idx_probability (default_probability)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- BORROWER RISK PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS borrower_risk_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    risk_score INT DEFAULT 50,
    risk_category ENUM('AAA', 'AA', 'A', 'BBB', 'BB', 'high_risk') DEFAULT 'A',
    identity_verified BOOLEAN DEFAULT FALSE,
    income_verified BOOLEAN DEFAULT FALSE,
    repayment_history_score DECIMAL(5, 2) DEFAULT 50,
    collateral_strength_score DECIMAL(5, 2) DEFAULT 50,
    income_verification_score DECIMAL(5, 2) DEFAULT 50,
    platform_reputation_score DECIMAL(5, 2) DEFAULT 50,
    total_loans INT DEFAULT 0,
    successful_loans INT DEFAULT 0,
    defaulted_loans INT DEFAULT 0,
    current_total_debt DECIMAL(15, 2) DEFAULT 0,
    monthly_income DECIMAL(15, 2) DEFAULT 0,
    positive_factors JSON,
    risk_factors JSON,
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_category (risk_category),
    INDEX idx_score (risk_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- COLLATERAL VALUATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS collateral_valuations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    collateral_id BIGINT UNSIGNED NOT NULL,
    valuation_type ENUM('initial', 'revaluation', 'liquidation') DEFAULT 'initial',
    estimated_value DECIMAL(15, 2) NOT NULL,
    liquidation_value DECIMAL(15, 2),
    market_value DECIMAL(15, 2),
    depreciation_rate DECIMAL(5, 2) DEFAULT 0,
    appraiser_name VARCHAR(255),
    appraisal_method VARCHAR(50),
    valuation_notes TEXT,
    valuation_date DATE DEFAULT (CURRENT_DATE),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collateral_id) REFERENCES collateral_assets(id) ON DELETE CASCADE,
    INDEX idx_collateral (collateral_id),
    INDEX idx_type (valuation_type),
    INDEX idx_date (valuation_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- EXPOSURE LIMITS
-- ============================================================

CREATE TABLE IF NOT EXISTS exposure_limits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entity_type ENUM('borrower', 'loan', 'lender', 'platform') NOT NULL,
    entity_id BIGINT UNSIGNED,
    limit_type ENUM('max_borrower_exposure', 'max_loan_exposure', 'max_lender_exposure') NOT NULL,
    limit_percentage DECIMAL(5, 2) NOT NULL,
    limit_amount DECIMAL(15, 2),
    current_exposure DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_type (limit_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DEFAULT WORKFLOW STAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS default_workflows (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    stage ENUM('grace_period', 'refinance_attempt', 'pre_liquidation', 'liquidation', 'recovery') DEFAULT 'grace_period',
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    days_in_stage INT DEFAULT 0,
    next_action_date DATE,
    notes TEXT,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    INDEX idx_loan (loan_id),
    INDEX idx_stage (stage),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RISK MONITORING EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS risk_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED,
    user_id BIGINT UNSIGNED,
    event_type ENUM('payment_missed', 'payment_late', 'collateral_depreciated', 'debt_increased', 'ltv_breached', 'risk_upgraded', 'risk_downgraded', 'default_warning', 'liquidation_initiated') NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    risk_score_change DECIMAL(5, 2),
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    description TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_loan (loan_id),
    INDEX idx_user (user_id),
    INDEX idx_type (event_type),
    INDEX idx_severity (severity),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RISK DASHBOARD SUMMARY (CACHE TABLE)
-- ============================================================

CREATE TABLE IF NOT EXISTS risk_dashboard_summary (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    total_active_loans INT DEFAULT 0,
    total_default_rate DECIMAL(5, 2) DEFAULT 0,
    reserve_coverage_ratio DECIMAL(5, 2) DEFAULT 0,
    high_risk_loans INT DEFAULT 0,
    watchlist_loans INT DEFAULT 0,
    healthy_loans INT DEFAULT 0,
    total_loans_at_risk DECIMAL(15, 2) DEFAULT 0,
    average_risk_score DECIMAL(5, 2) DEFAULT 0,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_calculated (calculated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- LTV CONFIGURATION BY RISK CATEGORY
-- ============================================================

CREATE TABLE IF NOT EXISTS ltv_configurations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    risk_category ENUM('AAA', 'AA', 'A', 'BBB', 'BB', 'high_risk') NOT NULL UNIQUE,
    max_ltv_percentage DECIMAL(5, 2) NOT NULL,
    min_ltv_percentage DECIMAL(5, 2) DEFAULT 0,
    collateral_discount_rate DECIMAL(5, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (risk_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default LTV configurations
INSERT IGNORE INTO ltv_configurations (risk_category, max_ltv_percentage, min_ltv_percentage, collateral_discount_rate) VALUES
('AAA', 70.00, 0, 10.00),
('AA', 65.00, 0, 15.00),
('A', 60.00, 0, 20.00),
('BBB', 55.00, 0, 25.00),
('BB', 50.00, 0, 30.00),
('high_risk', 40.00, 0, 40.00);

-- Insert default exposure limits
INSERT IGNORE INTO exposure_limits (entity_type, entity_id, limit_type, limit_percentage, limit_amount) VALUES
('platform', NULL, 'max_borrower_exposure', 5.00, NULL),
('platform', NULL, 'max_loan_exposure', 2.00, NULL);

-- Initialize risk dashboard summary
INSERT IGNORE INTO risk_dashboard_summary (id, total_active_loans, total_default_rate, reserve_coverage_ratio, high_risk_loans, watchlist_loans, healthy_loans) VALUES
(1, 0, 0, 25.00, 0, 0, 0);

-- ============================================================
-- RISK-002: GRACE PERIOD CONFIGURATION
-- ============================================================

CREATE TABLE IF NOT EXISTS grace_period_config (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    default_days INT DEFAULT 7 NOT NULL,
    min_days INT DEFAULT 1 NOT NULL,
    max_days INT DEFAULT 30 NOT NULL,
    warning_days JSON,
    auto_advance_workflow BOOLEAN DEFAULT TRUE,
    send_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default grace period config
INSERT IGNORE INTO grace_period_config (id, default_days, min_days, max_days, warning_days) VALUES
(1, 7, 1, 30, '[7, 5, 3, 1]');

-- ============================================================
-- RISK-004: REFINANCING MATCH ENGINE
-- ============================================================

CREATE TABLE IF NOT EXISTS refinancing_opportunities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    borrower_id BIGINT UNSIGNED NOT NULL,
    original_loan_amount DECIMAL(15, 2) NOT NULL,
    outstanding_amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    remaining_term_months INT NOT NULL,
    collateral_value DECIMAL(15, 2),
    credit_score INT,
    status ENUM('available', 'in_progress', 'funded', 'expired', 'cancelled') DEFAULT 'available',
    target_amount DECIMAL(15, 2),
    funded_amount DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (borrower_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_loan (loan_id),
    INDEX idx_borrower (borrower_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refinancing_investments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    opportunity_id BIGINT UNSIGNED NOT NULL,
    investor_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'settled', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    FOREIGN KEY (opportunity_id) REFERENCES refinancing_opportunities(id) ON DELETE CASCADE,
    FOREIGN KEY (investor_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_opportunity (opportunity_id),
    INDEX idx_investor (investor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refinancing_match_scores (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    opportunity_id BIGINT UNSIGNED NOT NULL,
    investor_id BIGINT UNSIGNED NOT NULL,
    match_score DECIMAL(5, 2) NOT NULL,
    risk_score DECIMAL(5, 2),
    return_score DECIMAL(5, 2),
    liquidity_score DECIMAL(5, 2),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (opportunity_id) REFERENCES refinancing_opportunities(id) ON DELETE CASCADE,
    FOREIGN KEY (investor_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_match (opportunity_id, investor_id),
    INDEX idx_score (match_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS investor_preferences (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    risk_tolerance ENUM('conservative', 'moderate', 'aggressive') DEFAULT 'moderate',
    min_investment DECIMAL(15, 2) DEFAULT 100,
    max_investment DECIMAL(15, 2) DEFAULT 50000,
    preferred_loan_sizes JSON,
    min_interest_rate DECIMAL(5, 2),
    max_loan_age_months INT DEFAULT 12,
    notify_new_opportunities BOOLEAN DEFAULT TRUE,
    notify_match_score_above INT DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RISK-005: HYBRID AUCTION SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS hybrid_auctions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    collateral_id BIGINT UNSIGNED,
    auction_type ENUM('english', 'dutch', 'sealed_bid', 'dutch_english_hybrid') DEFAULT 'english',
    status ENUM('pending', 'active', 'extended', 'settling', 'settled', 'cancelled', 'expired') DEFAULT 'pending',
    starting_price DECIMAL(15, 2) NOT NULL,
    reserve_price DECIMAL(15, 2),
    current_price DECIMAL(15, 2) NOT NULL,
    highest_bid DECIMAL(15, 2) DEFAULT 0,
    highest_bidder_id BIGINT UNSIGNED,
    duration_days INT DEFAULT 7,
    started_at TIMESTAMP,
    ends_at TIMESTAMP,
    settled_at TIMESTAMP,
    blockchain_tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (collateral_id) REFERENCES collateral_assets(id) ON DELETE SET NULL,
    INDEX idx_loan (loan_id),
    INDEX idx_status (status),
    INDEX idx_ends (ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auction_bids (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    auction_id BIGINT UNSIGNED NOT NULL,
    bidder_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    is_winning BOOLEAN DEFAULT FALSE,
    is_withdrawn BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES hybrid_auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (bidder_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_auction (auction_id),
    INDEX idx_bidder (bidder_id),
    INDEX idx_amount (amount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RISK-006: LIQUIDATION RULE ENGINE
-- ============================================================

CREATE TABLE IF NOT EXISTS liquidation_rules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type ENUM('ltv', 'days_past_due', 'payment_streak', 'collateral_depreciation', 'risk_score') NOT NULL,
    conditions JSON NOT NULL,
    actions JSON NOT NULL,
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (rule_type),
    INDEX idx_priority (priority),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default liquidation rules
INSERT IGNORE INTO liquidation_rules (id, name, description, rule_type, conditions, actions, priority, is_system) VALUES
(1, 'LTV Threshold Trigger', 'Trigger liquidation when LTV exceeds 80%', 'ltv', '{"field": "ltv_ratio", "operator": "greater_than", "value": 80}', '["notify_admin", "initiate_auction"]', 'high', TRUE),
(2, 'Days Past Due Trigger', 'Trigger liquidation after 30 days past due', 'days_past_due', '{"field": "days_past_due", "operator": "greater_than", "value": 30}', '["send_warning", "initiate_auction"]', 'high', TRUE),
(3, 'Payment Streak Failure', 'Trigger after 3 consecutive missed payments', 'payment_streak', '{"field": "consecutive_missed_payments", "operator": "greater_than", "value": 3}', '["start_workflow", "notify_borrower"]', 'medium', TRUE),
(4, 'Collateral Depreciation', 'Trigger when collateral value drops below 100% coverage', 'collateral_depreciation', '{"field": "collateral_coverage", "operator": "less_than", "value": 100}', '["request_revaluation", "notify_admin"]', 'medium', TRUE),
(5, 'Risk Score Threshold', 'Trigger based on default probability above 70%', 'risk_score', '{"field": "default_probability", "operator": "greater_than", "value": 70}', '["escalate", "enhanced_monitoring"]', 'low', TRUE);

CREATE TABLE IF NOT EXISTS liquidation_executions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    rule_id BIGINT UNSIGNED,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    conditions_met JSON,
    actions_taken JSON,
    status ENUM('pending', 'executed', 'failed', 'skipped') DEFAULT 'pending',
    executed_by BIGINT UNSIGNED,
    executed_at TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (rule_id) REFERENCES liquidation_rules(id) ON DELETE SET NULL,
    INDEX idx_loan (loan_id),
    INDEX idx_rule (rule_id),
    INDEX idx_triggered (triggered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RISK-001: WORKFLOW PROGRESSION LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS workflow_progression_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    workflow_id BIGINT UNSIGNED NOT NULL,
    from_stage VARCHAR(50),
    to_stage VARCHAR(50),
    trigger_type ENUM('automatic', 'manual', 'cron', 'system') DEFAULT 'manual',
    triggered_by BIGINT UNSIGNED,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    INDEX idx_loan (loan_id),
    INDEX idx_workflow (workflow_id),
    INDEX idx_triggered (triggered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
