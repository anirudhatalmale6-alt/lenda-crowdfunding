import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks
export const fetchReserveFundData = createAsyncThunk(
  'reserveFund/fetchData',
  async (_, { rejectWithValue }) => {
    try {
      // Mock API call - replace with actual API
      return {
        totalReserve: 450000,
        targetRatio: 20,
        currentRatio: 18.4,
        contributions: 25000,
        claims: 12000,
        autoContributions: true,
        autoTopUp: false,
        threshold: 15,
        topUpAmount: 50000,
        transactions: [
          { id: 1, date: '2024-03-15', type: 'contribution', amount: 5000, source: 'Platform Fees' },
          { id: 2, date: '2024-03-14', type: 'claim', amount: 3000, source: 'Default LN-4485' },
          { id: 3, date: '2024-03-13', type: 'contribution', amount: 5000, source: 'Platform Fees' },
          { id: 4, date: '2024-03-12', type: 'contribution', amount: 5000, source: 'Platform Fees' },
          { id: 5, date: '2024-03-11', type: 'claim', amount: 5000, source: 'Default LN-4478' },
        ]
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateReserveFundSettings = createAsyncThunk(
  'reserveFund/updateSettings',
  async (settings, { rejectWithValue }) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      return settings;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const triggerManualTopUp = createAsyncThunk(
  'reserveFund/manualTopUp',
  async (amount, { rejectWithValue }) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { amount, success: true };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Initial state
const initialState = {
  data: {
    totalReserve: 0,
    targetRatio: 20,
    currentRatio: 0,
    contributions: 0,
    claims: 0,
    autoContributions: true,
    autoTopUp: false,
    threshold: 15,
    topUpAmount: 50000,
    transactions: []
  },
  settings: {
    autoContributions: true,
    autoTopUp: false,
    threshold: 15,
    topUpAmount: 50000,
    notificationEmail: 'admin@lenda.com'
  },
  loading: false,
  updating: false,
  error: null
};

// Reserve fund slice
const reserveFundSlice = createSlice({
  name: 'reserveFund',
  initialState,
  reducers: {
    setAutoContributions: (state, action) => {
      state.settings.autoContributions = action.payload;
    },
    setAutoTopUp: (state, action) => {
      state.settings.autoTopUp = action.payload;
    },
    setThreshold: (state, action) => {
      state.settings.threshold = action.payload;
    },
    setTopUpAmount: (state, action) => {
      state.settings.topUpAmount = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch reserve fund data
      .addCase(fetchReserveFundData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReserveFundData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchReserveFundData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update settings
      .addCase(updateReserveFundSettings.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateReserveFundSettings.fulfilled, (state, action) => {
        state.updating = false;
        state.settings = { ...state.settings, ...action.payload };
      })
      .addCase(updateReserveFundSettings.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      })
      
      // Manual top up
      .addCase(triggerManualTopUp.pending, (state) => {
        state.updating = true;
      })
      .addCase(triggerManualTopUp.fulfilled, (state, action) => {
        state.updating = false;
        state.data.totalReserve += action.payload.amount;
      })
      .addCase(triggerManualTopUp.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      });
  }
});

// Export actions
export const {
  setAutoContributions,
  setAutoTopUp,
  setThreshold,
  setTopUpAmount,
  clearError
} = reserveFundSlice.actions;

// Selectors
export const selectReserveFundData = (state) => state.reserveFund.data;
export const selectReserveFundSettings = (state) => state.reserveFund.settings;
export const selectReserveFundLoading = (state) => state.reserveFund.loading;
export const selectReserveFundError = (state) => state.reserveFund.error;

export default reserveFundSlice.reducer;
