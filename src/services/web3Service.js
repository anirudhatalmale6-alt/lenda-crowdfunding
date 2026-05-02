/**
 * Web3 Service
 * 
 * Handles blockchain interactions for Lenda protocol
 * 
 * CODE-002: Refactored to use separate ABI file
 * Imports ABIs from contractAbis.js to reduce file size
 */

import Web3 from 'web3';
import { ethers } from 'ethers';
import {
    CONTRACT_ADDRESSES,
    LENDA_LOAN_ABI,
    LENDA_ESCROW_ABI,
    LOAN_STATUS,
    REPAYMENT_STATUS,
    ESCROW_STATUS
} from './contracts/contractAbis';

class Web3Service {
    constructor() {
        this.web3 = null;
        this.provider = null;
        this.signer = null;
        this.account = null;
        this.chainId = null;
        this.lendaLoanContract = null;
        this.lendaEscrowContract = null;
        this.listeners = new Map();
    }

    /**
     * Initialize Web3 connection
     */
    async initialize() {
        if (typeof window.ethereum !== 'undefined') {
            // Use MetaMask or other Web3 provider
            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.web3 = new Web3(window.ethereum);

            try {
                const accounts = await this.provider.listAccounts();
                if (accounts.length > 0) {
                    this.signer = await this.provider.getSigner();
                    this.account = accounts[0].address;
                    const network = await this.provider.getNetwork();
                    this.chainId = Number(network.chainId);
                    await this.initializeContracts();
                }
            } catch (error) {
                console.error('Error initializing Web3:', error);
                throw error;
            }
        } else if (typeof window.web3 !== 'undefined') {
            // Legacy Web3
            this.web3 = new Web3(window.web3.currentProvider);
        } else {
            // Use Infura/Alchemy or local node
            const rpcUrl = import.meta.env.VITE_ETH_RPC_URL || 'http://localhost:8545';
            this.provider = new ethers.JsonRpcProvider(rpcUrl);
            this.web3 = new Web3(rpcUrl);

            try {
                const network = await this.provider.getNetwork();
                this.chainId = Number(network.chainId);
                await this.initializeContracts();
            } catch (error) {
                console.error('Error connecting to RPC:', error);
                throw error;
            }
        }
    }

    /**
     * Initialize contract instances
     */
    async initializeContracts() {
        const addresses = CONTRACT_ADDRESSES[this.chainId] || CONTRACT_ADDRESSES[1337];

        if (this.provider) {
            const signer = await this.provider.getSigner();

            this.lendaLoanContract = new ethers.Contract(
                addresses.LendaLoan,
                LENDA_LOAN_ABI,
                signer
            );

            this.lendaEscrowContract = new ethers.Contract(
                addresses.LendaEscrow,
                LENDA_ESCROW_ABI,
                signer
            );
        }
    }

