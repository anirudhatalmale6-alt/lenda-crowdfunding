/**
 * Risk Engine Redux Slice
 * Manages risk-related state
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as riskService from '../../services/riskService';

// Initial state
const initialState = {
  // Borrower risk
  borrowerRiskScore: null,
  borrowerRiskLoading: false,
  borrowerRiskError: null,
  
  // Loan risk status
  loanRiskStatus: {},
  loanRiskLoading: false,
  loanRiskError: null,
  
  // Collateral
  collateralValuation: {},
  collateralLoading: false,
  collateralError: null,
  
  // LTV
  ltvResult: null,
  ltvLoading: false,
  ltvError: null,
  
  // Dashboard
  dashboardData: null,
  dashboardLoading: false,
  dashboardError: null,
  
  // Default monitoring
  defaultMonitoring: null,
  monitoringLoading: false,
  monitoringError: null,
  
  // Validation
  validationResult: null,
  validationLoading: false,
  validationError: null,
  
  // Exposure
  exposureResult: null,
  exposureLoading: false,
  exposureError: null
};

// ============================================================
// ASYNC THUNKS
// ============================================================

// Get borrower risk score
export const fetchBorrowerRiskScore = createAsyncThunk(
  'risk/fetchBorrowerRiskScore',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await riskService.getBorrowerRiskScore(userId);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch risk score' });
    }
  }
);

// Calculate borrower risk score
export const calculateRiskScore = createAsyncThunk(
  'risk/calculateRiskScore',
  async (_, { rejectWithValue }) => {
    try {
      const response = await riskService.calculateBorrowerRiskScore();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to calculate risk score' });
    }
  }
);

// Get loan risk status
export const fetchLoanRiskStatus = createAsyncThunk(
  'risk/fetchLoanRiskStatus',
  async (loanId, { rejectWithValue }) => {
    try {
      const response = await riskService.getLoanRiskStatus(loanId);
      return { loanId, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch loan risk status' });
    }
  }
);

// Get collateral valuation
export const fetchCollateralValuation = createAsyncThunk(
  'risk/fetchCollateralValuation',
  async (collateralId, { rejectWithValue }) => {
    try {
      const response = await riskService.getCollateralValuation(collateralId);
      return { collateralId, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch collateral valuation' });
    }
  }
);

// Calculate LTV
export const calculateLTV = createAsyncThunk(
  'risk/calculateLTV',
  async ({ loanAmount, collateralValue, riskCategory }, { rejectWithValue }) => {
    try {
      const response = await riskService.calculateLTV(loanAmount, collateralValue, riskCategory);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to calculate LTV' });
    }
  }
);

// Validate LTV
export const validateLTV = createAsyncThunk(
  'risk/validateLTV',
  async (data, { rejectWithValue }) => {
    try {
      const response = await riskService.validateLTV(data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to validate LTV' });
    }
  }
);

// Validate exposure
export const validateExposure = createAsyncThunk(
  'risk/validateExposure',
  async (data, { rejectWithValue }) => {
    try {
      const response = await riskService.validateExposure(data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to validate exposure' });
    }
  }
);

// Get risk dashboard
export const fetchRiskDashboard = createAsyncThunk(
  'risk/fetchRiskDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await riskService.getRiskDashboard();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch dashboard' });
    }
  }
);

// Get default monitoring
export const fetchDefaultMonitoring = createAsyncThunk(
  'risk/fetchDefaultMonitoring',
  async (_, { rejectWithValue }) => {
    try {
      const response = await riskService.getDefaultMonitoring();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch monitoring' });
    }
  }
);

// Validate loan request
export const validateLoanRequest = createAsyncThunk(
  'risk/validateLoanRequest',
  async (data, { rejectWithValue }) => {
    try {
      const response = await riskService.validateLoanRequest(data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to validate loan request' });
    }
  }
);

// ============================================================
// SLICE
// ============================================================

const riskSlice = createSlice({
  name: 'risk',
  initialState,
  reducers: {
    clearBorrowerRisk: (state) => {
      state.borrowerRiskScore = null;
      state.borrowerRiskError = null;
    },
    clearLoanRisk: (state) => {
      state.loanRiskStatus = {};
      state.loanRiskError = null;
    },
    clearLTV: (state) => {
      state.ltvResult = null;
      state.ltvError = null;
    },
    clearDashboard: (state) => {
      state.dashboardData = null;
      state.dashboardError = null;
    },
    clearValidation: (state) => {
      state.validationResult = null;
      state.validationError = null;
    },
    clearExposure: (state) => {
      state.exposureResult = null;
      state.exposureError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Borrower Risk Score
      .addCase(fetchBorrowerRiskScore.pending, (state) => {
        state.borrowerRiskLoading = true;
        state.borrowerRiskError = null;
      })
      .addCase(fetchBorrowerRiskScore.fulfilled, (state, action) => {
        state.borrowerRiskLoading = false;
        state.borrowerRiskScore = action.payload;
      })
      .addCase(fetchBorrowerRiskScore.rejected, (state, action) => {
        state.borrowerRiskLoading = false;
        state.borrowerRiskError = action.payload;
      })
      
      // Calculate Risk Score
      .addCase(calculateRiskScore.pending, (state) => {
        state.borrowerRiskLoading = true;
        state.borrowerRiskError = null;
      })
      .addCase(calculateRiskScore.fulfilled, (state, action) => {
        state.borrowerRiskLoading = false;
        state.borrowerRiskScore = action.payload;
      })
      .addCase(calculateRiskScore.rejected, (state, action) => {
        state.borrowerRiskLoading = false;
        state.borrowerRiskError = action.payload;
      })
      
      // Loan Risk Status
      .addCase(fetchLoanRiskStatus.pending, (state) => {
        state.loanRiskLoading = true;
        state.loanRiskError = null;
      })
      .addCase(fetchLoanRiskStatus.fulfilled, (state, action) => {
        state.loanRiskLoading = false;
        state.loanRiskStatus[action.payload.loanId] = action.payload;
      })
      .addCase(fetchLoanRiskStatus.rejected, (state, action) => {
        state.loanRiskLoading = false;
        state.loanRiskError = action.payload;
      })
      
      // Collateral Valuation
      .addCase(fetchCollateralValuation.pending, (state) => {
        state.collateralLoading = true;
        state.collateralError = null;
      })
      .addCase(fetchCollateralValuation.fulfilled, (state, action) => {
        state.collateralLoading = false;
        state.collateralValuation[action.payload.collateralId] = action.payload;
      })
      .addCase(fetchCollateralValuation.rejected, (state, action) => {
        state.collateralLoading = false;
        state.collateralError = action.payload;
      })
      
      // Calculate LTV
      .addCase(calculateLTV.pending, (state) => {
        state.ltvLoading = true;
        state.ltvError = null;
      })
      .addCase(calculateLTV.fulfilled, (state, action) => {
        state.ltvLoading = false;
        state.ltvResult = action.payload;
      })
      .addCase(calculateLTV.rejected, (state, action) => {
        state.ltvLoading = false;
        state.ltvError = action.payload;
      })
      
      // Validate LTV
      .addCase(validateLTV.pending, (state) => {
        state.validationLoading = true;
        state.validationError = null;
      })
      .addCase(validateLTV.fulfilled, (state, action) => {
        state.validationLoading = false;
        state.validationResult = action.payload;
      })
      .addCase(validateLTV.rejected, (state, action) => {
        state.validationLoading = false;
        state.validationError = action.payload;
      })
      
      // Validate Exposure
      .addCase(validateExposure.pending, (state) => {
        state.exposureLoading = true;
        state.exposureError = null;
      })
      .addCase(validateExposure.fulfilled, (state, action) => {
        state.exposureLoading = false;
        state.exposureResult = action.payload;
      })
      .addCase(validateExposure.rejected, (state, action) => {
        state.exposureLoading = false;
        state.exposureError = action.payload;
      })
      
      // Risk Dashboard
      .addCase(fetchRiskDashboard.pending, (state) => {
        state.dashboardLoading = true;
        state.dashboardError = null;
      })
      .addCase(fetchRiskDashboard.fulfilled, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardData = action.payload;
      })
      .addCase(fetchRiskDashboard.rejected, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardError = action.payload;
      })
      
      // Default Monitoring
      .addCase(fetchDefaultMonitoring.pending, (state) => {
        state.monitoringLoading = true;
        state.monitoringError = null;
      })
      .addCase(fetchDefaultMonitoring.fulfilled, (state, action) => {
        state.monitoringLoading = false;
        state.defaultMonitoring = action.payload;
      })
      .addCase(fetchDefaultMonitoring.rejected, (state, action) => {
        state.monitoringLoading = false;
        state.monitoringError = action.payload;
      })
      
      // Validate Loan Request
      .addCase(validateLoanRequest.pending, (state) => {
        state.validationLoading = true;
        state.validationError = null;
      })
      .addCase(validateLoanRequest.fulfilled, (state, action) => {
        state.validationLoading = false;
        state.validationResult = action.payload;
      })
      .addCase(validateLoanRequest.rejected, (state, action) => {
        state.validationLoading = false;
        state.validationError = action.payload;
      });
  }
});

export const {
  clearBorrowerRisk,
  clearLoanRisk,
  clearLTV,
  clearDashboard,
  clearValidation,
  clearExposure
} = riskSlice.actions;

export default riskSlice.reducer;

// Selectors
export const selectBorrowerRiskScore = (state) => state.risk.borrowerRiskScore;
export const selectBorrowerRiskLoading = (state) => state.risk.borrowerRiskLoading;
export const selectBorrowerRiskError = (state) => state.risk.borrowerRiskError;

export const selectLoanRiskStatus = (state, loanId) => state.risk.loanRiskStatus[loanId];
export const selectLoanRiskLoading = (state) => state.risk.loanRiskLoading;

export const selectCollateralValuation = (state, collateralId) => state.risk.collateralValuation[collateralId];
export const selectCollateralLoading = (state) => state.risk.collateralLoading;

export const selectLTVResult = (state) => state.risk.ltvResult;
export const selectLTVLoading = (state) => state.risk.ltvLoading;

export const selectRiskDashboard = (state) => state.risk.dashboardData;
export const selectDashboardLoading = (state) => state.risk.dashboardLoading;

export const selectDefaultMonitoring = (state) => state.risk.defaultMonitoring;
export const selectMonitoringLoading = (state) => state.risk.monitoringLoading;

export const selectValidationResult = (state) => state.risk.validationResult;
export const selectValidationLoading = (state) => state.risk.validationLoading;

export const selectExposureResult = (state) => state.risk.exposureResult;
export const selectExposureLoading = (state) => state.risk.exposureLoading;
