/**
 * Marketplace Service Unit Tests
 * 
 * Tests for marketplaceService.js API functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import marketplaceService from './marketplaceService';
import { createApiClient } from '../utils/api/client';

// Mock the API client
vi.mock('../utils/api/client', () => ({
    createApiClient: vi.fn(() => ({
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    })),
}));

describe('marketplaceService', () => {
    let mockApi;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApi = createApiClient();
    });

    describe('getRecoveryItems', () => {
        it('should fetch recovery items', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, items: [] }
            });

            const result = await marketplaceService.getRecoveryItems();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/recovery/items');
        });

        it('should fetch items with filters', async () => {
            const filters = { status: 'active', type: 'vehicle' };
            mockApi.get.mockResolvedValue({
                data: { success: true, items: [] }
            });

            await marketplaceService.getRecoveryItems(filters);

            expect(mockApi.get).toHaveBeenCalledWith('/recovery/items', { params: filters });
        });
    });

    describe('getRecoveryItem', () => {
        it('should fetch a single recovery item', async () => {
            const itemId = 1;
            mockApi.get.mockResolvedValue({
                data: { success: true, item: { id: itemId } }
            });

            const result = await marketplaceService.getRecoveryItem(itemId);

            expect(result.success).toBe(true);
            expect(result.item.id).toBe(itemId);
            expect(mockApi.get).toHaveBeenCalledWith(`/recovery/items/${itemId}`);
        });

        it('should handle non-existent item', async () => {
            mockApi.get.mockRejectedValue({
                response: { data: { error: 'Item not found' } }
            });

            await expect(marketplaceService.getRecoveryItem(999)).rejects.toEqual(
                expect.objectContaining({ response: expect.any(Object) })
            );
        });
    });

    describe('placeBid', () => {
        it('should place a bid on an item', async () => {
            const itemId = 1;
            const bidData = { amount: 5000 };

            mockApi.post.mockResolvedValue({
                data: { success: true, bidId: 1 }
            });

            const result = await marketplaceService.placeBid(itemId, bidData);

            expect(result.success).toBe(true);
            expect(result.bidId).toBe(1);
            expect(mockApi.post).toHaveBeenCalledWith(`/recovery/items/${itemId}/bid`, bidData);
        });

        it('should handle bid errors', async () => {
            mockApi.post.mockRejectedValue({
                response: { data: { error: 'Bid too low' } }
            });

            await expect(marketplaceService.placeBid(1, { amount: 100 })).rejects.toEqual(
                expect.objectContaining({ response: expect.any(Object) })
            );
        });
    });

    describe('getBids', () => {
        it('should fetch bids for an item', async () => {
            const itemId = 1;
            mockApi.get.mockResolvedValue({
                data: { success: true, bids: [] }
            });

            const result = await marketplaceService.getBids(itemId);

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith(`/recovery/items/${itemId}/bids`);
        });
    });

    describe('getMyBids', () => {
        it('should fetch current user bids', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, bids: [] }
            });

            const result = await marketplaceService.getMyBids();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/recovery/my-bids');
        });
    });

    describe('purchaseItem', () => {
        it('should purchase an item at buy now price', async () => {
            const itemId = 1;
            const purchaseData = { paymentMethod: 'wallet' };

            mockApi.post.mockResolvedValue({
                data: { success: true, purchaseId: 1 }
            });

            const result = await marketplaceService.purchaseItem(itemId, purchaseData);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/recovery/items/${itemId}/buy`, purchaseData);
        });
    });

    // Admin functions
    describe('getAllItems (Admin)', () => {
        it('should fetch all items', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, items: [] }
            });

            const result = await marketplaceService.getAllItems();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/admin/recovery/items');
        });
    });

    describe('createRecoveryItem (Admin)', () => {
        it('should create a recovery item', async () => {
            const itemData = {
                title: 'Test Item',
                type: 'vehicle',
                marketValue: 10000,
                startingPrice: 5000
            };

            mockApi.post.mockResolvedValue({
                data: { success: true, itemId: 1 }
            });

            const result = await marketplaceService.createRecoveryItem(itemData);

            expect(result.success).toBe(true);
            expect(result.itemId).toBe(1);
            expect(mockApi.post).toHaveBeenCalledWith('/admin/recovery/items', itemData);
        });
    });

    describe('updateRecoveryItem (Admin)', () => {
        it('should update a recovery item', async () => {
            const itemId = 1;
            const updateData = { status: 'sold', currentPrice: 8000 };

            mockApi.put.mockResolvedValue({
                data: { success: true, message: 'Item updated' }
            });

            const result = await marketplaceService.updateRecoveryItem(itemId, updateData);

            expect(result.success).toBe(true);
            expect(mockApi.put).toHaveBeenCalledWith(`/admin/recovery/items/${itemId}`, updateData);
        });
    });

    describe('deleteRecoveryItem (Admin)', () => {
        it('should delete a recovery item', async () => {
            const itemId = 1;

            mockApi.delete.mockResolvedValue({
                data: { success: true, message: 'Item deleted' }
            });

            const result = await marketplaceService.deleteRecoveryItem(itemId);

            expect(result.success).toBe(true);
            expect(mockApi.delete).toHaveBeenCalledWith(`/admin/recovery/items/${itemId}`);
        });
    });

    describe('approveBid (Admin)', () => {
        it('should approve a bid', async () => {
            const bidId = 1;

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Bid approved' }
            });

            const result = await marketplaceService.approveBid(bidId);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/admin/recovery/bids/${bidId}/approve`);
        });
    });

    describe('rejectBid (Admin)', () => {
        it('should reject a bid', async () => {
            const bidId = 1;
            const reason = 'Below minimum bid';

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Bid rejected' }
            });

            const result = await marketplaceService.rejectBid(bidId, reason);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/admin/recovery/bids/${bidId}/reject`, { reason });
        });
    });

    describe('getSalesReport (Admin)', () => {
        it('should fetch sales report', async () => {
            const params = { startDate: '2024-01-01', endDate: '2024-12-31' };
            mockApi.get.mockResolvedValue({
                data: { success: true, report: {} }
            });

            const result = await marketplaceService.getSalesReport(params);

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/admin/recovery/sales-report', { params });
        });
    });

    describe('getRevenueAnalytics (Admin)', () => {
        it('should fetch revenue analytics', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, analytics: {} }
            });

            const result = await marketplaceService.getRevenueAnalytics();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/admin/recovery/analytics');
        });
    });
});
