import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Configure MSW for Node.js/E2E tests
 * This enables API mocking in Vitest tests
 */
export const server = setupServer(...handlers);

/**
 * Start the MSW server before all tests
 */
beforeAll(() => {
    server.listen();
});

/**
 * Reset handlers after each test to avoid state pollution
 */
afterEach(() => {
    server.resetHandlers();
});

/**
 * Clean up after all tests are done
 */
afterAll(() => {
    server.close();
});

/**
 * Helper to simulate network delay
 * @param {number} ms - Delay in milliseconds
 */
export const delay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper to create a mock auth token
 */
export const createMockToken = () => `mock-jwt-token-${Date.now()}`;

/**
 * Helper to set auth token in localStorage
 */
export const setAuthToken = (token) => {
    localStorage.setItem('lenda_token', token);
};

/**
 * Helper to clear auth token from localStorage
 */
export const clearAuthToken = () => {
    localStorage.removeItem('lenda_token');
    localStorage.removeItem('lenda_user');
};
