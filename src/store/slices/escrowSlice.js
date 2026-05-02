import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import escrowService from '../../services/escrowService';

const initialState = {
    transactions: [],
    transactionDetails: null,
    myTransactions: [],
    disputes: [],
    isLoading: false,
    error: null,
    // Escrow statuses: CREATED, FUNDED, SHIPPED, DELIVERED, DISPUTED, RELEASED, REFUNDED
    filters: {
        status: 'all',
        role: 'all', // all, buyer, seller
    },
    pagination: {
        page: 1,
        limit: 10,
        total: 0,
    },
};

// Create escrow transaction
export const createEscrow = createAsyncThunk(
    'escrow/create',
    async (transactionData, { rejectWithValue }) => {
        try {
            const response = await escrowService.createTransaction(transactionData);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get all escrow transactions (admin/lender view)
export const getEscrowTransactions = createAsyncThunk(
    'escrow/getTransactions',
    async (filters, { rejectWithValue }) => {
        try {
            const response = await escrowService.getTransactions(filters);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get my transactions (as buyer or seller)
export const getMyEscrowTransactions = createAsyncThunk(
    'escrow/getMyTransactions',
    async (_, { rejectWithValue }) => {
        try {
            const response = await escrowService.getMyTransactions();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get transaction details
export const getEscrowDetails = createAsyncThunk(
    'escrow/getDetails',
    async (transactionId, { rejectWithValue }) => {
        try {
            const response = await escrowService.getTransactionDetails(transactionId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Fund escrow (buyer pays)
export const fundEscrow = createAsyncThunk(
    'escrow/fund',
    async ({ transactionId, amount }, { rejectWithValue }) => {
        try {
            const response = await escrowService.fundTransaction(transactionId, amount);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Mark as shipped
export const markAsShipped = createAsyncThunk(
    'escrow/ship',
    async (transactionId, { rejectWithValue }) => {
        try {
            const response = await escrowService.markAsShipped(transactionId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Confirm delivery
export const confirmDelivery = createAsyncThunk(
    'escrow/confirm',
    async (transactionId, { rejectWithValue }) => {
        try {
            const response = await escrowService.confirmDelivery(transactionId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Release funds
export const releaseFunds = createAsyncThunk(
    'escrow/release',
    async (transactionId, { rejectWithValue }) => {
        try {
            const response = await escrowService.releaseFunds(transactionId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Open dispute
export const openDispute = createAsyncThunk(
    'escrow/dispute',
    async ({ transactionId, reason }, { rejectWithValue }) => {
        try {
            const response = await escrowService.openDispute(transactionId, reason);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Resolve dispute
export const resolveDispute = createAsyncThunk(
    'escrow/resolve',
    async ({ transactionId, resolution }, { rejectWithValue }) => {
        try {
            const response = await escrowService.resolveDispute(transactionId, resolution);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get escrow disputes (admin)
export const getEscrowDisputes = createAsyncThunk(
    'escrow/getDisputes',
    async (filters, { rejectWithValue }) => {
        try {
            const response = await escrowService.getDisputes(filters);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const escrowSlice = createSlice({
    name: 'escrow',
    initialState,
    reducers: {
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        resetFilters: (state) => {
            state.filters = initialState.filters;
        },
        setPage: (state, action) => {
            state.pagination.page = action.payload;
        },
        clearTransactionDetails: (state) => {
            state.transactionDetails = null;
        },
        clearError: (state) => {
            state.error = null;
        },
        // WebSocket real-time update handlers
        updateEscrowStatus: (state, action) => {
            const { escrowId, status } = action.payload;
            // Update in transactions array
            const index = state.transactions.findIndex(t => t.id === escrowId);
            if (index !== -1) {
                state.transactions[index].status = status;
            }
            // Update in my transactions
            const myIndex = state.myTransactions.findIndex(t => t.id === escrowId);
            if (myIndex !== -1) {
                state.myTransactions[myIndex].status = status;
            }
            // Update details if viewing
            if (state.transactionDetails?.id === escrowId) {
                state.transactionDetails.status = status;
            }
        },
        addNewEscrow: (state, action) => {
            // Add new escrow to the top of the list
            state.transactions.unshift(action.payload);
            state.myTransactions.unshift(action.payload);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(createEscrow.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createEscrow.fulfilled, (state, action) => {
                state.isLoading = false;
                state.myTransactions.unshift(action.payload);
            })
            .addCase(createEscrow.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(getEscrowTransactions.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getEscrowTransactions.fulfilled, (state, action) => {
                state.isLoading = false;
                state.transactions = action.payload.transactions;
                state.pagination = action.payload.pagination;
            })
            .addCase(getEscrowTransactions.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(getMyEscrowTransactions.fulfilled, (state, action) => {
                state.myTransactions = action.payload.transactions;
            })
            .addCase(getEscrowDetails.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getEscrowDetails.fulfilled, (state, action) => {
                state.isLoading = false;
                state.transactionDetails = action.payload;
            })
            .addCase(getEscrowDetails.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(fundEscrow.fulfilled, (state, action) => {
                if (state.transactionDetails?.id === action.payload.id) {
                    state.transactionDetails = action.payload;
                }
            })
            .addCase(markAsShipped.fulfilled, (state, action) => {
                if (state.transactionDetails?.id === action.payload.id) {
                    state.transactionDetails = action.payload;
                }
            })
            .addCase(confirmDelivery.fulfilled, (state, action) => {
                if (state.transactionDetails?.id === action.payload.id) {
                    state.transactionDetails = action.payload;
                }
            })
            .addCase(releaseFunds.fulfilled, (state, action) => {
                if (state.transactionDetails?.id === action.payload.id) {
                    state.transactionDetails = action.payload;
                }
            })
            .addCase(openDispute.fulfilled, (state, action) => {
                if (state.transactionDetails?.id === action.payload.id) {
                    state.transactionDetails = action.payload;
                }
            })
            .addCase(resolveDispute.fulfilled, (state, action) => {
                if (state.transactionDetails?.id === action.payload.id) {
                    state.transactionDetails = action.payload;
                }
            })
            // Get disputes
            .addCase(getEscrowDisputes.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getEscrowDisputes.fulfilled, (state, action) => {
                state.isLoading = false;
                state.disputes = action.payload.disputes;
                state.pagination = action.payload.pagination;
            })
            .addCase(getEscrowDisputes.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export const { setFilters, resetFilters, setPage, clearTransactionDetails, clearError, updateEscrowStatus, addNewEscrow } = escrowSlice.actions;
export default escrowSlice.reducer;
