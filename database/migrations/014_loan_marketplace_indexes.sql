-- Migration: Add composite indexes for loan marketplace queries
-- Version: 014
-- Date: 2026-03-19
-- Description: Addresses ARCH-03 - Add composite indexes for loan marketplace queries

-- ============================================================
-- Loan Marketplace Search Indexes
-- ============================================================

-- Index for marketplace loan filtering by status, amount range, and date
-- Supports: /api/v2/loans?status=active&min_amount=1000&max_amount=50000
CREATE INDEX IF NOT EXISTS idx_loan_marketplace_status_amount 
ON loan_requests (status, loan_amount, created_at DESC);

-- Index for marketplace loan filtering by interest rate range
-- Supports: /api/v2/loans?status=active&min_rate=5&max_rate=15
CREATE INDEX IF NOT EXISTS idx_loan_marketplace_status_rate 
ON loan_requests (status, interest_rate, created_at DESC);

-- Index for marketplace loan filtering by duration
-- Supports: /api/v2/loans?status=active&duration=12
CREATE INDEX IF NOT EXISTS idx_loan_marketplace_status_duration 
ON loan_requests (status, duration_months, created_at DESC);

-- Index for marketplace loan filtering by borrower risk score
-- Supports: /api/v2/loans?status=active&min_risk_score=70
CREATE INDEX IF NOT EXISTS idx_loan_marketplace_status_risk 
ON loan_requests (status, risk_score DESC, created_at DESC);

-- Composite index for funded amount percentage (for sorting by funding progress)
-- Supports: /api/v2/loans?sort=funding_progress
CREATE INDEX IF NOT EXISTS idx_loan_funding_progress 
ON loan_requests (status, funded_amount, loan_amount, created_at DESC);

-- ============================================================
-- Accelerator/Marketplace Featured Loans Indexes
-- ============================================================

-- Index for trending loans (high funding percentage)
-- Supports: /api/v2/loans/trending
CREATE INDEX IF NOT EXISTS idx_loan_trending 
ON loan_requests (status, funded_amount DESC, created_at DESC);

-- Index for closing soon loans (near deadline)
-- Supports: /api/v2/loans/closing-soon
CREATE INDEX IF NOT EXISTS idx_loan_closing_soon 
ON loan_requests (status, end_date, created_at DESC);

-- Index for almost funded loans (90%+ funded)
-- Supports: /api/v2/accelerator/almost-funded
CREATE INDEX IF NOT EXISTS idx_loan_almost_funded 
ON loan_requests (status, funded_amount, loan_amount);

-- Index for hot opportunities (high interest, trending)
-- Supports: /api/v2/accelerator/hot-opportunities
CREATE INDEX IF NOT EXISTS idx_loan_hot_opportunities 
ON loan_requests (status, interest_rate DESC, funded_amount DESC);

-- Index for high yield opportunities
-- Supports: /api/v2/accelerator/high-yield
CREATE INDEX IF NOT EXISTS idx_loan_high_yield 
ON loan_requests (status, interest_rate DESC, created_at DESC);

-- ============================================================
-- Discovery Engine / Recommendation Indexes
-- ============================================================

-- Index for discovery recommendations by user preference match
-- Supports: /api/v2/discovery/recommendations
CREATE INDEX IF NOT EXISTS idx_discovery_recommendations_user 
ON discovery_recommendations (user_id, relevance_score DESC, created_at DESC);

-- Index for loan matching by borrower profile
-- Supports: /api/v2/discovery/loans
CREATE INDEX IF NOT EXISTS idx_loan_borrower_profile 
ON loan_requests (borrower_id, status, created_at DESC);

-- ============================================================
-- Refinancing Marketplace Indexes
-- ============================================================

-- Index for refinancing opportunities by borrower eligibility
-- Supports: /api/v2/refinancing/borrower/:id/eligibility
CREATE INDEX IF NOT EXISTS idx_refinancing_eligibility 
ON loan_requests (borrower_id, status, interest_rate, created_at DESC);

