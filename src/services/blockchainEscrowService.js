import web3Service from './web3Service';
import escrowService from './escrowService';
import { getStoredToken } from '../utils/storage';

/**
 * BlockchainEscrowService - Hybrid service that uses Web3 when available,
 * falls back to REST API when blockchain is not accessible
 */
class BlockchainEscrowService {
    constructor() {
        this.useWeb3 = false;
        this.web3Initialized = false;
    }

    /**
     * Initialize and determine whether to use Web3
     */
    async initialize() {
        try {
            await web3Service.initialize();
            this.web3Initialized = true;

            if (web3Service.isConnected()) {
                this.useWeb3 = true;
                return { useWeb3: true, connected: true };
            }

            return { useWeb3: false, connected: false };
        } catch (error) {
            console.warn('Web3 initialization failed, using REST API:', error);
            this.web3Initialized = false;
            this.useWeb3 = false;
            return { useWeb3: false, connected: false, error: error.message };
        }
    }

    /**
     * Connect wallet and enable Web3
     */
    async connectWallet() {
        try {
            await web3Service.connectWallet();
            this.useWeb3 = true;
            return { success: true, account: web3Service.getAccount() };
        } catch (error) {
            console.error('Wallet connection failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Disconnect wallet and use REST API
     */
    disconnectWallet() {
        web3Service.disconnectWallet();
        this.useWeb3 = false;
    }

    /**
     * Check if Web3 is being used
     */
    isUsingWeb3() {
        return this.useWeb3;
    }

    /**
     * Get current account
     */
    getAccount() {
        return web3Service.getAccount();
    }

    /**
     * Get current chain ID
     */
    getChainId() {
        return web3Service.getChainId();
    }

    /**
     * Get ETH balance
     */
    async getBalance() {
        if (this.useWeb3) {
            return await web3Service.getNativeBalance();
        }

        // Fallback: Get balance from API
        const response = await fetch('/api/wallet/balance', {
            headers: this._getAuthHeaders(),
        });
        const data = await response.json();
        return data.balance || '0';
    }

    /**
     * Create escrow transaction
     */
    async createTransaction(transactionData) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.createEscrowTransaction(
                    transactionData.seller,
                    transactionData.amount,
                    transactionData.shippingFee || 0,
                    transactionData.description
                );

                // Also create in API for tracking
                await escrowService.createTransaction({
                    ...transactionData,
                    blockchainTransactionId: result.transactionId?.toString(),
                    transactionHash: result.transactionHash,
                    source: 'blockchain',
                });

                return {
                    success: true,
                    transactionId: result.transactionId,
                    transactionHash: result.transactionHash,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 create transaction failed:', error);
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    throw new Error('Transaction rejected by user');
                }
                // Fall through to API
            }
        }

        // Fallback to REST API
        const result = await escrowService.createTransaction(transactionData);
        return {
            success: true,
            transactionId: result.id || result.transactionId,
            source: 'api',
        };
    }

    /**
     * Get all transactions
     */
    async getTransactions(filters = {}) {
        if (this.useWeb3) {
            try {
                const counter = await web3Service.getTransactionCounter();
                const transactions = [];

                for (let i = 1; i <= Number(counter); i++) {
                    try {
                        const tx = await web3Service.getTransaction(i);
                        if (this._filterTransaction(tx, filters)) {
                            transactions.push(tx);
                        }
                    } catch (e) {
                        // Skip invalid transactions
                    }
                }

                return transactions;
            } catch (error) {
                console.error('Web3 get transactions failed:', error);
            }
        }

        // Fallback to REST API
        return await escrowService.getTransactions(filters);
    }

