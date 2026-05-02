import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';
import { getStoredToken, getStoredUser, setAuthData, clearAuthData, getRefreshToken } from '../../utils/storage';

const user = getStoredUser();
const token = getStoredToken();
const refreshToken = getRefreshToken();

const initialState = {
    user: user || null,
    token: token || null,
    refreshToken: refreshToken || null, // SEC-002: Store refresh token
    tokenExpiresAt: null, // SEC-002: Token expiration timestamp
    users: [],
    isAuthenticated: !!token,
    isLoading: false,
    error: null,
    twoFactorRequired: false,
    kycStatus: 'none', // none, pending, approved, rejected
};

export const login = createAsyncThunk(
    'auth/login',
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await authService.login(credentials);
            if (response.token) {
                setAuthData(response.token, response.user);
            }
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const register = createAsyncThunk(
    'auth/register',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await authService.register(userData);
            if (response.token) {
                setAuthData(response.token, response.user);
            }
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const loginWithGoogle = createAsyncThunk(
    'auth/loginWithGoogle',
    async (role = 'borrower', { rejectWithValue }) => {
        try {
            const response = await authService.loginWithGoogle(role);
            if (response.token) {
                setAuthData(response.token, response.user);
            }
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const verify2FA = createAsyncThunk(
    'auth/verify2FA',
    async ({ code, userId }, { rejectWithValue }) => {
        try {
            const response = await authService.verify2FA({ code, userId });
            if (response.token) {
                setAuthData(response.token, response.user);
            }
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const logout = createAsyncThunk('auth/logout', async () => {
    try {
        // Call logout endpoint to invalidate refresh token on server
        await authService.logout();
    } catch (error) {
        console.error('Logout API error:', error);
    }
    clearAuthData();
    return null;
});

// SEC-002: Refresh token async thunk
export const refreshAccessToken = createAsyncThunk(
    'auth/refreshToken',
    async (_, { rejectWithValue }) => {
        try {
            const currentRefreshToken = getRefreshToken();
            if (!currentRefreshToken) {
                return rejectWithValue('No refresh token available');
            }
            
            const response = await authService.refreshToken(currentRefreshToken);
            
            // Update stored auth data with new tokens
            if (response.token) {
                setAuthData(response.token, response.user);
            }
            
            return response;
        } catch (error) {
            // If refresh fails, clear auth data and require re-login
            clearAuthData();
            return rejectWithValue(error.message || 'Token refresh failed');
        }
    }
);

export const updateProfile = createAsyncThunk(
    'auth/updateProfile',
    async (profileData, { rejectWithValue }) => {
        try {
            const response = await authService.updateProfile(profileData);
            // SEC-008: Get token from secure storage, not localStorage
            setAuthData(null, response.user);
            return response.user;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const submitKYC = createAsyncThunk(
    'auth/submitKYC',
    async (kycData, { rejectWithValue }) => {
        try {
            const response = await authService.submitKYC(kycData);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get all users (admin)
export const getAllUsers = createAsyncThunk(
    'auth/getAllUsers',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await authService.getAllUsers(params);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Update user status (admin)
export const updateUserStatus = createAsyncThunk(
    'auth/updateUserStatus',
    async ({ userId, status }, { rejectWithValue }) => {
        try {
            const response = await authService.updateUserStatus(userId, status);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Verify user KYC (admin)
export const verifyUserKYC = createAsyncThunk(
    'auth/verifyUserKYC',
    async (userId, { rejectWithValue }) => {
        try {
            const response = await authService.verifyUserKYC(userId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        updateKYCStatus: (state, action) => {
            state.kycStatus = action.payload?.status || action.payload || 'none';
        },
        setTwoFactorRequired: (state, action) => {
            state.twoFactorRequired = action.payload;
        },
        setUsers: (state, action) => {
            state.users = action.payload;
        },
        // SEC-002: Update token expiration
        setTokenExpiration: (state, action) => {
            state.tokenExpiresAt = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.twoFactorRequired = action.payload.twoFactorRequired || false;
                state.kycStatus = action.payload.user?.kycStatus || 'none';
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(register.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(register.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
            })
            .addCase(register.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(loginWithGoogle.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loginWithGoogle.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.twoFactorRequired = false;
                state.kycStatus = action.payload.user?.kycStatus || 'none';
            })
            .addCase(loginWithGoogle.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(verify2FA.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(verify2FA.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.twoFactorRequired = false;
            })
            .addCase(verify2FA.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.token = null;
                state.refreshToken = null;
                state.tokenExpiresAt = null;
                state.isAuthenticated = false;
                state.twoFactorRequired = false;
                state.kycStatus = 'none';
            })
            // SEC-002: Handle token refresh
            .addCase(refreshAccessToken.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(refreshAccessToken.fulfilled, (state, action) => {
                state.isLoading = false;
                state.token = action.payload.token;
                state.user = action.payload.user;
                state.tokenExpiresAt = action.payload.expiresAt;
            })
            .addCase(refreshAccessToken.rejected, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = false;
                state.token = null;
                state.refreshToken = null;
                state.error = action.payload;
            })
            .addCase(updateProfile.fulfilled, (state, action) => {
                state.user = action.payload;
            })
            .addCase(submitKYC.pending, (state) => {
                state.kycStatus = 'pending';
            })
            .addCase(submitKYC.fulfilled, (state) => {
                state.kycStatus = 'pending';
            })
            .addCase(submitKYC.rejected, (state) => {
                state.kycStatus = 'rejected';
            })
            // Get all users (admin)
            .addCase(getAllUsers.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getAllUsers.fulfilled, (state, action) => {
                state.isLoading = false;
                state.users = action.payload.users;
            })
            .addCase(getAllUsers.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Update user status (admin)
            .addCase(updateUserStatus.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateUserStatus.fulfilled, (state, action) => {
                state.isLoading = false;
                // Update user in the list
                const index = state.users.findIndex(u => u.id === action.payload.user.id);
                if (index !== -1) {
                    state.users[index] = action.payload.user;
                }
            })
            .addCase(updateUserStatus.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Verify user KYC (admin)
            .addCase(verifyUserKYC.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(verifyUserKYC.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.users.findIndex(u => u.id === action.payload.user.id);
                if (index !== -1) {
                    state.users[index] = action.payload.user;
                }
            })
            .addCase(verifyUserKYC.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export const { clearError, updateKYCStatus, setTwoFactorRequired, setUsers, setTokenExpiration } = authSlice.actions;
export default authSlice.reducer;
