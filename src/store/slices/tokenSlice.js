import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../utils/api/client';

// API Base URL
const API_URL = '/api/tokens';

// Initial state
const initialState = {
    // Tokenized Loans
    tokenizedLoans: [],
    loanTokens: [],
    tokenDetails: null,
    
    // Holdings
    tokenHoldings: [],
    portfolio: null,
    
    // Secondary Market
    orderBook: {
        buyOrders: [],
        sellOrders: []
    },
    marketStats: null,
    myOrders: [],
    myTrades: [],
    
    // Reserve Pools
    reservePools: [],
    coverageDetails: null,
    claims: [],
    
    // Market Maker
    marketMakerPools: [],
    marketMakerPositions: [],
    quotes: null,
    
    // Risk Scoring
    riskAssessments: [],
    riskScoreHistory: [],
    
    // Refinancing
    refinancingRequests: [],
    refinancingOpportunities: [],
    
    // Loading states
    isLoading: false,
    isProcessing: false,
    error: null,
    
    // Filters
    filters: {
        riskRating: 'all',
        minYield: 0,
        maxYield: 30,
        status: 'all',
        tokenType: 'all'
    },
    
    // Pagination
    pagination: {
        page: 1,
        limit: 20,
        total: 0
    }
};

// Async Thunks

// Get all tokenized loans
export const getTokenizedLoans = createAsyncThunk(
    'tokens/getTokenizedLoans',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`${API_URL}/market`, { params: filters });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get loan token details
