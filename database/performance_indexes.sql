-- Performance Indexes for Database Query Optimization (PERF-03)
-- This file adds composite indexes on foreign keys to improve query performance

-- =============================================
-- LOAN REQUEST TABLE INDEXES
-- =============================================

-- Index for borrower lookups
CREATE INDEX idx_loan_requests_borrower_id ON loan_requests(borrower_id);

-- Composite index for borrower status queries
CREATE INDEX idx_loan_requests_borrower_status ON loan_requests(borrower_id, status);

-- Composite index for approved/active loan listings
CREATE INDEX idx_loan_requests_status_created ON loan_requests(status, created_at);

-- Index for funding percentage calculations
CREATE INDEX idx_loan_requests_funded_amount ON loan_requests(funded_amount, loan_amount);

-- =============================================
-- LOAN FUNDING TABLE INDEXES
-- =============================================

-- Index for lender lookups
CREATE INDEX idx_loan_fundings_lender_id ON loan_fundings(lender_id);

-- Composite index for lender loan lookups
CREATE INDEX idx_loan_fundings_lender_loan ON loan_fundings(lender_id, loan_id);

-- Index for loan funding lookups
CREATE INDEX idx_loan_fundings_loan_id ON loan_fundings(loan_id);

-- Composite index for funding status
CREATE INDEX idx_loan_fundings_status_created ON loan_fundings(status, created_at);

-- =============================================
-- REPAYMENT TABLE INDEXES
-- =============================================

-- Index for borrower repayment lookups
CREATE INDEX idx_repayments_borrower_id ON repayments(borrower_id);

-- Index for loan repayment lookups
CREATE INDEX idx_repayments_loan_id ON repayments(loan_id);

-- Composite index for loan repayment status
CREATE INDEX idx_repayments_loan_status ON repayments(loan_id, status);

-- Index for due date queries
CREATE INDEX idx_repayments_due_date ON repayments(due_date);

-- =============================================
-- COLLATERAL ASSET TABLE INDEXES
-- =============================================

-- Index for borrower collateral lookups
CREATE INDEX idx_collateral_assets_borrower_id ON collateral_assets(borrower_id);

-- Index for loan collateral lookups  
CREATE INDEX idx_collateral_assets_loan_id ON collateral_assets(loan_id);

-- Composite index for collateral verification status
CREATE INDEX idx_collateral_assets_verification ON collateral_assets(verification_status, created_at);

-- =============================================
-- USER TABLE INDEXES
-- =============================================

-- Index for user role queries
CREATE INDEX idx_users_role ON users(role);

-- Index for KYC status queries
CREATE INDEX idx_users_kyc_status ON users(kyc_status);

-- Composite index for active user queries
CREATE INDEX idx_users_role_status ON users(role, is_active);

-- =============================================
-- TRANSACTION TABLE INDEXES  
-- =============================================

-- Index for user transaction lookups
CREATE INDEX idx_transactions_user_id ON transactions(user_id);

-- Composite index for transaction type queries
CREATE INDEX idx_transactions_user_type ON transactions(user_id, transaction_type_id);

-- Index for transaction status
CREATE INDEX idx_transactions_status ON transactions(status);

-- Composite index for date range queries
CREATE INDEX idx_transactions_created_status ON transactions(created_at, status);

-- =============================================
-- RESERVE FUND TRANSACTION INDEXES
-- =============================================

-- Index for reserve fund transaction lookups
CREATE INDEX idx_reserve_fund_transactions_created ON reserve_fund_transactions(created_at);

-- =============================================
-- ACCELERATOR TABLE INDEXES
-- =============================================

-- Index for loan accelerator lookups
CREATE INDEX idx_loan_funding_accelerator_loan_id ON loan_funding_accelerator(loan_id);

-- Composite index for accelerator stage queries
CREATE INDEX idx_loan_funding_accelerator_stage ON loan_funding_accelerator(accelerator_stage, funding_percentage);

-- =============================================
-- MATERIALIZED VIEWS FOR AGGREGATIONS (PERF-04)
-- =============================================

