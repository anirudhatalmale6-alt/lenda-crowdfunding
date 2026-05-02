-- SEC-008: API Keys table for service account authentication
CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key_id` varchar(32) NOT NULL COMMENT 'Public key identifier',
  `key_hash` varchar(64) NOT NULL COMMENT 'SHA256 hash of the API key',
  `user_id` int(11) NOT NULL COMMENT 'Owner user ID',
  `name` varchar(255) NOT NULL COMMENT 'Key description/name',
  `permissions` text COMMENT 'JSON array of permissions',
  `created_at` datetime NOT NULL,
  `expires_at` datetime DEFAULT NULL,
  `last_used_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_id` (`key_id`),
  KEY `user_id` (`user_id`),
  KEY `key_hash` (`key_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='API keys for service account authentication';

-- SEC-014: Add encrypted fields to users table
ALTER TABLE `users` 
  ADD COLUMN `encrypted_ssn` varchar(255) DEFAULT NULL COMMENT 'Encrypted SSN',
  ADD COLUMN `encrypted_bank_account` varchar(255) DEFAULT NULL COMMENT 'Encrypted bank account number',
  ADD COLUMN `encrypted_routing_number` varchar(255) DEFAULT NULL COMMENT 'Encrypted routing number',
  ADD COLUMN `encryption_iv` varchar(64) DEFAULT NULL COMMENT 'Initialization vector for encryption';

-- SEC-006: Add external KYC tracking fields
ALTER TABLE `users`
  ADD COLUMN `kyc_provider` varchar(50) DEFAULT NULL COMMENT 'KYC provider (stripe, jumio, etc.)',
  ADD COLUMN `kyc_external_id` varchar(255) DEFAULT NULL COMMENT 'External KYC verification ID',
  ADD COLUMN `kyc_verified_at` datetime DEFAULT NULL COMMENT 'When KYC was verified',
  ADD COLUMN `backup_codes_hash` varchar(255) DEFAULT NULL COMMENT 'Hashed backup codes for 2FA recovery';

-- SEC-005: Backup codes table for 2FA recovery
CREATE TABLE IF NOT EXISTS `backup_codes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `code_hash` varchar(64) NOT NULL COMMENT 'Hashed backup code',
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Backup codes for 2FA account recovery';
