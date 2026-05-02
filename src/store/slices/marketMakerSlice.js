import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import marketMakerService from '../../services/marketMakerService';

// Initial state
const initialState = {
    // Pools
    pools: [],
    activePool: null,
    
    // Positions
    positions: [],
    
    // Quotes
    currentQuote: null,
    priceHistory: [],
    
    // Analytics
    analytics: null,
    performanceMetrics: null,
    
    // Risk Management
    riskAssessments: {},
    exposureReport: null,
    riskAlerts: [],
    
    // Recovery Tokens
    recoveryTokens: [],
    recoveryPositions: [],
    
    // Parameters
    parameters: {
        baseSpread: 0.01,
        maxPositionSize: 100000,
        minLiquidityRatio: 0.15,
        stabilizationEnabled: true,
        autoRebalance: true
    },
    
    // Trading
    isTrading: false,
    tradeHistory: [],
    
    // Status
    isLoading: false,
    isProcessing: false,
    error: null,
    lastUpdate: null
};

// Async Thunks

// Get all pools
export const fetchPools = createAsyncThunk(
    'marketMaker/fetchPools',
    async (_, { rejectWithValue }) => {
        try {
            const data = await marketMakerService.getMarketMakerPools();
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Create pool
export const createPool = createAsyncThunk(
    'marketMaker/createPool',
    async (poolData, { rejectWithValue }) => {
        try {
            const data = await marketMakerService.createMarketMakerPool(poolData);
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Fund pool
export const fundPool = createAsyncThunk(
    'marketMaker/fundPool',
    async ({ poolId, amount }, { rejectWithValue }) => {
        try {
            const data = await marketMakerService.fundPool(poolId, amount);
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get quote
export const fetchQuote = createAsyncThunk(
    'marketMaker/fetchQuote',
    async ({ loanId, tokenCount }, { rejectWithValue }) => {
        try {
            const data = await marketMakerService.getQuote(loanId, tokenCount);
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Execute trade
export const executeTrade = createAsyncThunk(
    'marketMaker/executeTrade',
    async ({ loanId, tokenCount, isBuy }, { rejectWithValue }) => {
        try {
            const data = await marketMakerService.executeTrade(loanId, tokenCount, isBuy);
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get positions
export const fetchPositions = createAsyncThunk(
    'marketMaker/fetchPositions',
    async (_, { rejectWithValue }) => {
        try {
            const data = await marketMakerService.getPositions();
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get analytics
export const fetchAnalytics = createAsyncThunk(
    'marketMaker/fetchAnalytics',
    async (params, { rejectWithValue }) => {
        try {
            const data = await marketMakerService.getAnalytics(params);
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get price history
export const fetchPriceHistory = createAsyncThunk(
    'marketMaker/fetchPriceHistory',
    async ({ loanId, timeframe }, { rejectWithValue }) => {
        try {
            const data = await marketMakerService.getPriceHistory(loanId, timeframe);
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get risk assessment
export const fetchRiskAssessment = createAsyncThunk(
    'marketMaker/fetchRiskAssessment',
    async (loanId, { rejectWithValue }) => {
        try {
            const data = await marketMakerService.getRiskAssessment(loanId);
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Trigger stabilization
export const triggerStabilization = createAsyncThunk(
    'marketMaker/triggerStabilization',
    async (loanId, { rejectWithValue }) => {
        try {
            const data = await marketMakerService.triggerStabilization(loanId);
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Update parameters
export const updateParameters = createAsyncThunk(
    'marketMaker/updateParameters',
    async (params, { rejectWithValue }) => {
        try {
            const data = await marketMakerService.updateParameters(params);
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Get recovery token
export const fetchRecoveryToken = createAsyncThunk(
    'marketMaker/fetchRecoveryToken',
    async (loanId, { rejectWithValue }) => {
        try {
            const data = await marketMakerService.getRecoveryToken(loanId);
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Trade recovery token
export const tradeRecoveryToken = createAsyncThunk(
    'marketMaker/tradeRecoveryToken',
    async ({ loanId, tokenCount, isBuy }, { rejectWithValue }) => {
        try {
            const data = await marketMakerService.tradeRecoveryToken(loanId, tokenCount, isBuy);
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Slice
const marketMakerSlice = createSlice({
    name: 'marketMaker',
    initialState,
    reducers: {
        setActivePool: (state, action) => {
            state.activePool = action.payload;
        },
        updateQuoteLocally: (state, action) => {
            state.currentQuote = action.payload;
        },
        addRiskAlert: (state, action) => {
            state.riskAlerts.push({
                ...action.payload,
                timestamp: new Date().toISOString()
            });
        },
        clearRiskAlerts: (state) => {
            state.riskAlerts = [];
        },
        setParameters: (state, action) => {
            state.parameters = { ...state.parameters, ...action.payload };
        },
        clearError: (state) => {
            state.error = null;
        },
        resetState: () => initialState
    },
    extraReducers: (builder) => {
        builder
            // Fetch Pools
            .addCase(fetchPools.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchPools.fulfilled, (state, action) => {
                state.isLoading = false;
                state.pools = action.payload.pools || [];
                state.lastUpdate = new Date().toISOString();
            })
            .addCase(fetchPools.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            
            // Create Pool
            .addCase(createPool.pending, (state) => {
                state.isProcessing = true;
            })
            .addCase(createPool.fulfilled, (state, action) => {
                state.isProcessing = false;
                state.pools.push(action.payload.pool);
            })
            .addCase(createPool.rejected, (state, action) => {
                state.isProcessing = false;
                state.error = action.payload;
            })
            
            // Fund Pool
            .addCase(fundPool.pending, (state) => {
                state.isProcessing = true;
            })
            .addCase(fundPool.fulfilled, (state, action) => {
                state.isProcessing = false;
                const index = state.pools.findIndex(p => p.id === action.payload.pool.id);
                if (index >= 0) {
                    state.pools[index] = action.payload.pool;
                }
            })
            .addCase(fundPool.rejected, (state, action) => {
                state.isProcessing = false;
                state.error = action.payload;
            })
            
            // Fetch Quote
            .addCase(fetchQuote.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchQuote.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentQuote = action.payload;
            })
            .addCase(fetchQuote.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            
            // Execute Trade
            .addCase(executeTrade.pending, (state) => {
                state.isTrading = true;
            })
            .addCase(executeTrade.fulfilled, (state, action) => {
                state.isTrading = false;
                state.tradeHistory.unshift(action.payload.trade);
                
                // Update positions
                const positionIndex = state.positions.findIndex(
                    p => p.loanId === action.payload.trade.loanId
                );
                if (positionIndex >= 0) {
                    state.positions[positionIndex] = action.payload.position;
                } else {
                    state.positions.push(action.payload.position);
                }
            })
            .addCase(executeTrade.rejected, (state, action) => {
                state.isTrading = false;
                state.error = action.payload;
            })
            
            // Fetch Positions
            .addCase(fetchPositions.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchPositions.fulfilled, (state, action) => {
                state.isLoading = false;
                state.positions = action.payload.positions || [];
            })
            .addCase(fetchPositions.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            
            // Fetch Analytics
            .addCase(fetchAnalytics.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchAnalytics.fulfilled, (state, action) => {
                state.isLoading = false;
                state.analytics = action.payload.analytics;
                state.performanceMetrics = action.payload.metrics;
                state.exposureReport = action.payload.exposure;
            })
            .addCase(fetchAnalytics.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            
            // Fetch Price History
            .addCase(fetchPriceHistory.fulfilled, (state, action) => {
                state.priceHistory = action.payload.history || [];
            })
            
            // Fetch Risk Assessment
            .addCase(fetchRiskAssessment.fulfilled, (state, action) => {
                state.riskAssessments[action.payload.loanId] = action.payload;
            })
            
            // Trigger Stabilization
            .addCase(triggerStabilization.fulfilled, (state, action) => {
                state.currentQuote = action.payload.quote;
                state.riskAlerts.push({
                    type: 'stabilization',
                    message: `Price stabilization triggered for loan ${action.payload.loanId}`,
                    timestamp: new Date().toISOString()
                });
            })
            
            // Update Parameters
            .addCase(updateParameters.fulfilled, (state, action) => {
                state.parameters = { ...state.parameters, ...action.payload.parameters };
            })
            
            // Fetch Recovery Token
            .addCase(fetchRecoveryToken.fulfilled, (state, action) => {
                const index = state.recoveryTokens.findIndex(
                    r => r.loanId === action.payload.loanId
                );
                if (index >= 0) {
                    state.recoveryTokens[index] = action.payload;
                } else {
                    state.recoveryTokens.push(action.payload);
                }
            })
            
            // Trade Recovery Token
            .addCase(tradeRecoveryToken.pending, (state) => {
                state.isTrading = true;
            })
            .addCase(tradeRecoveryToken.fulfilled, (state, action) => {
                state.isTrading = false;
                const index = state.recoveryPositions.findIndex(
                    p => p.loanId === action.payload.loanId
                );
                if (index >= 0) {
                    state.recoveryPositions[index] = action.payload.position;
                } else {
                    state.recoveryPositions.push(action.payload.position);
                }
            })
            .addCase(tradeRecoveryToken.rejected, (state, action) => {
                state.isTrading = false;
                state.error = action.payload;
            });
    }
});

export const {
    setActivePool,
    updateQuoteLocally,
    addRiskAlert,
    clearRiskAlerts,
    setParameters,
    clearError,
    resetState
} = marketMakerSlice.actions;

export default marketMakerSlice.reducer;
