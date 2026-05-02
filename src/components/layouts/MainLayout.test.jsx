import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';
import MainLayout from './MainLayout';

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

const TestChild = () => <div data-testid="test-child">Test Content</div>;

describe('MainLayout', () => {
    it('renders the layout structure correctly', () => {
        const store = createTestStore({
            auth: {
                isAuthenticated: false,
                user: null,
                loading: false,
                error: null,
            },
        });

        renderWithRouterAndStore(
            <Routes>
                <Route element={<MainLayout />}>
                    <Route path="/" element={<TestChild />} />
                </Route>
            </Routes>,
            store
        );

        // Check that the main layout elements exist
        expect(document.querySelector('.min-h-screen')).toBeInTheDocument();
        expect(document.querySelector('.flex.flex-col')).toBeInTheDocument();
    });

    it('renders Header and Footer components', () => {
        const store = createTestStore({
            auth: {
                isAuthenticated: false,
                user: null,
                loading: false,
                error: null,
            },
        });

        renderWithRouterAndStore(
            <Routes>
                <Route element={<MainLayout />}>
                    <Route path="/" element={<TestChild />} />
                </Route>
            </Routes>,
            store
        );

        // Check for Header and Footer existence
        expect(document.querySelector('header.sticky')).toBeInTheDocument();
        expect(document.querySelector('footer.bg-slate-900')).toBeInTheDocument();
    });

    it('renders the Outlet for child routes', () => {
        const store = createTestStore({
            auth: {
                isAuthenticated: false,
                user: null,
                loading: false,
                error: null,
            },
        });

        renderWithRouterAndStore(
            <Routes>
                <Route element={<MainLayout />}>
                    <Route path="/" element={<TestChild />} />
                </Route>
            </Routes>,
            store
        );

        expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('renders navigation links in Header', () => {
        const store = createTestStore({
            auth: {
                isAuthenticated: false,
                user: null,
                loading: false,
                error: null,
            },
        });

        renderWithRouterAndStore(
            <Routes>
                <Route element={<MainLayout />}>
                    <Route path="/" element={<TestChild />} />
                </Route>
            </Routes>,
            store
        );

        // Check for navigation links in Header (use querySelector for header)
        const header = document.querySelector('header');
        expect(header.querySelector('a[href="/"]')).toBeInTheDocument();
        expect(header.querySelector('a[href="/loans"]')).toBeInTheDocument();
    });

    it('shows auth buttons when not authenticated', () => {
        const store = createTestStore({
            auth: {
                isAuthenticated: false,
                user: null,
                loading: false,
                error: null,
            },
        });

        renderWithRouterAndStore(
            <Routes>
                <Route element={<MainLayout />}>
                    <Route path="/" element={<TestChild />} />
                </Route>
            </Routes>,
            store
        );

        // Check for Sign In and Get Started buttons - use header specifically
        const header = document.querySelector('header');
        expect(header.querySelector('a[href="/login"]')).toBeInTheDocument();
        expect(header.querySelector('a[href="/register"]')).toBeInTheDocument();
    });

    it('shows user dropdown when authenticated', () => {
        const store = createTestStore({
            auth: {
                isAuthenticated: true,
                user: { name: 'John Doe', role: 'borrower' },
                loading: false,
                error: null,
            },
        });

        renderWithRouterAndStore(
            <Routes>
                <Route element={<MainLayout />}>
                    <Route path="/" element={<TestChild />} />
                </Route>
            </Routes>,
            store
        );

        // Check for user name in header
        const header = document.querySelector('header');
        expect(header.textContent).toContain('John Doe');
    });

    it('renders main content area', () => {
        const store = createTestStore({
            auth: {
                isAuthenticated: false,
                user: null,
                loading: false,
                error: null,
            },
        });

        renderWithRouterAndStore(
            <Routes>
                <Route element={<MainLayout />}>
                    <Route path="/" element={<TestChild />} />
                </Route>
            </Routes>,
            store
        );

        // Check for main element with flex-1 class
        const mainElement = document.querySelector('main.flex-1');
        expect(mainElement).toBeInTheDocument();
    });

    it('has correct propTypes', () => {
        expect(MainLayout.propTypes).toBeDefined();
    });
});
