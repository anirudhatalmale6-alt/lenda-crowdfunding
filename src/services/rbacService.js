/**
 * RBAC (Role-Based Access Control) Service
 * Provides granular permission management for admin users
 */

// Admin role definitions with granular permissions
export const ADMIN_ROLES = {
  super_admin: {
    label: 'Super Admin',
    permissions: [
      'users.read', 'users.write', 'users.delete', 'users.manage_roles',
      'loans.read', 'loans.write', 'loans.approve', 'loans.reject', 'loans.delete',
      'finance.read', 'finance.write', 'finance.refund',
      'compliance.read', 'compliance.write',
      'settings.read', 'settings.write',
      'reports.read', 'reports.write',
      'audit.read',
      'risk.read', 'risk.write',
      'escrow.read', 'escrow.write',
      'recovery.read', 'recovery.write'
    ]
  },
  loan_admin: {
    label: 'Loan Admin',
    permissions: [
      'loans.read', 'loans.write', 'loans.approve', 'loans.reject',
      'risk.read',
      'reports.read'
    ]
  },
  user_admin: {
    label: 'User Admin',
    permissions: [
      'users.read', 'users.write', 'users.manage_roles',
      'reports.read'
    ]
  },
  finance_admin: {
    label: 'Finance Admin',
    permissions: [
      'finance.read', 'finance.write', 'finance.refund',
      'loans.read',
      'reports.read', 'reports.write',
      'escrow.read', 'escrow.write'
    ]
  },
  compliance_admin: {
    label: 'Compliance Admin',
    permissions: [
      'compliance.read', 'compliance.write',
      'users.read',
      'loans.read',
      'audit.read',
      'reports.read'
    ]
  },
  support_admin: {
    label: 'Support Admin',
    permissions: [
      'users.read',
      'loans.read',
      'reports.read',
      'escrow.read'
    ]
  }
};

// Permission groups for easier checking
export const PERMISSION_GROUPS = {
  users: ['users.read', 'users.write', 'users.delete', 'users.manage_roles'],
  loans: ['loans.read', 'loans.write', 'loans.approve', 'loans.reject', 'loans.delete'],
  finance: ['finance.read', 'finance.write', 'finance.refund'],
  compliance: ['compliance.read', 'compliance.write'],
  settings: ['settings.read', 'settings.write'],
  reports: ['reports.read', 'reports.write'],
  audit: ['audit.read'],
  risk: ['risk.read', 'risk.write'],
  escrow: ['escrow.read', 'escrow.write'],
  recovery: ['recovery.read', 'recovery.write']
};

/**
 * Check if user has a specific permission
 * @param {Object} user - User object with role
 * @param {string} permission - Permission string to check
 * @returns {boolean}
 */
export const hasPermission = (user, permission) => {
  if (!user || !user.role) {
    return false;
  }

  // Super admins have all permissions
  if (user.role === 'super_admin' || user.is_super_admin === true) {
    return true;
  }

  const rolePermissions = ADMIN_ROLES[user.role];
  if (!rolePermissions) {
    return false;
  }

  return rolePermissions.permissions.includes(permission);
};

/**
 * Check if user has any permission from a list
 * @param {Object} user - User object with role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
export const hasAnyPermission = (user, permissions) => {
  return permissions.some(permission => hasPermission(user, permission));
};

/**
 * Check if user has all permissions from a list
 * @param {Object} user - User object with role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
export const hasAllPermissions = (user, permissions) => {
  return permissions.every(permission => hasPermission(user, permission));
};

/**
 * Check if user has permission from a specific group
 * @param {Object} user - User object with role
 * @param {string} group - Permission group name
 * @returns {boolean}
 */
export const hasGroupPermission = (user, group) => {
  const groupPermissions = PERMISSION_GROUPS[group];
  if (!groupPermissions) {
    return false;
  }
  return hasAnyPermission(user, groupPermissions);
};

/**
 * Get all permissions for a user role
 * @param {string} role - User role
 * @returns {string[]}
 */
export const getRolePermissions = (role) => {
  const roleConfig = ADMIN_ROLES[role];
  return roleConfig ? roleConfig.permissions : [];
};

/**
 * Check if user can access a specific admin section
 * @param {Object} user - User object with role
 * @param {string} section - Admin section name
 * @returns {boolean}
 */
export const canAccessSection = (user, section) => {
  const sectionPermissionMap = {
    'dashboard': 'loans.read',
    'users': 'users.read',
    'loans': 'loans.read',
    'finance': 'finance.read',
    'compliance': 'compliance.read',
    'settings': 'settings.read',
    'reports': 'reports.read',
    'audit': 'audit.read',
    'risk': 'risk.read',
    'escrow': 'escrow.read',
    'recovery': 'recovery.read'
  };

  const requiredPermission = sectionPermissionMap[section];
  return requiredPermission ? hasPermission(user, requiredPermission) : false;
};

/**
 * Get available admin sections for a user
 * @param {Object} user - User object with role
 * @returns {string[]}
 */
export const getAvailableSections = (user) => {
  const sections = [
    'dashboard', 'users', 'loans', 'finance', 
    'compliance', 'settings', 'reports', 'audit', 
    'risk', 'escrow', 'recovery'
  ];

  return sections.filter(section => canAccessSection(user, section));
};

/**
 * Validate role exists
 * @param {string} role - Role to validate
 * @returns {boolean}
 */
export const isValidRole = (role) => {
  return Object.keys(ADMIN_ROLES).includes(role);
};

/**
 * Get all available roles
 * @returns {Array}
 */
export const getAllRoles = () => {
  return Object.entries(ADMIN_ROLES).map(([key, value]) => ({
    id: key,
    label: value.label,
    permissions: value.permissions
  }));
};

export default {
  ADMIN_ROLES,
  PERMISSION_GROUPS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasGroupPermission,
  getRolePermissions,
  canAccessSection,
  getAvailableSections,
  isValidRole,
  getAllRoles
};
