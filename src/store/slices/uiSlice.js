import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    sidebarOpen: true,
    modalOpen: null, // 'login', 'register', 'wallet', etc.
    notifications: [],
    theme: 'light',
    currency: 'NGN',
    language: 'en',
    watchlist: [], // UX-009: Loan watchlist for investors
    dismissedAlerts: [], // UX-007: Dismissed portfolio alerts
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen;
        },
        setSidebarOpen: (state, action) => {
            state.sidebarOpen = action.payload;
        },
        openModal: (state, action) => {
            state.modalOpen = action.payload;
        },
        closeModal: (state) => {
            state.modalOpen = null;
        },
        addNotification: (state, action) => {
            state.notifications.push({
                id: Date.now(),
                ...action.payload,
            });
        },
        removeNotification: (state, action) => {
            state.notifications = state.notifications.filter(
                (n) => n.id !== action.payload
            );
        },
        clearNotifications: (state) => {
            state.notifications = [];
        },
        setTheme: (state, action) => {
            state.theme = action.payload;
        },
        setCurrency: (state, action) => {
            state.currency = action.payload;
        },
        setLanguage: (state, action) => {
            state.language = action.payload;
        },
        // UX-009: Watchlist actions
        addToWatchlist: (state, action) => {
            if (!state.watchlist.includes(action.payload)) {
                state.watchlist.push(action.payload);
            }
        },
        removeFromWatchlist: (state, action) => {
            state.watchlist = state.watchlist.filter(id => id !== action.payload);
        },
        clearWatchlist: (state) => {
            state.watchlist = [];
        },
        // UX-007: Diversification alert actions
        dismissDiversificationAlert: (state, action) => {
            if (!state.dismissedAlerts.includes(action.payload)) {
                state.dismissedAlerts.push(action.payload);
            }
        },
        clearDismissedAlerts: (state) => {
            state.dismissedAlerts = [];
        },
    },
});

export const {
    toggleSidebar,
    setSidebarOpen,
    openModal,
    closeModal,
    addNotification,
    removeNotification,
    clearNotifications,
    setTheme,
    setCurrency,
    setLanguage,
    addToWatchlist,
    removeFromWatchlist,
    clearWatchlist,
    dismissDiversificationAlert,
    clearDismissedAlerts,
} = uiSlice.actions;

export default uiSlice.reducer;