-- Create materialized view for loan statistics summary
CREATE TABLE IF NOT EXISTS mv_loan_statistics AS
SELECT 
    COUNT(*) as total_loans,
    SUM(CASE WHEN status IN ('active', 'funded') THEN 1 ELSE 0 END) as active_loans,
    SUM(loan_amount) as total_loan_amount,
    SUM(funded_amount) as total_funded_amount,
    AVG(interest_rate) as avg_interest_rate,
    COUNT(CASE WHEN status = 'defaulted' THEN 1 END) as defaulted_count,
    COUNT(CASE WHEN status = 'repaid' THEN 1 END) as repaid_count
FROM loan_requests
WHERE deleted_at IS NULL;

-- Create index on materialized view
CREATE INDEX idx_mv_loan_statistics ON mv_loan_statistics(total_loans);

-- Create materialized view for user loan summary
CREATE TABLE IF NOT EXISTS mv_user_loan_summary AS
SELECT 
    borrower_id,
    COUNT(*) as total_loans,
    SUM(loan_amount) as total_borrowed,
    SUM(funded_amount) as total_funded,
    SUM(CASE WHEN status = 'repaid' THEN 1 ELSE 0 END) as repaid_loans,
    SUM(CASE WHEN status = 'defaulted' THEN 1 ELSE 0 END) as defaulted_loans
FROM loan_requests
WHERE deleted_at IS NULL
GROUP BY borrower_id;

-- Create index on user loan summary
CREATE INDEX idx_mv_user_loan_summary_borrower ON mv_user_loan_summary(borrower_id);

-- Create materialized view for monthly statistics
CREATE TABLE IF NOT EXISTS mv_monthly_statistics AS
SELECT 
    DATE_FORMAT(created_at, '%Y-%m') as month,
    COUNT(*) as loan_count,
    SUM(loan_amount) as volume,
    SUM(funded_amount) as funded_volume,
    AVG(interest_rate) as avg_rate
FROM loan_requests
WHERE deleted_at IS NULL
GROUP BY DATE_FORMAT(created_at, '%Y-%m');

-- Create index on monthly statistics
CREATE INDEX idx_mv_monthly_statistics_month ON mv_monthly_statistics(month);

-- =============================================
-- FUNCTION TO REFRESH MATERIALIZED VIEWS
-- =============================================

DELIMITER //

CREATE PROCEDURE refresh_loan_statistics_mv()
BEGIN
    REPLACE INTO mv_loan_statistics
    SELECT 
        COUNT(*) as total_loans,
        SUM(CASE WHEN status IN ('active', 'funded') THEN 1 ELSE 0 END) as active_loans,
        SUM(loan_amount) as total_loan_amount,
        SUM(funded_amount) as total_funded_amount,
        AVG(interest_rate) as avg_interest_rate,
        COUNT(CASE WHEN status = 'defaulted' THEN 1 END) as defaulted_count,
        COUNT(CASE WHEN status = 'repaid' THEN 1 END) as repaid_count
    FROM loan_requests
    WHERE deleted_at IS NULL;
END //

CREATE PROCEDURE refresh_user_loan_summary_mv()
BEGIN
    REPLACE INTO mv_user_loan_summary
    SELECT 
        borrower_id,
        COUNT(*) as total_loans,
        SUM(loan_amount) as total_borrowed,
        SUM(funded_amount) as total_funded,
        SUM(CASE WHEN status = 'repaid' THEN 1 ELSE 0 END) as repaid_loans,
        SUM(CASE WHEN status = 'defaulted' THEN 1 ELSE 0 END) as defaulted_loans
    FROM loan_requests
    WHERE deleted_at IS NULL
    GROUP BY borrower_id;
END //

CREATE PROCEDURE refresh_monthly_statistics_mv()
BEGIN
    REPLACE INTO mv_monthly_statistics
    SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as loan_count,
        SUM(loan_amount) as volume,
        SUM(funded_amount) as funded_volume,
        AVG(interest_rate) as avg_rate
    FROM loan_requests
    WHERE deleted_at IS NULL
    GROUP BY DATE_FORMAT(created_at, '%Y-%m');
END //

CREATE PROCEDURE refresh_all_materialized_views()
BEGIN
    CALL refresh_loan_statistics_mv();
    CALL refresh_user_loan_summary_mv();
    CALL refresh_monthly_statistics_mv();
END //

DELIMITER ;