    /**
     * Connect wallet (request account access)
     */
    async connectWallet() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts',
                });
                this.account = accounts[0];
                this.signer = await this.provider.getSigner();

                // Setup event listeners
                this.setupEventListeners();

                return this.account;
            } catch (error) {
                console.error('Error connecting wallet:', error);
                throw error;
            }
        } else {
            throw new Error('No Web3 wallet found. Please install MetaMask.');
        }
    }

    /**
     * Disconnect wallet
     */
    disconnectWallet() {
        this.account = null;
        this.signer = null;
        this.lendaLoanContract = null;
        this.lendaEscrowContract = null;
        this.removeEventListeners();
    }

    /**
     * Setup event listeners for account/network changes
     */
    setupEventListeners() {
        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnectWallet();
                } else {
                    this.account = accounts[0];
                    this.signer = null;
                    this.initializeContracts();
                }
                this.emit('accountChanged', accounts);
            });

            window.ethereum.on('chainChanged', (chainId) => {
                this.chainId = parseInt(chainId, 16);
                this.initializeContracts();
                this.emit('chainChanged', this.chainId);
            });
        }
    }

    /**
     * Remove event listeners
     */
    removeEventListeners() {
        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.removeAllListeners('accountsChanged');
            window.ethereum.removeAllListeners('chainChanged');
        }
    }

    /**
     * Get current account
     */
    getAccount() {
        return this.account;
    }

    /**
     * Get current chain ID
     */
    getChainId() {
        return this.chainId;
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.account !== null;
    }

    /**
     * Get ETH balance
     */
    async getBalance(address) {
        if (!this.web3) return '0';
        const balance = await this.web3.eth.getBalance(address);
        return this.web3.utils.fromWei(balance, 'ether');
    }

    /**
     * Get native token balance (using ethers)
     */
    async getNativeBalance() {
        if (!this.account || !this.provider) return '0';
        const balance = await this.provider.getBalance(this.account);
        return ethers.formatEther(balance);
    }

    // ============================================
    // LENDA LOAN CONTRACT METHODS
    // ============================================

    /**
     * Create a new loan request
     */
    async createLoan(loanAmount, interestRate, durationMonths, collateralId = 0) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaLoanContract.createLoan(
            ethers.parseEther(loanAmount.toString()),
            interestRate, // in basis points
            durationMonths,
            collateralId
        );

        const receipt = await tx.wait();
        const loanCreatedEvent = receipt.logs.find(
            log => log.fragment?.name === 'LoanCreated'
        );

        return {
            transactionHash: receipt.hash,
            loanId: loanCreatedEvent ? loanCreatedEvent.args.loanId : null,
        };
    }

    /**
     * Fund a loan (lender invests)
     */
    async fundLoan(loanId, amount) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaLoanContract.fundLoan(loanId, {
            value: ethers.parseEther(amount.toString()),
        });

        return await tx.wait();
    }

    /**
     * Make a loan repayment
     */
    async repayLoan(loanId, amount) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaLoanContract.repayLoan(loanId, {
            value: ethers.parseEther(amount.toString()),
        });

        return await tx.wait();
    }

    /**
     * Deposit collateral
     */
    async depositCollateral(collateralType, estimatedValue, documentHash) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaLoanContract.depositCollateral(
            collateralType,
            ethers.parseEther(estimatedValue.toString()),
            documentHash
        );

        const receipt = await tx.wait();
        const collateralEvent = receipt.logs.find(
            log => log.fragment?.name === 'CollateralDeposited'
        );

        return {
            transactionHash: receipt.hash,
            collateralId: collateralEvent ? collateralEvent.args.collateralId : null,
        };
    }

    /**
     * Verify collateral (admin)
     */
    async verifyCollateral(collateralId) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaLoanContract.verifyCollateral(collateralId);
        return await tx.wait();
    }

    /**
     * Trigger default (admin)
     */
    async triggerDefault(loanId) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaLoanContract.triggerDefault(loanId);
        return await tx.wait();
    }

    /**
     * Deposit to reserve fund
     */
    async depositToReserveFund(amount) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaLoanContract.depositToReserveFund({
            value: ethers.parseEther(amount.toString()),
        });

        return await tx.wait();
    }

    /**
     * Request a loan top-up
     */
    async requestLoanTopup(loanId, additionalAmount, additionalMonths) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaLoanContract.requestLoanTopup(
            loanId,
            ethers.parseEther(additionalAmount.toString()),
            additionalMonths
        );

        const receipt = await tx.wait();
        const topupEvent = receipt.logs.find(
            log => log.fragment?.name === 'LoanTopupRequested'
        );

        return {
            transactionHash: receipt.hash,
            topupId: topupEvent ? topupEvent.args.topupId : null,
        };
    }

    /**
     * Approve a loan top-up (admin)
     */
    async approveLoanTopup(topupId) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaLoanContract.approveLoanTopup(topupId);
        return await tx.wait();
    }

    /**
     * Fund a loan top-up
     */
    async fundLoanTopup(topupId, amount) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaLoanContract.fundLoanTopup(topupId, {
            value: ethers.parseEther(amount.toString()),
        });

        return await tx.wait();
    }

    /**
     * Get loan topup details
     */
    async getLoanTopup(topupId) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const topup = await this.lendaLoanContract.getLoanTopup(topupId);
        return {
            id: topup.id,
            loanId: topup.loanId,
            borrower: topup.borrower,
            additionalAmount: ethers.formatEther(topup.additionalAmount),
            newTotalAmount: ethers.formatEther(topup.newTotalAmount),
            interestRate: topup.interestRate,
            additionalMonths: topup.additionalMonths,
            isApproved: topup.isApproved,
            isFunded: topup.isFunded,
            requestedAt: new Date(Number(topup.requestedAt) * 1000).toISOString(),
            approvedAt: Number(topup.approvedAt) > 0 ? new Date(Number(topup.approvedAt) * 1000).toISOString() : null,
        };
    }

    /**
     * Get all topups for a loan
     */
    async getLoanTopups(loanId) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        return await this.lendaLoanContract.getLoanTopups(loanId);
    }

    /**
     * Get topup counter
     */
    async getTopupCounter() {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        return await this.lendaLoanContract.topupCounter();
    }

    /**
     * Get loan details
     */
    async getLoan(loanId) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const loan = await this.lendaLoanContract.getLoan(loanId);
        return {
            id: loan.id,
            borrower: loan.borrower,
            lenders: loan.lenders,
            loanAmount: ethers.formatEther(loan.loanAmount),
            interestRate: loan.interestRate,
            durationMonths: loan.durationMonths,
            fundedAmount: ethers.formatEther(loan.fundedAmount),
            repaidAmount: ethers.formatEther(loan.repaidAmount),
            status: LOAN_STATUS[loan.status],
            statusCode: loan.status,
            collateralId: loan.collateralId,
            createdAt: new Date(Number(loan.createdAt) * 1000).toISOString(),
            fundedAt: Number(loan.fundedAt) > 0 ? new Date(Number(loan.fundedAt) * 1000).toISOString() : null,
            fullyFundedAt: Number(loan.fullyFundedAt) > 0 ? new Date(Number(loan.fullyFundedAt) * 1000).toISOString() : null,
            dueDate: Number(loan.dueDate) > 0 ? new Date(Number(loan.dueDate) * 1000).toISOString() : null,
            defaultDate: Number(loan.defaultDate) > 0 ? new Date(Number(loan.defaultDate) * 1000).toISOString() : null,
        };
    }

    /**
     * Get collateral details
     */
    async getCollateral(collateralId) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const collateral = await this.lendaLoanContract.getCollateral(collateralId);
        return {
            id: collateral.id,
            owner: collateral.owner,
            loanId: collateral.loanId,
            collateralType: collateral.collateralType,
            estimatedValue: ethers.formatEther(collateral.estimatedValue),
            documentHash: collateral.documentHash,
            isVerified: collateral.isVerified,
            isLocked: collateral.isLocked,
            isReleased: collateral.isReleased,
        };
    }

    /**
     * Get loan repayments
     */
    async getLoanRepayments(loanId) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const repayments = await this.lendaLoanContract.getLoanRepayments(loanId);
        return repayments.map(r => ({
            loanId: r.loanId,
            amount: ethers.formatEther(r.amount),
            principal: ethers.formatEther(r.principal),
            interest: ethers.formatEther(r.interest),
            dueDate: new Date(Number(r.dueDate) * 1000).toISOString(),
            paidAt: Number(r.paidAt) > 0 ? new Date(Number(r.paidAt) * 1000).toISOString() : null,
            status: REPAYMENT_STATUS[r.status],
            statusCode: r.status,
        }));
    }

    /**
     * Get lender investments
     */
    async getLenderInvestments(address) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const investments = await this.lendaLoanContract.getLenderInvestments(address);
        return investments.map(i => ({
            loanId: i.loanId,
            amount: ethers.formatEther(i.amount),
            earnedAmount: ethers.formatEther(i.earnedAmount),
            isActive: i.isActive,
        }));
    }

    /**
     * Get borrower loans
     */
    async getBorrowerLoans(address) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        return await this.lendaLoanContract.getBorrowerLoans(address);
    }

    /**
     * Calculate LTV
     */
    async calculateLTV(loanAmount, collateralValue) {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const ltv = await this.lendaLoanContract.calculateLTV(
            ethers.parseEther(loanAmount.toString()),
            ethers.parseEther(collateralValue.toString())
        );

        return Number(ltv) / 100; // Convert basis points to percentage
    }

    /**
     * Get loan counter
     */
    async getLoanCounter() {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        return await this.lendaLoanContract.loanCounter();
    }

    /**
     * Get reserve fund balance
     */
    async getReserveFundBalance() {
        if (!this.lendaLoanContract) {
            throw new Error('Contract not initialized');
        }

        const balance = await this.lendaLoanContract.reserveFundBalance();
        return ethers.formatEther(balance);
    }

    // ============================================
    // LENDA ESCROW CONTRACT METHODS
    // ============================================

    /**
     * Create escrow transaction
     */
    async createEscrowTransaction(seller, amount, shippingFee, description) {
        if (!this.lendaEscrowContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaEscrowContract.createTransaction(
            seller,
            ethers.parseEther(amount.toString()),
            ethers.parseEther(shippingFee.toString()),
            description
        );

        const receipt = await tx.wait();
        const event = receipt.logs.find(
            log => log.fragment?.name === 'TransactionCreated'
        );

        return {
            transactionHash: receipt.hash,
            transactionId: event ? event.args.id : null,
        };
    }

    /**
     * Fund escrow transaction
     */
    async fundEscrow(transactionId, amount, shippingFee) {
        if (!this.lendaEscrowContract) {
            throw new Error('Contract not initialized');
        }

        const totalAmount = ethers.parseEther((amount + shippingFee).toString());
        const tx = await this.lendaEscrowContract.fundTransaction(transactionId, {
            value: totalAmount,
        });

        return await tx.wait();
    }

    /**
     * Mark as shipped
     */
    async markAsShipped(transactionId, trackingNumber, carrier) {
        if (!this.lendaEscrowContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaEscrowContract.markAsShipped(
            transactionId,
            trackingNumber,
            carrier
        );

        return await tx.wait();
    }

    /**
     * Confirm delivery
     */
    async confirmDelivery(transactionId) {
        if (!this.lendaEscrowContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaEscrowContract.confirmDelivery(transactionId);
        return await tx.wait();
    }

    /**
     * Release funds to seller
     */
    async releaseEscrowFunds(transactionId) {
        if (!this.lendaEscrowContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaEscrowContract.releaseFunds(transactionId);
        return await tx.wait();
    }

    /**
     * Open dispute
     */
    async openDispute(transactionId, reason) {
        if (!this.lendaEscrowContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaEscrowContract.openDispute(transactionId, reason);
        return await tx.wait();
    }

    /**
     * Resolve dispute (admin)
     */
    async resolveDispute(transactionId, resolution, refundBuyer) {
        if (!this.lendaEscrowContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaEscrowContract.resolveDispute(
            transactionId,
            resolution,
            refundBuyer
        );

        return await tx.wait();
    }

    /**
     * Cancel transaction
     */
    async cancelEscrowTransaction(transactionId) {
        if (!this.lendaEscrowContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaEscrowContract.cancelTransaction(transactionId);
        return await tx.wait();
    }

    /**
     * Get transaction details
     */
    async getTransaction(transactionId) {
        if (!this.lendaEscrowContract) {
            throw new Error('Contract not initialized');
        }

        const tx = await this.lendaEscrowContract.getTransaction(transactionId);
        return {
            id: tx.id,
            buyer: tx.buyer,
            seller: tx.seller,
            amount: ethers.formatEther(tx.amount),
            shippingFee: ethers.formatEther(tx.shippingFee),
            platformFee: ethers.formatEther(tx.platformFee),
            status: ESCROW_STATUS[tx.status],
            statusCode: tx.status,
            description: tx.description,
            trackingNumber: tx.trackingNumber,
            shippingCarrier: tx.shippingCarrier,
            createdAt: new Date(Number(tx.createdAt) * 1000).toISOString(),
            fundedAt: Number(tx.fundedAt) > 0 ? new Date(Number(tx.fundedAt) * 1000).toISOString() : null,
            shippedAt: Number(tx.shippedAt) > 0 ? new Date(Number(tx.shippedAt) * 1000).toISOString() : null,
            deliveredAt: Number(tx.deliveredAt) > 0 ? new Date(Number(tx.deliveredAt) * 1000).toISOString() : null,
            releasedAt: Number(tx.releasedAt) > 0 ? new Date(Number(tx.releasedAt) * 1000).toISOString() : null,
            disputeReason: tx.disputeReason,
            deliveryProof: tx.deliveryProof,
        };
    }

    /**
     * Get buyer transactions
     */
    async getBuyerTransactions(address) {
        if (!this.lendaEscrowContract) {
            throw new Error('Contract not initialized');
        }

        return await this.lendaEscrowContract.getBuyerTransactions(address);
    }

    /**
     * Get seller transactions
     */
    async getSellerTransactions(address) {
        if (!this.lendaEscrowContract) {
            throw new Error('Contract not initialized');
        }

        return await this.lendaEscrowContract.getSellerTransactions(address);
    }

    /**
     * Get transaction counter
     */
    async getTransactionCounter() {
        if (!this.lendaEscrowContract) {
            throw new Error('Contract not initialized');
        }

        return await this.lendaEscrowContract.transactionCounter();
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    /**
     * Subscribe to contract events
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    /**
     * Unsubscribe from contract events
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    /**
     * Emit event to listeners
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }

    /**
     * Setup contract event listeners
     */
    async setupContractEvents() {
        if (!this.lendaLoanContract || !this.lendaEscrowContract) {
            return;
        }

        // Loan events
        this.lendaLoanContract.on('LoanCreated', (loanId, borrower, amount, interestRate, event) => {
            this.emit('loanCreated', {
                loanId: loanId,
                borrower: borrower,
                amount: ethers.formatEther(amount),
                interestRate: interestRate,
                transactionHash: event.log.transactionHash,
            });
        });

        this.lendaLoanContract.on('LoanFunded', (loanId, lender, amount, event) => {
            this.emit('loanFunded', {
                loanId: loanId,
                lender: lender,
                amount: ethers.formatEther(amount),
                transactionHash: event.log.transactionHash,
            });
        });

        this.lendaLoanContract.on('LoanRepaid', (loanId, event) => {
            this.emit('loanRepaid', {
                loanId: loanId,
                transactionHash: event.log.transactionHash,
            });
        });

        this.lendaLoanContract.on('DefaultTriggered', (loanId, event) => {
            this.emit('defaultTriggered', {
                loanId: loanId,
                transactionHash: event.log.transactionHash,
            });
        });

        // Escrow events
        this.lendaEscrowContract.on('TransactionCreated', (id, buyer, seller, amount, event) => {
            this.emit('escrowCreated', {
                transactionId: id,
                buyer: buyer,
                seller: seller,
                amount: ethers.formatEther(amount),
                transactionHash: event.log.transactionHash,
            });
        });

        this.lendaEscrowContract.on('FundsReleased', (id, amount, event) => {
            this.emit('fundsReleased', {
                transactionId: id,
                amount: ethers.formatEther(amount),
                transactionHash: event.log.transactionHash,
            });
        });

        this.lendaEscrowContract.on('DisputeOpened', (id, reason, event) => {
            this.emit('disputeOpened', {
                transactionId: id,
                reason: reason,
                transactionHash: event.log.transactionHash,
            });
        });
    }

    /**
     * Remove all contract event listeners
     */
    removeContractEvents() {
        if (this.lendaLoanContract) {
            this.lendaLoanContract.removeAllListeners();
        }
        if (this.lendaEscrowContract) {
            this.lendaEscrowContract.removeAllListeners();
        }
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Parse ETH amount
     */
    parseEther(amount) {
        return ethers.parseEther(amount.toString());
    }

    /**
     * Format ETH amount
     */
    formatEther(wei) {
        return ethers.formatEther(wei);
    }

    /**
     * Format address
     */
    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    /**
     * Switch network
     */
    async switchNetwork(chainId) {
        if (typeof window.ethereum !== 'undefined') {
            const chainIdHex = `0x${chainId.toString(16)}`;

            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: chainIdHex }],
                });
            } catch (error) {
                console.error('Error switching network:', error);
                throw error;
            }
        }
    }

    /**
     * Add network
     */
    async addNetwork(networkConfig) {
        if (typeof window.ethereum !== 'undefined') {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [networkConfig],
                });
            } catch (error) {
                console.error('Error adding network:', error);
                throw error;
            }
        }
    }
}

// Export singleton instance
const web3Service = new Web3Service();
export default web3Service;

// Export enums for use in other modules
export { LOAN_STATUS, REPAYMENT_STATUS, ESCROW_STATUS, CONTRACT_ADDRESSES };
