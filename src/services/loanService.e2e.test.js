/**
 * Loan Service API E2E Tests
 * 
 * These tests verify the complete loan lifecycle including:
 * - Creating loan requests
 * - Fetching loan listings
 * - Funding loans
 * - Making repayments
 * - Admin operations (approve/reject)
 * - Risk calculations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import loanService from './loanService';
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

describe('Loan Service API E2E Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.getItem.mockReturnValue('mock-jwt-token');
    });

    afterEach(() => {
        server.resetHandlers();
    });

    describe('GET /api/loans - Fetch Loan Listings', () => {
        it('should get all loan requests', async () => {
            const response = await loanService.getLoanRequests();

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('loans');
            expect(Array.isArray(response.data.loans)).toBe(true);
        });

        it('should filter loans by status', async () => {
            const filters = { status: 'active' };

            const response = await loanService.getLoanRequests(filters);

            expect(response.success).toBe(true);
            expect(response.data.loans.every(loan => loan.status === 'active')).toBe(true);
        });

        it('should support pagination', async () => {
            const filters = { page: 1, limit: 10 };

            const response = await loanService.getLoanRequests(filters);

            expect(response.data).toHaveProperty('page');
            expect(response.data).toHaveProperty('pageSize');
            expect(response.data).toHaveProperty('totalPages');
        });

        it('should return empty array when no loans match filter', async () => {
            const filters = { status: 'non-existent-status' };

            const response = await loanService.getLoanRequests(filters);

            expect(response.success).toBe(true);
            expect(response.data.loans).toEqual([]);
        });
    });

    describe('POST /api/loans - Create Loan Request', () => {
        it('should create a new loan request with valid data', async () => {
            const loanData = {
                amount: 5000,
                duration: 90,
                interestRate: 12,
                collateral: {
                    type: 'real_estate',
                    value: 10000,
                    address: '123 Main St, City, State 12345',
                },
            };

            const response = await loanService.createLoanRequest(loanData);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('id');
            expect(response.data.amount).toBe(loanData.amount);
            expect(response.data.status).toBe('pending');
        });

        it('should fail to create loan with missing required fields', async () => {
            const invalidLoanData = {
                amount: 5000,
                // missing duration, interestRate, collateral
            };

            await expect(loanService.createLoanRequest(invalidLoanData)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Missing required fields',
                })
            );
        });

        it('should fail to create loan with invalid collateral', async () => {
            const invalidLoanData = {
                amount: 5000,
                duration: 90,
                interestRate: 12,
                collateral: {
                    // invalid - missing type and value
                },
            };

            await expect(loanService.createLoanRequest(invalidLoanData)).rejects.toBeDefined();
        });

        it('should fail to create loan with negative amount', async () => {
            const invalidLoanData = {
                amount: -1000,
                duration: 90,
                interestRate: 12,
                collateral: {
                    type: 'vehicle',
                    value: 5000,
                },
            };

            await expect(loanService.createLoanRequest(invalidLoanData)).rejects.toBeDefined();
        });
    });

    describe('GET /api/loans/my-loans', () => {
        it('should get current user loans', async () => {
            const response = await loanService.getMyLoans();

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toBeDefined();
            expect(Array.isArray(response.data)).toBe(true);
        });

        it('should return empty array when user has no loans', async () => {
            // Reset handlers to simulate empty state
            server.use(
                http.get('/api/loans/my-loans', () => {
                    return HttpResponse.json({
                        success: true,
                        data: [],
                    });
                })
            );

            const response = await loanService.getMyLoans();

            expect(response.success).toBe(true);
            expect(response.data).toEqual([]);
        });
    });

    describe('GET /api/loans/:id - Get Loan Details', () => {
        it('should get loan details by ID', async () => {
            const loanId = 'loan-1';

            const response = await loanService.getLoanDetails(loanId);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data.id).toBe(loanId);
        });

        it('should fail to get non-existent loan', async () => {
            const loanId = 'non-existent-loan';

            await expect(loanService.getLoanDetails(loanId)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Loan not found',
                })
            );
        });
    });

    describe('POST /api/loans/:id/fund - Fund Loan', () => {
        it('should fund a loan successfully', async () => {
            const loanId = 'loan-1';
            const amount = 1000;

            const response = await loanService.fundLoan(loanId, amount);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data.fundedAmount).toBeGreaterThan(0);
        });

        it('should fail to fund non-existent loan', async () => {
            const loanId = 'non-existent-loan';
            const amount = 1000;

            await expect(loanService.fundLoan(loanId, amount)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Loan not found',
                })
            );
        });

        it('should fail to fund with invalid amount', async () => {
            const loanId = 'loan-1';
            const amount = -100; // negative amount

            await expect(loanService.fundLoan(loanId, amount)).rejects.toBeDefined();
        });
    });

    describe('POST /api/loans/:id/repay - Make Repayment', () => {
        it('should make repayment successfully', async () => {
            const loanId = 'loan-1';
            const amount = 500;

            const response = await loanService.makeRepayment(loanId, amount);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data.repaidAmount).toBeGreaterThan(0);
        });

        it('should mark loan as repaid when fully paid', async () => {
            const loanId = 'loan-2';
            const amount = 5000;

            // First get the loan to know total amount needed
            const loanDetails = await loanService.getLoanDetails(loanId);
            const totalDue = loanDetails.data.amount +
                (loanDetails.data.amount * loanDetails.data.interestRate / 100);

            const response = await loanService.makeRepayment(loanId, totalDue);

            expect(response.data.status).toBe('repaid');
        });

        it('should fail to repay non-existent loan', async () => {
            const loanId = 'non-existent-loan';

            await expect(loanService.makeRepayment(loanId, 500)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Loan not found',
                })
            );
        });
    });

    describe('POST /api/loans/:id/approve - Admin Approve Loan', () => {
        it('should approve a pending loan', async () => {
            const loanId = 'loan-2';

            const response = await loanService.approveLoan(loanId);

            expect(response.success).toBe(true);
            expect(response.data.status).toBe('approved');
        });

        it('should fail to approve non-existent loan', async () => {
            const loanId = 'non-existent-loan';

            await expect(loanService.approveLoan(loanId)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Loan not found',
                })
            );
        });
    });

    describe('POST /api/loans/:id/reject - Admin Reject Loan', () => {
        it('should reject a loan with reason', async () => {
            const loanId = 'loan-2';
            const reason = 'Insufficient collateral value';

            const response = await loanService.rejectLoan(loanId, reason);

            expect(response.success).toBe(true);
            expect(response.data.status).toBe('rejected');
            expect(response.data.rejectionReason).toBe(reason);
        });

        it('should reject a loan without reason', async () => {
            const loanId = 'loan-2';

            const response = await loanService.rejectLoan(loanId);

            expect(response.success).toBe(true);
            expect(response.data.status).toBe('rejected');
        });
    });

    describe('GET /api/loans/statistics', () => {
        it('should get loan statistics', async () => {
            const response = await loanService.getStatistics();

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('totalLoans');
            expect(response.data).toHaveProperty('activeLoans');
            expect(response.data).toHaveProperty('totalValue');
            expect(response.data).toHaveProperty('totalFunded');
            expect(response.data).toHaveProperty('averageInterestRate');
        });

        it('should return valid numeric values', async () => {
            const response = await loanService.getStatistics();

            expect(typeof response.data.totalLoans).toBe('number');
            expect(typeof response.data.totalValue).toBe('number');
            expect(response.data.totalValue).toBeGreaterThanOrEqual(0);
        });
    });

    describe('GET /api/loans/calculate-ltv', () => {
        it('should calculate LTV correctly', async () => {
            const loanAmount = 5000;
            const collateralValue = 10000;

            const response = await loanService.calculateLTV(loanAmount, collateralValue);

            expect(response.success).toBe(true);
            expect(response.data.ltv).toBe('50.00');
            expect(response.data.isEligible).toBe(true);
        });

        it('should show ineligible for high LTV', async () => {
            const loanAmount = 8000;
            const collateralValue = 10000;

            const response = await loanService.calculateLTV(loanAmount, collateralValue);

            expect(response.success).toBe(true);
            expect(parseFloat(response.data.ltv)).toBeGreaterThan(70);
            expect(response.data.isEligible).toBe(false);
        });

        it('should return max LTV threshold', async () => {
            const response = await loanService.calculateLTV(5000, 10000);

            expect(response.data.maxLtv).toBe(70);
        });
    });

    describe('POST /api/loans/:id/cancel - Cancel Loan Request', () => {
        it('should cancel a pending loan', async () => {
            const loanId = 'loan-2';

            const response = await loanService.cancelLoanRequest(loanId);

            expect(response.success).toBe(true);
        });

        it('should not allow cancelling active loan', async () => {
            const loanId = 'loan-1';

            // Mock response showing loan is already active
            server.use(
                http.post(`/api/loans/${loanId}/cancel`, () => {
                    return HttpResponse.json(
                        { success: false, error: 'Cannot cancel active loan' },
                        { status: 400 }
                    );
                })
            );

            await expect(loanService.cancelLoanRequest(loanId)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Cannot cancel active loan',
                })
            );
        });
    });

    describe('GET /api/loans/:id/schedule', () => {
        it('should get repayment schedule', async () => {
            const loanId = 'loan-1';

            server.use(
                http.get(`/api/loans/${loanId}/schedule`, () => {
                    return HttpResponse.json({
                        success: true,
                        data: {
                            loanId,
                            payments: [
                                { installment: 1, amount: 1750, dueDate: '2024-02-15' },
                                { installment: 2, amount: 1750, dueDate: '2024-03-15' },
                                { installment: 3, amount: 1750, dueDate: '2024-04-15' },
                            ],
                            totalAmount: 5250,
                            remainingBalance: 5250,
                        },
                    });
                })
            );

            const response = await loanService.getRepaymentSchedule(loanId);

            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('payments');
            expect(Array.isArray(response.data.payments)).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors', async () => {
            server.use(
                http.get('/api/loans', () => {
                    return HttpResponse.error();
                })
            );

            await expect(loanService.getLoanRequests()).rejects.toEqual(
                expect.objectContaining({
                    message: expect.any(String),
                })
            );
        });

        it('should handle server errors (500)', async () => {
            server.use(
                http.post('/api/loans', () => {
                    return HttpResponse.json(
                        { success: false, error: 'Internal server error' },
                        { status: 500 }
                    );
                })
            );

            await expect(loanService.createLoanRequest({
                amount: 5000,
                duration: 90,
                interestRate: 12,
                collateral: { type: 'vehicle', value: 10000 },
            })).rejects.toBeDefined();
        });

        it('should handle unauthorized access', async () => {
            localStorage.getItem.mockReturnValue(null);

            server.use(
                http.get('/api/loans/statistics', () => {
                    return HttpResponse.json(
                        { success: false, error: 'Unauthorized' },
                        { status: 401 }
                    );
                })
            );

            await expect(loanService.getStatistics()).rejects.toEqual(
                expect.objectContaining({
                    error: 'Unauthorized',
                })
            );
        });
    });
});
