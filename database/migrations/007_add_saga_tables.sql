-- ============================================================
-- SAGA ORCHESTRATION TABLES (DATA-01)
-- Distributed transaction coordination
-- ============================================================

-- Saga orchestrations table
CREATE TABLE IF NOT EXISTS saga_orchestrations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    saga_type VARCHAR(50) NOT NULL,
    status ENUM('pending', 'running', 'completed', 'compensating', 'failed', 'partially_completed') DEFAULT 'pending',
    metadata JSON,
    error_message TEXT,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_saga_type (saga_type),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Saga steps table
CREATE TABLE IF NOT EXISTS saga_steps (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    saga_id BIGINT UNSIGNED NOT NULL,
    step_index INT NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    step_type ENUM('database', 'blockchain', 'api', 'external') DEFAULT 'database',
    status ENUM('pending', 'running', 'completed', 'failed', 'compensated', 'compensation_failed') DEFAULT 'pending',
    request_data JSON,
    response_data JSON,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (saga_id) REFERENCES saga_orchestrations(id) ON DELETE CASCADE,
    INDEX idx_saga (saga_id),
    INDEX idx_step_index (step_index),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RESERVE POOL RECONCILIATION TABLE (DATA-02)
-- Track reconciliation status of reserve pools
-- ============================================================

CREATE TABLE IF NOT EXISTS reserve_pool_reconciliations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pool_id BIGINT UNSIGNED NOT NULL,
    pool_type ENUM('guarantee', 'insurance', 'liquidity', 'recovery') NOT NULL,
    reconciliation_type ENUM('daily', 'weekly', 'monthly', 'on_demand') DEFAULT 'daily',
    
    -- On-chain values
    onchain_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
    onchain_total_debits DECIMAL(20, 8) NOT NULL DEFAULT 0,
    onchain_total_credits DECIMAL(20, 8) NOT NULL DEFAULT 0,
    onchain_block_number BIGINT UNSIGNED,
    onchain_verified_at TIMESTAMP NULL,
    
    -- Off-chain values
    offchain_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
    offchain_total_debits DECIMAL(20, 8) NOT NULL DEFAULT 0,
    offchain_total_credits DECIMAL(20, 8) NOT NULL DEFAULT 0,
    offchain_verified_at TIMESTAMP NULL,
    
    -- Comparison results
    balance_discrepancy DECIMAL(20, 8) DEFAULT 0,
    debits_discrepancy DECIMAL(20, 8) DEFAULT 0,
    credits_discrepancy DECIMAL(20, 8) DEFAULT 0,
    is_balanced TINYINT(1) DEFAULT 0,
    
    -- Bookkeeping verification
    bookkeeping_balanced TINYINT(1) DEFAULT 0,
    bookkeeping_discrepancy DECIMAL(20, 8) DEFAULT 0,
    
    -- Status and notes
    status ENUM('in_progress', 'completed', 'failed', 'discrepancy_found', 'resolved') DEFAULT 'in_progress',
    discrepancy_reason VARCHAR(255),
    resolution_notes TEXT,
    
    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    next_reconciliation_at TIMESTAMP NULL,
    
    INDEX idx_pool (pool_id),
    INDEX idx_pool_type (pool_type),
    INDEX idx_reconciliation_type (reconciliation_type),
    INDEX idx_status (status),
    INDEX idx_completed (completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
