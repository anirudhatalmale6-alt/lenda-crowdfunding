-- ============================================================
-- CHECK CONSTRAINTS FOR FINANCIAL AMOUNTS (DATA-05)
-- MySQL 8.0.16+ supports CHECK constraints natively
-- For older versions, use triggers as fallback
-- ============================================================

-- Note: This migration uses CHECK constraints which are supported in MySQL 8.0.16+
-- For older MySQL versions, use triggers instead (see comments below)

-- ============================================================
-- LOAN REQUESTS - CHECK constraints
-- ============================================================

-- Loan amount must be positive and within reasonable limits
ALTER TABLE loan_requests 
ADD CONSTRAINT chk_loan_amount_positive CHECK (loan_amount > 0),
ADD CONSTRAINT chk_loan_amount_max CHECK (loan_amount <= 10000000);

-- Interest rate must be between 0 and 100%
ALTER TABLE loan_requests 
ADD CONSTRAINT chk_interest_rate CHECK (interest_rate >= 0 AND interest_rate <= 100);

-- Duration must be positive
ALTER TABLE loan_requests 
ADD CONSTRAINT chk_duration_months CHECK (duration_months > 0 AND duration_months <= 360);

-- Funded amount cannot exceed loan amount
ALTER TABLE loan_requests 
ADD CONSTRAINT chk_funded_amount CHECK (funded_amount >= 0 AND funded_amount <= loan_amount);

-- ============================================================
-- LOAN FUNDINGS - CHECK constraints
-- ============================================================

-- Funding amount must be positive
ALTER TABLE loan_fundings 
ADD CONSTRAINT chk_funding_amount_positive CHECK (amount > 0),
ADD CONSTRAINT chk_funding_amount_max CHECK (amount <= 1000000);

-- Interest rate validation
ALTER TABLE loan_fundings 
ADD CONSTRAINT chk_funding_interest_rate CHECK (interest_rate >= 0 AND interest_rate <= 100);

-- Earned amount cannot be negative
ALTER TABLE loan_fundings 
ADD CONSTRAINT chk_earned_amount CHECK (earned_amount >= 0);

-- ============================================================
-- REPAYMENTS - CHECK constraints
-- ============================================================

-- Repayment amounts must be positive
ALTER TABLE repayments 
ADD CONSTRAINT chk_repayment_amount CHECK (amount > 0),
ADD CONSTRAINT chk_repayment_principal CHECK (principal >= 0),
ADD CONSTRAINT chk_repayment_interest CHECK (interest >= 0);

-- Principal + interest should equal amount (within rounding)
-- Note: This is validated at application level due to decimal precision

-- ============================================================
-- WALLET ACCOUNTS - CHECK constraints
-- ============================================================

-- Balance cannot be negative
ALTER TABLE wallet_accounts 
ADD CONSTRAINT chk_wallet_balance CHECK (balance >= 0),
ADD CONSTRAINT chk_wallet_locked CHECK (locked_balance >= 0),
ADD CONSTRAINT chk_wallet_total CHECK (balance + locked_balance >= 0);

-- ============================================================
-- WALLET TRANSACTIONS - CHECK constraints
-- ============================================================

-- Transaction amount validation
ALTER TABLE wallet_transactions 
ADD CONSTRAINT chk_wallet_tx_amount CHECK (amount != 0),
ADD CONSTRAINT chk_wallet_tx_fee CHECK (fee >= 0);

-- ============================================================
-- COLLATERAL ASSETS - CHECK constraints
-- ============================================================

-- Collateral value must be positive
ALTER TABLE collateral_assets 
ADD CONSTRAINT chk_collateral_value CHECK (estimated_value > 0),
ADD CONSTRAINT chk_collateral_value_max CHECK (estimated_value <= 100000000);

-- ============================================================
-- RESERVE FUND - CHECK constraints
-- ============================================================

-- Reserve fund balances must be non-negative
ALTER TABLE reserve_fund 
ADD CONSTRAINT chk_reserve_balance CHECK (balance >= 0),
ADD CONSTRAINT chk_reserve_locked CHECK (locked_balance >= 0),
ADD CONSTRAINT chk_reserve_claims CHECK (total_claims_paid >= 0),
ADD CONSTRAINT chk_reserve_replenished CHECK (total_replenished >= 0);

-- Coverage ratio validation
ALTER TABLE reserve_fund 
ADD CONSTRAINT chk_coverage_ratio CHECK (coverage_ratio >= 0 AND coverage_ratio <= 100);

-- ============================================================
-- RESERVE FUND TRANSACTIONS - CHECK constraints
-- ============================================================

ALTER TABLE reserve_fund_transactions 
ADD CONSTRAINT chk_reserve_tx_amount CHECK (amount > 0);

-- ============================================================
-- LEDGER ENTRIES - CHECK constraints
-- ============================================================

