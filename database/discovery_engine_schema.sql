-- LENDA AI Loan Discovery Engine Database Schema
-- Investor Preferences, Discovery Scores, and Behavior Tracking

-- Investor Preferences Table
CREATE TABLE IF NOT EXISTS investor_preferences (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    investor_id BIGINT UNSIGNED NOT NULL UNIQUE,
    risk_tolerance ENUM('low', 'medium', 'high', 'very_high') DEFAULT 'medium',
    min_interest_rate DECIMAL(5, 2) DEFAULT 0,
    max_interest_rate DECIMAL(5, 2) DEFAULT 30,
    min_loan_size DECIMAL(15, 2) DEFAULT 0,
    max_loan_size DECIMAL(15, 2) DEFAULT 1000000,
    preferred_collateral_types JSON,
    max_loan_exposure DECIMAL(15, 2) DEFAULT 50000,
    investment_strategy ENUM('balanced', 'aggressive', 'conservative', 'income') DEFAULT 'balanced',
    auto_invest_enabled TINYINT(1) DEFAULT 0,
    min_investment_amount DECIMAL(15, 2) DEFAULT 100,
    notification_preferences JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_investor (investor_id),
    INDEX idx_risk_tolerance (risk_tolerance)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Loan Discovery Score Table
CREATE TABLE IF NOT EXISTS loan_discovery_scores (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    discovery_score DECIMAL(5, 2) NOT NULL,
    interest_score DECIMAL(5, 2) DEFAULT 0,
    risk_match_score DECIMAL(5, 2) DEFAULT 0,
    reputation_score DECIMAL(5, 2) DEFAULT 0,
    funding_momentum_score DECIMAL(5, 2) DEFAULT 0,
    collateral_score DECIMAL(5, 2) DEFAULT 0,
    closing_soon_boost DECIMAL(5, 2) DEFAULT 0,
    last_calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_loan (loan_id),
    INDEX idx_score (discovery_score DESC),
    INDEX idx_last_calculated (last_calculated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Investor Behavior Tracking Table
CREATE TABLE IF NOT EXISTS investor_behavior (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    investor_id BIGINT UNSIGNED NOT NULL,
    loan_id BIGINT UNSIGNED,
    event_type ENUM('viewed', 'invested', 'saved', 'dismissed', 'applied_filter', 'shared') NOT NULL,
    interest_rate_at_event DECIMAL(5, 2),
    loan_size_at_event DECIMAL(15, 2),
    risk_category_at_event VARCHAR(20),
    collateral_type_at_event VARCHAR(50),
    time_spent_seconds INT,
    device_type VARCHAR(20),
    source_page VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_investor (investor_id),
    INDEX idx_loan (loan_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Investor Recommendation Weights Table (AI Learning)
CREATE TABLE IF NOT EXISTS recommendation_weights (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    investor_id BIGINT UNSIGNED NOT NULL UNIQUE,
    interest_rate_weight DECIMAL(5, 2) DEFAULT 25,
    risk_match_weight DECIMAL(5, 2) DEFAULT 25,
    reputation_weight DECIMAL(5, 2) DEFAULT 20,
    funding_momentum_weight DECIMAL(5, 2) DEFAULT 15,
    collateral_weight DECIMAL(5, 2) DEFAULT 15,
    learning_iterations INT DEFAULT 0,
    last_learned_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_investor (investor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Loan Demand Signals Table (For Borrowers)
CREATE TABLE IF NOT EXISTS loan_demand_signals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL UNIQUE,
    demand_level ENUM('very_low', 'low', 'medium', 'high', 'very_high') DEFAULT 'medium',
    investor_interest_score DECIMAL(5, 2) DEFAULT 50,
    view_count INT DEFAULT 0,
    investment_intent_count INT DEFAULT 0,
    average_match_score DECIMAL(5, 2) DEFAULT 0,
    trending_direction ENUM('rising', 'stable', 'declining') DEFAULT 'stable',
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_loan (loan_id),
    INDEX idx_demand_level (demand_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Personalized Loan Feed Cache
CREATE TABLE IF NOT EXISTS loan_feed_cache (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    investor_id BIGINT UNSIGNED NOT NULL,
    feed_type ENUM('recommended', 'high_yield', 'low_risk', 'closing_soon') NOT NULL,
    loan_ids JSON NOT NULL,
    cache_key VARCHAR(100) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_investor_feed (investor_id, feed_type),
    INDEX idx_cache_key (cache_key),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Discovery Engine Analytics (Admin)
CREATE TABLE IF NOT EXISTS discovery_analytics (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    total_recommendations_shown INT DEFAULT 0,
    recommendations_clicked INT DEFAULT 0,
    recommendations_invested INT DEFAULT 0,
    average_funding_time_hours DECIMAL(10, 2),
    investor_engagement_rate DECIMAL(5, 2),
    recommendation_accuracy_score DECIMAL(5, 2),
    loans_funded_count INT DEFAULT 0,
    loans_funded_volume DECIMAL(15, 2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_date (date),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default discovery weights configuration
INSERT INTO recommendation_weights (investor_id, interest_rate_weight, risk_match_weight, reputation_weight, funding_momentum_weight, collateral_weight)
VALUES (0, 25, 25, 20, 15, 15);

-- Add discovery-specific columns to loan_requests if they don't exist
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS borrower_reputation_score DECIMAL(5, 2) DEFAULT 50;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS closing_soon TINYINT(1) DEFAULT 0;
