-- Migration: Add tokenized flag to loan_requests
-- ARCH-006: Add tokenized BOOLEAN DEFAULT FALSE to loan_requests for fractional ownership

-- Add tokenized column to loan_requests table
ALTER TABLE loan_requests 
ADD COLUMN tokenized BOOLEAN DEFAULT FALSE AFTER funded_amount;

-- Add index for tokenized queries
ALTER TABLE loan_requests 
ADD INDEX idx_tokenized (tokenized);

-- Add tokenized_at timestamp for tracking when loan was tokenized
ALTER TABLE loan_requests 
ADD COLUMN tokenized_at TIMESTAMP NULL AFTER tokenized;

-- Add token_price for fractional ownership pricing
ALTER TABLE loan_requests 
ADD COLUMN token_price DECIMAL(15, 8) NULL AFTER tokenized_at;

-- Add minimum_investment for tokenized loans
ALTER TABLE loan_requests 
ADD COLUMN minimum_investment DECIMAL(15, 2) DEFAULT 100 AFTER token_price;

-- Add maximum_investment for tokenized loans
ALTER TABLE loan_requests 
ADD COLUMN maximum_investment DECIMAL(15, 2) NULL AFTER minimum_investment;

-- Add token_symbol for tokenized loans
ALTER TABLE loan_requests 
ADD COLUMN token_symbol VARCHAR(20) NULL AFTER maximum_investment;

-- Migration complete
-- Run this migration against your database