-- Index for refinancing portfolio by investor
-- Supports: /api/v2/refinancing/portfolio
CREATE INDEX IF NOT EXISTS idx_refinancing_portfolio 
ON refinancing_applications (investor_id, status, created_at DESC);

-- ============================================================
-- Recovery Marketplace Indexes
-- ============================================================

-- Index for recovery marketplace loans by status
-- Supports: /api/v2/recovery/marketplace
CREATE INDEX IF NOT EXISTS idx_recovery_marketplace 
ON loan_requests (status, defaulted_at DESC, recovery_percentage);

-- Index for recovery purchases by investor
-- Supports: /api/v2/recovery/my-purchases
CREATE INDEX IF NOT EXISTS idx_recovery_purchases 
ON recovery_purchases (investor_id, purchased_at DESC);

-- ============================================================
-- Risk-Based Filtering Indexes
-- ============================================================

-- Index for loans at risk (near default)
-- Supports: /api/v2/risk/loans-at-risk
CREATE INDEX IF NOT EXISTS idx_loans_at_risk 
ON loan_requests (status, default_probability DESC, created_at DESC);

-- Index for grace period upcoming loans
-- Supports: /api/v2/risk/grace-period/upcoming
CREATE INDEX IF NOT EXISTS idx_grace_period_upcoming 
ON loan_requests (status, grace_period_end, created_at DESC);

-- ============================================================
-- Hybrid Auction Indexes
-- ============================================================

-- Index for active auctions
-- Supports: /api/v2/auctions/hybrid/active
CREATE INDEX IF NOT EXISTS idx_auctions_active 
ON auction_sessions (status, end_time, current_bid DESC);

-- Index for user's auction activity
-- Supports: /api/v2/auctions/hybrid/my-activity
CREATE INDEX IF NOT EXISTS idx_auctions_user_activity 
ON auction_bids (user_id, created_at DESC);

-- Index for loan auction timeline
-- Supports: /api/v2/auctions/hybrid/loan/:loanId/timeline
CREATE INDEX IF NOT EXISTS idx_auctions_loan_timeline 
ON auction_sessions (loan_id, status, created_at DESC);

-- ============================================================
-- Performance Indexes for Cursor Pagination
-- ============================================================

-- Index for cursor-based pagination with status filter
-- Supports: /api/v2/loans?cursor=xxx&status=active
CREATE INDEX IF NOT EXISTS idx_loan_cursor_status 
ON loan_requests (status, id DESC, created_at DESC);

-- Index for cursor-based pagination with amount range
-- Supports: /api/v2/loans?cursor=xxx&min_amount=1000
CREATE INDEX IF NOT EXISTS idx_loan_cursor_amount 
ON loan_requests (loan_amount, id DESC);

-- Index for cursor-based pagination with rate range
-- Supports: /api/v2/loans?cursor=xxx&min_rate=5
CREATE INDEX IF NOT EXISTS idx_loan_cursor_rate 
ON loan_requests (interest_rate, id DESC);

-- ============================================================
-- Verification query
-- ============================================================

-- List all marketplace-related indexes
SELECT INDEX_NAME, TABLE_NAME, COLUMN_NAME, SEQ_IN_INDEX 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND INDEX_NAME LIKE 'idx_loan_marketplace%'
   OR INDEX_NAME LIKE 'idx_loan_trending%'
   OR INDEX_NAME LIKE 'idx_loan_closing%'
   OR INDEX_NAME LIKE 'idx_loan_almost%'
   OR INDEX_NAME LIKE 'idx_loan_hot%'
   OR INDEX_NAME LIKE 'idx_loan_high%'
   OR INDEX_NAME LIKE 'idx_loan_cursor%'
   OR INDEX_NAME LIKE 'idx_discovery%'
   OR INDEX_NAME LIKE 'idx_refinancing%'
   OR INDEX_NAME LIKE 'idx_recovery%'
   OR INDEX_NAME LIKE 'idx_auctions%'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
