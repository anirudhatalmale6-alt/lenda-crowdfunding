import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// IMPORTANT: Set environment variables at the very top before anything else
// This must happen before any module imports
process.env.VITE_API_URL = 'http://localhost:3000';

// Now we can safely import the MSW server
import { server } from './msw/setup';

/**
 * Test Setup Configuration
 * This file is loaded before all Vitest tests
 */

// Set test environment URL before importing services
beforeAll(() => {
    // Set the VITE_API_URL for tests (both import.meta.env and process.env)
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
    process.env.VITE_API_URL = 'http://localhost:3000';
});

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock window.location
delete window.location;
window.location = {
    href: 'http://localhost:3000/',
    origin: 'http://localhost:3000',
    pathname: '/',
    assign: vi.fn(),
    replace: vi.fn(),
    search: '',
    hash: '',
};

// Mock window.scrollTo
window.scrollTo = vi.fn();

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
    takeRecords: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock alert
window.alert = vi.fn();

// Mock confirm
window.confirm = vi.fn();

// Mock console errors in tests (optional - comment out if you want to see all errors)
const originalError = console.error;
beforeAll(() => {
    console.error = (...args) => {
        if (
            typeof args[0] === 'string' &&
            args[0].includes('Warning: ReactDOM.render')
        ) {
            return;
        }
        originalError.call(console, ...args);
    };
});

afterAll(() => {
    console.error = originalError;
});

// Cleanup after each test
afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
});

// Start MSW server before all tests
beforeAll(() => {
    server.listen();
});

// Reset handlers after each test to avoid state pollution
afterEach(() => {
    server.resetHandlers();
});

// Clean up after all tests are done
afterAll(() => {
    server.close();
});
