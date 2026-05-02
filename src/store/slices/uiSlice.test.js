import { describe, it, expect, beforeEach } from 'vitest';
import uiReducer, {
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
} from './uiSlice';

describe('uiSlice', () => {
    const initialState = {
        sidebarOpen: true,
        modalOpen: null,
        notifications: [],
        theme: 'light',
        currency: 'USD',
        language: 'en',
    };

    it('should return the initial state', () => {
        const result = uiReducer(undefined, { type: 'unknown' });
        expect(result.sidebarOpen).toBe(true);
        expect(result.modalOpen).toBe(null);
        expect(result.notifications).toEqual([]);
        expect(result.theme).toBe('light');
        expect(result.currency).toBe('USD');
        expect(result.language).toBe('en');
    });

    describe('toggleSidebar', () => {
        it('should toggle sidebar from open to closed', () => {
            const result = uiReducer(initialState, toggleSidebar());
            expect(result.sidebarOpen).toBe(false);
        });

        it('should toggle sidebar from closed to open', () => {
            const closedState = { ...initialState, sidebarOpen: false };
            const result = uiReducer(closedState, toggleSidebar());
            expect(result.sidebarOpen).toBe(true);
        });
    });

    describe('setSidebarOpen', () => {
        it('should set sidebar to open', () => {
            const result = uiReducer(initialState, setSidebarOpen(true));
            expect(result.sidebarOpen).toBe(true);
        });

        it('should set sidebar to closed', () => {
            const result = uiReducer(initialState, setSidebarOpen(false));
            expect(result.sidebarOpen).toBe(false);
        });
    });

    describe('openModal', () => {
        it('should open login modal', () => {
            const result = uiReducer(initialState, openModal('login'));
            expect(result.modalOpen).toBe('login');
        });

        it('should open register modal', () => {
            const result = uiReducer(initialState, openModal('register'));
            expect(result.modalOpen).toBe('register');
        });

        it('should open wallet modal', () => {
            const result = uiReducer(initialState, openModal('wallet'));
            expect(result.modalOpen).toBe('wallet');
        });
    });

    describe('closeModal', () => {
        it('should close any open modal', () => {
            const stateWithModal = { ...initialState, modalOpen: 'login' };
            const result = uiReducer(stateWithModal, closeModal());
            expect(result.modalOpen).toBe(null);
        });
    });

    describe('addNotification', () => {
        it('should add a notification', () => {
            const notification = { type: 'success', message: 'Operation successful' };
            const result = uiReducer(initialState, addNotification(notification));
            expect(result.notifications).toHaveLength(1);
            expect(result.notifications[0].type).toBe('success');
            expect(result.notifications[0].message).toBe('Operation successful');
        });

        it('should add notification with id', () => {
            const notification = { type: 'error', message: 'Error occurred' };
            const result = uiReducer(initialState, addNotification(notification));
            expect(result.notifications[0].id).toBeDefined();
        });

        it('should add multiple notifications', () => {
            const stateWithNotification = {
                ...initialState,
                notifications: [{ id: 1, type: 'info', message: 'First' }],
            };
            const result = uiReducer(
                stateWithNotification,
                addNotification({ type: 'success', message: 'Second' })
            );
            expect(result.notifications).toHaveLength(2);
        });
    });

    describe('removeNotification', () => {
        it('should remove a notification by id', () => {
            const stateWithNotifications = {
                ...initialState,
                notifications: [
                    { id: 1, type: 'info', message: 'First' },
                    { id: 2, type: 'success', message: 'Second' },
                ],
            };
            const result = uiReducer(stateWithNotifications, removeNotification(1));
            expect(result.notifications).toHaveLength(1);
            expect(result.notifications[0].id).toBe(2);
        });

        it('should handle removing non-existent notification', () => {
            const stateWithNotifications = {
                ...initialState,
                notifications: [{ id: 1, type: 'info', message: 'First' }],
            };
            const result = uiReducer(stateWithNotifications, removeNotification(999));
            expect(result.notifications).toHaveLength(1);
        });
    });

    describe('clearNotifications', () => {
        it('should clear all notifications', () => {
            const stateWithNotifications = {
                ...initialState,
                notifications: [
                    { id: 1, type: 'info', message: 'First' },
                    { id: 2, type: 'success', message: 'Second' },
                ],
            };
            const result = uiReducer(stateWithNotifications, clearNotifications());
            expect(result.notifications).toEqual([]);
        });
    });

    describe('setTheme', () => {
        it('should set theme to dark', () => {
            const result = uiReducer(initialState, setTheme('dark'));
            expect(result.theme).toBe('dark');
        });

        it('should set theme to light', () => {
            const darkState = { ...initialState, theme: 'dark' };
            const result = uiReducer(darkState, setTheme('light'));
            expect(result.theme).toBe('light');
        });
    });

    describe('setCurrency', () => {
        it('should set currency to EUR', () => {
            const result = uiReducer(initialState, setCurrency('EUR'));
            expect(result.currency).toBe('EUR');
        });

        it('should set currency to GBP', () => {
            const result = uiReducer(initialState, setCurrency('GBP'));
            expect(result.currency).toBe('GBP');
        });
    });

    describe('setLanguage', () => {
        it('should set language to Spanish', () => {
            const result = uiReducer(initialState, setLanguage('es'));
            expect(result.language).toBe('es');
        });

        it('should set language to French', () => {
            const result = uiReducer(initialState, setLanguage('fr'));
            expect(result.language).toBe('fr');
        });
    });
});
