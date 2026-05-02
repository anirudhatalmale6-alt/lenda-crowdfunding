import { describe, it, expect, beforeEach } from 'vitest';
import authReducer, {
    clearError,
    setTwoFactorRequired,
} from './authSlice';

describe('authSlice', () => {
    const initialState = {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        twoFactorRequired: false,
        kycStatus: 'none',
    };

    it('should return the initial state', () => {
        const result = authReducer(undefined, { type: 'unknown' });
        expect(result.isAuthenticated).toBe(false);
        expect(result.user).toBe(null);
    });

    it('should handle clearError', () => {
        const stateWithError = {
            ...initialState,
            error: 'Some error message',
        };

        const result = authReducer(stateWithError, clearError());
        expect(result.error).toBe(null);
    });

    it('should handle setTwoFactorRequired', () => {
        const result = authReducer(initialState, setTwoFactorRequired(true));
        expect(result.twoFactorRequired).toBe(true);
    });

    it('should handle setTwoFactorRequired to false', () => {
        const stateWith2FA = {
            ...initialState,
            twoFactorRequired: true,
        };

        const result = authReducer(stateWith2FA, setTwoFactorRequired(false));
        expect(result.twoFactorRequired).toBe(false);
    });
});
