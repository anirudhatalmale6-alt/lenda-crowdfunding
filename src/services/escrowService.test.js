/**
 * Escrow Service Unit Tests
 * 
 * Tests for escrowService.js API functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import escrowService from './escrowService';
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

describe('escrowService', () => {
    let mockApi;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApi = createApiClient();
    });

    describe('createTransaction', () => {
        it('should create an escrow transaction', async () => {
            const transactionData = {
                seller: '0x123',
                amount: 1000,
                shippingFee: 50,
                description: 'Test transaction'
            };

            mockApi.post.mockResolvedValue({
                data: { success: true, transactionId: 1 }
            });

            const result = await escrowService.createTransaction(transactionData);

            expect(result.success).toBe(true);
            expect(result.transactionId).toBe(1);
            expect(mockApi.post).toHaveBeenCalledWith('/', transactionData);
        });

        it('should handle creation errors', async () => {
            mockApi.post.mockRejectedValue({
                response: { data: { error: 'Invalid seller address' } }
            });

            await expect(escrowService.createTransaction({})).rejects.toEqual(
                expect.objectContaining({ response: expect.any(Object) })
            );
        });
    });

    describe('getTransactions', () => {
        it('should fetch transactions for current user', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, transactions: [] }
            });

            const result = await escrowService.getTransactions();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/');
        });

        it('should fetch transactions with filters', async () => {
            const filters = { status: 'active' };
            mockApi.get.mockResolvedValue({
                data: { success: true, transactions: [] }
            });

            await escrowService.getTransactions(filters);

            expect(mockApi.get).toHaveBeenCalledWith('/', { params: filters });
        });
    });

    describe('getTransaction', () => {
        it('should fetch transaction by ID', async () => {
            const transactionId = 1;
            mockApi.get.mockResolvedValue({
                data: { success: true, transaction: { id: transactionId } }
            });

            const result = await escrowService.getTransaction(transactionId);

            expect(result.success).toBe(true);
            expect(result.transaction.id).toBe(transactionId);
            expect(mockApi.get).toHaveBeenCalledWith(`/${transactionId}`);
        });

        it('should handle non-existent transaction', async () => {
            mockApi.get.mockRejectedValue({
                response: { data: { error: 'Transaction not found' } }
            });

            await expect(escrowService.getTransaction(999)).rejects.toEqual(
                expect.objectContaining({ response: expect.any(Object) })
            );
        });
    });

    describe('fundTransaction', () => {
        it('should fund an escrow transaction', async () => {
            const transactionId = 1;
            const amount = 1050;

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Transaction funded' }
            });

            const result = await escrowService.fundTransaction(transactionId, amount);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/${transactionId}/fund`, { amount });
        });

        it('should handle insufficient payment', async () => {
            mockApi.post.mockRejectedValue({
                response: { data: { error: 'Insufficient payment' } }
            });

            await expect(escrowService.fundTransaction(1, 100)).rejects.toEqual(
                expect.objectContaining({ response: expect.any(Object) })
            );
        });
    });

    describe('markAsShipped', () => {
        it('should mark transaction as shipped', async () => {
            const transactionId = 1;
            const trackingData = {
                trackingNumber: 'TRACK123',
                carrier: 'DHL'
            };

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Marked as shipped' }
            });

            const result = await escrowService.markAsShipped(transactionId, trackingData);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/${transactionId}/ship`, trackingData);
        });
    });

    describe('confirmDelivery', () => {
        it('should confirm delivery', async () => {
            const transactionId = 1;

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Delivery confirmed' }
            });

            const result = await escrowService.confirmDelivery(transactionId);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/${transactionId}/deliver`);
        });
    });

    describe('releaseFunds', () => {
        it('should release funds to seller', async () => {
            const transactionId = 1;

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Funds released' }
            });

            const result = await escrowService.releaseFunds(transactionId);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/${transactionId}/release`);
        });

        it('should handle release errors', async () => {
            mockApi.post.mockRejectedValue({
                response: { data: { error: 'Cannot release in current status' } }
            });

            await expect(escrowService.releaseFunds(1)).rejects.toEqual(
                expect.objectContaining({ response: expect.any(Object) })
            );
        });
    });

    describe('openDispute', () => {
        it('should open a dispute', async () => {
            const transactionId = 1;
            const reason = 'Item not as described';

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Dispute opened' }
            });

            const result = await escrowService.openDispute(transactionId, reason);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/${transactionId}/dispute`, { reason });
        });
    });

    describe('resolveDispute', () => {
        it('should resolve dispute with refund', async () => {
            const transactionId = 1;
            const resolution = { resolution: 'Refund buyer', refundBuyer: true };

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Dispute resolved' }
            });

            const result = await escrowService.resolveDispute(transactionId, resolution);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/${transactionId}/resolve`, resolution);
        });

        it('should resolve dispute in favor of seller', async () => {
            const transactionId = 1;
            const resolution = { resolution: 'Release to seller', refundBuyer: false };

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Dispute resolved' }
            });

            const result = await escrowService.resolveDispute(transactionId, resolution);

            expect(result.success).toBe(true);
        });
    });

    describe('cancelTransaction', () => {
        it('should cancel a transaction', async () => {
            const transactionId = 1;

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Transaction cancelled' }
            });

            const result = await escrowService.cancelTransaction(transactionId);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/${transactionId}/cancel`);
        });

        it('should handle cancellation errors', async () => {
            mockApi.post.mockRejectedValue({
                response: { data: { error: 'Cannot cancel funded transaction' } }
            });

            await expect(escrowService.cancelTransaction(1)).rejects.toEqual(
                expect.objectContaining({ response: expect.any(Object) })
            );
        });
    });

    describe('getBuyerTransactions', () => {
        it('should fetch buyer transactions', async () => {
            const buyerAddress = '0x123';
            mockApi.get.mockResolvedValue({
                data: { success: true, transactions: [] }
            });

            await escrowService.getBuyerTransactions(buyerAddress);

            expect(mockApi.get).toHaveBeenCalledWith('/buyer/0x123');
        });
    });

    describe('getSellerTransactions', () => {
        it('should fetch seller transactions', async () => {
            const sellerAddress = '0x456';
            mockApi.get.mockResolvedValue({
                data: { success: true, transactions: [] }
            });

            await escrowService.getSellerTransactions(sellerAddress);

            expect(mockApi.get).toHaveBeenCalledWith('/seller/0x456');
        });
    });

    // Admin functions
    describe('getAllTransactions (Admin)', () => {
        it('should fetch all transactions', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, transactions: [] }
            });

            const result = await escrowService.getAllTransactions();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/admin/all');
        });

        it('should filter by status', async () => {
            const filters = { status: 'disputed' };
            mockApi.get.mockResolvedValue({
                data: { success: true, transactions: [] }
            });

            await escrowService.getAllTransactions(filters);

            expect(mockApi.get).toHaveBeenCalledWith('/admin/all', { params: filters });
        });
    });

    describe('getDisputedTransactions (Admin)', () => {
        it('should fetch disputed transactions', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, transactions: [] }
            });

            const result = await escrowService.getDisputedTransactions();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/admin/disputed');
        });
    });

    describe('emergencyCancel (Admin)', () => {
        it('should emergency cancel a transaction', async () => {
            const transactionId = 1;

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Emergency cancellation completed' }
            });

            const result = await escrowService.emergencyCancel(transactionId);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/${transactionId}/emergency-cancel`);
        });
    });

    describe('updatePlatformFee (Admin)', () => {
        it('should update platform fee', async () => {
            const newFee = 300; // 3%

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Platform fee updated' }
            });

            const result = await escrowService.updatePlatformFee(newFee);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith('/admin/set-fee', { fee: newFee });
        });
    });

    describe('withdrawPlatformFees (Admin)', () => {
        it('should withdraw platform fees', async () => {
            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Platform fees withdrawn' }
            });

            const result = await escrowService.withdrawPlatformFees();

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith('/admin/withdraw-fees');
        });
    });
});
