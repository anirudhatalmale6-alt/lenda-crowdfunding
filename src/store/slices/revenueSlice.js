import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import revenueService from '../../services/revenueService';

// Async thunks
export const fetchFeeConfig = createAsyncThunk(
  'revenue/fetchFeeConfig',
  async (_, { rejectWithValue }) => {
    try {
      const response = await revenueService.getFeeConfig();
      return response.fee_config;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch fee configuration');
    }
  }
);

export const fetchRevenueSummary = createAsyncThunk(
  'revenue/fetchRevenueSummary',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await revenueService.getRevenueSummary(params);
      return response.summary;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch revenue summary');
    }
  }
);

export const fetchRevenueHistory = createAsyncThunk(
  'revenue/fetchRevenueHistory',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await revenueService.getRevenueHistory(params);
      return {
        transactions: response.data,
        pagination: response.pagination
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch revenue history');
    }
  }
);

export const fetchAnalytics = createAsyncThunk(
  'revenue/fetchAnalytics',
  async (months = 12, { rejectWithValue }) => {
    try {
      const response = await revenueService.getAnalytics(months);
      return response.analytics;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch analytics');
    }
  }
);

export const updateFeeConfig = createAsyncThunk(
  'revenue/updateFeeConfig',
  async (fees, { rejectWithValue }) => {
    try {
      const response = await revenueService.updateFees(fees);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update fee configuration');
    }
  }
);

// Initial state
const initialState = {
  // Fee configuration - loaded from API with fallback defaults
  feeConfig: {
    origination_fee: { percentage: null, fixed_amount: 0, description: 'Loan origination fee', isDynamic: false },
    investor_service_fee: { percentage: null, fixed_amount: 0, description: 'Investor service fee', isDynamic: false },
    trading_fee: { percentage: null, fixed_amount: 0, description: 'Trading fee', isDynamic: false },
    escrow_fee: { percentage: null, fixed_amount: 0, description: 'Escrow service fee', isDynamic: false },
    liquidation_commission: { percentage: null, fixed_amount: 0, description: 'Liquidation commission', isDynamic: false }
  },
  
  // Revenue data
  summary: {
    by_type: {},
    total_revenue: 0,
    total_transactions: 0,
    period: 'all'
  },
  
  // Revenue history
  history: {
    transactions: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      total_pages: 0
    }
  },
  
  // Analytics
  analytics: {
    monthly_data: [],
    revenue_by_category: {},
    total_loans_funded: 0,
    total_loan_volume: 0,
    marketplace_volume: 0
  },
  
  // Fee calculator preview
  feePreview: {
    loanAmount: 0,
    interestRate: 0,
    feePercentage: 2,
    feeAmount: 0,
    borrowerReceives: 0
  },
  
  // UI state
  loading: {
    feeConfig: false,
    summary: false,
    history: false,
    analytics: false,
    updating: false
  },
  error: {
    feeConfig: null,
    summary: null,
    history: null,
    analytics: null,
    updating: null
  }
};

