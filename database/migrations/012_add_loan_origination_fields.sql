-- Migration: Add loan origination fee fields
-- FIN-01 FIX: Add fields to track origination fees in loan requests
-- Compatible with MySQL 5.7+

-- Add origination fee related columns to loan_requests table
-- Use separate statements for compatibility
ALTER TABLE loan_requests 
    ADD COLUMN net_amount DECIMAL(15, 2) DEFAULT 0 AFTER loan_amount;

ALTER TABLE loan_requests 
    ADD COLUMN origination_fee DECIMAL(15, 2) DEFAULT 0 AFTER net_amount;

-- Add index for faster queries on origination fee
ALTER TABLE loan_requests 
    ADD INDEX idx_origination_fee (origination_fee);

-- Update the default reserve fund value in the seed data to use configurable value
-- The application now uses SecurityConfig::getReserveFundMinimum() instead of hardcoded value
-- ARCH-04: This migration consolidates the schema definition

-- Update existing loan records to calculate net_amount if not set
UPDATE loan_requests 
SET net_amount = loan_amount - COALESCE(origination_fee, 0)
WHERE net_amount = 0 OR net_amount IS NULL;
