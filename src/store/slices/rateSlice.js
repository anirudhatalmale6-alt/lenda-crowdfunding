import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import rateService from '../../services/rateService';

const initialState = {
    platformSettings: null,
    suggestedRate: null,
    marketDemand: null,
    rateHistory: [],
    currentDemandLevel: null,
    loanProjections: null,
    rateValidation: null,
    rateStatistics: null,
    averageRatesByCategory: null,
    fundingSpeedPrediction: null,
    isLoading: false,
    error: null,
    // Rate adjustment preview
    adjustmentPreview: null,
    // Form state for loan creation
    loanForm: {
        amount: 10000,
        interestRate: 15,
        duration: 12,
        collateralValue: 0,
        collateralType: 'real_estate',
        riskCategory: 'A',
        ltvRatio: 0,
    },
    // Recommendations cache
    recommendations: {},
};

// Get platform rate settings
export const fetchPlatformSettings = createAsyncThunk(
    'rates/fetchPlatformSettings',
    async (_, { rejectWithValue }) => {
        try {
            const response = await rateService.getPlatformSettings();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Update platform rate settings (admin)
export const updatePlatformSettings = createAsyncThunk(
    'rates/updatePlatformSettings',
    async (settings, { rejectWithValue }) => {
        try {
            const response = await rateService.updatePlatformSettings(settings);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get suggested rate
export const fetchSuggestedRate = createAsyncThunk(
    'rates/fetchSuggestedRate',
    async (params, { rejectWithValue }) => {
        try {
            const response = await rateService.getSuggestedRate(params);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Calculate market demand
export const calculateMarketDemand = createAsyncThunk(
    'rates/calculateMarketDemand',
    async (loanId, { rejectWithValue }) => {
        try {
            const response = await rateService.calculateMarketDemand(loanId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get rate recommendation
export const fetchRateRecommendation = createAsyncThunk(
    'rates/fetchRateRecommendation',
    async (loanData, { rejectWithValue }) => {
        try {
            const response = await rateService.getRateRecommendation(loanData);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Update loan rate
export const updateLoanRate = createAsyncThunk(
    'rates/updateLoanRate',
    async ({ loanId, newRate, reason }, { rejectWithValue }) => {
        try {
            const response = await rateService.updateLoanRate(loanId, newRate, reason);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get rate history
export const fetchRateHistory = createAsyncThunk(
    'rates/fetchRateHistory',
    async (loanId, { rejectWithValue }) => {
        try {
            const response = await rateService.getRateHistory(loanId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get current demand
export const fetchCurrentDemand = createAsyncThunk(
    'rates/fetchCurrentDemand',
    async (loanId, { rejectWithValue }) => {
        try {
            const response = await rateService.getCurrentDemand(loanId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Calculate loan projections
export const calculateLoanProjections = createAsyncThunk(
    'rates/calculateProjections',
    async (params, { rejectWithValue }) => {
        try {
            const response = await rateService.calculateLoanProjections(params);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Validate rate
export const validateRate = createAsyncThunk(
    'rates/validateRate',
    async ({ rate, riskCategory }, { rejectWithValue }) => {
        try {
            const response = await rateService.validateRate(rate, riskCategory);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get rate statistics
export const fetchRateStatistics = createAsyncThunk(
    'rates/fetchRateStatistics',
    async (timeRange, { rejectWithValue }) => {
        try {
            const response = await rateService.getRateStatistics(timeRange);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get average rates by category
export const fetchAverageRatesByCategory = createAsyncThunk(
    'rates/fetchAverageRatesByCategory',
    async (_, { rejectWithValue }) => {
        try {
            const response = await rateService.getAverageRatesByCategory();
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get funding speed prediction
export const fetchFundingSpeedPrediction = createAsyncThunk(
    'rates/fetchFundingSpeedPrediction',
    async (loanId, { rejectWithValue }) => {
        try {
            const response = await rateService.getFundingSpeedPrediction(loanId);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Preview rate adjustment
export const previewRateAdjustment = createAsyncThunk(
    'rates/previewRateAdjustment',
    async ({ loanId, newRate }, { rejectWithValue }) => {
        try {
            const response = await rateService.previewRateAdjustment(loanId, newRate);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Calculate LTV
export const calculateLTV = createAsyncThunk(
    'rates/calculateLTV',
    async ({ loanAmount, collateralValue }, { rejectWithValue }) => {
        try {
            const response = await rateService.calculateLTV(loanAmount, collateralValue);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Get risk category
export const fetchRiskCategory = createAsyncThunk(
    'rates/fetchRiskCategory',
    async (riskScore, { rejectWithValue }) => {
        try {
            const response = await rateService.getRiskCategory(riskScore);
            return response;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const rateSlice = createSlice({
    name: 'rates',
    initialState,
    reducers: {
        setLoanFormAmount: (state, action) => {
            state.loanForm.amount = action.payload;
        },
        setLoanFormRate: (state, action) => {
            state.loanForm.interestRate = action.payload;
        },
        setLoanFormDuration: (state, action) => {
            state.loanForm.duration = action.payload;
        },
        setLoanFormCollateralValue: (state, action) => {
            state.loanForm.collateralValue = action.payload;
        },
        setLoanFormCollateralType: (state, action) => {
            state.loanForm.collateralType = action.payload;
        },
        setLoanFormLTV: (state, action) => {
            state.loanForm.ltvRatio = action.payload;
        },
        setLoanFormRiskCategory: (state, action) => {
            state.loanForm.riskCategory = action.payload;
        },
        resetLoanForm: (state) => {
            state.loanForm = initialState.loanForm;
        },
        clearRateError: (state) => {
            state.error = null;
        },
        clearAdjustmentPreview: (state) => {
            state.adjustmentPreview = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Platform settings
            .addCase(fetchPlatformSettings.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchPlatformSettings.fulfilled, (state, action) => {
                state.isLoading = false;
                state.platformSettings = action.payload;
            })
            .addCase(fetchPlatformSettings.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Update platform settings
            .addCase(updatePlatformSettings.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updatePlatformSettings.fulfilled, (state, action) => {
                state.isLoading = false;
                state.platformSettings = action.payload;
            })
            .addCase(updatePlatformSettings.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Suggested rate
            .addCase(fetchSuggestedRate.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchSuggestedRate.fulfilled, (state, action) => {
                state.isLoading = false;
                state.suggestedRate = action.payload;
            })
            .addCase(fetchSuggestedRate.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Market demand
            .addCase(calculateMarketDemand.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(calculateMarketDemand.fulfilled, (state, action) => {
                state.isLoading = false;
                state.marketDemand = action.payload;
            })
            .addCase(calculateMarketDemand.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Rate recommendation
            .addCase(fetchRateRecommendation.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchRateRecommendation.fulfilled, (state, action) => {
                state.isLoading = false;
                state.recommendations[action.payload.loanId] = action.payload;
            })
            .addCase(fetchRateRecommendation.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Update loan rate
            .addCase(updateLoanRate.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateLoanRate.fulfilled, (state, action) => {
                state.isLoading = false;
                state.rateHistory.unshift(action.payload);
            })
            .addCase(updateLoanRate.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Rate history
            .addCase(fetchRateHistory.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchRateHistory.fulfilled, (state, action) => {
                state.isLoading = false;
                state.rateHistory = action.payload;
            })
            .addCase(fetchRateHistory.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Current demand
            .addCase(fetchCurrentDemand.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchCurrentDemand.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentDemandLevel = action.payload;
            })
            .addCase(fetchCurrentDemand.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Loan projections
            .addCase(calculateLoanProjections.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(calculateLoanProjections.fulfilled, (state, action) => {
                state.isLoading = false;
                state.loanProjections = action.payload;
            })
            .addCase(calculateLoanProjections.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Validate rate
            .addCase(validateRate.fulfilled, (state, action) => {
                state.rateValidation = action.payload;
            })
            // Rate statistics
            .addCase(fetchRateStatistics.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchRateStatistics.fulfilled, (state, action) => {
                state.isLoading = false;
                state.rateStatistics = action.payload;
            })
            .addCase(fetchRateStatistics.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Average rates by category
            .addCase(fetchAverageRatesByCategory.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchAverageRatesByCategory.fulfilled, (state, action) => {
                state.isLoading = false;
                state.averageRatesByCategory = action.payload;
            })
            .addCase(fetchAverageRatesByCategory.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Funding speed prediction
            .addCase(fetchFundingSpeedPrediction.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchFundingSpeedPrediction.fulfilled, (state, action) => {
                state.isLoading = false;
                state.fundingSpeedPrediction = action.payload;
            })
            .addCase(fetchFundingSpeedPrediction.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Preview rate adjustment
            .addCase(previewRateAdjustment.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(previewRateAdjustment.fulfilled, (state, action) => {
                state.isLoading = false;
                state.adjustmentPreview = action.payload;
            })
            .addCase(previewRateAdjustment.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Calculate LTV
            .addCase(calculateLTV.fulfilled, (state, action) => {
                state.loanForm.ltvRatio = action.payload.ltv;
            })
            // Risk category
            .addCase(fetchRiskCategory.fulfilled, (state, action) => {
                state.loanForm.riskCategory = action.payload.category;
            });
    },
});

export const {
    setLoanFormAmount,
    setLoanFormRate,
    setLoanFormDuration,
    setLoanFormCollateralValue,
    setLoanFormCollateralType,
    setLoanFormLTV,
    setLoanFormRiskCategory,
    resetLoanForm,
    clearRateError,
    clearAdjustmentPreview,
} = rateSlice.actions;

export default rateSlice.reducer;