export const getTokenDetails = createAsyncThunk(
    'tokens/getDetails',
    async (loanId, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`${API_URL}/${loanId}/details`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Purchase tokens
export const purchaseTokens = createAsyncThunk(
    'tokens/purchase',
    async ({ loanId, amount }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(`${API_URL}/${loanId}/purchase`, { amount });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get portfolio
export const getPortfolio = createAsyncThunk(
    'tokens/getPortfolio',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`${API_URL}/portfolio`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get token holdings
export const getTokenHoldings = createAsyncThunk(
    'tokens/getHoldings',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`${API_URL}/holdings`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get order book
export const getOrderBook = createAsyncThunk(
    'tokens/getOrderBook',
    async (loanId, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`${API_URL}/market/${loanId}/orderbook`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Create order
export const createOrder = createAsyncThunk(
    'tokens/createOrder',
    async ({ loanId, orderType, tokenCount, pricePerToken, durationHours }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(`${API_URL}/market/orders`, {
                loanId,
                orderType,
                tokenCount,
                pricePerToken,
                durationHours
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Fill order
export const fillOrder = createAsyncThunk(
    'tokens/fillOrder',
    async ({ orderId, tokenCount }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(`${API_URL}/market/orders/${orderId}/fill`, { tokenCount });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Cancel order
export const cancelOrder = createAsyncThunk(
    'tokens/cancelOrder',
    async (orderId, { rejectWithValue }) => {
        try {
            const response = await apiClient.delete(`${API_URL}/market/orders/${orderId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get my orders
export const getMyOrders = createAsyncThunk(
    'tokens/getMyOrders',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`${API_URL}/market/my-orders`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get market stats
export const getMarketStats = createAsyncThunk(
    'tokens/getMarketStats',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`${API_URL}/market/stats`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get reserve pools
export const getReservePools = createAsyncThunk(
    'tokens/getReservePools',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`${API_URL}/reserves/pools`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get coverage details
export const getCoverageDetails = createAsyncThunk(
    'tokens/getCoverage',
    async (loanId, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`${API_URL}/reserves/coverage/${loanId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Submit claim
export const submitClaim = createAsyncThunk(
    'tokens/submitClaim',
    async ({ poolId, loanId, amount, reason }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(`${API_URL}/reserves/claims`, {
                poolId,
                loanId,
                amount,
                reason
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get claims
export const getClaims = createAsyncThunk(
    'tokens/getClaims',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`${API_URL}/reserves/claims`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get market maker pools
export const getMarketMakerPools = createAsyncThunk(
    'tokens/getMarketMakerPools',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`${API_URL}/market-maker/pools`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get quote
export const getQuote = createAsyncThunk(
    'tokens/getQuote',
    async ({ loanId, tokenCount }, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`${API_URL}/market-maker/quote`, {
                params: { loanId, tokenCount }
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Execute trade with market maker
export const executeMarketMakerTrade = createAsyncThunk(
    'tokens/executeTrade',
    async ({ loanId, tokenCount, isBuy }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(`${API_URL}/market-maker/trade`, {
                loanId,
                tokenCount,
                isBuy
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get risk assessments
export const getRiskAssessments = createAsyncThunk(
    'tokens/getRiskAssessments',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`${API_URL}/risk/assessments`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get refinancing opportunities
export const getRefinancingOpportunities = createAsyncThunk(
    'tokens/getRefinancing',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(`${API_URL}/refinancing/opportunities`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Submit refinancing request
export const requestRefinancing = createAsyncThunk(
    'tokens/requestRefinancing',
    async ({ loanId, newInterestRate, newDurationMonths }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(`${API_URL}/refinancing/request`, {
                loanId,
                newInterestRate,
                newDurationMonths
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Invest in refinancing
export const investRefinancing = createAsyncThunk(
    'tokens/investRefinancing',
    async ({ refinancingId, amount }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(`${API_URL}/refinancing/invest`, {
                refinancingId,
                amount
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Slice
const tokenSlice = createSlice({
    name: 'tokens',
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
        clearTokenDetails: (state) => {
            state.tokenDetails = null;
        },
        clearError: (state) => {
            state.error = null;
        },
        clearOrderBook: (state) => {
            state.orderBook = { buyOrders: [], sellOrders: [] };
        }
    },
    extraReducers: (builder) => {
        builder
            // Get Tokenized Loans
            .addCase(getTokenizedLoans.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getTokenizedLoans.fulfilled, (state, action) => {
                state.isLoading = false;
                state.tokenizedLoans = action.payload.loans;
                state.pagination = action.payload.pagination || state.pagination;
            })
            .addCase(getTokenizedLoans.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            
            // Get Token Details
            .addCase(getTokenDetails.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getTokenDetails.fulfilled, (state, action) => {
                state.isLoading = false;
                state.tokenDetails = action.payload;
            })
            .addCase(getTokenDetails.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            
            // Purchase Tokens
            .addCase(purchaseTokens.pending, (state) => {
                state.isProcessing = true;
            })
            .addCase(purchaseTokens.fulfilled, (state, action) => {
                state.isProcessing = false;
                // Update holdings
                if (state.tokenHoldings) {
                    const index = state.tokenHoldings.findIndex(h => h.loanId === action.payload.loanId);
                    if (index >= 0) {
                        state.tokenHoldings[index].tokenCount += action.payload.tokensPurchased;
                    }
                }
            })
            .addCase(purchaseTokens.rejected, (state, action) => {
                state.isProcessing = false;
                state.error = action.payload;
            })
            
            // Get Portfolio
            .addCase(getPortfolio.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getPortfolio.fulfilled, (state, action) => {
                state.isLoading = false;
                state.portfolio = action.payload;
            })
            .addCase(getPortfolio.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            
            // Get Holdings
            .addCase(getTokenHoldings.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getTokenHoldings.fulfilled, (state, action) => {
                state.isLoading = false;
                state.tokenHoldings = action.payload.holdings;
            })
            .addCase(getTokenHoldings.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            
            // Get Order Book
            .addCase(getOrderBook.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getOrderBook.fulfilled, (state, action) => {
                state.isLoading = false;
                state.orderBook = action.payload;
            })
            .addCase(getOrderBook.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            
            // Create Order
            .addCase(createOrder.pending, (state) => {
                state.isProcessing = true;
            })
            .addCase(createOrder.fulfilled, (state, action) => {
                state.isProcessing = false;
                if (action.payload.orderType === 'buy') {
                    state.orderBook.buyOrders.push(action.payload);
                } else {
                    state.orderBook.sellOrders.push(action.payload);
                }
            })
            .addCase(createOrder.rejected, (state, action) => {
                state.isProcessing = false;
                state.error = action.payload;
            })
            
            // Fill Order
            .addCase(fillOrder.pending, (state) => {
                state.isProcessing = true;
            })
            .addCase(fillOrder.fulfilled, (state, action) => {
                state.isProcessing = false;
                // Update order in book
                const { orderType, orderId } = action.payload;
                const orders = orderType === 'buy' ? state.orderBook.buyOrders : state.orderBook.sellOrders;
                const index = orders.findIndex(o => o.id === orderId);
                if (index >= 0) {
                    orders[index] = action.payload.updatedOrder;
                }
            })
            .addCase(fillOrder.rejected, (state, action) => {
                state.isProcessing = false;
                state.error = action.payload;
            })
            
            // Cancel Order
            .addCase(cancelOrder.fulfilled, (state, action) => {
                const { orderType, orderId } = action.payload;
                const orders = orderType === 'buy' ? state.orderBook.buyOrders : state.orderBook.sellOrders;
                const index = orders.findIndex(o => o.id === orderId);
                if (index >= 0) {
                    orders.splice(index, 1);
                }
            })
            
            // Get My Orders
            .addCase(getMyOrders.fulfilled, (state, action) => {
                state.myOrders = action.payload.orders;
            })
            
            // Get Market Stats
            .addCase(getMarketStats.fulfilled, (state, action) => {
                state.marketStats = action.payload;
            })
            
            // Reserve Pools
            .addCase(getReservePools.fulfilled, (state, action) => {
                state.reservePools = action.payload.pools;
            })
            
            // Coverage Details
            .addCase(getCoverageDetails.fulfilled, (state, action) => {
                state.coverageDetails = action.payload;
            })
            
            // Claims
            .addCase(getClaims.fulfilled, (state, action) => {
                state.claims = action.payload.claims;
            })
            
            .addCase(submitClaim.fulfilled, (state, action) => {
                state.claims.push(action.payload);
            })
            
            // Market Maker
            .addCase(getMarketMakerPools.fulfilled, (state, action) => {
                state.marketMakerPools = action.payload.pools;
            })
            
            .addCase(getQuote.fulfilled, (state, action) => {
                state.quotes = action.payload;
            })
            
            // Execute Market Maker Trade
            .addCase(executeMarketMakerTrade.pending, (state) => {
                state.isProcessing = true;
            })
            .addCase(executeMarketMakerTrade.fulfilled, (state, action) => {
                state.isProcessing = false;
                // Add to trades history
                if (action.payload.trade) {
                    state.myTrades.unshift(action.payload.trade);
                }
                // Update token holdings if it's a buy
                if (action.payload.trade?.type === 'buy' && state.tokenHoldings) {
                    const index = state.tokenHoldings.findIndex(
                        h => h.loanId === action.payload.trade.loanId
                    );
                    if (index >= 0) {
                        state.tokenHoldings[index].tokenCount += action.payload.trade.tokenCount;
                    } else {
                        state.tokenHoldings.push({
                            loanId: action.payload.trade.loanId,
                            tokenCount: action.payload.trade.tokenCount,
                            tokenSymbol: action.payload.trade.tokenSymbol
                        });
                    }
                }
            })
            .addCase(executeMarketMakerTrade.rejected, (state, action) => {
                state.isProcessing = false;
                state.error = action.payload;
            })
            
            // Risk Assessments
            .addCase(getRiskAssessments.fulfilled, (state, action) => {
                state.riskAssessments = action.payload.assessments;
            })
            
            // Refinancing
            .addCase(getRefinancingOpportunities.fulfilled, (state, action) => {
                state.refinancingOpportunities = action.payload.opportunities;
            })
            
            .addCase(requestRefinancing.fulfilled, (state, action) => {
                state.refinancingRequests.push(action.payload);
            })
            
            .addCase(investRefinancing.fulfilled, (state, action) => {
                const index = state.refinancingOpportunities.findIndex(
                    r => r.id === action.payload.refinancingId
                );
                if (index >= 0) {
                    state.refinancingOpportunities[index].investorCount += 1;
                    state.refinancingOpportunities[index].raisedAmount += action.payload.amount;
                }
            });
    }
});

export const { setFilters, resetFilters, setPage, clearTokenDetails, clearError, clearOrderBook } = tokenSlice.actions;
export default tokenSlice.reducer;
