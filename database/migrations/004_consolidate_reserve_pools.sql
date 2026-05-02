-- Migration: Consolidate reserve fund and reserve pools
-- ARCH-009: Consolidate to single reserve pool architecture

-- Step 1: Migrate data from reserve_fund to reserve_pools
-- Check if we have existing data in reserve_fund
INSERT INTO reserve_pools (pool_name, pool_type, balance, locked_balance, target_coverage_ratio, min_coverage_ratio, max_coverage_ratio, total_claims_paid, total_replenished, status, created_at, updated_at)
SELECT 
    'Legacy Reserve Fund' AS pool_name,
    'guarantee' AS pool_type,
    COALESCE(balance, 0) AS balance,
    COALESCE(locked_balance, 0) AS locked_balance,
    COALESCE(coverage_ratio, 4.00) AS target_coverage_ratio,
    2.00 AS min_coverage_ratio,
    10.00 AS max_coverage_ratio,
    COALESCE(total_claims_paid, 0) AS total_claims_paid,
    COALESCE(total_replenished, 0) AS total_replenished,
    'active' AS status,
    NOW() AS created_at,
    NOW() AS updated_at
FROM reserve_fund
WHERE id = 1;

-- Step 2: Add migration tracking column to reserve_fund
ALTER TABLE reserve_fund 
ADD COLUMN migrated_to_pool_id BIGINT UNSIGNED NULL;

-- Step 3: Mark old records as migrated
UPDATE reserve_fund rf
JOIN reserve_pools rp ON rp.pool_name = 'Legacy Reserve Fund'
SET rf.migrated_to_pool_id = rp.id
WHERE rf.id = 1;

-- Step 4: Create views for backward compatibility
-- View that presents unified reserve data
CREATE OR REPLACE VIEW v_unified_reserve AS
SELECT 
    rp.id,
    rp.pool_name,
    rp.pool_type,
    rp.balance,
    rp.locked_balance,
    rp.available_balance,
    rp.target_coverage_ratio,
    rp.current_coverage_ratio,
    rp.min_coverage_ratio,
    rp.max_coverage_ratio,
    rp.total_claims_paid,
    rp.total_replenished,
    rp.status,
    rp.created_at,
    rp.updated_at,
    'new' AS source_table
FROM reserve_pools rp
WHERE rp.status != 'closed'
UNION ALL
SELECT 
    rf.id + 10000 AS id,  -- Offset to avoid ID conflicts
    'Legacy Reserve Fund' AS pool_name,
    'guarantee' AS pool_type,
    rf.balance,
    rf.locked_balance,
    rf.balance - rf.locked_balance AS available_balance,
    rf.coverage_ratio AS target_coverage_ratio,
    rf.coverage_ratio AS current_coverage_ratio,
    2.00 AS min_coverage_ratio,
    10.00 AS max_coverage_ratio,
    rf.total_claims_paid,
    rf.total_replenished,
    'deprecated' AS status,
    NOW() AS created_at,
    NOW() AS updated_at,
    'legacy' AS source_table
FROM reserve_fund rf
WHERE rf.migrated_to_pool_id IS NULL;

-- Step 5: Create procedure for consolidated balance queries
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_get_total_reserve_balance()
BEGIN
    SELECT 
        SUM(balance) AS total_balance,
        SUM(locked_balance) AS total_locked,
        SUM(balance - locked_balance) AS total_available,
        SUM(total_claims_paid) AS total_claims,
        SUM(total_replenished) AS total_replenished
    FROM reserve_pools
    WHERE status = 'active';
END //
DELIMITER ;

-- Step 6: Optional - Drop old table after full migration (run after testing)
-- ALTER TABLE reserve_fund_transactions DROP FOREIGN KEY reserve_fund_transactions_ibfk_1;
-- ALTER TABLE reserve_fund_transactions ADD CONSTRAINT fk_reserve_pool_transaction 
--     FOREIGN KEY (loan_id) REFERENCES reserve_pools(id) ON DELETE SET NULL;
-- DROP TABLE IF EXISTS reserve_fund;

-- Migration complete
-- The reserve_pools table is now the single source of truth for reserve data
