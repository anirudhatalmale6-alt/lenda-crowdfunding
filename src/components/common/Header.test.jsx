import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';
import Header from './Header';

const renderWithRouterAndStore = (ui, store) => {
    return render(
        <Provider store={store}>
            <BrowserRouter>
                {ui}
            </BrowserRouter>
        </Provider>
    );
};

const createTestStore = (preloadedState = {}) => {
    return configureStore({
        reducer: {
            auth: authReducer,
        },
        preloadedState,
    });
};

describe('Header', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('renders the LENDA logo', () => {
        const store = createTestStore({
            auth: {
                isAuthenticated: false,
                user: null,
                loading: false,
                error: null,
            },
        });

        renderWithRouterAndStore(<Header />, store);

        // Use querySelector to find the header first, then the logo
        const header = document.querySelector('header');
        expect(header.textContent).toContain('LENDA');
    });

    it('renders navigation links', () => {
        const store = createTestStore({
            auth: {
                isAuthenticated: false,
                user: null,
                loading: false,
                error: null,
            },
        });

        renderWithRouterAndStore(<Header />, store);

        const header = document.querySelector('header');
        expect(header.querySelector('a[href="/"]')).toBeInTheDocument();
        expect(header.querySelector('a[href="/loans"]')).toBeInTheDocument();
    });

    it('shows Sign In and Get Started buttons when not authenticated', () => {
        const store = createTestStore({
            auth: {
                isAuthenticated: false,
                user: null,
                loading: false,
                error: null,
            },
        });

        renderWithRouterAndStore(<Header />, store);

        const header = document.querySelector('header');
        expect(header.querySelector('a[href="/login"]')).toBeInTheDocument();
        expect(header.querySelector('a[href="/register"]')).toBeInTheDocument();
    });

    it('shows user name when authenticated', () => {
        const store = createTestStore({
            auth: {
                isAuthenticated: true,
                user: { name: 'John Doe', role: 'borrower' },
                loading: false,
                error: null,
            },
        });

        renderWithRouterAndStore(<Header />, store);

        const header = document.querySelector('header');
        expect(header.textContent).toContain('John Doe');
    });

    it('shows user initial in avatar when authenticated', () => {
        const store = createTestStore({
            auth: {
                isAuthenticated: true,
                user: { name: 'John Doe', role: 'borrower' },
                loading: false,
                error: null,
            },
        });

        renderWithRouterAndStore(<Header />, store);

        // Check for first letter of user name in avatar
        expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('has mobile menu toggle button', () => {
        const store = createTestStore({
            auth: {
                isAuthenticated: false,
                user: null,
                loading: false,
                error: null,
            },
        });

        renderWithRouterAndStore(<Header />, store);

        // Check for mobile menu button (should be visible on small screens)
        const menuButton = document.querySelector('.md\\:hidden');
        expect(menuButton).toBeInTheDocument();
    });

    it('renders navigation links with correct paths', () => {
        const store = createTestStore({
            auth: {
                isAuthenticated: false,
                user: null,
                loading: false,
                error: null,
            },
        });

        renderWithRouterAndStore(<Header />, store);

        const header = document.querySelector('header');

        // Check that navigation links have correct hrefs
        const homeLink = header.querySelector('a[href="/"]');
        expect(homeLink).toBeInTheDocument();

        const loansLink = header.querySelector('a[href="/loans"]');
        expect(loansLink).toBeInTheDocument();
    });

    it('shows "User" as fallback when user name is not provided', () => {
        const store = createTestStore({
            auth: {
                isAuthenticated: true,
                user: { name: null, role: 'borrower' },
                loading: false,
                error: null,
            },
        });

        renderWithRouterAndStore(<Header />, store);

        const header = document.querySelector('header');
        expect(header.textContent).toContain('User');
    });

    it('has sticky positioning', () => {
        const store = createTestStore({
            auth: {
                isAuthenticated: false,
                user: null,
                loading: false,
                error: null,
            },
        });

        renderWithRouterAndStore(<Header />, store);

        const header = document.querySelector('header.sticky');
        expect(header).toBeInTheDocument();
    });
});
