import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * Configure MSW for browser-based tests
 * This enables API mocking in Vitest with jsdom
 */
export const worker = setupWorker(...handlers);
