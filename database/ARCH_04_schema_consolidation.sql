-- =============================================================================
-- LENDA Platform - Database Schema Consolidation Report (ARCH-04)
-- =============================================================================
-- This document identifies duplicate table definitions across schema files
-- and provides the canonical definition for each table.
--
-- DUPLICATE TABLES IDENTIFIED:
-- 1. loan_requests       - lenda_schema.sql, lenda_api_tables.sql
-- 2. loan_fundings        - lenda_schema.sql, lenda_api_tables.sql
-- 3. loan_tokens          - lenda_schema.sql, market_rate_system.sql
-- 4. investor_preferences - risk_engine_schema.sql, discovery_engine_schema.sql
-- =============================================================================

-- =============================================================================
-- CONSOLIDATION GUIDE
-- =============================================================================

-- TABLE: loan_requests
-- ---------------------------------------------------------------------
-- Canonical Definition: database/lenda_schema.sql (line 71)
-- Duplicate In: database/lenda_api_tables.sql (line 13)
-- Resolution: Use lenda_schema.sql definition - it includes FIN-01 origination fee fields
--
-- Canonical Definition (from lenda_schema.sql):
/*
CREATE TABLE IF NOT EXISTS loan_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    borrower_id BIGINT UNSIGNED,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    term_months INT UNSIGNED NOT NULL,
    status ENUM('draft','pending','active','funded','completed','defaulted','cancelled') DEFAULT 'draft',
    collateral_type VARCHAR(50),
    collateral_value DECIMAL(15,2),
    risk_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    funded_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    default_at TIMESTAMP NULL,
    -- FIN-01: Origination fee fields
    origination_fee DECIMAL(5,2) DEFAULT 2.00,
    platform_interest_share DECIMAL(5,2) DEFAULT 30.00,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
*/
-- Action: Drop table in lenda_api_tables.sql, keep only lenda_schema.sql version


-- TABLE: loan_fundings
-- ---------------------------------------------------------------------
-- Canonical Definition: database/lenda_schema.sql (line 106)
-- Duplicate In: database/lenda_api_tables.sql (line 45)
-- Resolution: Use lenda_schema.sql - more complete
--
-- Action: Drop table in lenda_api_tables.sql, keep only lenda_schema.sql version


-- TABLE: loan_tokens
-- ---------------------------------------------------------------------
-- Canonical Definition: database/lenda_schema.sql (line 458)
-- Duplicate In: database/market_rate_system.sql (line 90)
-- Resolution: Use lenda_tokenization_schema.sql - most complete with tokenization fields
--
-- From lenda_tokenization_schema.sql:
/*
CREATE TABLE IF NOT EXISTS loan_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    token_contract_address VARCHAR(42),
    total_supply DECIMAL(20,8) NOT NULL,
    price_per_token DECIMAL(20,8) NOT NULL,
    tokens_sold DECIMAL(20,8) DEFAULT 0,
    holders_count INT UNSIGNED DEFAULT 0,
    status ENUM('pending','active','trading','completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_loan_id (loan_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
*/
-- Action: Drop in market_rate_system.sql, use lenda_tokenization_schema.sql


-- TABLE: investor_preferences
-- ---------------------------------------------------------------------
-- Canonical Definition: database/discovery_engine_schema.sql (line 5)
-- Duplicate In: database/risk_engine_schema.sql (line 272)
-- Resolution: Merge fields from both - discovery engine has more investor-specific fields
--
-- From discovery_engine_schema.sql:
/*
CREATE TABLE IF NOT EXISTS investor_preferences (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    min_interest_rate DECIMAL(5,2) DEFAULT 0,
    max_interest_rate DECIMAL(5,2) DEFAULT 50,
    min_credit_score INT,
    preferred_loan_types TEXT,
    risk_tolerance ENUM('conservative','moderate','aggressive') DEFAULT 'moderate',
    investment_amount_min DECIMAL(15,2),
    investment_amount_max DECIMAL(15,2),
    preferred_sectors TEXT,
    auto_invest_enabled BOOLEAN DEFAULT FALSE,
    auto_invest_threshold DECIMAL(5,2),
    notification_preferences JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_risk_tolerance (risk_tolerance)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
*/
-- Action: Merge fields into discovery_engine version, drop from risk_engine_schema.sql


-- =============================================================================
-- CONSOLIDATION SCRIPT
-- =============================================================================

-- Step 1: Backup existing tables (run in production)
-- RENAME TABLE loan_requests TO loan_requests_backup;
-- RENAME TABLE loan_fundings TO loan_fundings_backup;
-- RENAME TABLE loan_tokens TO loan_tokens_backup;
-- RENAME TABLE investor_preferences TO investor_preferences_backup;

-- Step 2: Create canonical tables with complete definitions
-- (See above for full CREATE TABLE statements)

-- Step 3: Migrate data from backups
-- INSERT INTO new_loan_requests SELECT * FROM loan_requests_backup;

-- Step 4: Update application code to use single schema source
-- Files to update:
--   - app/Model/LoanRequest.php (ensure uses lenda_schema.sql definition)
--   - app/Model/LoanFunding.php
--   - app/Model/LoanToken.php
--   - app/Model/InvestorPreference.php

-- Step 5: Remove duplicate schema definitions
-- Comment out or remove duplicate CREATE TABLE statements from:
--   - database/lenda_api_tables.sql (loan_requests, loan_fundings)
--   - database/market_rate_system.sql (loan_tokens)
--   - database/risk_engine_schema.sql (investor_preferences)


-- =============================================================================
-- SCHEMA FILE DEPENDENCY MAP
-- =============================================================================
-- Core Tables (master source):
--   - lenda_schema.sql          -> users, borrower_profiles, loan_requests, loan_fundings, loan_tokens
--   - lenda_tokenization_schema.sql -> loan_token_contracts, loan_coverage, loan_risk_assessments, investor_portfolios
--   - discovery_engine_schema.sql -> investor_preferences, loan_discovery_scores, investor_behavior, loan_demand_signals
--
-- Extension Tables:
--   - risk_engine_schema.sql    -> loan_risk_status, borrower_risk_profiles
--   - capital_protection_schema.sql -> loan_guarantees, loan_exposure_summary
--   - credit_reputation_schema.sql -> borrower_credit, borrower_repayment_history, borrower_badges
--   - market_rate_system.sql   -> loan_rate_history (loan_tokens removed - use lenda_schema.sql)
--   - accelerator_schema.sql   -> loan_funding_accelerator, borrower_rate_boosts, investor_notifications


-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check for duplicate loan_requests tables
-- SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_COMMENT 
-- FROM information_schema.TABLES 
-- WHERE TABLE_NAME = 'loan_requests' AND TABLE_SCHEMA = 'lenda';

-- Check column differences between duplicates
-- SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
-- FROM information_schema.COLUMNS
-- WHERE TABLE_NAME = 'loan_requests' AND TABLE_SCHEMA = 'lenda'
-- ORDER BY ORDINAL_POSITION;
