/**
 * Marketplace Service API E2E Tests
 * 
 * These tests verify the complete marketplace functionality including:
 * - Fetching recovery marketplace items
 * - Placing bids on items
 * - Buying items directly
 * - Viewing bid history
 * - Managing purchases
 * - Admin operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import marketplaceService from './marketplaceService';
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

describe('Marketplace Service API E2E Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.getItem.mockReturnValue('mock-jwt-token');
    });

    afterEach(() => {
        server.resetHandlers();
    });

    describe('GET /api/marketplace - Fetch Marketplace Items', () => {
        it('should get all marketplace items', async () => {
            const response = await marketplaceService.getRecoveryItems();

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('items');
            expect(Array.isArray(response.data.items)).toBe(true);
        });

        it('should filter items by category', async () => {
            const filters = { category: 'vehicle' };

            const response = await marketplaceService.getRecoveryItems(filters);

            expect(response.success).toBe(true);
            expect(response.data.items.every(item => item.category === 'vehicle')).toBe(true);
        });

        it('should filter items by status', async () => {
            const filters = { status: 'active' };

            const response = await marketplaceService.getRecoveryItems(filters);

            expect(response.success).toBe(true);
            expect(response.data.items.every(item => item.status === 'active')).toBe(true);
        });

        it('should return empty array when no items match filter', async () => {
            const filters = { category: 'non-existent' };

            const response = await marketplaceService.getRecoveryItems(filters);

            expect(response.success).toBe(true);
            expect(response.data.items).toEqual([]);
        });

        it('should support combined filters', async () => {
            const filters = { category: 'vehicle', status: 'active' };

            const response = await marketplaceService.getRecoveryItems(filters);

            expect(response.success).toBe(true);
        });
    });

    describe('GET /api/marketplace/featured - Get Featured Items', () => {
        it('should get featured items', async () => {
            const response = await marketplaceService.getFeaturedItems();

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(Array.isArray(response.data)).toBe(true);
        });

        it('should only return active items', async () => {
            const response = await marketplaceService.getFeaturedItems();

            expect(response.data.every(item => item.status === 'active')).toBe(true);
        });

        it('should limit featured items to 6', async () => {
            const response = await marketplaceService.getFeaturedItems();

            expect(response.data.length).toBeLessThanOrEqual(6);
        });
    });

    describe('GET /api/marketplace/:id - Get Item Details', () => {
        it('should get item details by ID', async () => {
            const itemId = 'item-1';

            const response = await marketplaceService.getItemDetails(itemId);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data.id).toBe(itemId);
        });

        it('should fail to get non-existent item', async () => {
            const itemId = 'non-existent-item';

            await expect(marketplaceService.getItemDetails(itemId)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Item not found',
                })
            );
        });

        it('should include bid history in response', async () => {
            const itemId = 'item-1';

            const response = await marketplaceService.getItemDetails(itemId);

            expect(response.data).toHaveProperty('bids');
        });
    });

    describe('POST /api/marketplace/:id/bid - Place Bid', () => {
        it('should place bid successfully', async () => {
            const itemId = 'item-1';
            const amount = 18000;

            const response = await marketplaceService.placeBid(itemId, amount);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data.currentPrice).toBe(amount);
        });

        it('should fail to bid below current price', async () => {
            const itemId = 'item-1';
            const amount = 10000; // Below current price of 17500

            await expect(marketplaceService.placeBid(itemId, amount)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Bid must be higher than current price',
                })
            );
        });

        it('should fail to bid on sold item', async () => {
            const itemId = 'item-1';

            server.use(
                http.post(`/api/marketplace/${itemId}/bid`, () => {
                    return HttpResponse.json(
                        { success: false, error: 'Item is no longer available' },
                        { status: 400 }
                    );
                })
            );

            await expect(marketplaceService.placeBid(itemId, 20000)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Item is no longer available',
                })
            );
        });

        it('should fail to bid on non-existent item', async () => {
            const itemId = 'non-existent-item';

            await expect(marketplaceService.placeBid(itemId, 10000)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Item not found',
                })
            );
        });

        it('should accept bid equal to starting price for new item', async () => {
            const itemId = 'item-new';
            const startingPrice = 15000;

            server.use(
                http.post(`/api/marketplace/${itemId}/bid`, ({ request }) => {
                    return HttpResponse.json({
                        success: true,
                        data: {
                            id: itemId,
                            currentPrice: startingPrice,
                            bids: [{ bidderId: 'user-1', amount: startingPrice }],
                        },
                    });
                })
            );

            const response = await marketplaceService.placeBid(itemId, startingPrice);

            expect(response.success).toBe(true);
        });
    });

    describe('POST /api/marketplace/:id/buy - Buy Now', () => {
        it('should purchase item at buy now price', async () => {
            const itemId = 'item-1';

            const response = await marketplaceService.buyNow(itemId);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data.status).toBe('sold');
            expect(response.data.buyerId).toBe('user-1');
        });

        it('should fail to buy already sold item', async () => {
            const itemId = 'item-1';

            server.use(
                http.post(`/api/marketplace/${itemId}/buy`, () => {
                    return HttpResponse.json(
                        { success: false, error: 'Item already sold' },
                        { status: 400 }
                    );
                })
            );

            await expect(marketplaceService.buyNow(itemId)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Item already sold',
                })
            );
        });

        it('should fail to buy non-existent item', async () => {
            const itemId = 'non-existent-item';

            await expect(marketplaceService.buyNow(itemId)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Item not found',
                })
            );
        });
    });

    describe('GET /api/marketplace/my-bids - Get My Bids', () => {
        it('should get items user has bid on', async () => {
            const response = await marketplaceService.getMyBids();

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(Array.isArray(response.data)).toBe(true);
        });

        it('should return empty array when user has no bids', async () => {
            server.use(
                http.get('/api/marketplace/my-bids', () => {
                    return HttpResponse.json({
                        success: true,
                        data: [],
                    });
                })
            );

            const response = await marketplaceService.getMyBids();

            expect(response.success).toBe(true);
            expect(response.data).toEqual([]);
        });
    });

    describe('GET /api/marketplace/my-purchases - Get My Purchases', () => {
        it('should get items user has purchased', async () => {
            const response = await marketplaceService.getMyPurchases();

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(Array.isArray(response.data)).toBe(true);
        });

        it('should return only sold items', async () => {
            const response = await marketplaceService.getMyPurchases();

            if (response.data.length > 0) {
                expect(response.data.every(item => item.status === 'sold')).toBe(true);
            }
        });

        it('should return empty array when user has no purchases', async () => {
            server.use(
                http.get('/api/marketplace/my-purchases', () => {
                    return HttpResponse.json({
                        success: true,
                        data: [],
                    });
                })
            );

            const response = await marketplaceService.getMyPurchases();

            expect(response.success).toBe(true);
            expect(response.data).toEqual([]);
        });
    });

    describe('GET /api/marketplace/:id/history - Get Bid History', () => {
        it('should get bid history for item', async () => {
            const itemId = 'item-1';

            const response = await marketplaceService.getItemHistory(itemId);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(Array.isArray(response.data)).toBe(true);
        });

        it('should return empty history for new item', async () => {
            const itemId = 'item-new';

            server.use(
                http.get(`/api/marketplace/${itemId}/history`, () => {
                    return HttpResponse.json({
                        success: true,
                        data: [],
                    });
                })
            );

            const response = await marketplaceService.getItemHistory(itemId);

            expect(response.success).toBe(true);
            expect(response.data).toEqual([]);
        });

        it('should fail to get history for non-existent item', async () => {
            const itemId = 'non-existent-item';

            await expect(marketplaceService.getItemHistory(itemId)).rejects.toEqual(
                expect.objectContaining({
                    error: 'Item not found',
                })
            );
        });

        it('should return bids in chronological order', async () => {
            const itemId = 'item-1';

            const response = await marketplaceService.getItemHistory(itemId);

            if (response.data.length > 1) {
                // Check that timestamps are in order
                for (let i = 1; i < response.data.length; i++) {
                    const prevTime = new Date(response.data[i - 1].timestamp);
                    const currTime = new Date(response.data[i].timestamp);
                    expect(currTime.getTime()).toBeGreaterThanOrEqual(prevTime.getTime());
                }
            }
        });
    });

    describe('GET /api/marketplace/:id/auction-status - Get Auction Status', () => {
        it('should get auction status', async () => {
            const itemId = 'item-1';

            server.use(
                http.get(`/api/marketplace/${itemId}/auction-status`, () => {
                    return HttpResponse.json({
                        success: true,
                        data: {
                            status: 'active',
                            currentPrice: 17500,
                            highestBidder: 'user-1',
                            endDate: '2024-02-15T00:00:00Z',
                            timeRemaining: '5 days',
                        },
                    });
                })
            );

            const response = await marketplaceService.getAuctionStatus(itemId);

            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('status');
            expect(response.data).toHaveProperty('currentPrice');
        });

        it('should show ended status for expired auction', async () => {
            const itemId = 'item-1';

            server.use(
                http.get(`/api/marketplace/${itemId}/auction-status`, () => {
                    return HttpResponse.json({
                        success: true,
                        data: {
                            status: 'ended',
                            currentPrice: 20000,
                            highestBidder: 'user-2',
                            endDate: '2024-01-01T00:00:00Z',
                            timeRemaining: 'Auction ended',
                        },
                    });
                })
            );

            const response = await marketplaceService.getAuctionStatus(itemId);

            expect(response.data.status).toBe('ended');
        });
    });

    describe('GET /api/marketplace/statistics', () => {
        it('should get marketplace statistics', async () => {
            const response = await marketplaceService.getStatistics();

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('totalListings');
            expect(response.data).toHaveProperty('activeListings');
            expect(response.data).toHaveProperty('soldListings');
            expect(response.data).toHaveProperty('totalValue');
        });

        it('should calculate average price', async () => {
            const response = await marketplaceService.getStatistics();

            expect(response.data).toHaveProperty('averagePrice');
            expect(typeof response.data.averagePrice).toBe('number');
        });

        it('should return valid numeric values', async () => {
            const response = await marketplaceService.getStatistics();

            expect(response.data.totalListings).toBeGreaterThanOrEqual(0);
            expect(response.data.totalValue).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Admin Operations', () => {
        describe('GET /api/marketplace/admin/recovery-listings', () => {
            it('should get all recovery listings', async () => {
                const response = await marketplaceService.getRecoveryListings();

                expect(response.success).toBe(true);
            });
        });

        describe('POST /api/marketplace/admin/recovery-listings/:id/approve', () => {
            it('should approve recovery listing', async () => {
                const listingId = 'listing-1';

                server.use(
                    http.post(`/api/marketplace/admin/recovery-listings/${listingId}/approve`, () => {
                        return HttpResponse.json({
                            success: true,
                            data: { id: listingId, status: 'approved' },
                            message: 'Listing approved',
                        });
                    })
                );

                const response = await marketplaceService.approveRecoveryListing(listingId);

                expect(response.success).toBe(true);
            });
        });

        describe('POST /api/marketplace/admin/recovery-listings/:id/process-sale', () => {
            it('should process recovery sale', async () => {
                const listingId = 'listing-1';

                server.use(
                    http.post(`/api/marketplace/admin/recovery-listings/${listingId}/process-sale`, () => {
                        return HttpResponse.json({
                            success: true,
                            data: { id: listingId, status: 'sold' },
                            message: 'Sale processed',
                        });
                    })
                );

                const response = await marketplaceService.processRecoverySale(listingId);

                expect(response.success).toBe(true);
            });
        });

        describe('POST /api/marketplace/admin/recovery-listings/:id/cancel', () => {
            it('should cancel recovery listing', async () => {
                const listingId = 'listing-1';

                server.use(
                    http.post(`/api/marketplace/admin/recovery-listings/${listingId}/cancel`, () => {
                        return HttpResponse.json({
                            success: true,
                            data: { id: listingId, status: 'cancelled' },
                            message: 'Listing cancelled',
                        });
                    })
                );

                const response = await marketplaceService.cancelRecoveryListing(listingId);

                expect(response.success).toBe(true);
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors', async () => {
            server.use(
                http.get('/api/marketplace', () => {
                    return HttpResponse.error();
                })
            );

            await expect(marketplaceService.getRecoveryItems()).rejects.toEqual(
                expect.objectContaining({
                    message: expect.any(String),
                })
            );
        });

        it('should handle server errors (500)', async () => {
            server.use(
                http.post('/api/marketplace/:id/bid', () => {
                    return HttpResponse.json(
                        { success: false, error: 'Internal server error' },
                        { status: 500 }
                    );
                })
            );

            await expect(marketplaceService.placeBid('item-1', 20000)).rejects.toBeDefined();
        });

        it('should handle unauthorized access', async () => {
            localStorage.getItem.mockReturnValue(null);

            server.use(
                http.get('/api/marketplace/statistics', () => {
                    return HttpResponse.json(
                        { success: false, error: 'Unauthorized' },
                        { status: 401 }
                    );
                })
            );

            await expect(marketplaceService.getStatistics()).rejects.toEqual(
                expect.objectContaining({
                    error: 'Unauthorized',
                })
            );
        });

        it('should handle bad request errors (400)', async () => {
            server.use(
                http.post('/api/marketplace/:id/buy', () => {
                    return HttpResponse.json(
                        { success: false, error: 'Invalid request' },
                        { status: 400 }
                    );
                })
            );

            await expect(marketplaceService.buyNow('item-1')).rejects.toEqual(
                expect.objectContaining({
                    error: 'Invalid request',
                })
            );
        });
    });

    describe('Complete Marketplace Flow', () => {
        it('should complete full bidding lifecycle', async () => {
            const itemId = 'item-1';

            // 1. Get item details
            const detailsResponse = await marketplaceService.getItemDetails(itemId);
            expect(detailsResponse.success).toBe(true);
            const startingPrice = detailsResponse.data.currentPrice;

            // 2. Place a bid
            const bidAmount = startingPrice + 1000;
            const bidResponse = await marketplaceService.placeBid(itemId, bidAmount);
            expect(bidResponse.data.currentPrice).toBe(bidAmount);

            // 3. Get bid history
            const historyResponse = await marketplaceService.getItemHistory(itemId);
            expect(historyResponse.data.length).toBeGreaterThan(0);

            // 4. Get auction status
            const statusResponse = await marketplaceService.getAuctionStatus(itemId);
            expect(statusResponse.success).toBe(true);
        });
    });
});
