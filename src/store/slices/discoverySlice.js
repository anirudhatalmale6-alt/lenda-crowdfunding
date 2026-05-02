import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import discoveryService from '../../services/discoveryService';

const initialState = {
    // Investor preferences
    preferences: {
        riskTolerance: 'medium',
        minInterestRate: 0,
        maxInterestRate: 30,
        minLoanSize: 0,
        maxLoanSize: 1000000,
        preferredCollateralTypes: [],
        maxLoanExposure: 50000,
        investmentStrategy: 'balanced',
        autoInvestEnabled: false,
        minInvestmentAmount: 100,
    },
    // Recommendation weights (AI learning)
    weights: {
        interestRateWeight: 25,
        riskMatchWeight: 25,
        reputationWeight: 20,
        fundingMomentumWeight: 15,
        collateralWeight: 15,
    },
    // Loan feeds
    recommendedLoans: [],
    highYieldLoans: [],
    lowRiskLoans: [],
    closingSoonLoans: [],
    // Filtered loans
    filteredLoans: [],
    // Discovery scores
    discoveryScores: {},
    // Loan demand indicators
    loanDemand: {},
    // Behavior tracking
    behaviorTracking: {
        lastViewed: null,
        recentlyInvested: [],
    },
    // Analytics
    analytics: null,
    // UI state
    isLoading: false,
    error: null,
    filters: {
        interestRateMin: 0,
        interestRateMax: 30,
        loanSizeMin: 0,
        loanSizeMax: 1000000,
        riskCategory: 'all',
        collateralType: 'all',
        fundingProgressMin: 0,
        fundingProgressMax: 100,
    },
    // Feed refresh timestamp
    lastFeedUpdate: null,
};

// Async thunks