ALTER TABLE ledger_entries 
ADD CONSTRAINT chk_ledger_amount CHECK (amount > 0);

-- ============================================================
-- BALANCE ADJUSTMENTS - CHECK constraints
-- ============================================================

ALTER TABLE balance_adjustments 
ADD CONSTRAINT chk_adj_amount CHECK (amount != 0),
ADD CONSTRAINT chk_adj_balance_before CHECK (balance_before >= 0),
ADD CONSTRAINT chk_adj_balance_after CHECK (balance_after >= 0);

-- ============================================================
-- ESCROW TRANSACTIONS - CHECK constraints
-- ============================================================

ALTER TABLE escrow_transactions 
ADD CONSTRAINT chk_escrow_amount CHECK (amount > 0),
ADD CONSTRAINT chk_escrow_shipping_fee CHECK (shipping_fee >= 0),
ADD CONSTRAINT chk_escrow_platform_fee CHECK (platform_fee >= 0);

-- ============================================================
-- RECOVERY ITEMS - CHECK constraints
-- ============================================================

ALTER TABLE recovery_items 
ADD CONSTRAINT chk_recovery_market_value CHECK (market_value > 0),
ADD CONSTRAINT chk_recovery_starting_price CHECK (starting_price IS NULL OR starting_price > 0),
ADD CONSTRAINT chk_recovery_current_price CHECK (current_price IS NULL OR current_price > 0),
ADD CONSTRAINT chk_recovery_buy_now CHECK (buy_now_price IS NULL OR buy_now_price > 0);

-- ============================================================
-- RECOVERY BIDS - CHECK constraints
-- ============================================================

ALTER TABLE recovery_bids 
ADD CONSTRAINT chk_bid_amount CHECK (amount > 0);

-- ============================================================
-- BORROWER PROFILES - CHECK constraints
-- ============================================================

ALTER TABLE borrower_profiles 
ADD CONSTRAINT chk_annual_revenue CHECK (annual_revenue IS NULL OR annual_revenue >= 0),
ADD CONSTRAINT chk_credit_score CHECK (credit_score IS NULL OR (credit_score >= 0 AND credit_score <= 850)),
ADD CONSTRAINT chk_total_borrowed CHECK (total_borrowed >= 0),
ADD CONSTRAINT chk_total_repaid CHECK (total_repaid >= 0);

-- ============================================================
-- LENDER PROFILES - CHECK constraints
-- ============================================================

ALTER TABLE lender_profiles 
ADD CONSTRAINT chk_total_invested CHECK (total_invested >= 0),
ADD CONSTRAINT chk_total_earned CHECK (total_earned >= 0),
ADD CONSTRAINT chk_preferred_min_rate CHECK (preferred_min_rate >= 0),
ADD CONSTRAINT chk_preferred_max_rate CHECK (preferred_max_rate >= 0),
ADD CONSTRAINT chk_preferred_amounts CHECK (
    preferred_min_amount >= 0 AND 
    preferred_max_amount >= preferred_min_amount
);

-- ============================================================
-- RISK SCORES - CHECK constraints
-- ============================================================

ALTER TABLE risk_scores 
ADD CONSTRAINT chk_risk_overall CHECK (overall_score >= 0 AND overall_score <= 100),
ADD CONSTRAINT chk_risk_repayment CHECK (repayment_history_score IS NULL OR (repayment_history_score >= 0 AND repayment_history_score <= 100)),
ADD CONSTRAINT chk_risk_collateral CHECK (collateral_strength_score IS NULL OR (collateral_strength_score >= 0 AND collateral_strength_score <= 100)),
ADD constraint chk_risk_income CHECK (income_verification_score IS NULL OR (income_verification_score >= 0 AND income_verification_score <= 100)),
ADD CONSTRAINT chk_risk_platform CHECK (platform_reputation_score IS NULL OR (platform_reputation_score >= 0 AND platform_reputation_score <= 100)),
ADD CONSTRAINT chk_credit_score_value CHECK (credit_score IS NULL OR (credit_score >= 0 AND credit_score <= 850));

-- ============================================================
-- For MySQL versions < 8.0.16, use triggers as alternative
-- ============================================================

-- Example trigger for loan_amount (MySQL 5.x fallback):
/*
DELIMITER //

CREATE TRIGGER trg_loan_amount_check BEFORE INSERT ON loan_requests
FOR EACH ROW
BEGIN
    IF NEW.loan_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Loan amount must be positive';
    END IF;
    IF NEW.loan_amount > 10000000 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Loan amount exceeds maximum limit';
    END IF;
END//

CREATE TRIGGER trg_loan_amount_update BEFORE UPDATE ON loan_requests
FOR EACH ROW
BEGIN
    IF NEW.loan_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Loan amount must be positive';
    END IF;
    IF NEW.loan_amount > 10000000 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Loan amount exceeds maximum limit';
    END IF;
END//

DELIMITER ;
*/
