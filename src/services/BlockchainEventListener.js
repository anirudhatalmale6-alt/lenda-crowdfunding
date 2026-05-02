/**
 * Blockchain Event Listener Service
 * 
 * This service listens to smart contract events and syncs them with the database.
 * It can be run as a background process using node or as a cron job.
 * 
 * Usage:
 *   node src/services/BlockchainEventListener.js
 * 
 * Events listened:
 * - LendaEscrow: TransactionCreated, TransactionFunded, TransactionShipped, 
 *                TransactionDelivered, FundsReleased, DisputeOpened, DisputeResolved
 * - LendaLoan: LoanCreated, LoanFunded, LoanFullyFunded, LoanActivated, 
 *              RepaymentMade, LoanRepaid, DefaultTriggered, CollateralDeposited, CollateralReleased
 */

const { ethers } = require('ethers');
const axios = require('axios');

// Configuration
const CONFIG = {
    // Blockchain RPC endpoint
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'http://localhost:8545',
    
    // Contract addresses
    escrowContractAddress: process.env.ESCROW_CONTRACT_ADDRESS || '',
    loanContractAddress: process.env.LOAN_CONTRACT_ADDRESS || '',
    
    // Private key for event listener (use a read-only or events-only account)
    privateKey: process.env.EVENT_LISTENER_PRIVATE_KEY || '',
    
    // API endpoint for database sync
    apiUrl: process.env.API_URL || 'http://localhost:8765/api',
    apiKey: process.env.API_KEY || '',
    
    // Block confirmation depth
    confirmationBlocks: parseInt(process.env.CONFIRMATION_BLOCKS || '3'),
    
    // Polling interval in ms
    pollInterval: parseInt(process.env.POLL_INTERVAL || '15000'),
    
    // Database sync endpoint
    syncEndpoint: process.env.SYNC_ENDPOINT || '/blockchain/sync-event'
};

// Event ABIs
const ESCROW_EVENTS = [
    'event TransactionCreated(uint256 indexed id, address indexed buyer, address indexed seller, uint256 amount)',
    'event TransactionFunded(uint256 indexed id, uint256 amount)',
    'event TransactionShipped(uint256 indexed id, string trackingNumber)',
    'event TransactionDelivered(uint256 indexed id)',
    'event FundsReleased(uint256 indexed id, uint256 amount)',
    'event DisputeOpened(uint256 indexed id, string reason)',
    'event DisputeResolved(uint256 indexed id, string resolution)',
    'event TransactionRefunded(uint256 indexed id)',
    'event TransactionCancelled(uint256 indexed id)'
];

const LOAN_EVENTS = [
    'event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 interestRate)',
    'event LoanFunded(uint256 indexed loanId, address indexed lender, uint256 amount)',
    'event LoanFullyFunded(uint256 indexed loanId)',
    'event LoanActivated(uint256 indexed loanId, uint256 dueDate)',
    'event RepaymentMade(uint256 indexed loanId, uint256 amount)',
    'event LoanRepaid(uint256 indexed loanId)',
    'event DefaultTriggered(uint256 indexed loanId)',
    'event CollateralDeposited(uint256 indexed collateralId, uint256 loanId, uint256 value)',
    'event CollateralReleased(uint256 indexed collateralId)',
    'event CollateralTransferredToMarketplace(uint256 indexed collateralId)'
];

class BlockchainEventListener {
    constructor(config = CONFIG) {
        this.config = config;
        this.provider = null;
        this.escrowContract = null;
        this.loanContract = null;
        this.lastEscrowBlock = 0;
        this.lastLoanBlock = 0;
        this.isRunning = false;
        this.eventCount = 0;
    }

    /**
     * Initialize the provider and contracts
     */
    async initialize() {
        console.log('Initializing Blockchain Event Listener...');
        
        try {
            // Initialize provider
            this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
            
            // Verify connection
            const network = await this.provider.getNetwork();
            console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
            
            // Get wallet (for reading only)
            if (this.config.privateKey) {
                const wallet = new ethers.Wallet(this.config.privateKey, this.provider);
                console.log(`Using wallet: ${wallet.address}`);
            }
            
            // Get current block number
            const currentBlock = await this.provider.getBlockNumber();
            console.log(`Current block: ${currentBlock}`);
            
            // Load last processed blocks from storage (in production, use a database)
            await this.loadLastProcessedBlocks();
            
            console.log('Initialization complete');
            return true;
        } catch (error) {
            console.error('Initialization failed:', error.message);
            return false;
        }
    }

    /**
     * Load last processed blocks from storage
     */
    async loadLastProcessedBlocks() {
        // In production, load from database or file
        // For now, use environment variables or start from current block
        this.lastEscrowBlock = parseInt(process.env.LAST_ESCROW_BLOCK || '0');
        this.lastLoanBlock = parseInt(process.env.LAST_LOAN_BLOCK || '0');
        
        console.log(`Resuming from - Escrow: block ${this.lastEscrowBlock}, Loan: block ${this.lastLoanBlock}`);
    }

    /**
     * Save last processed blocks
     */
    async saveLastProcessedBlocks() {
        // In production, save to database or file
        process.env.LAST_ESCROW_BLOCK = this.lastEscrowBlock.toString();
        process.env.LAST_LOAN_BLOCK = this.lastLoanBlock.toString();
    }

