import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import marketplaceService from '../../services/marketplaceService';

const initialState = {
    recoveryItems: [],
    recoveryListings: [],
    featuredItems: [],
    itemDetails: null,
    myBids: [],
    isLoading: false,
    error: null,
    // Real-time data
    liveStats: null,
    recentLoans: [],
    // Pagination state
    loans: {
        items: [],
        cursor: null,
        hasMore: true,
        isLoading: false
    },
    filters: {
        type: 'all', // all, vehicle, property, equipment, other
        status: 'all', // all, active, auction, negotiation
        minPrice: 0,
        maxPrice: 1000000,
    },
    pagination: {
        page: 1,
        limit: 12,
        total: 0,
    },
};

// Get recovery marketplace items
export const getRecoveryItems = createAsyncThunk(
    'marketplace/getItems',
    async (filters, { rejectWithValue }) => {
        try {
            const response = await marketplaceService.getRecoveryItems(filters);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get featured items
export const getFeaturedItems = createAsyncThunk(
    'marketplace/getFeatured',
    async (_, { rejectWithValue }) => {
        try {
            const response = await marketplaceService.getFeaturedItems();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get item details
export const getItemDetails = createAsyncThunk(
    'marketplace/getItemDetails',
    async (itemId, { rejectWithValue }) => {
        try {
            const response = await marketplaceService.getItemDetails(itemId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Place a bid
export const placeBid = createAsyncThunk(
    'marketplace/placeBid',
    async ({ itemId, amount }, { rejectWithValue }) => {
        try {
            const response = await marketplaceService.placeBid(itemId, amount);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Buy now
export const buyNow = createAsyncThunk(
    'marketplace/buyNow',
    async (itemId, { rejectWithValue }) => {
        try {
            const response = await marketplaceService.buyNow(itemId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get my bids
export const getMyBids = createAsyncThunk(
    'marketplace/getMyBids',
    async (_, { rejectWithValue }) => {
        try {
            const response = await marketplaceService.getMyBids();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get recovery listings (admin)
export const getRecoveryListings = createAsyncThunk(
    'marketplace/getRecoveryListings',
    async (_, { rejectWithValue }) => {
        try {
            const response = await marketplaceService.getRecoveryListings();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Approve recovery listing (admin)
export const approveRecoveryListing = createAsyncThunk(
    'marketplace/approveRecoveryListing',
    async (listingId, { rejectWithValue }) => {
        try {
            const response = await marketplaceService.approveRecoveryListing(listingId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Process recovery sale (admin)
export const processRecoverySale = createAsyncThunk(
    'marketplace/processRecoverySale',
    async (listingId, { rejectWithValue }) => {
        try {
            const response = await marketplaceService.processRecoverySale(listingId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Cancel recovery listing (admin)
export const cancelRecoveryListing = createAsyncThunk(
    'marketplace/cancelRecoveryListing',
    async (listingId, { rejectWithValue }) => {
        try {
            const response = await marketplaceService.cancelRecoveryListing(listingId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const marketplaceSlice = createSlice({
    name: 'marketplace',
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
        clearItemDetails: (state) => {
            state.itemDetails = null;
        },
        clearError: (state) => {
            state.error = null;
        },
        // WebSocket real-time update handlers
        updateLoanStatus: (state, action) => {
            const { loanId, status } = action.payload;
            // Update in loans array
            const loanIndex = state.loans.items.findIndex(l => l.id === loanId);
            if (loanIndex !== -1) {
                state.loans.items[loanIndex].status = status;
            }
            // Update in recent loans
            const recentIndex = state.recentLoans.findIndex(l => l.id === loanId);
            if (recentIndex !== -1) {
                state.recentLoans[recentIndex].status = status;
            }
        },
        addNewLoan: (state, action) => {
            // Add new loan to the top of the list
            state.recentLoans.unshift(action.payload);
            // Keep only the last 20 loans
            if (state.recentLoans.length > 20) {
                state.recentLoans = state.recentLoans.slice(0, 20);
            }
        },
        updateLoanFunding: (state, action) => {
            const { loanId, fundedAmount } = action.payload;
            // Update in loans array
            const loanIndex = state.loans.items.findIndex(l => l.id === loanId);
            if (loanIndex !== -1) {
                state.loans.items[loanIndex].funded_amount = fundedAmount;
            }
            // Update in recent loans
            const recentIndex = state.recentLoans.findIndex(l => l.id === loanId);
            if (recentIndex !== -1) {
                state.recentLoans[recentIndex].funded_amount = fundedAmount;
            }
        },
        updateStats: (state, action) => {
            state.liveStats = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getRecoveryItems.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getRecoveryItems.fulfilled, (state, action) => {
                state.isLoading = false;
                state.recoveryItems = action.payload.items;
                state.pagination = action.payload.pagination;
            })
            .addCase(getRecoveryItems.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(getFeaturedItems.fulfilled, (state, action) => {
                state.featuredItems = action.payload.items;
            })
            .addCase(getItemDetails.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getItemDetails.fulfilled, (state, action) => {
                state.isLoading = false;
                state.itemDetails = action.payload;
            })
            .addCase(getItemDetails.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(placeBid.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(placeBid.fulfilled, (state, action) => {
                state.isLoading = false;
                state.itemDetails = action.payload.item;
            })
            .addCase(placeBid.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(buyNow.fulfilled, (state, action) => {
                // Remove from marketplace after purchase
                state.recoveryItems = state.recoveryItems.filter(
                    (item) => item.id !== action.payload.id
                );
            })
            .addCase(getMyBids.fulfilled, (state, action) => {
                state.myBids = action.payload.bids;
            })
            // Get recovery listings (admin)
            .addCase(getRecoveryListings.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getRecoveryListings.fulfilled, (state, action) => {
                state.isLoading = false;
                state.recoveryListings = action.payload.listings;
            })
            .addCase(getRecoveryListings.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Approve recovery listing
            .addCase(approveRecoveryListing.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(approveRecoveryListing.fulfilled, (state, action) => {
                state.isLoading = false;
                // Update the listing in the list
                const index = state.recoveryListings.findIndex(l => l.id === action.payload.listing.id);
                if (index !== -1) {
                    state.recoveryListings[index] = action.payload.listing;
                }
            })
            .addCase(approveRecoveryListing.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Process recovery sale
            .addCase(processRecoverySale.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(processRecoverySale.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.recoveryListings.findIndex(l => l.id === action.payload.listing.id);
                if (index !== -1) {
                    state.recoveryListings[index] = action.payload.listing;
                }
            })
            .addCase(processRecoverySale.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Cancel recovery listing
            .addCase(cancelRecoveryListing.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(cancelRecoveryListing.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.recoveryListings.findIndex(l => l.id === action.payload.listing.id);
                if (index !== -1) {
                    state.recoveryListings[index] = action.payload.listing;
                }
            })
            .addCase(cancelRecoveryListing.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export const { setFilters, resetFilters, setPage, clearItemDetails, clearError, updateLoanStatus, addNewLoan, updateLoanFunding, updateStats, updateMarketplaceStats } = marketplaceSlice.actions;
export default marketplaceSlice.reducer;
