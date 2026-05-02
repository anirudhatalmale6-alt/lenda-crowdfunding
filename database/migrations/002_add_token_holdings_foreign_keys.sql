-- Migration: Add foreign key constraints and loan_id link to token_holdings
-- ARCH-007: Add foreign key constraints and index on loan_id

-- Add loan_id column to token_holdings for direct loan reference
ALTER TABLE token_holdings 
ADD COLUMN loan_id BIGINT UNSIGNED NULL AFTER holder_id;

-- Add foreign key constraint for loan_id
ALTER TABLE token_holdings 
ADD CONSTRAINT fk_token_holdings_loan 
FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE SET NULL;

-- Add index for loan_id queries
ALTER TABLE token_holdings 
ADD INDEX idx_loan (loan_id);

-- Add unique constraint for loan + holder (ensuring one row per loan per holder)
-- First, drop existing unique key if exists
ALTER TABLE token_holdings 
DROP INDEX uk_contract_holder;

-- Add new unique constraint
ALTER TABLE token_holdings 
ADD UNIQUE KEY uk_contract_holder_loan (contract_id, holder_id, loan_id);

-- Add index for holder queries
ALTER TABLE token_holdings 
ADD INDEX idx_holder_type (holder_id, holder_type);

-- Migration complete
