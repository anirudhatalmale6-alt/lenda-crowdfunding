-- Performance Migration: Phase 8 - Database Query Efficiency
-- Created: 2026-03-16
-- This migration adds required indexes and implements log archival

-- =============================================
-- PERF-001: Add composite index on loan_fundings (lender_id, status)
-- =============================================

-- Create composite index for lender status queries
-- This optimizes queries like: SELECT * FROM loan_fundings WHERE lender_id = ? AND status = ?
CREATE INDEX idx_loan_fundings_lender_status ON loan_fundings(lender_id, status);

-- =============================================
-- PERF-002: Add indexes for cursor-based pagination
-- =============================================

-- Index for loan cursor pagination (ordered by id for efficient cursor navigation)
CREATE INDEX idx_loan_requests_cursor ON loan_requests(id DESC);

-- Index for discovery engine cursor pagination
CREATE INDEX idx_loan_discovery_cursor ON loan_requests(status, id DESC);

-- =============================================
-- PERF-004: Blockchain event logs archival
-- =============================================

-- Create archive table for old blockchain events
CREATE TABLE IF NOT EXISTS blockchain_event_logs_archive LIKE blockchain_event_logs;

-- Add archival status column to main table
ALTER TABLE blockchain_event_logs ADD COLUMN IF NOT EXISTS archived TINYINT(1) DEFAULT 0;

-- Create procedure to archive old events (older than 90 days)
DELIMITER //

CREATE PROCEDURE archive_blockchain_events()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE archive_count INT DEFAULT 0;
    DECLARE batch_size INT DEFAULT 10000;
    DECLARE cutoff_date TIMESTAMP DEFAULT DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- Move old processed events to archive table
    INSERT INTO blockchain_event_logs_archive
    SELECT * FROM blockchain_event_logs 
    WHERE processed = 1 
    AND created_at < cutoff_date
    AND archived = 0
    LIMIT batch_size;
    
    SET archive_count = ROW_COUNT();
    
    -- Mark archived records
    UPDATE blockchain_event_logs 
    SET archived = 1 
    WHERE processed = 1 
    AND created_at < cutoff_date
    AND archived = 0
    LIMIT batch_size;
    
    -- Delete from archive table if needed (optional cleanup)
    DELETE FROM blockchain_event_logs WHERE archived = 1 AND created_at < DATE_SUB(NOW(), INTERVAL 180 DAY);
    
    SELECT archive_count as archived_count;
END //

DELIMITER ;

-- Create event to run archival daily at 2 AM
CREATE EVENT IF NOT EXISTS daily_blockchain_event_archive
ON SCHEDULE EVERY 1 DAY
STARTS '2026-03-17 02:00:00'
DO
    CALL archive_blockchain_events();

-- =============================================
-- Additional Performance Indexes
-- =============================================

-- Index for loan status + risk score queries (discovery engine)
CREATE INDEX idx_loan_status_risk ON loan_requests(status, risk_score);

-- Index for loan funding percentage calculations
CREATE INDEX idx_loan_funding_progress ON loan_requests(status, funded_amount, loan_amount);

-- Index for repayment distribution (PERF-003 - N+1 fix support)
CREATE INDEX idx_repayments_loan_borrower ON repayments(loan_id, borrower_id);

-- Index for user wallet queries
CREATE INDEX idx_wallet_user_type ON wallet_accounts(user_id, type);

-- Index for reserve fund transactions by date
CREATE INDEX idx_reserve_fund_transactions_date ON reserve_fund_transactions(created_at, type);
