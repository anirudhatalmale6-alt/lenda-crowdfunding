-- Migration: Add timezone awareness to temporal fields
-- ARCH-008: Use TIMESTAMP WITH TIME ZONE for all temporal fields

-- NOTE: MySQL 8.0+ supports TIMESTAMP WITH TIME ZONE
-- For older MySQL versions, use DATETIME with application-level timezone handling

-- For MySQL 8.0+, convert TIMESTAMP to TIMESTAMP WITH TIME ZONE
-- This is a representation of the recommended schema changes

-- Users table temporal fields with timezone
-- ALTER TABLE users 
-- MODIFY created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
-- MODIFY updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
-- MODIFY last_login_at TIMESTAMP WITH TIME ZONE NULL;

-- loan_requests table temporal fields with timezone
-- ALTER TABLE loan_requests 
-- MODIFY created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
-- MODIFY updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
-- MODIFY funded_at TIMESTAMP WITH TIME ZONE NULL,
-- MODIFY fully_funded_at TIMESTAMP WITH TIME ZONE NULL,
-- MODIFY repaid_at TIMESTAMP WITH TIME ZONE NULL,
-- MODIFY defaulted_at TIMESTAMP WITH TIME ZONE NULL;

-- loan_fundings table temporal fields with timezone
-- ALTER TABLE loan_fundings 
-- MODIFY created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
-- MODIFY updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- repayments table temporal fields with timezone
-- ALTER TABLE repayments 
-- MODIFY created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
-- MODIFY paid_at TIMESTAMP WITH TIME ZONE NULL;

-- Alternative for MySQL < 8.0: Add timezone_offset column for application-level handling
-- Or use UTC storage with application timezone conversion

-- Create a view for timezone-aware timestamps (recommended for cross-database compatibility)
CREATE OR REPLACE VIEW v_temporal_users AS
SELECT 
    id,
    email,
    name,
    role,
    status,
    CONVERT_TZ(created_at, '+00:00', @@session.time_zone) AS created_at,
    CONVERT_TZ(updated_at, '+00:00', @@session.time_zone) AS updated_at,
    CONVERT_TZ(last_login_at, '+00:00', @@session.time_zone) AS last_login_at
FROM users;

-- Migration complete
-- Note: Run the ALTER TABLE statements for your MySQL version
