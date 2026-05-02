/**
 * Capital Protection Redux Slice
 * Manages capital protection system state
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as capitalProtectionService from '../../services/capitalProtectionService';

// Initial state
const initialState = {
  // Reserve pools
  reserveStatus: null,
  reserveLoading: false,
  reserveError: null,

  // Coverage ratio
  coverageRatio: null,
  coverageLoading: false,
  coverageError: null,

  // System health
  systemHealth: null,
  healthLoading: false,
  healthError: null,

  // Platform stability (public)
  platformStability: null,
  stabilityLoading: false,
  stabilityError: null,

  // Admin dashboard
  adminDashboard: null,
  dashboardLoading: false,
  dashboardError: null,

  // Safety triggers
  triggers: [],
  triggersLoading: false,
  triggersError: null,

  // Stress tests
  stressTestScenarios: [],
  stressTestLoading: false,
  stressTestError: null,
  stressTestResults: null,
  stressTestHistory: [],

  // Alerts
  alerts: [],
  alertsLoading: false,
  alertsError: null,

  // Loan guarantees
  guarantees: {},
  guaranteeLoading: false,
  guaranteeError: null,

  // Operations
  operationLoading: false,
  operationError: null
};

// ============================================================
// ASYNC THUNKS
// ============================================================

// Fetch reserve status
export const fetchReserveStatus = createAsyncThunk(
  'capitalProtection/fetchReserveStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.getReserveStatus();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch reserve status' });
    }
  }
);

// Fetch coverage ratio
export const fetchCoverageRatio = createAsyncThunk(
  'capitalProtection/fetchCoverageRatio',
  async (_, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.getCoverageRatio();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch coverage ratio' });
    }
  }
);

// Fetch system health
export const fetchSystemHealth = createAsyncThunk(
  'capitalProtection/fetchSystemHealth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.getSystemHealth();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch system health' });
    }
  }
);

// Fetch platform stability (public)
export const fetchPlatformStability = createAsyncThunk(
  'capitalProtection/fetchPlatformStability',
  async (_, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.getPlatformStability();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch platform stability' });
    }
  }
);

// Fetch admin dashboard
export const fetchAdminDashboard = createAsyncThunk(
  'capitalProtection/fetchAdminDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.getAdminDashboard();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch dashboard' });
    }
  }
);

// Update pool balance
export const updatePoolBalance = createAsyncThunk(
  'capitalProtection/updatePoolBalance',
  async (data, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.updatePoolBalance(data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to update pool balance' });
    }
  }
);

// Replenish reserve
export const replenishReserve = createAsyncThunk(
  'capitalProtection/replenishReserve',
  async (data, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.replenishReserve(data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to replenish reserve' });
    }
  }
);

// Fetch triggers
export const fetchTriggers = createAsyncThunk(
  'capitalProtection/fetchTriggers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.getTriggers();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch triggers' });
    }
  }
);

// Evaluate triggers
export const evaluateTriggers = createAsyncThunk(
  'capitalProtection/evaluateTriggers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.evaluateTriggers();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to evaluate triggers' });
    }
  }
);

// Resolve trigger
export const resolveTrigger = createAsyncThunk(
  'capitalProtection/resolveTrigger',
  async (triggerId, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.resolveTrigger(triggerId);
      return { triggerId, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to resolve trigger' });
    }
  }
);

// Fetch stress test scenarios
export const fetchStressTestScenarios = createAsyncThunk(
  'capitalProtection/fetchStressTestScenarios',
  async (_, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.getStressTestScenarios();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch scenarios' });
    }
  }
);

// Run stress test
export const runStressTest = createAsyncThunk(
  'capitalProtection/runStressTest',
  async (data, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.runStressTest(data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to run stress test' });
    }
  }
);

// Fetch stress test history
export const fetchStressTestHistory = createAsyncThunk(
  'capitalProtection/fetchStressTestHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.getStressTestHistory();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch history' });
    }
  }
);

// Fetch alerts
export const fetchAlerts = createAsyncThunk(
  'capitalProtection/fetchAlerts',
  async (limit = 20, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.getAlerts(limit);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch alerts' });
    }
  }
);

// Resolve alert
export const resolveAlert = createAsyncThunk(
  'capitalProtection/resolveAlert',
  async (alertId, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.resolveAlert(alertId);
      return { alertId, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to resolve alert' });
    }
  }
);

// Create guarantee
export const createGuarantee = createAsyncThunk(
  'capitalProtection/createGuarantee',
  async (data, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.createGuarantee(data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to create guarantee' });
    }
  }
);

// File guarantee claim
export const fileGuaranteeClaim = createAsyncThunk(
  'capitalProtection/fileGuaranteeClaim',
  async (data, { rejectWithValue }) => {
    try {
      const response = await capitalProtectionService.fileGuaranteeClaim(data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to file claim' });
    }
  }
);

// ============================================================
// SLICE
// ============================================================

const capitalProtectionSlice = createSlice({
  name: 'capitalProtection',
  initialState,
  reducers: {
    clearReserveStatus: (state) => {
      state.reserveStatus = null;
      state.reserveError = null;
    },
    clearCoverageRatio: (state) => {
      state.coverageRatio = null;
      state.coverageError = null;
    },
    clearSystemHealth: (state) => {
      state.systemHealth = null;
      state.healthError = null;
    },
    clearPlatformStability: (state) => {
      state.platformStability = null;
      state.stabilityError = null;
    },
    clearAdminDashboard: (state) => {
      state.adminDashboard = null;
      state.dashboardError = null;
    },
    clearStressTestResults: (state) => {
      state.stressTestResults = null;
      state.stressTestError = null;
    },
    clearAlerts: (state) => {
      state.alerts = [];
      state.alertsError = null;
    },
    clearOperationError: (state) => {
      state.operationError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Reserve Status
      .addCase(fetchReserveStatus.pending, (state) => {
        state.reserveLoading = true;
        state.reserveError = null;
      })
      .addCase(fetchReserveStatus.fulfilled, (state, action) => {
        state.reserveLoading = false;
        state.reserveStatus = action.payload;
      })
      .addCase(fetchReserveStatus.rejected, (state, action) => {
        state.reserveLoading = false;
        state.reserveError = action.payload;
      })

      // Coverage Ratio
      .addCase(fetchCoverageRatio.pending, (state) => {
        state.coverageLoading = true;
        state.coverageError = null;
      })
      .addCase(fetchCoverageRatio.fulfilled, (state, action) => {
        state.coverageLoading = false;
        state.coverageRatio = action.payload;
      })
      .addCase(fetchCoverageRatio.rejected, (state, action) => {
        state.coverageLoading = false;
        state.coverageError = action.payload;
      })

      // System Health
      .addCase(fetchSystemHealth.pending, (state) => {
        state.healthLoading = true;
        state.healthError = null;
      })
      .addCase(fetchSystemHealth.fulfilled, (state, action) => {
        state.healthLoading = false;
        state.systemHealth = action.payload;
      })
      .addCase(fetchSystemHealth.rejected, (state, action) => {
        state.healthLoading = false;
        state.healthError = action.payload;
      })

      // Platform Stability
      .addCase(fetchPlatformStability.pending, (state) => {
        state.stabilityLoading = true;
        state.stabilityError = null;
      })
      .addCase(fetchPlatformStability.fulfilled, (state, action) => {
        state.stabilityLoading = false;
        state.platformStability = action.payload;
      })
      .addCase(fetchPlatformStability.rejected, (state, action) => {
        state.stabilityLoading = false;
        state.stabilityError = action.payload;
      })

      // Admin Dashboard
      .addCase(fetchAdminDashboard.pending, (state) => {
        state.dashboardLoading = true;
        state.dashboardError = null;
      })
      .addCase(fetchAdminDashboard.fulfilled, (state, action) => {
        state.dashboardLoading = false;
        state.adminDashboard = action.payload;
      })
      .addCase(fetchAdminDashboard.rejected, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardError = action.payload;
      })

      // Update Pool Balance
      .addCase(updatePoolBalance.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(updatePoolBalance.fulfilled, (state, action) => {
        state.operationLoading = false;
      })
      .addCase(updatePoolBalance.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload;
      })

      // Replenish Reserve
      .addCase(replenishReserve.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(replenishReserve.fulfilled, (state, action) => {
        state.operationLoading = false;
      })
      .addCase(replenishReserve.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload;
      })

      // Triggers
      .addCase(fetchTriggers.pending, (state) => {
        state.triggersLoading = true;
        state.triggersError = null;
      })
      .addCase(fetchTriggers.fulfilled, (state, action) => {
        state.triggersLoading = false;
        state.triggers = action.payload.triggers || [];
      })
      .addCase(fetchTriggers.rejected, (state, action) => {
        state.triggersLoading = false;
        state.triggersError = action.payload;
      })

      // Evaluate Triggers
      .addCase(evaluateTriggers.pending, (state) => {
        state.triggersLoading = true;
        state.triggersError = null;
      })
      .addCase(evaluateTriggers.fulfilled, (state, action) => {
        state.triggersLoading = false;
        if (action.payload.result) {
          state.triggers = action.payload.result;
        }
      })
      .addCase(evaluateTriggers.rejected, (state, action) => {
        state.triggersLoading = false;
        state.triggersError = action.payload;
      })

      // Resolve Trigger
      .addCase(resolveTrigger.fulfilled, (state, action) => {
        state.triggers = state.triggers.map(t => 
          t.id === action.payload.triggerId 
            ? { ...t, is_triggered: false, triggered_at: null }
            : t
        );
      })

      // Stress Test Scenarios
      .addCase(fetchStressTestScenarios.pending, (state) => {
        state.stressTestLoading = true;
        state.stressTestError = null;
      })
      .addCase(fetchStressTestScenarios.fulfilled, (state, action) => {
        state.stressTestLoading = false;
        state.stressTestScenarios = action.payload.scenarios || [];
      })
      .addCase(fetchStressTestScenarios.rejected, (state, action) => {
        state.stressTestLoading = false;
        state.stressTestError = action.payload;
      })

      // Run Stress Test
      .addCase(runStressTest.pending, (state) => {
        state.stressTestLoading = true;
        state.stressTestError = null;
      })
      .addCase(runStressTest.fulfilled, (state, action) => {
        state.stressTestLoading = false;
        state.stressTestResults = action.payload.stress_test;
      })
      .addCase(runStressTest.rejected, (state, action) => {
        state.stressTestLoading = false;
        state.stressTestError = action.payload;
      })

      // Stress Test History
      .addCase(fetchStressTestHistory.pending, (state) => {
        state.stressTestLoading = true;
        state.stressTestError = null;
      })
      .addCase(fetchStressTestHistory.fulfilled, (state, action) => {
        state.stressTestLoading = false;
        state.stressTestHistory = action.payload.history || [];
      })
      .addCase(fetchStressTestHistory.rejected, (state, action) => {
        state.stressTestLoading = false;
        state.stressTestError = action.payload;
      })

      // Alerts
      .addCase(fetchAlerts.pending, (state) => {
        state.alertsLoading = true;
        state.alertsError = null;
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.alertsLoading = false;
        state.alerts = action.payload.alerts || [];
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.alertsLoading = false;
        state.alertsError = action.payload;
      })

      // Resolve Alert
      .addCase(resolveAlert.fulfilled, (state, action) => {
        state.alerts = state.alerts.map(a => 
          a.id === action.payload.alertId 
            ? { ...a, is_resolved: true }
            : a
        );
      })

      // Create Guarantee
      .addCase(createGuarantee.pending, (state) => {
        state.guaranteeLoading = true;
        state.guaranteeError = null;
      })
      .addCase(createGuarantee.fulfilled, (state, action) => {
        state.guaranteeLoading = false;
      })
      .addCase(createGuarantee.rejected, (state, action) => {
        state.guaranteeLoading = false;
        state.guaranteeError = action.payload;
      })

      // File Guarantee Claim
      .addCase(fileGuaranteeClaim.pending, (state) => {
        state.guaranteeLoading = true;
        state.guaranteeError = null;
      })
      .addCase(fileGuaranteeClaim.fulfilled, (state, action) => {
        state.guaranteeLoading = false;
      })
      .addCase(fileGuaranteeClaim.rejected, (state, action) => {
        state.guaranteeLoading = false;
        state.guaranteeError = action.payload;
      });
  }
});

export const {
  clearReserveStatus,
  clearCoverageRatio,
  clearSystemHealth,
  clearPlatformStability,
  clearAdminDashboard,
  clearStressTestResults,
  clearAlerts,
  clearOperationError
} = capitalProtectionSlice.actions;

export default capitalProtectionSlice.reducer;

// ============================================================
// SELECTORS
// ============================================================

// Reserve
export const selectReserveStatus = (state) => state.capitalProtection.reserveStatus;
export const selectReserveLoading = (state) => state.capitalProtection.reserveLoading;
export const selectReserveError = (state) => state.capitalProtection.reserveError;

// Coverage
export const selectCoverageRatio = (state) => state.capitalProtection.coverageRatio;
export const selectCoverageLoading = (state) => state.capitalProtection.coverageLoading;

// Health
export const selectSystemHealth = (state) => state.capitalProtection.systemHealth;
export const selectHealthLoading = (state) => state.capitalProtection.healthLoading;

// Stability
export const selectPlatformStability = (state) => state.capitalProtection.platformStability;
export const selectStabilityLoading = (state) => state.capitalProtection.stabilityLoading;

// Dashboard
export const selectAdminDashboard = (state) => state.capitalProtection.adminDashboard;
export const selectDashboardLoading = (state) => state.capitalProtection.dashboardLoading;

// Triggers
export const selectTriggers = (state) => state.capitalProtection.triggers;
export const selectTriggersLoading = (state) => state.capitalProtection.triggersLoading;
export const selectActiveTriggers = (state) => 
  state.capitalProtection.triggers.filter(t => t.is_triggered);

// Stress Tests
export const selectStressTestScenarios = (state) => state.capitalProtection.stressTestScenarios;
export const selectStressTestLoading = (state) => state.capitalProtection.stressTestLoading;
export const selectStressTestResults = (state) => state.capitalProtection.stressTestResults;
export const selectStressTestHistory = (state) => state.capitalProtection.stressTestHistory;

// Alerts
export const selectAlerts = (state) => state.capitalProtection.alerts;
export const selectAlertsLoading = (state) => state.capitalProtection.alertsLoading;
export const selectUnresolvedAlerts = (state) => 
  state.capitalProtection.alerts.filter(a => !a.is_resolved);

// Guarantees
export const selectGuarantees = (state) => state.capitalProtection.guarantees;
export const selectGuaranteeLoading = (state) => state.capitalProtection.guaranteeLoading;

// Operations
export const selectOperationLoading = (state) => state.capitalProtection.operationLoading;
export const selectOperationError = (state) => state.capitalProtection.operationError;

// Derived selectors
export const selectSystemHealthStatus = (state) => 
  state.capitalProtection.systemHealth?.system_health?.status || 'unknown';

export const selectCoveragePercentage = (state) => 
  state.capitalProtection.coverageRatio?.coverage_ratio?.coverage_ratio || 0;

export const selectTotalReserve = (state) => 
  state.capitalProtection.reserveStatus?.reserve_status?.total?.balance || 0;
