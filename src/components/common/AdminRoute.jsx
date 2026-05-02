import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { hasPermission, canAccessSection } from '../../services/rbacService';

/**
 * AdminRoute - Protected route for admin users with RBAC
 * @param {ReactNode} children - Child components
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @param {Object} user - User object with role
 * @param {string} requiredPermission - Optional specific permission required
 * @param {string} section - Optional admin section to check access for
 */
function AdminRoute({ 
    children, 
    isAuthenticated, 
    user, 
    requiredPermission = null,
    section = null
}) {
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check basic admin role
    const isAdmin = user?.role === 'admin' || user?.is_admin === true;
    
    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    // If specific permission is required, check it
    if (requiredPermission && !hasPermission(user, requiredPermission)) {
        return <Navigate to="/admin/unauthorized" replace />;
    }

    // If section access is required, check it
    if (section && !canAccessSection(user, section)) {
        return <Navigate to="/admin/unauthorized" replace />;
    }

    return children;
}

AdminRoute.propTypes = {
    children: PropTypes.node.isRequired,
    isAuthenticated: PropTypes.bool.isRequired,
    user: PropTypes.shape({
        role: PropTypes.string,
        is_admin: PropTypes.bool
    }),
    requiredPermission: PropTypes.string,
    section: PropTypes.string
};

export default AdminRoute;
