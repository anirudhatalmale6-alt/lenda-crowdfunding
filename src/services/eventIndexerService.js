/**
 * EventIndexerService - Off-chain event indexing for historical data retrieval
 * Indexes blockchain events for efficient querying and historical data access
 */

import { ethers } from 'ethers';

// Supported event types
export const EVENT_TYPES = {
    LOAN_CREATED: 'LoanCreated',
    LOAN_FUNDED: 'LoanFunded',
    LOAN_FULLY_FUNDED: 'LoanFullyFunded',
    LOAN_ACTIVATED: 'LoanActivated',
    REPAYMENT_MADE: 'RepaymentMade',
    LOAN_REPAID: 'LoanRepaid',
    DEFAULT_TRIGGERED: 'DefaultTriggered',
    COLLATERAL_DEPOSITED: 'CollateralDeposited',
    COLLATERAL_RELEASED: 'CollateralReleased',
    ESCROW_CREATED: 'TransactionCreated',
    ESCROW_FUNDED: 'TransactionFunded',
    ESCROW_SHIPPED: 'TransactionShipped',
    ESCROW_DELIVERED: 'TransactionDelivered',
    FUNDS_RELEASED: 'FundsReleased',
    DISPUTE_OPENED: 'DisputeOpened',
    DISPUTE_RESOLVED: 'DisputeResolved',
};

// Index storage (in production, this would be a database)
class EventIndexerService {
    constructor() {
        this.events = [];
        this.lastIndexedBlock = 0;
        this.isIndexing = false;
        this.provider = null;
        this.indexed = {
            loans: new Map(),
            collateral: new Map(),
            escrow: new Map(),
            repayments: new Map(),
            investments: new Map(),
        };
    }

    /**
     * Initialize the indexer with a provider
     */
    async initialize(provider) {
        this.provider = provider;
        
        // Get current block number
        if (provider) {
            try {
                this.lastIndexedBlock = await provider.getBlockNumber();
            } catch (error) {
                console.warn('Could not get current block number:', error);
                this.lastIndexedBlock = 0;
            }
        }
        
        return {
            initialized: true,
            lastIndexedBlock: this.lastIndexedBlock,
        };
    }

    /**
     * Index events from a specific block range
     * @param {Object} contract - Ethers.js contract
     * @param {string} eventName - Name of the event to index
     * @param {number} fromBlock - Starting block
     * @param {number} toBlock - Ending block
     */
    async indexEvents(contract, eventName, fromBlock, toBlock) {
        if (!contract) {
            throw new Error('Contract not initialized');
        }

        try {
            const filter = contract.filters[eventName]();
            const events = await contract.queryFilter(filter, fromBlock, toBlock);
            
            console.log(`Indexed ${events.length} ${eventName} events`);
            
            return events.map(event => this._parseEvent(event));
        } catch (error) {
            console.error(`Error indexing ${eventName}:`, error);
            throw error;
        }
    }

    /**
     * Index all loan events
     */
    async indexLoanEvents(lendaLoanContract, fromBlock = 0, toBlock = 'latest') {
        const events = [];
        
        const eventNames = [
            EVENT_TYPES.LOAN_CREATED,
            EVENT_TYPES.LOAN_FUNDED,
            EVENT_TYPES.LOAN_FULLY_FUNDED,
            EVENT_TYPES.LOAN_ACTIVATED,
            EVENT_TYPES.REPAYMENT_MADE,
            EVENT_TYPES.LOAN_REPAID,
            EVENT_TYPES.DEFAULT_TRIGGERED,
        ];

        for (const eventName of eventNames) {
            try {
                const eventData = await this.indexEvents(
                    lendaLoanContract,
                    eventName,
                    fromBlock,
                    toBlock
                );
                events.push(...eventData);
                
                // Update indexed data
                eventData.forEach(event => {
                    this._updateLoanIndex(event);
                });
            } catch (error) {
                console.error(`Error indexing loan event ${eventName}:`, error);
            }
        }

        return events;
    }

    /**
     * Index all escrow events
     */
    async indexEscrowEvents(lendaEscrowContract, fromBlock = 0, toBlock = 'latest') {
        const events = [];
        
        const eventNames = [
            EVENT_TYPES.ESCROW_CREATED,
            EVENT_TYPES.ESCROW_FUNDED,
            EVENT_TYPES.ESCROW_SHIPPED,
            EVENT_TYPES.ESCROW_DELIVERED,
            EVENT_TYPES.FUNDS_RELEASED,
            EVENT_TYPES.DISPUTE_OPENED,
            EVENT_TYPES.DISPUTE_RESOLVED,
        ];

        for (const eventName of eventNames) {
            try {
                const eventData = await this.indexEvents(
                    lendaEscrowContract,
                    eventName,
                    fromBlock,
                    toBlock
                );
                events.push(...eventData);
                
                // Update indexed data
                eventData.forEach(event => {
                    this._updateEscrowIndex(event);
                });
            } catch (error) {
                console.error(`Error indexing escrow event ${eventName}:`, error);
            }
        }

        return events;
    }

    /**
     * Get loan history
     * @param {string|number} loanId - Loan ID
     * @returns {Array} Array of events
     */
    getLoanHistory(loanId) {
        return this.indexed.loans.get(loanId.toString()) || [];
    }

    /**
     * Get escrow history
     * @param {string|number} transactionId - Transaction ID
     * @returns {Array} Array of events
     */
    getEscrowHistory(transactionId) {
        return this.indexed.escrow.get(transactionId.toString()) || [];
    }

