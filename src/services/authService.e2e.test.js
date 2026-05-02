/**
 * Auth Service API E2E Tests
 * 
 * These tests verify the complete authentication flow including:
 * - Login with valid/invalid credentials
 * - Registration with new users
 * - Password reset flow
 * - Protected route access
 * - Token management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import authService from './authService';
import { server } from '../test/msw/setup';
import { http, HttpResponse } from 'msw';

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock window.location
delete window.location;
window.location = {
    href: '',
    pathname: '/',
    assign: vi.fn(),
    replace: vi.fn(),
};

describe('Auth Service API E2E Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        server.resetHandlers();
    });

    describe('POST /api/auth/login', () => {
        it('should successfully login with valid credentials', async () => {
            const credentials = {
                email: 'testuser@lenda.com',
                password: 'password123',
            };

            const response = await authService.login(credentials);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('token');
            expect(response.data).toHaveProperty('user');
            expect(response.data.user.email).toBe(credentials.email);
        });

        it('should fail login with invalid credentials', async () => {
            const credentials = {
                email: 'invalid@lenda.com',
                password: 'wrongpassword',
            };

            await expect(authService.login(credentials)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Invalid credentials',
                })
            );
        });

        it('should fail login with missing email', async () => {
            const credentials = {
                password: 'password123',
            };

            await expect(authService.login(credentials)).rejects.toBeDefined();
        });

        it('should store token in localStorage on successful login', async () => {
            const credentials = {
                email: 'testuser@lenda.com',
                password: 'password123',
            };

            const response = await authService.login(credentials);

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'lenda_token',
                response.data.token
            );
        });
    });

    describe('POST /api/auth/register', () => {
        it('should successfully register a new user', async () => {
            const userData = {
                email: `newuser${Date.now()}@lenda.com`,
                password: 'password123',
                firstName: 'New',
                lastName: 'User',
            };

            const response = await authService.register(userData);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('token');
            expect(response.data.user.email).toBe(userData.email);
            expect(response.data.user.firstName).toBe(userData.firstName);
        });

        it('should fail registration with existing email', async () => {
            const userData = {
                email: 'testuser@lenda.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User',
            };

            // First try without conflict, then add handler to simulate conflict
            server.use(
                http.post('/api/auth/register', () => {
                    return HttpResponse.json(
                        { success: false, error: 'Email already registered' },
                        { status: 400 }
                    );
                })
            );

            await expect(authService.register(userData)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Email already registered',
                })
            );
        });

        it('should fail registration with missing required fields', async () => {
            const userData = {
                email: 'test@lenda.com',
                // missing password, firstName, lastName
            };

            await expect(authService.register(userData)).rejects.toBeDefined();
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should successfully logout', async () => {
            localStorage.setItem('lenda_token', 'test-token');

            const response = await authService.logout();

            expect(response.success).toBe(true);
            expect(localStorage.removeItem).toHaveBeenCalledWith('lenda_token');
        });
    });

    describe('GET /api/auth/me', () => {
        it('should get current user with valid token', async () => {
            const token = 'valid-mock-token';
            localStorage.setItem('lenda_token', token);

            const response = await authService.getCurrentUser();

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('id');
            expect(response.data).toHaveProperty('email');
        });

        it('should fail to get user without token', async () => {
            // Clear localStorage
            localStorage.getItem.mockReturnValue(null);

            // Add handler to simulate 401
            server.use(
                http.get('/api/auth/me', () => {
                    return HttpResponse.json(
                        { success: false, error: 'Unauthorized' },
                        { status: 401 }
                    );
                })
            );

            await expect(authService.getCurrentUser()).rejects.toEqual(
                expect.objectContaining({
                    error: 'Unauthorized',
                })
            );
        });
    });

    describe('POST /api/auth/forgot-password', () => {
        it('should send password reset email with valid email', async () => {
            const email = 'testuser@lenda.com';

            const response = await authService.forgotPassword(email);

            expect(response.success).toBe(true);
            expect(response.message).toBe('Password reset link sent to your email');
        });

        it('should fail with missing email', async () => {
            await expect(authService.forgotPassword('')).rejects.toBeDefined();
        });
    });

    describe('POST /api/auth/reset-password', () => {
        it('should reset password with valid token', async () => {
            const data = {
                token: 'valid-reset-token',
                password: 'newpassword123',
            };

            const response = await authService.resetPassword(data);

            expect(response.success).toBe(true);
            expect(response.message).toBe('Password reset successful');
        });

        it('should fail with missing token', async () => {
            const data = {
                password: 'newpassword123',
            };

            await expect(authService.resetPassword(data)).rejects.toBeDefined();
        });
    });

    describe('GET /api/auth/admin/users', () => {
        it('should get all users with admin token', async () => {
            const token = 'admin-mock-token';
            localStorage.setItem('lenda_token', token);

            const response = await authService.getAllUsers();

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('users');
            expect(response.data).toHaveProperty('total');
            expect(Array.isArray(response.data.users)).toBe(true);
        });

        it('should fail without authentication', async () => {
            localStorage.getItem.mockReturnValue(null);

            // Add handler to simulate 401
            server.use(
                http.get('/api/auth/admin/users', () => {
                    return HttpResponse.json(
                        { success: false, error: 'Unauthorized' },
                        { status: 401 }
                    );
                })
            );

            await expect(authService.getAllUsers()).rejects.toEqual(
                expect.objectContaining({
                    error: 'Unauthorized',
                })
            );
        });
    });

    describe('PUT /api/auth/admin/users/:userId/status', () => {
        it('should update user status as admin', async () => {
            const token = 'admin-mock-token';
            localStorage.setItem('lenda_token', token);

            const userId = 'user-1';
            const status = 'active';

            const response = await authService.updateUserStatus(userId, status);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data.status).toBe(status);
        });
    });

    describe('POST /api/auth/kyc', () => {
        it('should submit KYC data', async () => {
            const token = 'valid-mock-token';
            localStorage.setItem('lenda_token', token);

            const kycData = {
                documentType: 'passport',
                documentNumber: 'AB123456',
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                address: '123 Main St, City, Country',
            };

            // Mock KYC submission
            server.use(
                http.post('/api/auth/kyc', () => {
                    return HttpResponse.json({
                        success: true,
                        data: { ...kycData, status: 'pending', id: 'kyc-1' },
                        message: 'KYC submitted successfully',
                    });
                })
            );

            const response = await authService.submitKYC(kycData);

            expect(response.success).toBe(true);
            expect(response.data.status).toBe('pending');
        });
    });

    describe('GET /api/auth/kyc/status', () => {
        it('should get KYC status', async () => {
            const token = 'valid-mock-token';
            localStorage.setItem('lenda_token', token);

            // Mock KYC status response
            server.use(
                http.get('/api/auth/kyc/status', () => {
                    return HttpResponse.json({
                        success: true,
                        data: {
                            status: 'verified',
                            submittedAt: '2024-01-15T00:00:00Z',
                            verifiedAt: '2024-01-16T00:00:00Z',
                        },
                    });
                })
            );

            const response = await authService.getKYCStatus();

            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('status');
        });
    });

    describe('Security Tests', () => {
        it('should handle network errors gracefully', async () => {
            // Simulate network error
            server.use(
                http.post('/api/auth/login', () => {
                    return HttpResponse.error();
                })
            );

            await expect(authService.login({
                email: 'test@lenda.com',
                password: 'password'
            })).rejects.toEqual(
                expect.objectContaining({
                    message: expect.any(String),
                })
            );
        });

        it('should handle server errors (500)', async () => {
            server.use(
                http.get('/api/auth/me', () => {
                    return HttpResponse.json(
                        { success: false, error: 'Internal server error' },
                        { status: 500 }
                    );
                })
            );

            await expect(authService.getCurrentUser()).rejects.toBeDefined();
        });

        it('should handle rate limiting (429)', async () => {
            server.use(
                http.post('/api/auth/login', () => {
                    return HttpResponse.json(
                        { success: false, error: 'Too many requests. Please try again later.' },
                        { status: 429 }
                    );
                })
            );

            await expect(authService.login({
                email: 'test@lenda.com',
                password: 'password'
            })).rejects.toEqual(
                expect.objectContaining({
                    error: 'Too many requests. Please try again later.',
                })
            );
        });
    });
});
