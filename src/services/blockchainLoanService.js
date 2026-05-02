import web3Service from './web3Service';
import loanService from './loanService';
import { getStoredToken } from '../utils/storage';

/**
 * BlockchainLoanService - Hybrid service that uses Web3 when available,
 * falls back to REST API when blockchain is not accessible
 */
class BlockchainLoanService {
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

            // Try to connect wallet
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
     * Create loan request - tries Web3 first, falls back to API
     */
    async createLoan(loanData) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.createLoan(
                    loanData.loanAmount,
                    loanData.interestRate,
                    loanData.durationMonths,
                    loanData.collateralId || 0
                );

                // Also create in API for tracking
                await loanService.createLoanRequest({
                    ...loanData,
                    blockchainLoanId: result.loanId?.toString(),
                    transactionHash: result.transactionHash,
                    source: 'blockchain',
                });

                return {
                    success: true,
                    loanId: result.loanId,
                    transactionHash: result.transactionHash,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 loan creation failed:', error);
                // Fall through to API
            }
        }

        // Fallback to REST API
        const result = await loanService.createLoanRequest(loanData);
        return {
            success: true,
            loanId: result.id || result.loanId,
            source: 'api',
        };
    }

    /**
     * Get all loan requests
     */
    async getLoanRequests(filters = {}) {
        if (this.useWeb3) {
            try {
                // Get loan counter to know how many loans exist
                const loanCounter = await web3Service.getLoanCounter();
                const loans = [];

                // Fetch all loans
                for (let i = 1; i <= Number(loanCounter); i++) {
                    try {
                        const loan = await web3Service.getLoan(i);
                        if (this._filterLoan(loan, filters)) {
                            loans.push(loan);
                        }
                    } catch (e) {
                        // Loan might not exist
                    }
                }

                return loans;
            } catch (error) {
                console.error('Web3 get loans failed:', error);
            }
        }

        // Fallback to REST API
        return await loanService.getLoanRequests(filters);
    }

    /**
     * Get my loans (as borrower)
     */
    async getMyLoans() {
        if (this.useWeb3) {
            try {
                const account = web3Service.getAccount();
                const loanIds = await web3Service.getBorrowerLoans(account);
                const loans = [];

                for (const loanId of loanIds) {
                    try {
                        const loan = await web3Service.getLoan(loanId);
                        loans.push(loan);
                    } catch (e) {
                        // Skip invalid loans
                    }
                }

                return loans;
            } catch (error) {
                console.error('Web3 get my loans failed:', error);
            }
        }

        // Fallback to REST API
        return await loanService.getMyLoans();
    }

    /**
     * Get loan details
     */
    async getLoanDetails(loanId) {
        if (this.useWeb3) {
            try {
                const loan = await web3Service.getLoan(loanId);

                // Also get repayments
                const repayments = await web3Service.getLoanRepayments(loanId);

                return {
                    ...loan,
                    repayments,
                };
            } catch (error) {
                console.error('Web3 get loan details failed:', error);
            }
        }

        // Fallback to REST API
        return await loanService.getLoanDetails(loanId);
    }

    /**
     * Fund a loan (lender invests)
     */
    async fundLoan(loanId, amount) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.fundLoan(loanId, amount);

                // Also record in API
                await loanService.fundLoan(loanId, amount);

                return {
                    success: true,
                    transactionHash: result.hash || result.transactionHash,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 fund loan failed:', error);
                // Check if it's a user rejection
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    throw new Error('Transaction rejected by user');
                }
                // Fall through to API
            }
        }

        // Fallback to REST API
        const result = await loanService.fundLoan(loanId, amount);
        return {
            success: true,
            source: 'api',
            ...result,
        };
    }

    /**
     * Make a repayment
     */
    async makeRepayment(loanId, amount) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.repayLoan(loanId, amount);

                // Also record in API
                await loanService.makeRepayment(loanId, amount);

                return {
                    success: true,
                    transactionHash: result.hash || result.transactionHash,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 repay loan failed:', error);
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    throw new Error('Transaction rejected by user');
                }
                // Fall through to API
            }
        }

        // Fallback to REST API
        const result = await loanService.makeRepayment(loanId, amount);
        return {
            success: true,
            source: 'api',
            ...result,
        };
    }

    /**
     * Deposit collateral
     */
    async depositCollateral(collateralData) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.depositCollateral(
                    collateralData.collateralType,
                    collateralData.estimatedValue,
                    collateralData.documentHash
                );

                // Also record in API
                await loanService.uploadCollateral(0, collateralData);

                return {
                    success: true,
                    collateralId: result.collateralId,
                    transactionHash: result.transactionHash,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 deposit collateral failed:', error);
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    throw new Error('Transaction rejected by user');
                }
                // Fall through to API
            }
        }

        // Fallback to REST API
        const result = await loanService.uploadCollateral(0, collateralData);
        return {
            success: true,
            source: 'api',
            ...result,
        };
    }

    /**
     * Verify collateral (admin)
     */
    async verifyCollateral(collateralId) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.verifyCollateral(collateralId);

                // Also update in API
                await loanService.verifyCollateral(collateralId);

                return {
                    success: true,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 verify collateral failed:', error);
            }
        }

        // Fallback to REST API
        return await loanService.verifyCollateral(collateralId);
    }

    /**
     * Trigger default (admin)
     */
    async triggerDefault(loanId) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.triggerDefault(loanId);

                // Also update in API
                await loanService.initiateDefaultProceedings(loanId);

                return {
                    success: true,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 trigger default failed:', error);
            }
        }

        // Fallback to REST API
        return await loanService.initiateDefaultProceedings(loanId);
    }

    /**
     * Deposit to reserve fund
     */
    async depositToReserveFund(amount) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.depositToReserveFund(amount);
                return {
                    success: true,
                    transactionHash: result.hash,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 deposit to reserve fund failed:', error);
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    throw new Error('Transaction rejected by user');
                }
            }
        }

        throw new Error('Reserve fund deposit only available via Web3');
    }

    /**
     * Request loan top-up
     */
    async requestLoanTopup(loanId, additionalAmount, additionalMonths) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.requestLoanTopup(
                    loanId,
                    additionalAmount,
                    additionalMonths
                );

                // Also record in API for tracking
                await loanService.requestLoanTopup(loanId, additionalAmount, `Top-up request for ${additionalAmount} ETH`, false);

                return {
                    success: true,
                    topupId: result.topupId,
                    transactionHash: result.transactionHash,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 loan topup request failed:', error);
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    throw new Error('Transaction rejected by user');
                }
                // Fall through to API
            }
        }

        // Fallback to REST API
        const result = await loanService.requestLoanTopup(loanId, additionalAmount, `Top-up request for ${additionalAmount} ETH`, false);
        return {
            success: true,
            topupId: result.id || result.topupId,
            source: 'api',
        };
    }

    /**
     * Approve loan top-up (admin)
     */
    async approveLoanTopup(topupId) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.approveLoanTopup(topupId);
                return {
                    success: true,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 approve loan topup failed:', error);
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    throw new Error('Transaction rejected by user');
                }
            }
        }

        throw new Error('Top-up approval only available via Web3');
    }

    /**
     * Fund loan top-up
     */
    async fundLoanTopup(topupId, amount) {
        if (this.useWeb3) {
            try {
                const result = await web3Service.fundLoanTopup(topupId, amount);
                return {
                    success: true,
                    transactionHash: result.hash || result.transactionHash,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 fund loan topup failed:', error);
                if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                    throw new Error('Transaction rejected by user');
                }
                // Fall through to API
            }
        }

        throw new Error('Top-up funding only available via Web3');
    }

    /**
     * Get loan topup details
     */
    async getLoanTopup(topupId) {
        if (this.useWeb3) {
            try {
                return await web3Service.getLoanTopup(topupId);
            } catch (error) {
                console.error('Web3 get loan topup failed:', error);
            }
        }

        throw new Error('Top-up details only available via Web3');
    }

    /**
     * Get all topups for a loan
     */
    async getLoanTopups(loanId) {
        if (this.useWeb3) {
            try {
                return await web3Service.getLoanTopups(loanId);
            } catch (error) {
                console.error('Web3 get loan topups failed:', error);
            }
        }

        throw new Error('Top-up list only available via Web3');
    }

    /**
     * Get lender investments
     */
    async getLenderInvestments(address) {
        if (this.useWeb3) {
            try {
                return await web3Service.getLenderInvestments(address || web3Service.getAccount());
            } catch (error) {
                console.error('Web3 get lender investments failed:', error);
            }
        }

        // Fallback to REST API
        return await loanService.getMyFundedLoans();
    }

    /**
     * Get loan repayments
     */
    async getLoanRepayments(loanId) {
        if (this.useWeb3) {
            try {
                return await web3Service.getLoanRepayments(loanId);
            } catch (error) {
                console.error('Web3 get repayments failed:', error);
            }
        }

        // Fallback to REST API
        return await loanService.getRepaymentSchedule(loanId);
    }

    /**
     * Calculate LTV
     */
    async calculateLTV(loanAmount, collateralValue) {
        if (this.useWeb3) {
            try {
                return await web3Service.calculateLTV(loanAmount, collateralValue);
            } catch (error) {
                console.error('Web3 calculate LTV failed:', error);
            }
        }

        // Fallback to REST API
        const result = await loanService.calculateLTV(loanAmount, collateralValue);
        return result.ltv || 0;
    }

    /**
     * Get statistics
     */
    async getStatistics() {
        if (this.useWeb3) {
            try {
                const loanCounter = await web3Service.getLoanCounter();
                const reserveFund = await web3Service.getReserveFundBalance();

                // Count loans by status
                let activeLoans = 0;
                let totalLoans = 0;
                let totalValue = 0;

                for (let i = 1; i <= Number(loanCounter); i++) {
                    try {
                        const loan = await web3Service.getLoan(i);
                        totalLoans++;
                        if (loan.status === 'ACTIVE') {
                            activeLoans++;
                            totalValue += parseFloat(loan.loanAmount);
                        }
                    } catch (e) {
                        // Skip
                    }
                }

                return {
                    totalLoans,
                    activeLoans,
                    totalValue,
                    reserveFund,
                    source: 'blockchain',
                };
            } catch (error) {
                console.error('Web3 get statistics failed:', error);
            }
        }

        // Fallback to REST API
        return await loanService.getStatistics();
    }

    /**
     * Subscribe to loan events
     */
    on(event, callback) {
        web3Service.on(event, callback);
    }

    /**
     * Unsubscribe from loan events
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

    _filterLoan(loan, filters) {
        if (!filters) return true;

        if (filters.status && loan.status !== filters.status) {
            return false;
        }

        if (filters.minAmount && parseFloat(loan.loanAmount) < filters.minAmount) {
            return false;
        }

        if (filters.maxAmount && parseFloat(loan.loanAmount) > filters.maxAmount) {
            return false;
        }

        return true;
    }
}

// Export singleton instance
const blockchainLoanService = new BlockchainLoanService();
export default blockchainLoanService;
