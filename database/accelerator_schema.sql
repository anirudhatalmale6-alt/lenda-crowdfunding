-- Loan Funding Accelerator System Database Schema
-- PostgreSQL / MySQL Compatible

-- ============================================================
-- ACCELERATOR SETTINGS (Admin Configuration)
-- ============================================================

CREATE TABLE IF NOT EXISTS accelerator_settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) NOT NULL UNIQUE,
    setting_value VARCHAR(255) NOT NULL,
    setting_type ENUM('percentage', 'boolean', 'number', 'json') DEFAULT 'percentage',
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (setting_key),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default accelerator settings
INSERT INTO accelerator_settings (setting_key, setting_value, setting_type, description) VALUES
('trending_threshold', '50', 'percentage', 'Funding percentage to trigger trending/visibility boost'),
('notification_threshold', '75', 'percentage', 'Funding percentage to trigger investor notifications'),
('liquidity_pool_threshold', '90', 'percentage', 'Funding percentage to enable liquidity pool completion'),
('auto_notifications_enabled', 'true', 'boolean', 'Enable automatic investor notifications'),
('liquidity_pool_enabled', 'true', 'boolean', 'Enable liquidity pool participation'),
('visibility_boost_enabled', 'true', 'boolean', 'Enable visibility boost for trending loans'),
('max_rate_increase', '5', 'number', 'Maximum interest rate increase for borrower boost'),
('min_rate_increase', '0.5', 'number', 'Minimum interest rate increase for borrower boost');

-- ============================================================
-- LOAN FUNDING ACCELERATOR (Per-Loan Tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS loan_funding_accelerator (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL UNIQUE,
    total_amount DECIMAL(15, 2) NOT NULL,
    funded_amount DECIMAL(15, 2) DEFAULT 0,
    funding_percentage DECIMAL(5, 2) DEFAULT 0,
    accelerator_stage ENUM('none', 'trending', 'hot', 'almost_funded', 'funded') DEFAULT 'none',
    is_trending BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    visibility_boosted_at TIMESTAMP NULL,
    notification_sent_at TIMESTAMP NULL,
    liquidity_pool_enabled BOOLEAN DEFAULT FALSE,
    liquidity_pool_contribution DECIMAL(15, 2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    INDEX idx_loan (loan_id),
    INDEX idx_stage (accelerator_stage),
    INDEX idx_percentage (funding_percentage),
    INDEX idx_trending (is_trending),
    INDEX idx_featured (is_featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ACCELERATOR LOG (Event Tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS accelerator_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    stage_triggered ENUM('trending', 'notification', 'liquidity_pool', 'rate_boost', 'fully_funded') NOT NULL,
    funding_percentage DECIMAL(5, 2) NOT NULL,
    action_taken VARCHAR(255) NOT NULL,
    details JSON,
    triggered_by ENUM('system', 'borrower', 'admin') DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    INDEX idx_loan (loan_id),
    INDEX idx_stage (stage_triggered),
    INDEX idx_triggered_by (triggered_by),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- BORROWER RATE BOOST REQUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS borrower_rate_boosts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    borrower_id BIGINT UNSIGNED NOT NULL,
    original_rate DECIMAL(5, 2) NOT NULL,
    requested_rate DECIMAL(5, 2) NOT NULL,
    rate_increase DECIMAL(5, 2) NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT 'pending',
    approved_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (borrower_id) REFERENCES users(id),
    INDEX idx_loan (loan_id),
    INDEX idx_borrower (borrower_id),
    INDEX idx_status (status),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INVESTOR NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS investor_notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    notification_type ENUM('email', 'in_app', 'push') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_loan (loan_id),
    INDEX idx_user (user_id),
    INDEX idx_type (notification_type),
    INDEX idx_sent (is_sent),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ACCELERATOR ANALYTICS
-- ============================================================

CREATE TABLE IF NOT EXISTS accelerator_analytics (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_loans INT DEFAULT 0,
    loans_at_50_percent INT DEFAULT 0,
    loans_at_75_percent INT DEFAULT 0,
    loans_at_90_percent INT DEFAULT 0,
    loans_fully_funded INT DEFAULT 0,
    average_funding_time_hours DECIMAL(10, 2) DEFAULT 0,
    loans_using_rate_boost INT DEFAULT 0,
    liquidity_pool_contributions DECIMAL(15, 2) DEFAULT 0,
    notifications_sent INT DEFAULT 0,
    click_through_rate DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_period (period_start, period_end),
    INDEX idx_period (period_start, period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MARKETPLACE FEATURED SLOTS
-- ============================================================

CREATE TABLE IF NOT EXISTS marketplace_featured_slots (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    slot_position INT NOT NULL,
    slot_type ENUM('trending', 'hot', 'featured', 'almost_funded') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ends_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE,
    INDEX idx_loan (loan_id),
    INDEX idx_active (is_active),
    INDEX idx_type (slot_type),
    INDEX idx_ends (ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
