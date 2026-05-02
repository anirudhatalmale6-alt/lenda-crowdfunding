import { createApiClient } from '../utils/api/client';

const API_URL = '/api/auth';

// Create auth-specific API client
const api = createApiClient(API_URL);

const normalizeUser = (user) => {
    if (!user) return user;

    if (!user.name) {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
        return { ...user, name: fullName || user.email || 'User' };
    }

    return user;
};

const normalizeAuthResponse = (payload) => {
    const normalized = payload?.data ?? payload;

    if (!normalized) {
        return normalized;
    }

    return {
        ...normalized,
        user: normalizeUser(normalized.user),
    };
};

const authService = {
    // Login
    login: async (credentials) => {
        const response = await api.post('/login', credentials);
        return normalizeAuthResponse(response.data);
    },

    // Google sign in / sign up
    loginWithGoogle: async (role = 'borrower') => {
        const response = await api.post('/google', { role });
        return normalizeAuthResponse(response.data);
    },

    // Register
    register: async (userData) => {
        const response = await api.post('/register', userData);
        return normalizeAuthResponse(response.data);
    },

    // Logout
    logout: async () => {
        const response = await api.post('/logout');
        return response.data;
    },

    // Verify 2FA
    verify2FA: async ({ code, userId }) => {
        const response = await api.post('/verify-2fa', { code, userId });
        return normalizeAuthResponse(response.data);
    },

    // Enable 2FA
    enable2FA: async () => {
        const response = await api.post('/enable-2fa');
        return response.data;
    },

    // Disable 2FA
    disable2FA: async () => {
        const response = await api.post('/disable-2fa');
        return response.data;
    },

    // Update profile
    updateProfile: async (profileData) => {
        const response = await api.put('/profile', profileData);
        return response.data;
    },

    // Get current user
    getCurrentUser: async () => {
        const response = await api.get('/me');
        return normalizeAuthResponse(response.data);
    },

    // Change password
    changePassword: async (passwords) => {
        const response = await api.post('/change-password', passwords);
        return response.data;
    },

    // Forgot password
    forgotPassword: async (email) => {
        const response = await api.post('/forgot-password', { email });
        return response.data;
    },

    // Reset password
    resetPassword: async ({ token, password }) => {
        const response = await api.post('/reset-password', { token, password });
        return response.data;
    },

    // Submit KYC
    submitKYC: async (kycData) => {
        const response = await api.post('/kyc', kycData);
        return response.data;
    },

    // Get KYC status
    getKYCStatus: async () => {
        const response = await api.get('/kyc/status');
        return response.data;
    },

    // Get all users (admin)
    getAllUsers: async (params = {}) => {
        const response = await api.get('/admin/users', { params });
        return response.data;
    },

    // Update user status (admin)
    updateUserStatus: async (userId, status) => {
        const response = await api.put(`/admin/users/${userId}/status`, { status });
        return response.data;
    },

    // Verify user KYC (admin)
    verifyUserKYC: async (userId) => {
        const response = await api.post(`/admin/users/${userId}/verify-kyc`);
        return response.data;
    },

    // SEC-002: Refresh access token
    refreshToken: async (refreshToken) => {
        const response = await api.post('/refresh-token', { refreshToken });
        return response.data;
    },

    // SEC-002: Validate token (check if still valid)
    validateToken: async () => {
        const response = await api.get('/validate-token');
        return response.data;
    },
};

export default authService;