// Revenue slice
const revenueSlice = createSlice({
  name: 'revenue',
  initialState,
  reducers: {
    // Update fee preview calculation
    calculateFeePreview: (state, action) => {
      const { loanAmount, feePercentage = state.feeConfig.origination_fee?.percentage || 2 } = action.payload;
      const feeAmount = loanAmount * (feePercentage / 100);
      
      state.feePreview = {
        loanAmount,
        feePercentage,
        feeAmount,
        borrowerReceives: loanAmount - feeAmount
      };
    },
    
    // Calculate investor earnings breakdown
    calculateEarningsBreakdown: (state, action) => {
      const { interestEarned, feePercentage = state.feeConfig.investor_service_fee?.percentage || 5 } = action.payload;
      const feeAmount = interestEarned * (feePercentage / 100);
      
      state.investorEarnings = {
        interestEarned,
        feePercentage,
        feeAmount,
        netProfit: interestEarned - feeAmount
      };
    },
    
    // Calculate trade summary
    calculateTradeSummary: (state, action) => {
      const { tradeAmount, feePercentage = state.feeConfig.trading_fee?.percentage || 1 } = action.payload;
      const feeAmount = tradeAmount * (feePercentage / 100);
      
      state.tradeSummary = {
        tradeAmount,
        feePercentage,
        feeAmount,
        netReceived: tradeAmount - feeAmount
      };
    },
    
    // Calculate escrow summary
    calculateEscrowSummary: (state, action) => {
      const { amount, feePercentage = state.feeConfig.escrow_fee?.percentage || 1.5 } = action.payload;
      const feeAmount = amount * (feePercentage / 100);
      
      state.escrowSummary = {
        amount,
        feePercentage,
        feeAmount,
        netSettlement: amount - feeAmount
      };
    },
    
    // Calculate auction sale summary
    calculateAuctionSummary: (state, action) => {
      const { winningBid, commissionPercentage = state.feeConfig.liquidation_commission?.percentage || 10 } = action.payload;
      const commissionAmount = winningBid * (commissionPercentage / 100);
      
      state.auctionSummary = {
        winningBid,
        commissionPercentage,
        commissionAmount,
        netAfterCommission: winningBid - commissionAmount
      };
    },
    
    // Clear errors
    clearErrors: (state) => {
      state.error = {
        feeConfig: null,
        summary: null,
        history: null,
        analytics: null,
        updating: null
      };
    },
    
    // Reset state
    resetRevenueState: () => initialState
  },
  
  extraReducers: (builder) => {
    builder
      // Fetch fee config
      .addCase(fetchFeeConfig.pending, (state) => {
        state.loading.feeConfig = true;
        state.error.feeConfig = null;
      })
      .addCase(fetchFeeConfig.fulfilled, (state, action) => {
        state.loading.feeConfig = false;
        state.feeConfig = action.payload;
      })
      .addCase(fetchFeeConfig.rejected, (state, action) => {
        state.loading.feeConfig = false;
        state.error.feeConfig = action.payload;
      })
      
      // Fetch revenue summary
      .addCase(fetchRevenueSummary.pending, (state) => {
        state.loading.summary = true;
        state.error.summary = null;
      })
      .addCase(fetchRevenueSummary.fulfilled, (state, action) => {
        state.loading.summary = false;
        state.summary = action.payload;
      })
      .addCase(fetchRevenueSummary.rejected, (state, action) => {
        state.loading.summary = false;
        state.error.summary = action.payload;
      })
      
      // Fetch revenue history
      .addCase(fetchRevenueHistory.pending, (state) => {
        state.loading.history = true;
        state.error.history = null;
      })
      .addCase(fetchRevenueHistory.fulfilled, (state, action) => {
        state.loading.history = false;
        state.history.transactions = action.payload.transactions;
        state.history.pagination = action.payload.pagination;
      })
      .addCase(fetchRevenueHistory.rejected, (state, action) => {
        state.loading.history = false;
        state.error.history = action.payload;
      })
      
      // Fetch analytics
      .addCase(fetchAnalytics.pending, (state) => {
        state.loading.analytics = true;
        state.error.analytics = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.loading.analytics = false;
        state.analytics = action.payload;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.loading.analytics = false;
        state.error.analytics = action.payload;
      })
      
      // Update fee config
      .addCase(updateFeeConfig.pending, (state) => {
        state.loading.updating = true;
        state.error.updating = null;
      })
      .addCase(updateFeeConfig.fulfilled, (state) => {
        state.loading.updating = false;
      })
      .addCase(updateFeeConfig.rejected, (state, action) => {
        state.loading.updating = false;
        state.error.updating = action.payload;
      });
  }
});

// Export actions
export const {
  calculateFeePreview,
  calculateEarningsBreakdown,
  calculateTradeSummary,
  calculateEscrowSummary,
  calculateAuctionSummary,
  clearErrors,
  resetRevenueState
} = revenueSlice.actions;

// Selectors
export const selectFeeConfig = (state) => state.revenue.feeConfig;
export const selectRevenueSummary = (state) => state.revenue.summary;
export const selectRevenueHistory = (state) => state.revenue.history;
export const selectAnalytics = (state) => state.revenue.analytics;
export const selectFeePreview = (state) => state.revenue.feePreview;
export const selectInvestorEarnings = (state) => state.revenue.investorEarnings;
export const selectTradeSummary = (state) => state.revenue.tradeSummary;
export const selectEscrowSummary = (state) => state.revenue.escrowSummary;
export const selectAuctionSummary = (state) => state.revenue.auctionSummary;
export const selectRevenueLoading = (state) => state.revenue.loading;
export const selectRevenueError = (state) => state.revenue.error;

export default revenueSlice.reducer;
