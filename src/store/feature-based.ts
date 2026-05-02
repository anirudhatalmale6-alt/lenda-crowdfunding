/**
 * Feature-Based Redux Store Architecture
 * 
 * Implements feature-sliced design / domain-driven structure
 * ARCH-012: Addresses flat store organization
 * 
 * This file provides the recommended folder structure and integration
 * The actual slices should be reorganized into feature directories
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';

// Feature-based reducer mapping
// Each feature should have its own directory under src/store/features/
const featureReducers = {
    // Core features
    auth: () => import('./slices/authSlice').then(m => m.default),
    loans: () => import('./slices/loanSlice').then(m => m.default),
    wallet: () => import('./slices/walletSlice').then(m => m.default),
    
    // Business features
    marketplace: () => import('./slices/marketplaceSlice').then(m => m.default),
    escrow: () => import('./slices/escrowSlice').then(m => m.default),
    tokens: () => import('./slices/tokenSlice').then(m => m.default),
    discovery: () => import('./slices/discoverySlice').then(m => m.default),
    revenue: () => import('./slices/revenueSlice').then(m => m.default),
    
    // Admin features
    admin: () => import('./slices/adminSlice').then(m => m.default),
    risk: () => import('./slices/riskSlice').then(m => m.default),
    rates: () => import('./slices/rateSlice').then(m => m.default),
    capitalProtection: () => import('./slices/capitalProtectionSlice').then(m => m.default),
    creditReputation: () => import('./slices/creditReputationSlice').then(m => m.default),
    
    // Infrastructure features
    ui: () => import('./slices/uiSlice').then(m => m.default),
    auctions: () => import('./slices/auctionSlice').then(m => m.default),
    gdpr: () => import('./slices/gdprSlice').then(m => m.default),
    marketMaker: () => import('./slices/marketMakerSlice').then(m => m.default),
    reserveFund: () => import('./slices/reserveFundSlice').then(m => m.default),
};

/**
 * Store configuration type
 */
export type RootState = ReturnType<typeof createFeatureStore>['getState'];
export type AppDispatch = ReturnType<typeof createFeatureStore>['dispatch'];

/**
 * Create feature-based store with lazy-loaded reducers
 * For migration purposes, this uses dynamic imports
 * 
 * Recommended structure:
 * src/store/
 * ├── index.ts                 # Main store config
 * ├── feature-based.ts         # This file
 * ├── slices/                  # Current slices (legacy)
 * ├── features/                # NEW: Feature-based modules
 * │   ├── auth/
 * │   │   ├── index.ts
 * │   │   ├── authSlice.ts
 * │   │   ├── authApi.ts
 * │   │   ├── authSelectors.ts
 * │   │   └── authTypes.ts
 * │   ├── loans/
 * │   │   ├── index.ts
 * │   │   ├── loansSlice.ts
 * │   │   ├── loansApi.ts
 * │   │   ├── loansSelectors.ts
 * │   │   └── loansTypes.ts
 * │   ├── wallet/
 * │   │   ├── index.ts
 * │   │   ├── walletSlice.ts
 * │   │   └── ...
 * │   └── [other features]
 * ├── hooks.ts                 # Typed hooks
 * └── utils.ts                 # Store utilities
 */
export function createFeatureStore() {
    return configureStore({
        reducer: {
            // Core domain slices (loaded eagerly for now)
            auth: require('./slices/authSlice').default,
            loans: require('./slices/loanSlice').default,
            wallet: require('./slices/walletSlice').default,
            marketplace: require('./slices/marketplaceSlice').default,
            escrow: require('./slices/escrowSlice').default,
            ui: require('./slices/uiSlice').default,
            
            // Other slices (loaded eagerly for backward compatibility)
            // In production, use lazy loading with React.lazy
            tokens: require('./slices/tokenSlice').default,
            discovery: require('./slices/discoverySlice').default,
            revenue: require('./slices/revenueSlice').default,
            risk: require('./slices/riskSlice').default,
            rates: require('./slices/rateSlice').default,
            capitalProtection: require('./slices/capitalProtectionSlice').default,
            creditReputation: require('./slices/creditReputationSlice').default,
            auctions: require('./slices/auctionSlice').default,
            gdpr: require('./slices/gdprSlice').default,
            marketMaker: require('./slices/marketMakerSlice').default,
            reserveFund: require('./slices/reserveFundSlice').default,
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: {
                    // Ignore these paths in the state for serialization check
                    ignoredActions: [
                        'wallet/setConnection',
                        'loans/setActiveLoan',
                        'auth/setUser'
                    ],
                },
            }),
    });
}

/**
 * Feature module definition type
 */
export interface FeatureModule {
    reducerPath: string;
    reducer: ReturnType<typeof combineReducers>;
    sagas?: Generator;
    middleware?: ReturnType<typeof configureStore>['middleware'];
}

/**
 * Feature registry for dynamic feature loading
 */
export const featureRegistry: Record<string, () => Promise<FeatureModule>> = {
    auth: () => import('./features/auth'),
    loans: () => import('./features/loans'),
    wallet: () => import('./features/wallet'),
    marketplace: () => import('./features/marketplace'),
    escrow: () => import('./features/escrow'),
    tokens: () => import('./features/tokens'),
    discovery: () => import('./features/discovery'),
    revenue: () => import('./features/revenue'),
    admin: () => import('./features/admin'),
    risk: () => import('./features/risk'),
};

/**
 * Example feature structure (to be implemented):
 * 
 * src/store/features/loans/index.ts:
 * 
 * import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
 * import { loansApi } from './loansApi';
 * import type { Loan, LoansState } from './loansTypes';
 * 
 * // Types
 * export interface LoansState {
 *   items: Loan[];
 *   loading: boolean;
 *   error: string | null;
 * }
 * 
 * // Async thunks
 * export const fetchLoans = createAsyncThunk('loans/fetchLoans', async () => {
 *   return await loansApi.getLoans();
 * });
 * 
 * // Slice
 * const loansSlice = createSlice({
 *   name: 'loans',
 *   initialState: {
 *     items: [],
 *     loading: false,
 *     error: null
 *   } as LoansState,
 *   reducers: {
 *     // synchronous reducers
 *   },
 *   extraReducers: (builder) => {
 *     builder
 *       .addCase(fetchLoans.pending, (state) => {
 *         state.loading = true;
 *       })
 *       .addCase(fetchLoans.fulfilled, (state, action) => {
 *         state.items = action.payload;
 *         state.loading = false;
 *       });
 *   }
 * });
 * 
 * export default loansSlice.reducer;
 * 
 * // Selectors
 * export const selectLoans = (state: RootState) => state.loans.items;
 * export const selectLoansLoading = (state: RootState) => state.loans.loading;
 * 
 * // API
 * export const loansApi = {
 *   async getLoans() { ... }
 * };
 */

// Re-export for convenience
export type { RootState as State, AppDispatch as Dispatch } from './index';

export default createFeatureStore;
