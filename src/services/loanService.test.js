/**
 * Loan Service Unit Tests
 * 
 * Tests for loanService.js API functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import loanService from './loanService';
import { createApiClient } from '../utils/api/client';

// Mock the API client
vi.mock('../utils/api/client', () => ({
    createApiClient: vi.fn(() => ({
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    })),
}));

describe('loanService', () => {
    let mockApi;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApi = createApiClient();
    });

    describe('createLoanRequest', () => {
        it('should create a loan request with valid data', async () => {
            const loanData = {
                title: 'Test Loan',
                description: 'Test description',
                loan_amount: 10000,
                interest_rate: 12,
                duration_months: 12,
            };

            mockApi.post.mockResolvedValue({
                data: { success: true, loan_id: 1 }
            });

            const result = await loanService.createLoanRequest(loanData);

            expect(result.success).toBe(true);
            expect(result.loan_id).toBe(1);
            expect(mockApi.post).toHaveBeenCalledWith('/', loanData);
        });

        it('should handle validation errors', async () => {
            mockApi.post.mockRejectedValue({
                response: { data: { error: 'Validation failed' } }
            });

            await expect(loanService.createLoanRequest({})).rejects.toEqual(
                expect.objectContaining({ response: expect.any(Object) })
            );
        });
    });

    describe('getLoanRequests', () => {
        it('should fetch loan requests with filters', async () => {
            const filters = { status: 'active', page: 1 };
            const mockResponse = {
                data: {
                    success: true,
                    loans: [{ id: 1, status: 'active' }]
                }
            };

            mockApi.get.mockResolvedValue(mockResponse);

            const result = await loanService.getLoanRequests(filters);

            expect(result.success).toBe(true);
            expect(result.loans).toHaveLength(1);
            expect(mockApi.get).toHaveBeenCalledWith('/', { params: filters });
        });

        it('should fetch all loans without filters', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, loans: [] }
            });

            await loanService.getLoanRequests();

            expect(mockApi.get).toHaveBeenCalledWith('/', { params: {} });
        });
    });

    describe('getMyLoans', () => {
        it('should fetch current user loans', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, data: [{ id: 1 }] }
            });

            const result = await loanService.getMyLoans();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/my-loans');
        });
    });

    describe('getMyFundedLoans', () => {
        it('should fetch funded loans for current user', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, data: [] }
            });

            await loanService.getMyFundedLoans();

            expect(mockApi.get).toHaveBeenCalledWith('/my-funded');
        });
    });

    describe('getLoanDetails', () => {
        it('should fetch loan details by ID', async () => {
            const loanId = 1;
            mockApi.get.mockResolvedValue({
                data: { success: true, data: { id: loanId } }
            });

            const result = await loanService.getLoanDetails(loanId);

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith(`/${loanId}`);
        });

        it('should handle non-existent loan', async () => {
            mockApi.get.mockRejectedValue({
                response: { data: { error: 'Loan not found' } }
            });

            await expect(loanService.getLoanDetails(999)).rejects.toEqual(
                expect.objectContaining({ response: expect.any(Object) })
            );
        });
    });

    describe('fundLoan', () => {
        it('should fund a loan with valid amount', async () => {
            const loanId = 1;
            const amount = 1000;

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Loan funded successfully' }
            });

            const result = await loanService.fundLoan(loanId, amount);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/${loanId}/fund`, { amount });
        });

        it('should handle funding errors', async () => {
            mockApi.post.mockRejectedValue({
                response: { data: { error: 'Insufficient funds' } }
            });

            await expect(loanService.fundLoan(1, 1000)).rejects.toEqual(
                expect.objectContaining({ response: expect.any(Object) })
            );
        });
    });

    describe('makeRepayment', () => {
        it('should make a repayment', async () => {
            const loanId = 1;
            const amount = 500;

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Repayment recorded' }
            });

            const result = await loanService.makeRepayment(loanId, amount);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/${loanId}/repay`, { amount });
        });
    });

    describe('cancelLoanRequest', () => {
        it('should cancel a loan request', async () => {
            const loanId = 1;

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Loan cancelled' }
            });

            const result = await loanService.cancelLoanRequest(loanId);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/${loanId}/cancel`);
        });
    });

    describe('calculateLTV', () => {
        it('should calculate LTV correctly', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, ltv: '50.00' }
            });

            const result = await loanService.calculateLTV(5000, 10000);

            expect(result.success).toBe(true);
            expect(result.ltv).toBe('50.00');
            expect(mockApi.get).toHaveBeenCalledWith('/calculate-ltv', {
                params: { loanAmount: 5000, collateralValue: 10000 }
            });
        });
    });

    describe('getRiskScore', () => {
        it('should fetch risk score for a user', async () => {
            const userId = 1;
            mockApi.get.mockResolvedValue({
                data: { success: true, risk_score: 85 }
            });

            const result = await loanService.getRiskScore(userId);

            expect(result.success).toBe(true);
            expect(result.risk_score).toBe(85);
            expect(mockApi.get).toHaveBeenCalledWith(`/risk-score/${userId}`);
        });
    });

    describe('getRepaymentSchedule', () => {
        it('should fetch repayment schedule', async () => {
            const loanId = 1;
            mockApi.get.mockResolvedValue({
                data: { success: true, schedule: [] }
            });

            await loanService.getRepaymentSchedule(loanId);

            expect(mockApi.get).toHaveBeenCalledWith(`/${loanId}/schedule`);
        });
    });

    describe('getStatistics', () => {
        it('should fetch loan statistics', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, data: { totalLoans: 100 } }
            });

            const result = await loanService.getStatistics();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/statistics');
        });
    });

    describe('getAdminDashboardStats', () => {
        it('should fetch admin dashboard stats', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, stats: { pending_loans: 5 } }
            });

            const result = await loanService.getAdminDashboardStats();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/admin/dashboard-stats');
        });
    });

    describe('getPlatformStats', () => {
        it('should fetch platform stats with time range', async () => {
            const timeRange = 30;
            mockApi.get.mockResolvedValue({
                data: { success: true, platform_stats: { totalVolume: 1000000 } }
            });

            const result = await loanService.getPlatformStats(timeRange);

            expect(result.success).toBe(true);
            expect(result.platform_stats.totalVolume).toBe(1000000);
            expect(mockApi.get).toHaveBeenCalledWith('/admin/platform-stats', {
                params: { timeRange }
            });
        });

        it('should use default time range', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, platform_stats: {} }
            });

            await loanService.getPlatformStats();

            expect(mockApi.get).toHaveBeenCalledWith('/admin/platform-stats', {
                params: { timeRange: 30 }
            });
        });
    });

    describe('getPendingLoans', () => {
        it('should fetch pending loans', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, loans: [] }
            });

            const result = await loanService.getPendingLoans();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/pending');
        });
    });

    describe('approveLoan', () => {
        it('should approve a loan', async () => {
            const loanId = 1;
            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Loan approved' }
            });

            const result = await loanService.approveLoan(loanId);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/${loanId}/approve`);
        });
    });

    describe('rejectLoan', () => {
        it('should reject a loan with reason', async () => {
            const loanId = 1;
            const reason = 'Insufficient collateral';

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Loan rejected' }
            });

            const result = await loanService.rejectLoan(loanId, reason);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/${loanId}/reject`, { reason });
        });
    });

    describe('getPendingCollateral', () => {
        it('should fetch pending collateral', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, collateral: [] }
            });

            const result = await loanService.getPendingCollateral();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/collateral/pending');
        });
    });

    describe('verifyCollateral', () => {
        it('should verify collateral', async () => {
            const collateralId = 1;
            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Collateral verified' }
            });

            const result = await loanService.verifyCollateral(collateralId);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/collateral/${collateralId}/verify`);
        });
    });

    describe('getDefaultedLoans', () => {
        it('should fetch defaulted loans', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, loans: [] }
            });

            const result = await loanService.getDefaultedLoans();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/defaulted');
        });
    });

    describe('processGuaranteeClaim', () => {
        it('should process a guarantee claim', async () => {
            const loanId = 1;
            const claimData = { amount: 5000 };

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Claim processed' }
            });

            const result = await loanService.processGuaranteeClaim(loanId, claimData);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/${loanId}/process-claim`, claimData);
        });
    });
});
