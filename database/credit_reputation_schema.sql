-- ============================================================
-- LENDA CREDIT REPUTATION SYSTEM DATABASE SCHEMA
-- PostgreSQL / MySQL Compatible
-- ============================================================

-- ============================================================
-- BORROWER CREDIT TABLE
-- Core credit reputation data for each borrower
-- ============================================================

CREATE TABLE IF NOT EXISTS borrower_credit (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    borrower_id BIGINT UNSIGNED NOT NULL UNIQUE,
    credit_score INT NOT NULL DEFAULT 500,
    credit_category ENUM('elite', 'excellent', 'good', 'fair', 'weak', 'high_risk') DEFAULT 'fair',
    
    -- Loan counts
    total_loans INT DEFAULT 0,
    successful_loans INT DEFAULT 0,
    defaulted_loans INT DEFAULT 0,
    active_loans INT DEFAULT 0,
    
    -- Financial history
    total_borrowed DECIMAL(15, 2) DEFAULT 0,
    total_repaid DECIMAL(15, 2) DEFAULT 0,
    total_defaulted DECIMAL(15, 2) DEFAULT 0,
    
    -- Repayment metrics
    repayment_rate DECIMAL(5, 2) DEFAULT 0,
    on_time_payment_rate DECIMAL(5, 2) DEFAULT 100,
    avg_days_late INT DEFAULT 0,
    
    -- Collateral history
    collateral_count INT DEFAULT 0,
    verified_collateral_count INT DEFAULT 0,
    
    -- Account metrics
    account_age_months INT DEFAULT 0,
    last_loan_date DATE,
    last_payment_date DATE,
    
    -- Score factors (for transparency)
    repayment_history_score DECIMAL(5, 2) DEFAULT 0,
    loan_completion_score DECIMAL(5, 2) DEFAULT 0,
    collateral_quality_score DECIMAL(5, 2) DEFAULT 0,
    account_longevity_score DECIMAL(5, 2) DEFAULT 0,
    marketplace_reputation_score DECIMAL(5, 2) DEFAULT 0,
    
    -- Metadata
    score_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (borrower_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_borrower (borrower_id),
    INDEX idx_credit_score (credit_score),
    INDEX idx_credit_category (credit_category),
    INDEX idx_repayment_rate (repayment_rate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- REPAYMENT HISTORY TABLE
-- Detailed payment history for each loan
-- ============================================================

CREATE TABLE IF NOT EXISTS borrower_repayment_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    borrower_id BIGINT UNSIGNED NOT NULL,
    
    -- Payment details
    payment_number INT NOT NULL,
    amount_due DECIMAL(15, 2) NOT NULL,
    amount_paid DECIMAL(15, 2) DEFAULT 0,
    principal_paid DECIMAL(15, 2) DEFAULT 0,
    interest_paid DECIMAL(15, 2) DEFAULT 0,
    late_fees DECIMAL(15, 2) DEFAULT 0,
    
    -- Status
    status ENUM('pending', 'paid', 'late', 'very_late', 'defaulted', 'forgiven') DEFAULT 'pending',
    
    -- Timing
    due_date DATE NOT NULL,
    paid_at TIMESTAMP,
    days_late INT DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (borrower_id) REFERENCES users(id),
    INDEX idx_loan (loan_id),
    INDEX idx_borrower (borrower_id),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status),
    INDEX idx_paid_at (paid_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- REPUTATION BADGE TABLE
-- Performance badges earned by borrowers
-- ============================================================

CREATE TABLE IF NOT EXISTS borrower_badges (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    borrower_id BIGINT UNSIGNED NOT NULL,
    
    -- Badge details
    badge_type ENUM(
        'reliable_borrower',
        'high_repayment_streak',
        'collateral_verified',
        'veteran_borrower',
        'on_time_king',
        'first_loan_completed',
        'consistent_borrower',
        'trusted_borrower',
        'low_ratio_borrower',
        'fast_payer'
    ) NOT NULL,
    badge_name VARCHAR(100) NOT NULL,
    badge_description TEXT,
    badge_icon VARCHAR(50),
    
    -- Achievement metrics
    metric_value DECIMAL(15, 2),
    threshold_value DECIMAL(15, 2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (borrower_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_borrower (borrower_id),
    INDEX idx_badge_type (badge_type),
    INDEX idx_awarded_at (awarded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CREDIT SCORE HISTORY TABLE
-- Historical tracking of credit score changes
-- ============================================================

CREATE TABLE IF NOT EXISTS credit_score_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    borrower_id BIGINT UNSIGNED NOT NULL,
    
    -- Score details
    credit_score INT NOT NULL,
    credit_category ENUM('elite', 'excellent', 'good', 'fair', 'weak', 'high_risk') NOT NULL,
    
    -- Change details
    score_change INT DEFAULT 0,
    previous_score INT,
    change_reason VARCHAR(255),
    
    -- Factors that influenced the score
    factors JSON,
    
    -- Metadata
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (borrower_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_borrower (borrower_id),
    INDEX idx_credit_score (credit_score),
    INDEX idx_calculated_at (calculated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- BORROWER REPUTATION SIGNALS TABLE
-- Real-time signals for investors
-- ============================================================

CREATE TABLE IF NOT EXISTS borrower_reputation_signals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    borrower_id BIGINT UNSIGNED NOT NULL,
    loan_id BIGINT UNSIGNED,
    
    -- Signal details
    signal_type ENUM(
        'high_reputation_high_rate',
        'high_reputation_low_rate',
        'low_reputation_high_rate',
        'low_reputation_low_rate',
        'new_borrower',
        'improving_score',
        'declining_score',
        'consistent_performance'
    ) NOT NULL,
    
    signal_strength ENUM('strong', 'moderate', 'weak') DEFAULT 'moderate',
    signal_message TEXT,
    
    -- Associated metrics
    borrower_credit_score INT,
    offered_interest_rate DECIMAL(5, 2),
    market_average_rate DECIMAL(5, 2),
    
    -- Metadata
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    FOREIGN KEY (borrower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    INDEX idx_borrower (borrower_id),
    INDEX idx_loan (loan_id),
    INDEX idx_signal_type (signal_type),
    INDEX idx_generated_at (generated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CREDIT MONITORING SUMMARY TABLE
-- Admin dashboard aggregated data
-- ============================================================

CREATE TABLE IF NOT EXISTS credit_monitoring_summary (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Summary metrics
    total_borrowers INT DEFAULT 0,
    average_credit_score DECIMAL(5, 2) DEFAULT 0,
    average_repayment_rate DECIMAL(5, 2) DEFAULT 0,
    
    -- Category breakdown
    elite_count INT DEFAULT 0,
    excellent_count INT DEFAULT 0,
    good_count INT DEFAULT 0,
    fair_count INT DEFAULT 0,
    weak_count INT DEFAULT 0,
    high_risk_count INT DEFAULT 0,
    
    -- Default statistics
    total_defaults INT DEFAULT 0,
    default_rate DECIMAL(5, 2) DEFAULT 0,
    total_defaulted_amount DECIMAL(15, 2) DEFAULT 0,
    
    -- Tier performance (by score tier)
    elite_default_rate DECIMAL(5, 2) DEFAULT 0,
    excellent_default_rate DECIMAL(5, 2) DEFAULT 0,
    good_default_rate DECIMAL(5, 2) DEFAULT 0,
    fair_default_rate DECIMAL(5, 2) DEFAULT 0,
    weak_default_rate DECIMAL(5, 2) DEFAULT 0,
    high_risk_default_rate DECIMAL(5, 2) DEFAULT 0,
    
    -- Badge statistics
    total_badges_awarded INT DEFAULT 0,
    reliable_borrower_count INT DEFAULT 0,
    veteran_borrower_count INT DEFAULT 0,
    
    -- Metadata
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_date (calculated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CREDIT IMPROVEMENT RECOMMENDATIONS TABLE
-- Stored recommendations for borrowers
-- ============================================================

CREATE TABLE IF NOT EXISTS credit_improvement_recommendations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    borrower_id BIGINT UNSIGNED NOT NULL,
    
    -- Recommendation details
    recommendation_type ENUM(
        'repay_early',
        'reduce_debt',
        'provide_collateral',
        'increase_income',
        'build_history',
        'verify_documents',
        'maintain_consistency'
    ) NOT NULL,
    
    recommendation_title VARCHAR(255) NOT NULL,
    recommendation_description TEXT,
    potential_impact INT,
    priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (borrower_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_borrower (borrower_id),
    INDEX idx_recommendation_type (recommendation_type),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
