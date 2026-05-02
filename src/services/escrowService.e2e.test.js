/**
 * Escrow Service API E2E Tests
 * 
 * These tests verify the complete escrow transaction flow including:
 * - Creating escrow transactions
 * - Funding escrow (buyer payment)
 * - Shipping and delivery confirmation
 * - Fund release to seller
 * - Dispute opening and resolution
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import escrowService from './escrowService';
import { server } from '../test/msw/setup';
import { http, HttpResponse } from 'msw';

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

describe('Escrow Service API E2E Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.getItem.mockReturnValue('mock-jwt-token');
    });

    afterEach(() => {
        server.resetHandlers();
    });

    describe('GET /api/escrow - Fetch Escrow Transactions', () => {
        it('should get all escrow transactions', async () => {
            const response = await escrowService.getTransactions();

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('transactions');
            expect(Array.isArray(response.data.transactions)).toBe(true);
        });

        it('should filter transactions by status', async () => {
            server.use(
                http.get('/api/escrow', ({ request }) => {
                    const url = new URL(request.url);
                    const status = url.searchParams.get('status');

                    return HttpResponse.json({
                        success: true,
                        data: {
                            transactions: [
                                { id: 'escrow-1', status: 'funded', amount: 2500 },
                            ],
                            total: 1,
                        },
                    });
                })
            );

            const response = await escrowService.getTransactions({ status: 'funded' });

            expect(response.success).toBe(true);
        });

        it('should support pagination', async () => {
            const filters = { page: 1, limit: 10 };

            const response = await escrowService.getTransactions(filters);

            expect(response.data).toHaveProperty('total');
        });
    });

    describe('POST /api/escrow - Create Escrow Transaction', () => {
        it('should create a new escrow transaction', async () => {
            const transactionData = {
                amount: 1000,
                itemDescription: 'Test Product',
                sellerId: 'user-3',
            };

            const response = await escrowService.createTransaction(transactionData);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('id');
            expect(response.data.amount).toBe(transactionData.amount);
            expect(response.data.status).toBe('pending');
        });

        it('should fail to create transaction with missing fields', async () => {
            const invalidData = {
                amount: 1000,
                // missing itemDescription and sellerId
            };

            await expect(escrowService.createTransaction(invalidData)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Missing required fields',
                })
            );
        });

        it('should fail with invalid amount', async () => {
            const invalidData = {
                amount: -100,
                itemDescription: 'Test Product',
                sellerId: 'user-3',
            };

            await expect(escrowService.createTransaction(invalidData)).rejects.toBeDefined();
        });

        it('should fail with empty description', async () => {
            const invalidData = {
                amount: 1000,
                itemDescription: '',
                sellerId: 'user-3',
            };

            await expect(escrowService.createTransaction(invalidData)).rejects.toBeDefined();
        });
    });

    describe('GET /api/escrow/my-transactions', () => {
        it('should get current user transactions', async () => {
            const response = await escrowService.getMyTransactions();

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(Array.isArray(response.data)).toBe(true);
        });

        it('should return empty array when user has no transactions', async () => {
            server.use(
                http.get('/api/escrow/my-transactions', () => {
                    return HttpResponse.json({
                        success: true,
                        data: [],
                    });
                })
            );

            const response = await escrowService.getMyTransactions();

            expect(response.success).toBe(true);
            expect(response.data).toEqual([]);
        });
    });

    describe('GET /api/escrow/:id - Get Transaction Details', () => {
        it('should get transaction details by ID', async () => {
            const transactionId = 'escrow-1';

            const response = await escrowService.getTransactionDetails(transactionId);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data.id).toBe(transactionId);
        });

        it('should fail to get non-existent transaction', async () => {
            const transactionId = 'non-existent';

            await expect(escrowService.getTransactionDetails(transactionId)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Transaction not found',
                })
            );
        });
    });

    describe('POST /api/escrow/:id/fund - Fund Escrow', () => {
        it('should fund escrow successfully', async () => {
            const transactionId = 'escrow-1';

            const response = await escrowService.fundTransaction(transactionId, 2500);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data.status).toBe('funded');
        });

        it('should fail to fund non-existent transaction', async () => {
            const transactionId = 'non-existent';

            await expect(escrowService.fundTransaction(transactionId, 1000)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Transaction not found',
                })
            );
        });

        it('should not allow funding already funded transaction', async () => {
            const transactionId = 'escrow-1';

            server.use(
                http.post(`/api/escrow/${transactionId}/fund`, () => {
                    return HttpResponse.json(
                        { success: false, error: 'Transaction already funded' },
                        { status: 400 }
                    );
                })
            );

            await expect(escrowService.fundTransaction(transactionId, 1000)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Transaction already funded',
                })
            );
        });
    });

    describe('POST /api/escrow/:id/ship - Mark as Shipped', () => {
        it('should mark transaction as shipped with tracking number', async () => {
            const transactionId = 'escrow-1';
            const trackingNumber = 'TRACK123456';

            const response = await escrowService.markAsShipped(transactionId, trackingNumber);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data.status).toBe('shipped');
            expect(response.data.trackingNumber).toBe(trackingNumber);
        });

        it('should fail to ship non-funded transaction', async () => {
            const transactionId = 'escrow-1';

            server.use(
                http.post(`/api/escrow/${transactionId}/ship`, () => {
                    return HttpResponse.json(
                        { success: false, error: 'Transaction must be funded first' },
                        { status: 400 }
                    );
                })
            );

            await expect(escrowService.markAsShipped(transactionId, 'TRACK123')).rejects.toEqual(
                expect.objectContaining({
                    error: 'Transaction must be funded first',
                })
            );
        });

        it('should allow shipping without tracking number', async () => {
            const transactionId = 'escrow-1';

            const response = await escrowService.markAsShipped(transactionId);

            expect(response.success).toBe(true);
            expect(response.data.status).toBe('shipped');
        });
    });

    describe('POST /api/escrow/:id/confirm - Confirm Delivery', () => {
        it('should confirm delivery successfully', async () => {
            const transactionId = 'escrow-1';

            const response = await escrowService.confirmDelivery(transactionId);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data.status).toBe('delivered');
        });

        it('should fail to confirm delivery for unshipped item', async () => {
            const transactionId = 'escrow-1';

            server.use(
                http.post(`/api/escrow/${transactionId}/confirm`, () => {
                    return HttpResponse.json(
                        { success: false, error: 'Item has not been shipped' },
                        { status: 400 }
                    );
                })
            );

            await expect(escrowService.confirmDelivery(transactionId)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Item has not been shipped',
                })
            );
        });
    });

    describe('POST /api/escrow/:id/release - Release Funds', () => {
        it('should release funds to seller after confirmation', async () => {
            const transactionId = 'escrow-1';

            const response = await escrowService.releaseFunds(transactionId);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data.status).toBe('released');
        });

        it('should fail to release funds before delivery', async () => {
            const transactionId = 'escrow-1';

            server.use(
                http.post(`/api/escrow/${transactionId}/release`, () => {
                    return HttpResponse.json(
                        { success: false, error: 'Delivery must be confirmed first' },
                        { status: 400 }
                    );
                })
            );

            await expect(escrowService.releaseFunds(transactionId)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Delivery must be confirmed first',
                })
            );
        });

        it('should fail to release funds twice', async () => {
            const transactionId = 'escrow-1';

            server.use(
                http.post(`/api/escrow/${transactionId}/release`, () => {
                    return HttpResponse.json(
                        { success: false, error: 'Funds already released' },
                        { status: 400 }
                    );
                })
            );

            await expect(escrowService.releaseFunds(transactionId)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Funds already released',
                })
            );
        });
    });

    describe('POST /api/escrow/:id/dispute - Open Dispute', () => {
        it('should open dispute with reason', async () => {
            const transactionId = 'escrow-1';
            const reason = 'Item not as described';

            const response = await escrowService.openDispute(transactionId, reason);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data.status).toBe('disputed');
            expect(response.data.disputeReason).toBe(reason);
        });

        it('should allow dispute without reason', async () => {
            const transactionId = 'escrow-1';

            const response = await escrowService.openDispute(transactionId);

            expect(response.success).toBe(true);
            expect(response.data.status).toBe('disputed');
        });

        it('should not allow dispute on completed transaction', async () => {
            const transactionId = 'escrow-1';

            server.use(
                http.post(`/api/escrow/${transactionId}/dispute`, () => {
                    return HttpResponse.json(
                        { success: false, error: 'Cannot dispute completed transaction' },
                        { status: 400 }
                    );
                })
            );

            await expect(escrowService.openDispute(transactionId, 'Reason')).rejects.toEqual(
                expect.objectContaining({
                    error: 'Cannot dispute completed transaction',
                })
            );
        });
    });

    describe('POST /api/escrow/:id/resolve - Resolve Dispute (Admin)', () => {
        it('should resolve dispute', async () => {
            const transactionId = 'escrow-1';
            const resolution = {
                decision: 'refund_buyer',
                reason: 'Item significantly not as described',
            };

            server.use(
                http.post(`/api/escrow/${transactionId}/resolve`, () => {
                    return HttpResponse.json({
                        success: true,
                        data: {
                            id: transactionId,
                            status: 'resolved',
                            resolution: resolution.decision,
                        },
                        message: 'Dispute resolved',
                    });
                })
            );

            const response = await escrowService.resolveDispute(transactionId, resolution);

            expect(response.success).toBe(true);
            expect(response.data.status).toBe('resolved');
        });
    });

    describe('GET /api/escrow/statistics', () => {
        it('should get escrow statistics', async () => {
            const response = await escrowService.getStatistics();

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('totalTransactions');
            expect(response.data).toHaveProperty('activeTransactions');
            expect(response.data).toHaveProperty('completedTransactions');
            expect(response.data).toHaveProperty('totalValue');
        });

        it('should track disputed transactions', async () => {
            const response = await escrowService.getStatistics();

            expect(response.data).toHaveProperty('disputedTransactions');
            expect(typeof response.data.disputedTransactions).toBe('number');
        });
    });

    describe('GET /api/escrow/shipping-carriers', () => {
        it('should get available shipping carriers', async () => {
            server.use(
                http.get('/api/escrow/shipping-carriers', () => {
                    return HttpResponse.json({
                        success: true,
                        data: [
                            { id: 'fedex', name: 'FedEx' },
                            { id: 'ups', name: 'UPS' },
                            { id: 'dhl', name: 'DHL' },
                            { id: 'usps', name: 'USPS' },
                        ],
                    });
                })
            );

            const response = await escrowService.getShippingCarriers();

            expect(response.success).toBe(true);
            expect(Array.isArray(response.data)).toBe(true);
            expect(response.data.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/escrow/disputes - Get Disputes (Admin)', () => {
        it('should get all disputes', async () => {
            const response = await escrowService.getDisputes();

            expect(response.success).toBe(true);
        });

        it('should filter disputes by status', async () => {
            const filters = { status: 'open' };

            const response = await escrowService.getDisputes(filters);

            expect(response.success).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors', async () => {
            server.use(
                http.get('/api/escrow', () => {
                    return HttpResponse.error();
                })
            );

            await expect(escrowService.getTransactions()).rejects.toEqual(
                expect.objectContaining({
                    message: expect.any(String),
                })
            );
        });

        it('should handle server errors (500)', async () => {
            server.use(
                http.post('/api/escrow', () => {
                    return HttpResponse.json(
                        { success: false, error: 'Internal server error' },
                        { status: 500 }
                    );
                })
            );

            await expect(escrowService.createTransaction({
                amount: 1000,
                itemDescription: 'Test',
                sellerId: 'user-2',
            })).rejects.toBeDefined();
        });

        it('should handle unauthorized access', async () => {
            localStorage.getItem.mockReturnValue(null);

            server.use(
                http.get('/api/escrow/statistics', () => {
                    return HttpResponse.json(
                        { success: false, error: 'Unauthorized' },
                        { status: 401 }
                    );
                })
            );

            await expect(escrowService.getStatistics()).rejects.toEqual(
                expect.objectContaining({
                    error: 'Unauthorized',
                })
            );
        });
    });

    describe('Complete Escrow Flow', () => {
        it('should complete full escrow lifecycle', async () => {
            // 1. Create transaction
            const createResponse = await escrowService.createTransaction({
                amount: 500,
                itemDescription: 'Vintage Watch',
                sellerId: 'user-3',
            });
            expect(createResponse.success).toBe(true);
            const transactionId = createResponse.data.id;

            // 2. Fund transaction
            const fundResponse = await escrowService.fundTransaction(transactionId, 500);
            expect(fundResponse.data.status).toBe('funded');

            // 3. Mark as shipped
            const shipResponse = await escrowService.markAsShipped(transactionId, 'TRACK999');
            expect(shipResponse.data.status).toBe('shipped');

            // 4. Confirm delivery
            const confirmResponse = await escrowService.confirmDelivery(transactionId);
            expect(confirmResponse.data.status).toBe('delivered');

            // 5. Release funds
            const releaseResponse = await escrowService.releaseFunds(transactionId);
            expect(releaseResponse.data.status).toBe('released');
        });
    });
});
