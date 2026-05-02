import { describe, it, expect, beforeEach } from 'vitest';
import loanReducer, {
    setFilters,
    resetFilters,
    setPage,
    clearLoanDetails,
    clearError,
} from './loanSlice';

describe('loanSlice', () => {
    const initialState = {
        loans: [],
        myLoans: [],
        myLoanRequests: [],
        loanDetails: null,
        loanRequests: [],
        fundingOpportunities: [],
        pendingLoans: [],
        pendingCollateral: [],
        defaultedLoans: [],
        isLoading: false,
        error: null,
        riskScore: null,
        ltvRatio: 0,
        adminStats: null,
        platformStats: null,
        filters: {
            status: 'all',
            minAmount: 0,
            maxAmount: 1000000,
            minRate: 0,
            maxRate: 30,
            duration: 'all',
        },
        pagination: {
            page: 1,
            limit: 10,
            total: 0,
        },
    };

    it('should return the initial state', () => {
        const result = loanReducer(undefined, { type: 'unknown' });
        expect(result.loans).toEqual([]);
        expect(result.myLoans).toEqual([]);
        expect(result.myLoanRequests).toEqual([]);
        expect(result.loanDetails).toBe(null);
        expect(result.loanRequests).toEqual([]);
        expect(result.fundingOpportunities).toEqual([]);
        expect(result.pendingLoans).toEqual([]);
        expect(result.pendingCollateral).toEqual([]);
        expect(result.defaultedLoans).toEqual([]);
        expect(result.isLoading).toBe(false);
        expect(result.error).toBe(null);
        expect(result.riskScore).toBe(null);
        expect(result.ltvRatio).toBe(0);
        expect(result.adminStats).toBe(null);
        expect(result.platformStats).toBe(null);
    });

    describe('setFilters', () => {
        it('should set status filter', () => {
            const result = loanReducer(initialState, setFilters({ status: 'ACTIVE' }));
            expect(result.filters.status).toBe('ACTIVE');
        });

        it('should set amount filters', () => {
            const result = loanReducer(
                initialState,
                setFilters({ minAmount: 1000, maxAmount: 50000 })
            );
            expect(result.filters.minAmount).toBe(1000);
            expect(result.filters.maxAmount).toBe(50000);
        });

        it('should set rate filters', () => {
            const result = loanReducer(
                initialState,
                setFilters({ minRate: 5, maxRate: 20 })
            );
            expect(result.filters.minRate).toBe(5);
            expect(result.filters.maxRate).toBe(20);
        });

        it('should set duration filter', () => {
            const result = loanReducer(initialState, setFilters({ duration: '12months' }));
            expect(result.filters.duration).toBe('12months');
        });

        it('should preserve existing filters when setting new ones', () => {
            const stateWithFilters = {
                ...initialState,
                filters: { status: 'ACTIVE', minAmount: 1000, maxAmount: 50000, minRate: 0, maxRate: 30, duration: 'all' },
            };
            const result = loanReducer(stateWithFilters, setFilters({ status: 'REPAID' }));
            expect(result.filters.status).toBe('REPAID');
            expect(result.filters.minAmount).toBe(1000);
        });
    });

    describe('resetFilters', () => {
        it('should reset filters to initial state', () => {
            const stateWithFilters = {
                ...initialState,
                filters: { status: 'DEFAULTED', minAmount: 5000, maxAmount: 100000, minRate: 10, maxRate: 25, duration: '24months' },
            };
            const result = loanReducer(stateWithFilters, resetFilters());
            expect(result.filters.status).toBe('all');
            expect(result.filters.minAmount).toBe(0);
            expect(result.filters.maxAmount).toBe(1000000);
            expect(result.filters.minRate).toBe(0);
            expect(result.filters.maxRate).toBe(30);
            expect(result.filters.duration).toBe('all');
        });
    });

    describe('setPage', () => {
        it('should set pagination page', () => {
            const result = loanReducer(initialState, setPage(3));
            expect(result.pagination.page).toBe(3);
        });
    });

    describe('clearLoanDetails', () => {
        it('should clear loan details', () => {
            const stateWithDetails = {
                ...initialState,
                loanDetails: { id: 1, status: 'ACTIVE', amount: 10000 },
            };
            const result = loanReducer(stateWithDetails, clearLoanDetails());
            expect(result.loanDetails).toBe(null);
        });
    });

    describe('clearError', () => {
        it('should clear error', () => {
            const stateWithError = {
                ...initialState,
                error: 'Some error occurred',
            };
            const result = loanReducer(stateWithError, clearError());
            expect(result.error).toBe(null);
        });
    });

    describe('async thunk extraReducers', () => {
        describe('createLoanRequest', () => {
            it('should set isLoading to true on pending', () => {
                const action = { type: 'loans/createRequest/pending' };
                const result = loanReducer(initialState, action);
                expect(result.isLoading).toBe(true);
                expect(result.error).toBe(null);
            });

            it('should add new loan on fulfilled', () => {
                const newLoan = { id: 1, status: 'REQUESTED', amount: 10000 };
                const action = { type: 'loans/createRequest/fulfilled', payload: newLoan };
                const result = loanReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.myLoans).toHaveLength(1);
                expect(result.myLoans[0]).toEqual(newLoan);
            });

            it('should set error on rejected', () => {
                const action = { type: 'loans/createRequest/rejected', payload: 'Failed to create loan' };
                const result = loanReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.error).toBe('Failed to create loan');
            });
        });

        describe('getLoanRequests', () => {
            it('should set isLoading to true on pending', () => {
                const action = { type: 'loans/getRequests/pending' };
                const result = loanReducer(initialState, action);
                expect(result.isLoading).toBe(true);
            });

            it('should set loanRequests on fulfilled', () => {
                const payload = {
                    loans: [{ id: 1 }, { id: 2 }],
                    pagination: { page: 1, limit: 10, total: 2 },
                };
                const action = { type: 'loans/getRequests/fulfilled', payload };
                const result = loanReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.loanRequests).toHaveLength(2);
                expect(result.pagination.total).toBe(2);
            });

            it('should set error on rejected', () => {
                const action = { type: 'loans/getRequests/rejected', payload: 'Failed to fetch' };
                const result = loanReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.error).toBe('Failed to fetch');
            });
        });

        describe('getMyLoans', () => {
            it('should set isLoading to true on pending', () => {
                const action = { type: 'loans/getMyLoans/pending' };
                const result = loanReducer(initialState, action);
                expect(result.isLoading).toBe(true);
            });

            it('should set myLoans on fulfilled', () => {
                const payload = { loans: [{ id: 1, status: 'ACTIVE' }, { id: 2, status: 'REPAID' }] };
                const action = { type: 'loans/getMyLoans/fulfilled', payload };
                const result = loanReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.myLoans).toHaveLength(2);
            });

            it('should set error on rejected', () => {
                const action = { type: 'loans/getMyLoans/rejected', payload: 'Unauthorized' };
                const result = loanReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.error).toBe('Unauthorized');
            });
        });

        describe('getLoanDetails', () => {
            it('should set isLoading to true on pending', () => {
                const action = { type: 'loans/getDetails/pending' };
                const result = loanReducer(initialState, action);
                expect(result.isLoading).toBe(true);
            });

            it('should set loanDetails on fulfilled', () => {
                const loan = { id: 1, status: 'ACTIVE', amount: 5000, interestRate: 12 };
                const action = { type: 'loans/getDetails/fulfilled', payload: loan };
                const result = loanReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.loanDetails).toEqual(loan);
            });

            it('should set error on rejected', () => {
                const action = { type: 'loans/getDetails/rejected', payload: 'Loan not found' };
                const result = loanReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.error).toBe('Loan not found');
            });
        });

        describe('fundLoan', () => {
            it('should set isLoading to true on pending', () => {
                const action = { type: 'loans/fund/pending' };
                const result = loanReducer(initialState, action);
                expect(result.isLoading).toBe(true);
            });

            it('should update loan in loanRequests on fulfilled', () => {
                const updatedLoan = { id: 1, status: 'FUNDED', amount: 5000 };
                const stateWithLoans = {
                    ...initialState,
                    loanRequests: [{ id: 1, status: 'REQUESTED' }, { id: 2, status: 'REQUESTED' }],
                };
                const action = { type: 'loans/fund/fulfilled', payload: updatedLoan };
                const result = loanReducer(stateWithLoans, action);
                expect(result.isLoading).toBe(false);
                expect(result.loanRequests[0].status).toBe('FUNDED');
            });

            it('should set error on rejected', () => {
                const action = { type: 'loans/fund/rejected', payload: 'Insufficient funds' };
                const result = loanReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.error).toBe('Insufficient funds');
            });
        });

        describe('makeRepayment', () => {
            it('should update loanDetails on fulfilled', () => {
                const repayment = { id: 1, status: 'ACTIVE', remainingAmount: 4000 };
                const stateWithDetails = {
                    ...initialState,
                    loanDetails: { id: 1, status: 'ACTIVE', remainingAmount: 5000 },
                };
                const action = { type: 'loans/repay/fulfilled', payload: repayment };
                const result = loanReducer(stateWithDetails, action);
                expect(result.loanDetails.remainingAmount).toBe(4000);
            });
        });

        describe('calculateLTV', () => {
            it('should set ltvRatio on fulfilled', () => {
                const payload = { ltv: 0.75 };
                const action = { type: 'loans/calculateLTV/fulfilled', payload };
                const result = loanReducer(initialState, action);
                expect(result.ltvRatio).toBe(0.75);
            });
        });

        describe('getRiskScore', () => {
            it('should set riskScore on fulfilled', () => {
                const payload = { score: 85, grade: 'A' };
                const action = { type: 'loans/getRiskScore/fulfilled', payload };
                const result = loanReducer(initialState, action);
                expect(result.riskScore).toEqual(payload);
            });
        });

        describe('getAdminDashboardStats', () => {
            it('should set adminStats on fulfilled', () => {
                const payload = { totalLoans: 100, totalValue: 1000000 };
                const action = { type: 'loans/getAdminDashboardStats/fulfilled', payload };
                const result = loanReducer(initialState, action);
                expect(result.adminStats).toEqual(payload);
            });
        });

        describe('getPlatformStats', () => {
            it('should set platformStats on fulfilled', () => {
                const payload = { monthlyVolume: 50000, activeLoans: 25 };
                const action = { type: 'loans/getPlatformStats/fulfilled', payload };
                const result = loanReducer(initialState, action);
                expect(result.platformStats).toEqual(payload);
            });
        });

        describe('getPendingLoans (admin)', () => {
            it('should set pendingLoans on fulfilled', () => {
                const payload = { loans: [{ id: 1, status: 'PENDING' }] };
                const action = { type: 'loans/getPendingLoans/fulfilled', payload };
                const result = loanReducer(initialState, action);
                expect(result.pendingLoans).toHaveLength(1);
            });
        });

        describe('approveLoan (admin)', () => {
            it('should remove loan from pendingLoans on fulfilled', () => {
                const approvedLoan = { id: 1, status: 'ACTIVE' };
                const stateWithPending = {
                    ...initialState,
                    pendingLoans: [{ id: 1, status: 'PENDING' }, { id: 2, status: 'PENDING' }],
                };
                const action = { type: 'loans/approve/fulfilled', payload: approvedLoan };
                const result = loanReducer(stateWithPending, action);
                expect(result.pendingLoans).toHaveLength(1);
            });
        });

        describe('rejectLoan (admin)', () => {
            it('should remove loan from pendingLoans on fulfilled', () => {
                const rejectedLoan = { id: 1, status: 'REJECTED' };
                const stateWithPending = {
                    ...initialState,
                    pendingLoans: [{ id: 1, status: 'PENDING' }, { id: 2, status: 'PENDING' }],
                };
                const action = { type: 'loans/reject/fulfilled', payload: rejectedLoan };
                const result = loanReducer(stateWithPending, action);
                expect(result.pendingLoans).toHaveLength(1);
            });
        });

        describe('getPendingCollateral (admin)', () => {
            it('should set pendingCollateral on fulfilled', () => {
                const payload = { collateral: [{ id: 1, status: 'PENDING' }] };
                const action = { type: 'loans/getPendingCollateral/fulfilled', payload };
                const result = loanReducer(initialState, action);
                expect(result.pendingCollateral).toHaveLength(1);
            });
        });

        describe('getDefaultedLoans (admin)', () => {
            it('should set defaultedLoans on fulfilled', () => {
                const payload = { loans: [{ id: 1, status: 'DEFAULTED' }] };
                const action = { type: 'loans/getDefaultedLoans/fulfilled', payload };
                const result = loanReducer(initialState, action);
                expect(result.defaultedLoans).toHaveLength(1);
            });
        });
    });
});