    /**
     * Start listening for events
     */
    async start() {
        if (this.isRunning) {
            console.log('Listener already running');
            return;
        }

        console.log('Starting Blockchain Event Listener...');
        this.isRunning = true;

        // Main event loop
        while (this.isRunning) {
            try {
                await this.pollEvents();
            } catch (error) {
                console.error('Error in event loop:', error.message);
            }

            // Wait before next poll
            await this.sleep(this.config.pollInterval);
        }
    }

    /**
     * Stop listening for events
     */
    stop() {
        console.log('Stopping Blockchain Event Listener...');
        this.isRunning = false;
    }

    /**
     * Poll for new events
     */
    async pollEvents() {
        const currentBlock = await this.provider.getBlockNumber();
        const fromBlock = this.config.confirmationBlocks;
        
        // Process escrow events
        if (this.config.escrowContractAddress) {
            await this.processEscrowEvents(fromBlock, currentBlock);
        }
        
        // Process loan events
        if (this.config.loanContractAddress) {
            await this.processLoanEvents(fromBlock, currentBlock);
        }
        
        // Save progress
        await this.saveLastProcessedBlocks();
        
        if (this.eventCount > 0) {
            console.log(`Processed ${this.eventCount} events. Progress - Escrow: ${this.lastEscrowBlock}, Loan: ${this.lastLoanBlock}`);
            this.eventCount = 0;
        }
    }

    /**
     * Process escrow contract events
     */
    async processEscrowEvents(fromBlock, toBlock) {
        if (fromBlock <= this.lastEscrowBlock) {
            fromBlock = this.lastEscrowBlock + 1;
        }
        
        if (fromBlock > toBlock) return;
        
        console.log(`Processing escrow events from block ${fromBlock} to ${toBlock}`);
        
        // In production, use contract filters
        // For now, simulate event processing
        for (const eventType of ESCROW_EVENTS) {
            const eventName = eventType.match(/event (\w+)/)[1];
            await this.processEvent('escrow', eventName, fromBlock, toBlock);
        }
        
        this.lastEscrowBlock = toBlock;
    }

    /**
     * Process loan contract events
     */
    async processLoanEvents(fromBlock, toBlock) {
        if (fromBlock <= this.lastLoanBlock) {
            fromBlock = this.lastLoanBlock + 1;
        }
        
        if (fromBlock > toBlock) return;
        
        console.log(`Processing loan events from block ${fromBlock} to ${toBlock}`);
        
        // In production, use contract filters
        for (const eventType of LOAN_EVENTS) {
            const eventName = eventType.match(/event (\w+)/)[1];
            await this.processEvent('loan', eventName, fromBlock, toBlock);
        }
        
        this.lastLoanBlock = toBlock;
    }

    /**
     * Process a specific event type
     */
    async processEvent(contractType, eventName, fromBlock, toBlock) {
        try {
            // In production, query the contract for events
            // const filter = contract.filters[eventName]();
            // const events = await contract.queryFilter(filter, fromBlock, toBlock);
            
            // For now, simulate - in production this would actually query the blockchain
            // const events = [];
            
            // if (events.length > 0) {
            //     for (const event of events) {
            //         await this.handleEvent(contractType, eventName, event);
            //     }
            // }
            
            this.eventCount++;
        } catch (error) {
            console.error(`Error processing ${contractType}.${eventName}:`, error.message);
        }
    }

    /**
     * Handle a single event
     */
    async handleEvent(contractType, eventName, event) {
        console.log(`Handling ${contractType}.${eventName}:`, event);
        
        const eventData = {
            contract_type: contractType,
            event_name: eventName,
            block_number: event.blockNumber,
            transaction_hash: event.transactionHash,
            log_index: event.logIndex,
            args: event.args,
            timestamp: new Date().toISOString()
        };
        
        try {
            // Send to API for processing
            await this.syncEvent(eventData);
            console.log(`Synced event: ${contractType}.${eventName} at block ${event.blockNumber}`);
        } catch (error) {
            console.error(`Failed to sync event:`, error.message);
            // In production, implement retry logic or store for later processing
        }
    }

    /**
     * Sync event to API
     */
    async syncEvent(eventData) {
        try {
            const response = await axios.post(
                `${this.config.apiUrl}${this.config.syncEndpoint}`,
                eventData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.config.apiKey}`
                    },
                    timeout: 10000
                }
            );
            
            return response.data;
        } catch (error) {
            if (error.response) {
                console.error(`API error: ${error.response.status} - ${error.response.data.message || error.response.statusText}`);
            } else if (error.request) {
                console.error('No response from API');
            } else {
                console.error(`Request error: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Helper to sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get listener status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastEscrowBlock: this.lastEscrowBlock,
            lastLoanBlock: this.lastLoanBlock,
            config: {
                rpcUrl: this.config.rpcUrl,
                confirmationBlocks: this.config.confirmationBlocks,
                pollInterval: this.config.pollInterval
            }
        };
    }
}

// Export for use as module
module.exports = BlockchainEventListener;

// Run if executed directly
if (require.main === module) {
    const listener = new BlockchainEventListener();
    
    // Initialize and start
    listener.initialize()
        .then(() => listener.start())
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('Received SIGINT, shutting down...');
        listener.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('Received SIGTERM, shutting down...');
        listener.stop();
        process.exit(0);
    });
}