    /**
     * Get my transactions (as buyer or seller)
     */
    async getMyTransactions() {
        if (this.useWeb3) {
            try {
                const account = web3Service.getAccount();

                // Get buyer transactions
                const buyerTxIds = await web3Service.getBuyerTransactions(account);
                // Get seller transactions
                const sellerTxIds = await web3Service.getSellerTransactions(account);

                // Combine and deduplicate
                const allIds = [...new Set([...buyerTxIds, ...sellerTxIds])];
                const transactions = [];

                for (const txId of allIds) {
                    try {
                        const tx = await web3Service.getTransaction(txId);
                        transactions.push(tx);
                    } catch (e) {
                        // Skip invalid
                    }
                }

                return transactions;
            } catch (error) {
                console.error('Web3 get my transactions failed:', error);
            }
        }

        // Fallback to REST API
        return await escrowService.getMyTransactions();
    }

    /**
     * Get transaction details
     */
    async getTransactionDetails(transactionId) {
        if (this.useWeb3) {
            try {
                return await web3Service.getTransaction(transactionId);
            } catch (error) {
                console.error('Web3 get transaction failed:', error);
            }
        }

        // Fallback to REST API
        return await escrowService.getTransactionDetails(transactionId);
    }

    /**
     * Fund escrow transaction (buyer pays)
     */
    async fundTransaction(transactionId, amount, shippingFee = 0) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.fundEscrow(transactionId, amount, shippingFee);

                // Also record in API
                await escrowService.fundTransaction(transactionId, amount + shippingFee);