// Save investor preferences
export const savePreferences = createAsyncThunk(
    'discovery/savePreferences',
    async (preferences, { rejectWithValue }) => {
        try {
            const response = await discoveryService.savePreferences(preferences);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get investor preferences
export const fetchPreferences = createAsyncThunk(
    'discovery/fetchPreferences',
    async (_, { rejectWithValue }) => {
        try {
            const response = await discoveryService.getPreferences();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get recommended loans
export const fetchRecommendedLoans = createAsyncThunk(
    'discovery/fetchRecommendedLoans',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const response = await discoveryService.getRecommendedLoans(filters);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get high yield opportunities
export const fetchHighYieldLoans = createAsyncThunk(
    'discovery/fetchHighYieldLoans',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const response = await discoveryService.getHighYieldOpportunities(filters);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get low risk loans
export const fetchLowRiskLoans = createAsyncThunk(
    'discovery/fetchLowRiskLoans',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const response = await discoveryService.getLowRiskLoans(filters);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get closing soon loans
export const fetchClosingSoonLoans = createAsyncThunk(
    'discovery/fetchClosingSoonLoans',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const response = await discoveryService.getClosingSoonLoans(filters);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get full feed (all sections)
export const fetchFullFeed = createAsyncThunk(
    'discovery/fetchFullFeed',
    async (_, { rejectWithValue }) => {
        try {
            const response = await discoveryService.getFullFeed();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get filtered loans
export const fetchFilteredLoans = createAsyncThunk(
    'discovery/fetchFilteredLoans',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const response = await discoveryService.getFilteredLoans(filters);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get loan discovery score
export const fetchLoanDiscoveryScore = createAsyncThunk(
    'discovery/fetchLoanDiscoveryScore',
    async (loanId, { rejectWithValue }) => {
        try {
            const response = await discoveryService.getLoanDiscoveryScore(loanId);
            return { loanId, score: response };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get loan demand indicator
export const fetchLoanDemand = createAsyncThunk(
    'discovery/fetchLoanDemand',
    async (loanId, { rejectWithValue }) => {
        try {
            const response = await discoveryService.getLoanDemandIndicator(loanId);
            return { loanId, demand: response };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Track investor behavior
export const trackBehavior = createAsyncThunk(
    'discovery/trackBehavior',
    async (behaviorData, { rejectWithValue }) => {
        try {
            const response = await discoveryService.trackBehavior(behaviorData);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get discovery analytics (admin)
export const fetchDiscoveryAnalytics = createAsyncThunk(
    'discovery/fetchAnalytics',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await discoveryService.getAnalytics(params);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get recommendation weights
export const fetchWeights = createAsyncThunk(
    'discovery/fetchWeights',
    async (_, { rejectWithValue }) => {
        try {
            const response = await discoveryService.getRecommendationWeights();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Update recommendation weights
export const updateWeights = createAsyncThunk(
    'discovery/updateWeights',
    async (weights, { rejectWithValue }) => {
        try {
            const response = await discoveryService.updateWeights(weights);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const discoverySlice = createSlice({
    name: 'discovery',
    initialState,
    reducers: {
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        resetFilters: (state) => {
            state.filters = initialState.filters;
        },
        setPreferences: (state, action) => {
            state.preferences = { ...state.preferences, ...action.payload };
        },
        setWeights: (state, action) => {
            state.weights = { ...state.weights, ...action.payload };
        },
        updateLastViewed: (state, action) => {
            state.behaviorTracking.lastViewed = action.payload;
        },
        addRecentlyInvested: (state, action) => {
            state.behaviorTracking.recentlyInvested = [
                action.payload,
                ...state.behaviorTracking.recentlyInvested.filter(id => id !== action.payload)
            ].slice(0, 10);
        },
        clearDiscoveryError: (state) => {
            state.error = null;
        },
        clearFilteredLoans: (state) => {
            state.filteredLoans = [];
        },
    },
    extraReducers: (builder) => {
        builder
            // Save preferences
            .addCase(savePreferences.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(savePreferences.fulfilled, (state, action) => {
                state.isLoading = false;
                state.preferences = action.payload;
            })
            .addCase(savePreferences.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Fetch preferences
            .addCase(fetchPreferences.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchPreferences.fulfilled, (state, action) => {
                state.isLoading = false;
                if (action.payload) {
                    state.preferences = { ...state.preferences, ...action.payload };
                }
            })
            .addCase(fetchPreferences.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Fetch recommended loans
            .addCase(fetchRecommendedLoans.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchRecommendedLoans.fulfilled, (state, action) => {
                state.isLoading = false;
                state.recommendedLoans = action.payload.loans || [];
                state.lastFeedUpdate = new Date().toISOString();
            })
            .addCase(fetchRecommendedLoans.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Fetch high yield loans
            .addCase(fetchHighYieldLoans.fulfilled, (state, action) => {
                state.highYieldLoans = action.payload.loans || [];
            })
            // Fetch low risk loans
            .addCase(fetchLowRiskLoans.fulfilled, (state, action) => {
                state.lowRiskLoans = action.payload.loans || [];
            })
            // Fetch closing soon loans
            .addCase(fetchClosingSoonLoans.fulfilled, (state, action) => {
                state.closingSoonLoans = action.payload.loans || [];
            })
            // Fetch full feed
            .addCase(fetchFullFeed.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchFullFeed.fulfilled, (state, action) => {
                state.isLoading = false;
                state.recommendedLoans = action.payload.recommended || [];
                state.highYieldLoans = action.payload.highYield || [];
                state.lowRiskLoans = action.payload.lowRisk || [];
                state.closingSoonLoans = action.payload.closingSoon || [];
                state.lastFeedUpdate = new Date().toISOString();
            })
            .addCase(fetchFullFeed.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Fetch filtered loans
            .addCase(fetchFilteredLoans.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchFilteredLoans.fulfilled, (state, action) => {
                state.isLoading = false;
                state.filteredLoans = action.payload.loans || [];
            })
            .addCase(fetchFilteredLoans.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Fetch loan discovery score
            .addCase(fetchLoanDiscoveryScore.fulfilled, (state, action) => {
                state.discoveryScores[action.payload.loanId] = action.payload.score;
            })
            // Fetch loan demand
            .addCase(fetchLoanDemand.fulfilled, (state, action) => {
                state.loanDemand[action.payload.loanId] = action.payload.demand;
            })
            // Track behavior
            .addCase(trackBehavior.fulfilled, (state, action) => {
                // Behavior tracked successfully
            })
            // Fetch analytics
            .addCase(fetchDiscoveryAnalytics.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchDiscoveryAnalytics.fulfilled, (state, action) => {
                state.isLoading = false;
                state.analytics = action.payload;
            })
            .addCase(fetchDiscoveryAnalytics.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Fetch weights
            .addCase(fetchWeights.fulfilled, (state, action) => {
                if (action.payload) {
                    state.weights = { ...state.weights, ...action.payload };
                }
            })
            // Update weights
            .addCase(updateWeights.fulfilled, (state, action) => {
                if (action.payload) {
                    state.weights = { ...state.weights, ...action.payload };
                }
            });
    },
});

export const {
    setFilters,
    resetFilters,
    setPreferences,
    setWeights,
    updateLastViewed,
    addRecentlyInvested,
    clearDiscoveryError,
    clearFilteredLoans,
} = discoverySlice.actions;

export default discoverySlice.reducer;
