import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import gdprService, { REQUIRED_CONSENTS } from '../../services/gdprService';
import type { GDPRConsent, GDPRDataRequest, GDPRConsentType } from '../../types';

interface GDPRState {
  consents: GDPRConsent[];
  dataRequests: GDPRDataRequest[];
  pendingExportRequest: GDPRDataRequest | null;
  pendingDeletionRequest: GDPRDataRequest | null;
  isLoading: boolean;
  error: string | null;
  allRequiredConsentsGranted: boolean;
  policyVersion: string | null;
  showConsentModal: boolean;
}

const initialState: GDPRState = {
  consents: [],
  dataRequests: [],
  pendingExportRequest: null,
  pendingDeletionRequest: null,
  isLoading: false,
  error: null,
  allRequiredConsentsGranted: false,
  policyVersion: null,
  showConsentModal: false,
};

// Get all consents
export const getConsents = createAsyncThunk(
  'gdpr/getConsents',
  async (_, { rejectWithValue }) => {
    try {
      const response = await gdprService.getConsents();
      return response.data as GDPRConsent[];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Grant consent
export const grantConsent = createAsyncThunk(
  'gdpr/grantConsent',
  async (consentType: GDPRConsentType, { rejectWithValue }) => {
    try {
      const response = await gdprService.grantConsent(consentType);
      return response.data as GDPRConsent;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Withdraw consent
export const withdrawConsent = createAsyncThunk(
  'gdpr/withdrawConsent',
  async (consentType: GDPRConsentType, { rejectWithValue }) => {
    try {
      const response = await gdprService.withdrawConsent(consentType);
      return response.data as GDPRConsent;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Grant all required consents
export const grantRequiredConsents = createAsyncThunk(
  'gdpr/grantRequiredConsents',
  async (_, { rejectWithValue }) => {
    try {
      const response = await gdprService.grantAllRequiredConsents(REQUIRED_CONSENTS);
      return response.data as GDPRConsent[];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Check required consents
export const checkRequiredConsents = createAsyncThunk(
  'gdpr/checkRequiredConsents',
  async (_, { rejectWithValue }) => {
    try {
      const response = await gdprService.checkRequiredConsents();
      return response.data as { allGranted: boolean; missing: GDPRConsentType[] };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Request data export
export const requestDataExport = createAsyncThunk(
  'gdpr/requestDataExport',
  async (_, { rejectWithValue }) => {
    try {
      const response = await gdprService.requestDataExport();
      return response.data as GDPRDataRequest;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Request data deletion
export const requestDataDeletion = createAsyncThunk(
  'gdpr/requestDataDeletion',
  async (reason: string | undefined = undefined, { rejectWithValue }) => {
    try {
      const response = await gdprService.requestDataDeletion(reason);
      return response.data as GDPRDataRequest;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Cancel data deletion
export const cancelDataDeletion = createAsyncThunk(
  'gdpr/cancelDataDeletion',
  async (requestId: string, { rejectWithValue }) => {
    try {
      const response = await gdprService.cancelDataDeletion(requestId);
      const data = response.data;
      if (data && 'success' in data) {
        return { requestId, success: data.success };
      }
      return { requestId, success: true };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Get data requests
export const getDataRequests = createAsyncThunk(
  'gdpr/getDataRequests',
  async (_, { rejectWithValue }) => {
    try {
      const response = await gdprService.getDataRequests();
      return response.data as GDPRDataRequest[];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Get policy version
export const getPolicyVersion = createAsyncThunk(
  'gdpr/getPolicyVersion',
  async (_, { rejectWithValue }) => {
    try {
      const response = await gdprService.getPolicyVersion();
      return response.data as { version: string; updatedAt: string };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Accept policy version
export const acceptPolicyVersion = createAsyncThunk(
  'gdpr/acceptPolicyVersion',
  async (version: string, { rejectWithValue }) => {
    try {
      const response = await gdprService.acceptPolicyVersion(version);
      return response.data as { success: boolean };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const gdprSlice = createSlice({
  name: 'gdpr',
  initialState,
  reducers: {
    clearGDPRError: (state) => {
      state.error = null;
    },
    setShowConsentModal: (state, action) => {
      state.showConsentModal = action.payload;
    },
    hideConsentModal: (state) => {
      state.showConsentModal = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get consents
      .addCase(getConsents.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getConsents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.consents = action.payload;
        // Check if all required consents are granted
        const requiredTypes = new Set(REQUIRED_CONSENTS);
        state.allRequiredConsentsGranted = action.payload
          .filter(c => requiredTypes.has(c.consentType) && c.granted)
          .length === REQUIRED_CONSENTS.length;
      })
      .addCase(getConsents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Grant consent
      .addCase(grantConsent.fulfilled, (state, action) => {
        const index = state.consents.findIndex(c => c.consentType === action.payload.consentType);
        if (index !== -1) {
          state.consents[index] = action.payload;
        } else {
          state.consents.push(action.payload);
        }
        // Re-check required consents
        const requiredTypes = new Set(REQUIRED_CONSENTS);
        state.allRequiredConsentsGranted = state.consents
          .filter(c => requiredTypes.has(c.consentType) && c.granted)
          .length === REQUIRED_CONSENTS.length;
      })
      // Withdraw consent
      .addCase(withdrawConsent.fulfilled, (state, action) => {
        const index = state.consents.findIndex(c => c.consentType === action.payload.consentType);
        if (index !== -1) {
          state.consents[index] = action.payload;
        }
        // Re-check required consents
        const requiredTypes = new Set(REQUIRED_CONSENTS);
        state.allRequiredConsentsGranted = state.consents
          .filter(c => requiredTypes.has(c.consentType) && c.granted)
          .length === REQUIRED_CONSENTS.length;
      })
      // Grant required consents
      .addCase(grantRequiredConsents.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(grantRequiredConsents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.consents = action.payload;
        state.allRequiredConsentsGranted = true;
        state.showConsentModal = false;
      })
      .addCase(grantRequiredConsents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Check required consents
      .addCase(checkRequiredConsents.fulfilled, (state, action) => {
        state.allRequiredConsentsGranted = action.payload.allGranted;
        if (!action.payload.allGranted && action.payload.missing.length > 0) {
          state.showConsentModal = true;
        }
      })
      // Request data export
      .addCase(requestDataExport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestDataExport.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pendingExportRequest = action.payload;
        state.dataRequests.unshift(action.payload);
      })
      .addCase(requestDataExport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Request data deletion
      .addCase(requestDataDeletion.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestDataDeletion.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pendingDeletionRequest = action.payload;
        state.dataRequests.unshift(action.payload);
      })
      .addCase(requestDataDeletion.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Cancel data deletion
      .addCase(cancelDataDeletion.fulfilled, (state, action) => {
        if (action.payload.success) {
          state.pendingDeletionRequest = null;
          const index = state.dataRequests.findIndex(r => r.id === action.payload.requestId);
          if (index !== -1) {
            state.dataRequests[index].status = 'CANCELLED';
          }
        }
      })
      // Get data requests
      .addCase(getDataRequests.fulfilled, (state, action) => {
        state.dataRequests = action.payload;
        // Find pending requests
        const exportReq = action.payload.find(r => r.requestType === 'EXPORT' && r.status === 'PENDING');
        const deletionReq = action.payload.find(r => r.requestType === 'DELETION' && r.status === 'PENDING');
        state.pendingExportRequest = exportReq || null;
        state.pendingDeletionRequest = deletionReq || null;
      })
      // Get policy version
      .addCase(getPolicyVersion.fulfilled, (state, action) => {
        state.policyVersion = action.payload.version;
      })
      // Accept policy version
      .addCase(acceptPolicyVersion.fulfilled, (state, action) => {
        if (action.payload.success) {
          // Refresh consents after accepting new policy
        }
      });
  },
});

export const { clearGDPRError, setShowConsentModal, hideConsentModal } = gdprSlice.actions;
export default gdprSlice.reducer;
