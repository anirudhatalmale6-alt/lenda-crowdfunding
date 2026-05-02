import { describe, it, expect, beforeEach } from 'vitest';
import escrowReducer, {
    setFilters,
    resetFilters,
    setPage,
    clearTransactionDetails,
    clearError,
} from './escrowSlice';

describe('escrowSlice', () => {
    const initialState = {
        transactions: [],
        transactionDetails: null,
        myTransactions: [],
        disputes: [],
        isLoading: false,
        error: null,
        filters: {
            status: 'all',
            role: 'all',
        },
        pagination: {
            page: 1,
            limit: 10,
            total: 0,
        },
    };

    it('should return the initial state', () => {
        const result = escrowReducer(undefined, { type: 'unknown' });
        expect(result.transactions).toEqual([]);
        expect(result.transactionDetails).toBe(null);
        expect(result.myTransactions).toEqual([]);
        expect(result.disputes).toEqual([]);
        expect(result.isLoading).toBe(false);
        expect(result.error).toBe(null);
        expect(result.filters.status).toBe('all');
        expect(result.filters.role).toBe('all');
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(10);
        expect(result.pagination.total).toBe(0);
    });

    describe('setFilters', () => {
        it('should set status filter', () => {
            const result = escrowReducer(initialState, setFilters({ status: 'FUNDED' }));
            expect(result.filters.status).toBe('FUNDED');
        });

        it('should set role filter', () => {
            const result = escrowReducer(initialState, setFilters({ role: 'buyer' }));
            expect(result.filters.role).toBe('buyer');
        });

        it('should set multiple filters at once', () => {
            const result = escrowReducer(
                initialState,
                setFilters({ status: 'DISPUTED', role: 'seller' })
            );
            expect(result.filters.status).toBe('DISPUTED');
            expect(result.filters.role).toBe('seller');
        });

        it('should preserve existing filters when setting new ones', () => {
            const stateWithFilters = {
                ...initialState,
                filters: { status: 'ACTIVE', role: 'buyer' },
            };
            const result = escrowReducer(stateWithFilters, setFilters({ status: 'COMPLETED' }));
            expect(result.filters.status).toBe('COMPLETED');
            expect(result.filters.role).toBe('buyer');
        });
    });

    describe('resetFilters', () => {
        it('should reset filters to initial state', () => {
            const stateWithFilters = {
                ...initialState,
                filters: { status: 'DISPUTED', role: 'seller' },
            };
            const result = escrowReducer(stateWithFilters, resetFilters());
            expect(result.filters.status).toBe('all');
            expect(result.filters.role).toBe('all');
        });
    });

    describe('setPage', () => {
        it('should set pagination page', () => {
            const result = escrowReducer(initialState, setPage(3));
            expect(result.pagination.page).toBe(3);
        });

        it('should handle setting page to 1', () => {
            const stateWithPage = { ...initialState, pagination: { ...initialState.pagination, page: 5 } };
            const result = escrowReducer(stateWithPage, setPage(1));
            expect(result.pagination.page).toBe(1);
        });
    });

    describe('clearTransactionDetails', () => {
        it('should clear transaction details', () => {
            const stateWithDetails = {
                ...initialState,
                transactionDetails: { id: 1, status: 'FUNDED' },
            };
            const result = escrowReducer(stateWithDetails, clearTransactionDetails());
            expect(result.transactionDetails).toBe(null);
        });
    });

    describe('clearError', () => {
        it('should clear error', () => {
            const stateWithError = {
                ...initialState,
                error: 'Some error occurred',
            };
            const result = escrowReducer(stateWithError, clearError());
            expect(result.error).toBe(null);
        });
    });

    describe('async thunk extraReducers', () => {
        describe('createEscrow', () => {
            it('should set isLoading to true on pending', () => {
                const action = { type: 'escrow/create/pending' };
                const result = escrowReducer(initialState, action);
                expect(result.isLoading).toBe(true);
                expect(result.error).toBe(null);
            });

            it('should add new transaction on fulfilled', () => {
                const newTransaction = { id: 1, status: 'CREATED', amount: 1000 };
                const action = { type: 'escrow/create/fulfilled', payload: newTransaction };
                const result = escrowReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.myTransactions).toHaveLength(1);
                expect(result.myTransactions[0]).toEqual(newTransaction);
            });

            it('should set error on rejected', () => {
                const action = { type: 'escrow/create/rejected', payload: 'Failed to create escrow' };
                const result = escrowReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.error).toBe('Failed to create escrow');
            });
        });

        describe('getEscrowTransactions', () => {
            it('should set isLoading to true on pending', () => {
                const action = { type: 'escrow/getTransactions/pending' };
                const result = escrowReducer(initialState, action);
                expect(result.isLoading).toBe(true);
            });

            it('should set transactions on fulfilled', () => {
                const payload = {
                    transactions: [{ id: 1 }, { id: 2 }],
                    pagination: { page: 1, limit: 10, total: 2 },
                };
                const action = { type: 'escrow/getTransactions/fulfilled', payload };
                const result = escrowReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.transactions).toHaveLength(2);
                expect(result.pagination.total).toBe(2);
            });

            it('should set error on rejected', () => {
                const action = { type: 'escrow/getTransactions/rejected', payload: 'Failed to fetch' };
                const result = escrowReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.error).toBe('Failed to fetch');
            });
        });

        describe('getMyEscrowTransactions', () => {
            it('should set myTransactions on fulfilled', () => {
                const payload = { transactions: [{ id: 1 }, { id: 2 }] };
                const action = { type: 'escrow/getMyTransactions/fulfilled', payload };
                const result = escrowReducer(initialState, action);
                expect(result.myTransactions).toHaveLength(2);
            });
        });

        describe('getEscrowDetails', () => {
            it('should set isLoading to true on pending', () => {
                const action = { type: 'escrow/getDetails/pending' };
                const result = escrowReducer(initialState, action);
                expect(result.isLoading).toBe(true);
            });

            it('should set transactionDetails on fulfilled', () => {
                const transaction = { id: 1, status: 'FUNDED', amount: 5000 };
                const action = { type: 'escrow/getDetails/fulfilled', payload: transaction };
                const result = escrowReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.transactionDetails).toEqual(transaction);
            });

            it('should set error on rejected', () => {
                const action = { type: 'escrow/getDetails/rejected', payload: 'Not found' };
                const result = escrowReducer(initialState, action);
                expect(result.isLoading).toBe(false);
                expect(result.error).toBe('Not found');
            });
        });

        describe('fundEscrow', () => {
            it('should update transactionDetails when ids match', () => {
                const updatedTransaction = { id: 1, status: 'FUNDED' };
                const stateWithDetails = {
                    ...initialState,
                    transactionDetails: { id: 1, status: 'CREATED' },
                };
                const action = { type: 'escrow/fund/fulfilled', payload: updatedTransaction };
                const result = escrowReducer(stateWithDetails, action);
                expect(result.transactionDetails.status).toBe('FUNDED');
            });

            it('should not update transactionDetails when ids do not match', () => {
                const updatedTransaction = { id: 2, status: 'FUNDED' };
                const stateWithDetails = {
                    ...initialState,
                    transactionDetails: { id: 1, status: 'CREATED' },
                };
                const action = { type: 'escrow/fund/fulfilled', payload: updatedTransaction };
                const result = escrowReducer(stateWithDetails, action);
                expect(result.transactionDetails.status).toBe('CREATED');
            });
        });

        describe('getEscrowDisputes', () => {
            it('should set disputes on fulfilled', () => {
                const payload = {
                    disputes: [{ id: 1 }, { id: 2 }],
                    pagination: { page: 1, limit: 10, total: 2 },
                };
                const action = { type: 'escrow/getDisputes/fulfilled', payload };
                const result = escrowReducer(initialState, action);
                expect(result.disputes).toHaveLength(2);
                expect(result.pagination.total).toBe(2);
            });
        });
    });
});