                return {
                    success: true,
                    transactionHash: result.hash || result.transactionHash,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 fund transaction failed:', error);
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    throw new Error('Transaction rejected by user');
                }
                // Fall through to API
            }
        }

        // Fallback to REST API
        const result = await escrowService.fundTransaction(transactionId, amount);
        return {
            success: true,
            source: 'api',
            ...result,
        };
    }

    /**
     * Mark as shipped (seller)
     */
    async markAsShipped(transactionId, trackingNumber, carrier) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.markAsShipped(transactionId, trackingNumber, carrier);

                // Also update in API
                await escrowService.markAsShipped(transactionId, trackingNumber);

                return {
                    success: true,
                    transactionHash: result.hash || result.transactionHash,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 mark as shipped failed:', error);
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    throw new Error('Transaction rejected by user');
                }
                // Fall through to API
            }
        }

        // Fallback to REST API
        const result = await escrowService.markAsShipped(transactionId, trackingNumber);
        return {
            success: true,
            source: 'api',
            ...result,
        };
    }

    /**
     * Confirm delivery (buyer)
     */
    async confirmDelivery(transactionId) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.confirmDelivery(transactionId);

                // Also update in API
                await escrowService.confirmDelivery(transactionId);

                return {
                    success: true,
                    transactionHash: result.hash || result.transactionHash,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 confirm delivery failed:', error);
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    throw new Error('Transaction rejected by user');
                }
                // Fall through to API
            }
        }

        // Fallback to REST API
        const result = await escrowService.confirmDelivery(transactionId);
        return {
            success: true,
            source: 'api',
            ...result,
        };
    }

    /**
     * Release funds to seller (buyer)
     */
    async releaseFunds(transactionId) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.releaseEscrowFunds(transactionId);

                // Also update in API
                await escrowService.releaseFunds(transactionId);

                return {
                    success: true,
                    transactionHash: result.hash || result.transactionHash,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 release funds failed:', error);
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    throw new Error('Transaction rejected by user');
                }
                // Fall through to API
            }
        }

        // Fallback to REST API
        const result = await escrowService.releaseFunds(transactionId);
        return {
            success: true,
            source: 'api',
            ...result,
        };
    }

    /**
     * Open dispute (buyer)
     */
    async openDispute(transactionId, reason) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.openDispute(transactionId, reason);

                // Also update in API
                await escrowService.openDispute(transactionId, reason);

                return {
                    success: true,
                    transactionHash: result.hash || result.transactionHash,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 open dispute failed:', error);
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    throw new Error('Transaction rejected by user');
                }
                // Fall through to API
            }
        }

        // Fallback to REST API
        const result = await escrowService.openDispute(transactionId, reason);
        return {
            success: true,
            source: 'api',
            ...result,
        };
    }

    /**
     * Resolve dispute (admin)
     */
    async resolveDispute(transactionId, resolution, refundBuyer) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.resolveDispute(transactionId, resolution, refundBuyer);

                // Also update in API
                await escrowService.resolveDispute(transactionId, { resolution, refundBuyer });

                return {
                    success: true,
                    transactionHash: result.hash || result.transactionHash,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 resolve dispute failed:', error);
            }
        }

        // Fallback to REST API
        return await escrowService.resolveDispute(transactionId, { resolution, refundBuyer });
    }

    /**
     * Cancel transaction (buyer)
     */
    async cancelTransaction(transactionId) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.cancelEscrowTransaction(transactionId);

                return {
                    success: true,
                    transactionHash: result.hash || result.transactionHash,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 cancel transaction failed:', error);
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    throw new Error('Transaction rejected by user');
                }
                // Fall through to API
            }
        }

        throw new Error('Transaction cancellation not available via API');
    }

    /**
     * Get statistics
     */
    async getStatistics() {
        if (this.useWeb3) {
            try {
                const counter = await web3Service.getTransactionCounter();
                const stats = {
                    totalTransactions: Number(counter),
                    active: 0,
                    completed: 0,
                    disputed: 0,
                    source: 'blockchain',
                };

                for (let i = 1; i <= Number(counter); i++) {
                    try {
                        const tx = await web3Service.getTransaction(i);
                        if (tx.status === 'FUNDED' || tx.status === 'SHIPPED' || tx.status === 'DELIVERED') {
                            stats.active++;
                        } else if (tx.status === 'RELEASED') {
                            stats.completed++;
                        } else if (tx.status === 'DISPUTED') {
                            stats.disputed++;
                        }
                    } catch (e) {
                        // Skip
                    }
                }

                return stats;
            } catch (error) {
                console.error('Web3 get statistics failed:', error);
            }
        }

        // Fallback to REST API
        return await escrowService.getStatistics();
    }

    /**
     * Get disputes (admin)
     */
    async getDisputes(filters = {}) {
        if (this.useWeb3) {
            try {
                const counter = await web3Service.getTransactionCounter();
                const disputes = [];

                for (let i = 1; i <= Number(counter); i++) {
                    try {
                        const tx = await web3Service.getTransaction(i);
                        if (tx.status === 'DISPUTED') {
                            disputes.push(tx);
                        }
                    } catch (e) {
                        // Skip
                    }
                }

                return disputes;
            } catch (error) {
                console.error('Web3 get disputes failed:', error);
            }
        }

        // Fallback to REST API
        return await escrowService.getDisputes(filters);
    }

    /**
     * Subscribe to escrow events
     */
    on(event, callback) {
        web3Service.on(event, callback);
    }

    /**
     * Unsubscribe from escrow events
     */
    off(event, callback) {
        web3Service.off(event, callback);
    }

    /**
     * Setup contract event listeners
     */
    async setupEventListeners() {
        if (this.useWeb3) {
            await web3Service.setupContractEvents();
        }
    }

    /**
     * Remove contract event listeners
     */
    removeEventListeners() {
        web3Service.removeContractEvents();
    }

    // Helper methods

    _getAuthHeaders() {
        // SEC-008: Get token from secure storage, not localStorage
        const token = getStoredToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
        };
    }

    _filterTransaction(tx, filters) {
        if (!filters) return true;

        if (filters.status && tx.status !== filters.status) {
            return false;
        }

        if (filters.minAmount && parseFloat(tx.amount) < filters.minAmount) {
            return false;
        }

        if (filters.maxAmount && parseFloat(tx.amount) > filters.maxAmount) {
            return false;
        }

        return true;
    }
}

// Export singleton instance
const blockchainEscrowService = new BlockchainEscrowService();
export default blockchainEscrowService;