    /**
     * Get borrower history
     * @param {string} borrowerAddress - Borrower address
     * @returns {Array} Array of loan events
     */
    getBorrowerHistory(borrowerAddress) {
        const loans = [];
        
        this.indexed.loans.forEach((events, loanId) => {
            const borrowerEvent = events.find(e => 
                e.event === EVENT_TYPES.LOAN_CREATED && 
                e.borrower?.toLowerCase() === borrowerAddress.toLowerCase()
            );
            if (borrowerEvent) {
                loans.push(...events);
            }
        });
        
        return loans;
    }

    /**
     * Get lender history
     * @param {string} lenderAddress - Lender address
     * @returns {Array} Array of investment events
     */
    getLenderHistory(lenderAddress) {
        const investments = [];
        
        this.indexed.loans.forEach((events, loanId) => {
            const lenderEvents = events.filter(e => 
                (e.event === EVENT_TYPES.LOAN_FUNDED || e.event === EVENT_TYPES.REPAYMENT_MADE) &&
                e.lender?.toLowerCase() === lenderAddress.toLowerCase()
            );
            if (lenderEvents.length > 0) {
                investments.push(...lenderEvents);
            }
        });
        
        return investments;
    }

    /**
     * Get historical statistics
     * @param {number} fromBlock - Starting block
     * @param {number} toBlock - Ending block
     * @returns {Object} Statistics
     */
    async getHistoricalStats(fromBlock, toBlock) {
        const stats = {
            totalLoansCreated: 0,
            totalFunded: 0,
            totalRepaid: 0,
            totalDefaulted: 0,
            totalVolume: ethers.formatEther('0'),
        };

        // Filter events by block range
        const relevantEvents = this.events.filter(e => 
            e.blockNumber >= fromBlock && e.blockNumber <= toBlock
        );

        relevantEvents.forEach(event => {
            switch (event.event) {
                case EVENT_TYPES.LOAN_CREATED:
                    stats.totalLoansCreated++;
                    stats.totalVolume = ethers.formatEther(
                        ethers.parseEther(stats.totalVolume) + 
                        ethers.parseEther(event.amount || '0')
                    );
                    break;
                case EVENT_TYPES.LOAN_FUNDED:
                    stats.totalFunded++;
                    break;
                case EVENT_TYPES.LOAN_REPAID:
                    stats.totalRepaid++;
                    break;
                case EVENT_TYPES.DEFAULT_TRIGGERED:
                    stats.totalDefaulted++;
                    break;
            }
        });

        return stats;
    }

    /**
     * Search events
     * @param {Object} filters - Search filters
     * @returns {Array} Matching events
     */
    searchEvents(filters) {
        let results = [...this.events];

        if (filters.eventType) {
            results = results.filter(e => e.event === filters.eventType);
        }

        if (filters.address) {
            results = results.filter(e => 
                e.borrower?.toLowerCase() === filters.address.toLowerCase() ||
                e.lender?.toLowerCase() === filters.address.toLowerCase() ||
                e.seller?.toLowerCase() === filters.address.toLowerCase() ||
                e.buyer?.toLowerCase() === filters.address.toLowerCase()
            );
        }

        if (filters.fromBlock) {
            results = results.filter(e => e.blockNumber >= filters.fromBlock);
        }

        if (filters.toBlock) {
            results = results.filter(e => e.blockNumber <= filters.toBlock);
        }

        if (filters.loanId) {
            results = results.filter(e => e.loanId === filters.loanId);
        }

        return results;
    }

    /**
     * Get all indexed events
     */
    getAllEvents() {
        return this.events;
    }

    /**
     * Get last indexed block
     */
    getLastIndexedBlock() {
        return this.lastIndexedBlock;
    }

    /**
     * Clear index (for testing/reset)
     */
    clearIndex() {
        this.events = [];
        this.indexed = {
            loans: new Map(),
            collateral: new Map(),
            escrow: new Map(),
            repayments: new Map(),
            investments: new Map(),
        };
    }

    _parseEvent(event) {
        return {
            event: event.fragment?.name,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            blockHash: event.blockHash,
            logIndex: event.logIndex,
            args: { ...event.args },
            timestamp: new Date().toISOString(), // Would be derived from block timestamp
            // Extracted common fields
            loanId: event.args?.loanId?.toString(),
            borrower: event.args?.borrower,
            lender: event.args?.lender,
            amount: event.args?.amount ? ethers.formatEther(event.args.amount) : null,
            id: event.args?.id?.toString(),
            buyer: event.args?.buyer,
            seller: event.args?.seller,
        };
    }

    _updateLoanIndex(event) {
        if (!event.loanId) return;

        const loanId = event.loanId.toString();
        
        if (!this.indexed.loans.has(loanId)) {
            this.indexed.loans.set(loanId, []);
        }
        
        this.indexed.loans.get(loanId).push(event);
        this.events.push(event);
    }

    _updateEscrowIndex(event) {
        if (!event.id) return;

        const transactionId = event.id.toString();
        
        if (!this.indexed.escrow.has(transactionId)) {
            this.indexed.escrow.set(transactionId, []);
        }
        
        this.indexed.escrow.get(transactionId).push(event);
        this.events.push(event);
    }
}

// Export singleton instance
const eventIndexerService = new EventIndexerService();
export default eventIndexerService;
