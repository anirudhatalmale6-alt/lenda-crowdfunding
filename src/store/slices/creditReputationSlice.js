/**
 * Credit Reputation Redux Slice
 * Manages credit reputation state
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as creditService from '../../services/creditReputationService';

// Initial state
const initialState = {
  // Credit score
  creditScore: null,
  creditScoreLoading: false,
  creditScoreError: null,

  // Borrower profile
  borrowerProfile: null,
  profileLoading: false,
  profileError: null,

  // Repayment history
  repaymentHistory: [],
  historyLoading: false,
  historyError: null,
  historyPagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  },

  // Badges
  badges: [],
  badgesLoading: false,
  badgesError: null,

  // Reputation signals
  signals: [],
  signalsLoading: false,
  signalsError: null,

  // Admin monitoring
  monitoringData: null,
  monitoringLoading: false,
  monitoringError: null
};

// ============================================================
// ASYNC THUNKS
// ============================================================

// Get borrower credit score
export const fetchCreditScore = createAsyncThunk(
  'creditReputation/fetchCreditScore',
  async (borrowerId, { rejectWithValue }) => {
    try {
      const response = await creditService.getBorrowerCreditScore(borrowerId);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch credit score' });
    }
  }
);

// Calculate credit score
export const calculateCreditScore = createAsyncThunk(
  'creditReputation/calculateCreditScore',
  async (_, { rejectWithValue }) => {
    try {
      const response = await creditService.calculateCreditScore();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to calculate credit score' });
    }
  }
);

// Get borrower profile
export const fetchBorrowerProfile = createAsyncThunk(
  'creditReputation/fetchBorrowerProfile',
  async (borrowerId, { rejectWithValue }) => {
    try {
      const response = await creditService.getBorrowerProfile(borrowerId);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch borrower profile' });
    }
  }
);

// Get repayment history
export const fetchRepaymentHistory = createAsyncThunk(
  'creditReputation/fetchRepaymentHistory',
  async ({ borrowerId, page = 1, limit = 20 }, { rejectWithValue }) => {
    try {
      const response = await creditService.getRepaymentHistory(borrowerId, page, limit);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch repayment history' });
    }
  }
);

// Get borrower badges
export const fetchBorrowerBadges = createAsyncThunk(
  'creditReputation/fetchBorrowerBadges',
  async (borrowerId, { rejectWithValue }) => {
    try {
      const response = await creditService.getBorrowerBadges(borrowerId);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch badges' });
    }
  }
);

// Get reputation signals
export const fetchReputationSignals = createAsyncThunk(
  'creditReputation/fetchReputationSignals',
  async ({ borrowerId, loanId }, { rejectWithValue }) => {
    try {
      const response = await creditService.getReputationSignals(borrowerId, loanId);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch signals' });
    }
  }
);

// Get credit monitoring dashboard
export const fetchCreditMonitoring = createAsyncThunk(
  'creditReputation/fetchCreditMonitoring',
  async (_, { rejectWithValue }) => {
    try {
      const response = await creditService.getCreditMonitoringDashboard();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch monitoring data' });
    }
  }
);

// ============================================================
// SLICE
// ============================================================

const creditReputationSlice = createSlice({
  name: 'creditReputation',
  initialState,
  reducers: {
    clearCreditScore: (state) => {
      state.creditScore = null;
      state.creditScoreError = null;
    },
    clearBorrowerProfile: (state) => {
      state.borrowerProfile = null;
      state.profileError = null;
    },
    clearRepaymentHistory: (state) => {
      state.repaymentHistory = [];
      state.historyError = null;
      state.historyPagination = initialState.historyPagination;
    },
    clearBadges: (state) => {
      state.badges = [];
      state.badgesError = null;
    },
    clearSignals: (state) => {
      state.signals = [];
      state.signalsError = null;
    },
    clearMonitoring: (state) => {
      state.monitoringData = null;
      state.monitoringError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Credit Score
      .addCase(fetchCreditScore.pending, (state) => {
        state.creditScoreLoading = true;
        state.creditScoreError = null;
      })
      .addCase(fetchCreditScore.fulfilled, (state, action) => {
        state.creditScoreLoading = false;
        state.creditScore = action.payload;
      })
      .addCase(fetchCreditScore.rejected, (state, action) => {
        state.creditScoreLoading = false;
        state.creditScoreError = action.payload;
      })

      // Calculate Credit Score
      .addCase(calculateCreditScore.pending, (state) => {
        state.creditScoreLoading = true;
        state.creditScoreError = null;
      })
      .addCase(calculateCreditScore.fulfilled, (state, action) => {
        state.creditScoreLoading = false;
        state.creditScore = action.payload;
      })
      .addCase(calculateCreditScore.rejected, (state, action) => {
        state.creditScoreLoading = false;
        state.creditScoreError = action.payload;
      })

      // Borrower Profile
      .addCase(fetchBorrowerProfile.pending, (state) => {
        state.profileLoading = true;
        state.profileError = null;
      })
      .addCase(fetchBorrowerProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.borrowerProfile = action.payload;
      })
      .addCase(fetchBorrowerProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.profileError = action.payload;
      })

      // Repayment History
      .addCase(fetchRepaymentHistory.pending, (state) => {
        state.historyLoading = true;
        state.historyError = null;
      })
      .addCase(fetchRepaymentHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.repaymentHistory = action.payload.history;
        state.historyPagination = action.payload.pagination;
      })
      .addCase(fetchRepaymentHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.historyError = action.payload;
      })

      // Badges
      .addCase(fetchBorrowerBadges.pending, (state) => {
        state.badgesLoading = true;
        state.badgesError = null;
      })
      .addCase(fetchBorrowerBadges.fulfilled, (state, action) => {
        state.badgesLoading = false;
        state.badges = action.payload.badges;
      })
      .addCase(fetchBorrowerBadges.rejected, (state, action) => {
        state.badgesLoading = false;
        state.badgesError = action.payload;
      })

      // Reputation Signals
      .addCase(fetchReputationSignals.pending, (state) => {
        state.signalsLoading = true;
        state.signalsError = null;
      })
      .addCase(fetchReputationSignals.fulfilled, (state, action) => {
        state.signalsLoading = false;
        state.signals = action.payload.signals;
      })
      .addCase(fetchReputationSignals.rejected, (state, action) => {
        state.signalsLoading = false;
        state.signalsError = action.payload;
      })

      // Credit Monitoring
      .addCase(fetchCreditMonitoring.pending, (state) => {
        state.monitoringLoading = true;
        state.monitoringError = null;
      })
      .addCase(fetchCreditMonitoring.fulfilled, (state, action) => {
        state.monitoringLoading = false;
        state.monitoringData = action.payload;
      })
      .addCase(fetchCreditMonitoring.rejected, (state, action) => {
        state.monitoringLoading = false;
        state.monitoringError = action.payload;
      });
  }
});

export const {
  clearCreditScore,
  clearBorrowerProfile,
  clearRepaymentHistory,
  clearBadges,
  clearSignals,
  clearMonitoring
} = creditReputationSlice.actions;

export default creditReputationSlice.reducer;

// ============================================================
// SELECTORS
// ============================================================

export const selectCreditScore = (state) => state.creditReputation.creditScore;
export const selectCreditScoreLoading = (state) => state.creditReputation.creditScoreLoading;
export const selectCreditScoreError = (state) => state.creditReputation.creditScoreError;

export const selectBorrowerProfile = (state) => state.creditReputation.borrowerProfile;
export const selectProfileLoading = (state) => state.creditReputation.profileLoading;

export const selectRepaymentHistory = (state) => state.creditReputation.repaymentHistory;
export const selectHistoryLoading = (state) => state.creditReputation.historyLoading;
export const selectHistoryPagination = (state) => state.creditReputation.historyPagination;

export const selectBadges = (state) => state.creditReputation.badges;
export const selectBadgesLoading = (state) => state.creditReputation.badgesLoading;

export const selectSignals = (state) => state.creditReputation.signals;
export const selectSignalsLoading = (state) => state.creditReputation.signalsLoading;

export const selectMonitoringData = (state) => state.creditReputation.monitoringData;
export const selectMonitoringLoading = (state) => state.creditReputation.monitoringLoading;
