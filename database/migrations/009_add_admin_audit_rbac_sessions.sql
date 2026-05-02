-- Admin Audit Trail Table
CREATE TABLE IF NOT EXISTS `admin_audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_user_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(100) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `old_values` text,
  `new_values` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_admin_user_id` (`admin_user_id`),
  KEY `idx_entity_type` (`entity_type`),
  KEY `idx_entity_id` (`entity_id`),
  KEY `idx_created` (`created`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin Roles Table for RBAC
CREATE TABLE IF NOT EXISTS `admin_roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT 1,
  `created` datetime DEFAULT NULL,
  `modified` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin Permissions Table for RBAC
CREATE TABLE IF NOT EXISTS `admin_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_role_id` int(11) NOT NULL,
  `controller` varchar(100) NOT NULL,
  `action` varchar(100) NOT NULL,
  `allowed` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_admin_role_id` (`admin_role_id`),
  KEY `idx_controller_action` (`controller`, `action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Update users table for admin role assignment
ALTER TABLE `users` ADD COLUMN `admin_role_id` int(11) DEFAULT NULL AFTER `role_id`;
ALTER TABLE `users` ADD INDEX `idx_admin_role_id` (`admin_role_id`);

-- Admin Sessions Table
CREATE TABLE IF NOT EXISTS `admin_sessions` (
  `id` varchar(128) NOT NULL,
  `admin_user_id` int(11) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_admin_user_id` (`admin_user_id`),
  KEY `idx_expires` (`expires`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin Settings for Session Limits
CREATE TABLE IF NOT EXISTS `admin_session_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `max_concurrent_sessions` int(11) DEFAULT 3,
  `session_timeout_minutes` int(11) DEFAULT 60,
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Platform Announcements Table
CREATE TABLE IF NOT EXISTS `platform_announcements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `announcement_type` enum('info','warning','success','danger') DEFAULT 'info',
  `target_audience` enum('all','lenders','borrowers','admins') DEFAULT 'all',
  `is_active` tinyint(1) DEFAULT 1,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `modified` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_target_audience` (`target_audience`),
  KEY `idx_dates` (`start_date`, `end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User Announcement Read Status
CREATE TABLE IF NOT EXISTS `user_announcement_reads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `announcement_id` int(11) NOT NULL,
  `read_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_announcement` (`user_id`, `announcement_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fee Configurations Table
CREATE TABLE IF NOT EXISTS `fee_configurations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fee_type` varchar(100) NOT NULL,
  `fee_name` varchar(255) NOT NULL,
  `fee_percentage` decimal(10,4) DEFAULT NULL,
  `fee_fixed` decimal(10,2) DEFAULT NULL,
  `min_amount` decimal(10,2) DEFAULT NULL,
  `max_amount` decimal(10,2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `effective_from` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created` datetime DEFAULT NULL,
  `modified` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fee_type` (`fee_type`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default admin role
INSERT INTO `admin_roles` (`id`, `name`, `description`, `is_active`, `created`, `modified`) VALUES
(1, 'Super Admin', 'Full access to all admin features', 1, NOW(), NOW()),
(2, 'Content Manager', 'Manage content and users only', 1, NOW(), NOW()),
(3, 'Finance Manager', 'Manage financial operations', 1, NOW(), NOW());

-- Insert default session settings
INSERT INTO `admin_session_settings` (`id`, `max_concurrent_sessions`, `session_timeout_minutes`, `is_active`) VALUES
(1, 3, 60, 1);

-- Insert default fee configurations
INSERT INTO `fee_configurations` (`id`, `fee_type`, `fee_name`, `fee_percentage`, `fee_fixed`, `min_amount`, `max_amount`, `is_active`, `effective_from`, `created`, `modified`) VALUES
(1, 'lending', 'Platform Fee', 2.5000, NULL, NULL, NULL, 1, NOW(), NOW(), NOW()),
(2, 'withdrawal', 'Withdrawal Fee', NULL, 10.00, NULL, NULL, 1, NOW(), NOW(), NOW()),
(3, 'transfer', 'Fund Transfer Fee', 0.5000, NULL, NULL, NULL, 1, NOW(), NOW(), NOW()),
(4, 'registration', 'Registration Fee', NULL, 0.00, NULL, NULL, 1, NOW(), NOW(), NOW());
