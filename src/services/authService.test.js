/**
 * Authentication Service Tests
 * Comprehensive test coverage for auth flows
 */

import authService from '../services/authService';

// Mock the API client
jest.mock('../utils/api/client', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

import api from '../utils/api/client';

const mockApi = api;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const mockResponse = {
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'lender'
        }
      };
      
      mockApi.post.mockResolvedValueOnce({ data: mockResponse });
      
      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123'
      });
      
      expect(result).toEqual(mockResponse);
      expect(mockApi.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should handle login failure', async () => {
      const mockResponse = {
        success: false,
        message: 'Invalid credentials'
      };
      
      mockApi.post.mockResolvedValueOnce({ data: mockResponse });
      
      await expect(authService.login({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      })).rejects.toThrow();
    });

    it('should handle 2FA required response', async () => {
      const mockResponse = {
        success: true,
        requires_2fa: true,
        user_id: 1
      };
      
      mockApi.post.mockResolvedValueOnce({ data: mockResponse });
      
      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123'
      });
      
      expect(result.requires_2fa).toBe(true);
      expect(result.user_id).toBe(1);
    });
  });

  describe('register', () => {
    it('should register with valid data', async () => {
      const mockResponse = {
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: 2,
          email: 'new@example.com',
          name: 'New User',
          role: 'borrower'
        }
      };
      
      mockApi.post.mockResolvedValueOnce({ data: mockResponse });
      
      const result = await authService.register({
        email: 'new@example.com',
        password: 'SecurePass123',
        name: 'New User',
        role: 'borrower'
      });
      
      expect(result.success).toBe(true);
      expect(result.user.email).toBe('new@example.com');
    });

    it('should reject weak passwords', async () => {
      const mockResponse = {
        success: false,
        message: 'Password must contain at least 8 characters, one uppercase, one lowercase, and one number'
      };
      
      mockApi.post.mockResolvedValueOnce({ data: mockResponse });
      
      await expect(authService.register({
        email: 'test@example.com',
        password: 'weak',
        name: 'Test'
      })).rejects.toThrow();
    });
  });

  describe('verify2FA', () => {
    it('should verify 2FA with valid code', async () => {
      const mockResponse = {
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: 1,
          email: 'test@example.com'
        }
      };
      
      mockApi.post.mockResolvedValueOnce({ data: mockResponse });
      
      const result = await authService.verify2FA({
        code: '123456',
        userId: 1
      });
      
      expect(result.success).toBe(true);
      expect(mockApi.post).toHaveBeenCalledWith('/api/auth/verify-2fa', {
        code: '123456',
        userId: 1
      });
    });

    it('should reject invalid 2FA codes', async () => {
      const mockResponse = {
        success: false,
        message: 'Invalid 2FA code'
      };
      
      mockApi.post.mockResolvedValueOnce({ data: mockResponse });
      
      await expect(authService.verify2FA({
        code: '000000',
        userId: 1
      })).rejects.toThrow();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        success: true,
        token: 'new-mock-jwt-token',
        expiresAt: Date.now() + 3600000
      };
      
      mockApi.post.mockResolvedValueOnce({ data: mockResponse });
      
      const result = await authService.refreshToken('expired-refresh-token');
      
      expect(result.token).toBe('new-mock-jwt-token');
    });

    it('should handle refresh failure', async () => {
      const mockResponse = {
        success: false,
        message: 'Invalid refresh token'
      };
      
      mockApi.post.mockResolvedValueOnce({ data: mockResponse });
      
      await expect(authService.refreshToken('invalid-token'))
        .rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Logged out successfully'
      };
      
      mockApi.post.mockResolvedValueOnce({ data: mockResponse });
      
      await authService.logout();
      
      expect(mockApi.post).toHaveBeenCalledWith('/api/auth/logout');
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const mockResponse = {
        success: true,
        user: {
          id: 1,
          name: 'Updated Name',
          email: 'test@example.com'
        }
      };
      
      mockApi.put.mockResolvedValueOnce({ data: mockResponse });
      
      const result = await authService.updateProfile({
        name: 'Updated Name'
      });
      
      expect(result.user.name).toBe('Updated Name');
    });
  });

  describe('changePassword', () => {
    it('should change password with valid current password', async () => {
      const mockResponse = {
        success: true,
        message: 'Password changed successfully'
      };
      
      mockApi.post.mockResolvedValueOnce({ data: mockResponse });
      
      const result = await authService.changePassword({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123'
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('submitKYC', () => {
    it('should submit KYC data', async () => {
      const mockResponse = {
        success: true,
        kyc_status: 'pending'
      };
      
      mockApi.post.mockResolvedValueOnce({ data: mockResponse });
      
      const result = await authService.submitKYC({
        documentType: 'passport',
        documentNumber: 'AB123456'
      });
      
      expect(result.kyc_status).toBe('pending');
    });
  });
});
