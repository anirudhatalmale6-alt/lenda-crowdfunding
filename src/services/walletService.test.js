/**
 * Wallet Service Unit Tests
 * 
 * Tests for walletService.js API functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import walletService from './walletService';
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

describe('walletService', () => {
    let mockApi;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApi = createApiClient();
    });

    describe('getBalance', () => {
        it('should fetch wallet balance', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, balance: 1000 }
            });

            const result = await walletService.getBalance();

            expect(result.success).toBe(true);
            expect(result.balance).toBe(1000);
            expect(mockApi.get).toHaveBeenCalledWith('/balance');
        });

        it('should handle errors', async () => {
            mockApi.get.mockRejectedValue({
                response: { data: { error: 'Unauthorized' } }
            });

            await expect(walletService.getBalance()).rejects.toEqual(
                expect.objectContaining({ response: expect.any(Object) })
            );
        });
    });

    describe('getTransactions', () => {
        it('should fetch wallet transactions', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, transactions: [] }
            });

            const result = await walletService.getTransactions();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/transactions');
        });

        it('should fetch transactions with filters', async () => {
            const filters = { type: 'deposit', limit: 10 };
            mockApi.get.mockResolvedValue({
                data: { success: true, transactions: [] }
            });

            await walletService.getTransactions(filters);

            expect(mockApi.get).toHaveBeenCalledWith('/transactions', { params: filters });
        });
    });

    describe('deposit', () => {
        it('should make a deposit', async () => {
            const depositData = {
                amount: 500,
                paymentMethod: 'bank_transfer',
                reference: 'REF123'
            };

            mockApi.post.mockResolvedValue({
                data: { success: true, transactionId: 1 }
            });

            const result = await walletService.deposit(depositData);

            expect(result.success).toBe(true);
            expect(result.transactionId).toBe(1);
            expect(mockApi.post).toHaveBeenCalledWith('/deposit', depositData);
        });

        it('should handle deposit errors', async () => {
            mockApi.post.mockRejectedValue({
                response: { data: { error: 'Invalid amount' } }
            });

            await expect(walletService.deposit({ amount: -100 })).rejects.toEqual(
                expect.objectContaining({ response: expect.any(Object) })
            );
        });
    });

    describe('withdraw', () => {
        it('should initiate a withdrawal', async () => {
            const withdrawData = {
                amount: 500,
                bankAccount: '1234567890',
                bankName: 'Test Bank'
            };

            mockApi.post.mockResolvedValue({
                data: { success: true, withdrawalId: 1 }
            });

            const result = await walletService.withdraw(withdrawData);

            expect(result.success).toBe(true);
            expect(result.withdrawalId).toBe(1);
            expect(mockApi.post).toHaveBeenCalledWith('/withdraw', withdrawData);
        });

        it('should handle insufficient balance', async () => {
            mockApi.post.mockRejectedValue({
                response: { data: { error: 'Insufficient balance' } }
            });

            await expect(walletService.withdraw({ amount: 10000 })).rejects.toEqual(
                expect.objectContaining({ response: expect.any(Object) })
            );
        });
    });

    describe('transfer', () => {
        it('should transfer to another user', async () => {
            const transferData = {
                recipientId: 2,
                amount: 100,
                note: 'Test transfer'
            };

            mockApi.post.mockResolvedValue({
                data: { success: true, transferId: 1 }
            });

            const result = await walletService.transfer(transferData);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith('/transfer', transferData);
        });

        it('should handle transfer to self', async () => {
            mockApi.post.mockRejectedValue({
                response: { data: { error: 'Cannot transfer to yourself' } }
            });

            await expect(walletService.transfer({ recipientId: 1 })).rejects.toEqual(
                expect.objectContaining({ response: expect.any(Object) })
            );
        });
    });

    describe('getBankAccounts', () => {
        it('should fetch bank accounts', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, accounts: [] }
            });

            const result = await walletService.getBankAccounts();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/bank-accounts');
        });
    });

    describe('addBankAccount', () => {
        it('should add a bank account', async () => {
            const accountData = {
                bankName: 'Test Bank',
                accountNumber: '1234567890',
                accountName: 'John Doe'
            };

            mockApi.post.mockResolvedValue({
                data: { success: true, accountId: 1 }
            });

            const result = await walletService.addBankAccount(accountData);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith('/bank-accounts', accountData);
        });
    });

    describe('deleteBankAccount', () => {
        it('should delete a bank account', async () => {
            const accountId = 1;

            mockApi.delete.mockResolvedValue({
                data: { success: true, message: 'Account deleted' }
            });

            const result = await walletService.deleteBankAccount(accountId);

            expect(result.success).toBe(true);
            expect(mockApi.delete).toHaveBeenCalledWith(`/bank-accounts/${accountId}`);
        });
    });

    // Admin functions
    describe('getAllWallets (Admin)', () => {
        it('should fetch all wallets', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, wallets: [] }
            });

            const result = await walletService.getAllWallets();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/admin/all-wallets');
        });
    });

    describe('getAllTransactions (Admin)', () => {
        it('should fetch all transactions', async () => {
            mockApi.get.mockResolvedValue({
                data: { success: true, transactions: [] }
            });

            const result = await walletService.getAllTransactions();

            expect(result.success).toBe(true);
            expect(mockApi.get).toHaveBeenCalledWith('/admin/all-transactions');
        });
    });

    describe('approveWithdrawal (Admin)', () => {
        it('should approve a withdrawal', async () => {
            const withdrawalId = 1;

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Withdrawal approved' }
            });

            const result = await walletService.approveWithdrawal(withdrawalId);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/admin/withdrawals/${withdrawalId}/approve`);
        });
    });

    describe('rejectWithdrawal (Admin)', () => {
        it('should reject a withdrawal', async () => {
            const withdrawalId = 1;
            const reason = 'Invalid account';

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Withdrawal rejected' }
            });

            const result = await walletService.rejectWithdrawal(withdrawalId, reason);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/admin/withdrawals/${withdrawalId}/reject`, { reason });
        });
    });

    describe('processDeposit (Admin)', () => {
        it('should process a deposit', async () => {
            const depositId = 1;

            mockApi.post.mockResolvedValue({
                data: { success: true, message: 'Deposit processed' }
            });

            const result = await walletService.processDeposit(depositId);

            expect(result.success).toBe(true);
            expect(mockApi.post).toHaveBeenCalledWith(`/admin/deposits/${depositId}/process`);
        });
    });
});
