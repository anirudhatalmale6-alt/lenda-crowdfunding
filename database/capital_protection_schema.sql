-- LENDA Capital Protection System Database Schema
-- Three-tier capital structure with automatic safety triggers

-- ============================================================
-- CAPITAL PROTECTION CORE TABLES
-- ============================================================

-- Capital Pool - Three-tier capital structure
CREATE TABLE IF NOT EXISTS capital_pools (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pool_type ENUM('operational', 'guarantee', 'emergency') NOT NULL UNIQUE,
    pool_name VARCHAR(100) NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0,
    locked_balance DECIMAL(15, 2) DEFAULT 0,
    available_balance DECIMAL(15, 2) GENERATED ALWAYS AS (balance - locked_balance) STORED,
    minimum_required DECIMAL(15, 2) DEFAULT 0,
    target_balance DECIMAL(15, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    last_replenished_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (pool_type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Capital Pool Transactions
CREATE TABLE IF NOT EXISTS capital_pool_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pool_id BIGINT UNSIGNED NOT NULL,
    transaction_type ENUM(
        -- Operational pool sources
        'transaction_fee', 'origination_fee', 'marketplace_commission',
        -- Guarantee pool sources
        'loan_insurance_fee', 'investor_interest_share', 'collateral_liquidation',
        -- Emergency pool sources
        'platform_profit', 'institutional_injection', 'external_capital',
        -- Outflows
        'claim_payment', 'operational_expense', 'reserve_transfer', 'liquidity_support'
    ) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT UNSIGNED,
    description VARCHAR(255),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pool_id) REFERENCES capital_pools(id),
    INDEX idx_pool (pool_id),
    INDEX idx_type (transaction_type),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- GUARANTEE COVERAGE TRACKING
-- ============================================================

-- Loan Guarantee Status
CREATE TABLE IF NOT EXISTS loan_guarantees (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL UNIQUE,
    guarantee_amount DECIMAL(15, 2) NOT NULL,
    guarantee_rate DECIMAL(5, 2) DEFAULT 100.00,
    coverage_type ENUM('full', 'partial', 'collateral_backed') DEFAULT 'full',
    status ENUM('active', 'claimed', 'released', 'expired') DEFAULT 'active',
    claimed_amount DECIMAL(15, 2) DEFAULT 0,
    claim_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    claimed_at TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    INDEX idx_loan (loan_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Guarantee Claims
CREATE TABLE IF NOT EXISTS guarantee_claims (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    guarantee_id BIGINT UNSIGNED NOT NULL,
    loan_id BIGINT UNSIGNED NOT NULL,
    claim_amount DECIMAL(15, 2) NOT NULL,
    approved_amount DECIMAL(15, 2),
    status ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
    claim_reason ENUM('borrower_default', 'late_repayment', 'collateral_insufficient') NOT NULL,
    reviewed_by BIGINT UNSIGNED,
    reviewed_at TIMESTAMP,
    payment_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (guarantee_id) REFERENCES loan_guarantees(id),
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    INDEX idx_guarantee (guarantee_id),
    INDEX idx_loan (loan_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- COVERAGE RATIO MONITORING
-- ============================================================

-- Coverage Ratio History
CREATE TABLE IF NOT EXISTS coverage_ratio_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    guarantee_pool_balance DECIMAL(15, 2) NOT NULL,
    outstanding_guaranteed_loans DECIMAL(15, 2) NOT NULL,
    coverage_ratio DECIMAL(5, 2) NOT NULL,
    operational_pool_balance DECIMAL(15, 2) NOT NULL,
    emergency_pool_balance DECIMAL(15, 2) NOT NULL,
    total_reserve DECIMAL(15, 2) NOT NULL,
    default_rate DECIMAL(5, 2) DEFAULT 0,
    collateral_coverage DECIMAL(5, 2) DEFAULT 0,
    system_health ENUM('strong', 'healthy', 'warning', 'critical') DEFAULT 'healthy',
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_calculated (calculated_at),
    INDEX idx_health (system_health)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AUTOMATIC SAFETY TRIGGERS
-- ============================================================

-- Safety Trigger Configurations
CREATE TABLE IF NOT EXISTS safety_triggers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trigger_name VARCHAR(100) NOT NULL UNIQUE,
    trigger_type ENUM(
        'lending_slowdown',      -- Coverage < 30%
        'lending_pause',         -- Coverage < 20%
        'emergency_mode',        -- Coverage < 15%
        'default_rate_spike',    -- Default rate exceeds threshold
        'collateral_decline',   -- Collateral value drops sharply
        'reserve_depletion'      -- Reserve running low
    ) NOT NULL,
    threshold_value DECIMAL(5, 2) NOT NULL,
    current_value DECIMAL(5, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_triggered BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMP,
    auto_action ENUM('none', 'reduce_approval', 'pause_listing', 'restrict_collateral_only'),
    action_description VARCHAR(255),
    cooldown_minutes INT DEFAULT 60,
    last_triggered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (trigger_type),
    INDEX idx_active (is_active),
    INDEX idx_triggered (is_triggered)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Safety Trigger Log
CREATE TABLE IF NOT EXISTS safety_trigger_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trigger_id BIGINT UNSIGNED NOT NULL,
    trigger_name VARCHAR(100) NOT NULL,
    threshold_value DECIMAL(5, 2) NOT NULL,
    actual_value DECIMAL(5, 2) NOT NULL,
    action_taken VARCHAR(255),
    system_response JSON,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trigger_id) REFERENCES safety_triggers(id),
    INDEX idx_trigger (trigger_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- STRESS TEST ENGINE
-- ============================================================

-- Stress Test Scenarios
CREATE TABLE IF NOT EXISTS stress_test_scenarios (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    scenario_name VARCHAR(100) NOT NULL,
    scenario_description TEXT,
    default_rate DECIMAL(5, 2) NOT NULL,
    collateral_recovery_rate DECIMAL(5, 2) DEFAULT 50.00,
    economic_factor DECIMAL(5, 2) DEFAULT 1.0,
    is_preset BOOLEAN DEFAULT FALSE,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_name (scenario_name),
    INDEX idx_preset (is_preset)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stress Test Results
CREATE TABLE IF NOT EXISTS stress_test_results (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    scenario_id BIGINT UNSIGNED NOT NULL,
    scenario_name VARCHAR(100) NOT NULL,
    total_loans_affected DECIMAL(15, 2) NOT NULL,
    estimated_default_amount DECIMAL(15, 2) NOT NULL,
    collateral_recovery_amount DECIMAL(15, 2) DEFAULT 0,
    guarantee_claim_amount DECIMAL(15, 2) NOT NULL,
    reserve_depletion DECIMAL(15, 2) NOT NULL,
    reserve_after_stress DECIMAL(15, 2) NOT NULL,
    coverage_ratio_after DECIMAL(5, 2) NOT NULL,
    liquidity_impact DECIMAL(15, 2) NOT NULL,
    platform_stability_score DECIMAL(5, 2),
    depletion_timeline_days INT,
    recommendations JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scenario_id) REFERENCES stress_test_scenarios(id),
    INDEX idx_scenario (scenario_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ADMIN ALERTS
-- ============================================================

-- System Alerts
CREATE TABLE IF NOT EXISTS system_alerts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    alert_type ENUM(
        'reserve_low', 'coverage_below_threshold', 'default_rate_spike',
        'collateral_decline', 'trigger_activated', 'emergency_mode',
        'liquidity_warning', 'system_recovery'
    ) NOT NULL,
    severity ENUM('info', 'warning', 'critical', 'emergency') DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50),
    related_entity_id BIGINT UNSIGNED,
    metadata JSON,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by BIGINT UNSIGNED,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (alert_type),
    INDEX idx_severity (severity),
    INDEX idx_resolved (is_resolved),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alert Recipients
CREATE TABLE IF NOT EXISTS alert_recipients (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    alert_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    notification_type ENUM('dashboard', 'email', 'sms') DEFAULT 'dashboard',
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alert_id) REFERENCES system_alerts(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_alert (alert_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- LOAN EXPOSURE TRACKING
-- ============================================================

-- Loan Exposure Summary (Daily Snapshot)
CREATE TABLE IF NOT EXISTS loan_exposure_summary (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    snapshot_date DATE NOT NULL UNIQUE,
    total_loans DECIMAL(15, 2) DEFAULT 0,
    guaranteed_loans DECIMAL(15, 2) DEFAULT 0,
    collateral_value DECIMAL(15, 2) DEFAULT 0,
    active_loans_count INT DEFAULT 0,
    defaulted_loans_count INT DEFAULT 0,
    total_defaulted_amount DECIMAL(15, 2) DEFAULT 0,
    collateral_coverage_ratio DECIMAL(5, 2) DEFAULT 0,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_date (snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INITIAL DATA
-- ============================================================

-- Initialize Capital Pools
INSERT INTO capital_pools (pool_type, pool_name, balance, minimum_required, target_balance) VALUES
('operational', 'Operational Reserve', 250000.00, 100000.00, 500000.00),
('guarantee', 'Guarantee Reserve', 2000000.00, 500000.00, 5000000.00),
('emergency', 'Emergency Capital Buffer', 500000.00, 250000.00, 1000000.00);

-- Initialize Safety Triggers
INSERT INTO safety_triggers (trigger_name, trigger_type, threshold_value, auto_action, action_description) VALUES
('Lending Slowdown', 'lending_slowdown', 30.00, 'reduce_approval', 'Reduce maximum new loan approvals by 50%'),
('Lending Pause', 'lending_pause', 20.00, 'pause_listing', 'Pause new loan listings temporarily'),
('Emergency Mode', 'emergency_mode', 15.00, 'restrict_collateral_only', 'Only refinance or collateral-backed loans allowed'),
('Default Rate Spike', 'default_rate_spike', 10.00, 'reduce_approval', 'Reduce approval rate and increase scrutiny'),
('Collateral Decline', 'collateral_decline', 20.00, 'reduce_approval', 'Increase collateral requirements');

-- Initialize Preset Stress Test Scenarios
INSERT INTO stress_test_scenarios (scenario_name, scenario_description, default_rate, collateral_recovery_rate, is_preset) VALUES
('Mild Stress', '5% default rate - Minor economic downturn', 5.00, 60.00, TRUE),
('Moderate Stress', '10% default rate - Significant economic downturn', 10.00, 45.00, TRUE),
('Severe Stress', '20% default rate - Major financial crisis', 20.00, 30.00, TRUE),
('Crisis Scenario', '30% default rate - Extreme market conditions', 30.00, 20.00, TRUE);

-- Initialize Loan Exposure Summary
INSERT INTO loan_exposure_summary (snapshot_date, total_loans, guaranteed_loans, collateral_value, active_loans_count) VALUES
(CURRENT_DATE, 5000000.00, 2000000.00, 6000000.00, 150);
