import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import loanReducer from './slices/loanSlice';
import walletReducer from './slices/walletSlice';
import marketplaceReducer from './slices/marketplaceSlice';
import escrowReducer from './slices/escrowSlice';
import uiReducer from './slices/uiSlice';
import auctionReducer from './slices/auctionSlice';
import gdprReducer from './slices/gdprSlice';
import tokenReducer from './slices/tokenSlice';
import marketMakerReducer from './slices/marketMakerSlice';
import rateReducer from './slices/rateSlice';
import riskReducer from './slices/riskSlice';
import capitalProtectionReducer from './slices/capitalProtectionSlice';
import creditReputationReducer from './slices/creditReputationSlice';
import discoveryReducer from './slices/discoverySlice';
import revenueReducer from './slices/revenueSlice';
import reserveFundReducer from './slices/reserveFundSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        loans: loanReducer,
        wallet: walletReducer,
        marketplace: marketplaceReducer,
        escrow: escrowReducer,
        ui: uiReducer,
        auctions: auctionReducer,
        gdpr: gdprReducer,
        tokens: tokenReducer,
        marketMaker: marketMakerReducer,
        rates: rateReducer,
        risk: riskReducer,
        capitalProtection: capitalProtectionReducer,
        creditReputation: creditReputationReducer,
        discovery: discoveryReducer,
        revenue: revenueReducer,
        reserveFund: reserveFundReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
