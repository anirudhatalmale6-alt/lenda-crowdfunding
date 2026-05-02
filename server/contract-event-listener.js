/**
 * Smart Contract Event Listener Service (PERF-10)
 * 
 * This service connects to the blockchain and listens for events
 * from Lenda's smart contracts, then broadcasts them via Socket.io
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Configuration
const CONFIG = {
  // Network configuration (defaults to local/development)
  network: process.env.BLOCKCHAIN_NETWORK || "localhost",
  rpcUrl: process.env.RPC_URL || "http://localhost:8545",
  
  // Contract addresses (load from config or environment)
  contracts: {
    loan: process.env.LOAN_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
    escrow: process.env.ESCROW_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
    token: process.env.TOKEN_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
    marketMaker: process.env.MARKET_MAKER_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000"
  },
  
  // Socket.io server URL for broadcasting
  socketUrl: process.env.SOCKET_URL || "http://localhost:3001",
  
  // Starting block (for historical events, set to contract creation block)
  startBlock: parseInt(process.env.START_BLOCK || "0"),
  
  // Polling interval in ms
  pollingInterval: parseInt(process.env.POLLING_INTERVAL || "15000")
};

// ABI fragments for event parsing
const EVENT_ABIS = [
  // Loan events
  "event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 interestRate, uint256 duration)",
  "event LoanFunded(uint256 indexed loanId, address indexed lender, uint256 amount)",
  "event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount)",
  "event LoanDefaulted(uint256 indexed loanId, address indexed borrower, string reason)",
  "event LoanStatusChanged(uint256 indexed loanId, uint8 status)",
  
  // Collateral events
  "event CollateralDeposited(uint256 indexed loanId, uint256 indexed collateralId, address indexed owner, uint256 value)",
  "event CollateralSeized(uint256 indexed loanId, uint256 indexed collateralId, uint256 value)",
  "event CollateralReturned(uint256 indexed loanId, uint256 indexed collateralId, address indexed owner)",
  
  // Escrow events
  "event EscrowCreated(uint256 indexed escrowId, uint256 indexed loanId, address indexed lender, uint256 amount)",
  "event EscrowFunded(uint256 indexed escrowId, address indexed funder, uint256 amount)",
  "event EscrowReleased(uint256 indexed escrowId, uint256 indexed loanId)",
  "event EscrowRefunded(uint256 indexed escrowId, address indexed recipient, uint256 amount)",
  
  // Payment events
  "event PaymentMade(uint256 indexed loanId, address indexed payer, uint256 amount, uint256 principal, uint256 interest)",
  "event PaymentLate(uint256 indexed loanId, address indexed payer, uint256 lateFee)",
  
  // Market events
  "event InterestRateUpdated(uint256 indexed loanId, uint256 oldRate, uint256 newRate)",
  "event PoolLiquidityUpdated(uint256 availableLiquidity, uint256 totalDeposits)"
];

// Simple event emitter for broadcasting
class EventBroadcaster {
  constructor() {
    this.listeners = [];
  }
  
  addListener(callback) {
    this.listeners.push(callback);
  }
  
  broadcast(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (e) {
        console.error("Broadcast error:", e);
      }
    });
  }
}

const broadcaster = new EventBroadcaster();

/**
 * Connect to Socket.io and register event broadcaster
 */
async function connectToSocket() {
  try {
    const { io } = require("./socket-server.js");
    
    broadcaster.addListener((event) => {
      const { eventListener } = require("./socket-server.js");
      eventListener.handleEvent(event);
    });
    
    console.log("Connected to Socket.io broadcaster");
  } catch (e) {
    // Socket server might not be running, use HTTP fallback
    console.log("Socket.io not available, using HTTP fallback");
    
    broadcaster.addListener(async (event) => {
      await broadcastViaHttp(event);
    });
  }
}

/**
 * Fallback HTTP broadcasting
 */
async function broadcastViaHttp(event) {
  try {
    const response = await fetch(`${CONFIG.socketUrl}/internal/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event)
    });
  } catch (e) {
    console.log("HTTP broadcast failed:", e.message);
  }
}

/**
 * Smart Contract Event Listener
 */
class ContractEventListener {
  constructor() {
    this.provider = null;
    this.contracts = {};
    this.isRunning = false;
    this.lastBlock = CONFIG.startBlock;
    this.filterIds = [];
  }
  
  /**
   * Initialize provider and contracts
   */
  async initialize() {
    console.log(`Connecting to blockchain: ${CONFIG.rpcUrl}`);
    
    this.provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    
    // Verify connection
    try {
      const network = await this.provider.getNetwork();
      console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
    } catch (e) {
      console.error("Failed to connect to blockchain:", e.message);
      throw e;
    }
    
    // Initialize contract instances
    for (const [name, address] of Object.entries(CONFIG.contracts)) {
      if (address && address !== ethers.ZeroAddress) {
        this.contracts[name] = new ethers.Contract(
          address,
          EVENT_ABIS,
          this.provider
        );
        console.log(`Contract loaded: ${name} at ${address}`);
      }
    }
    
    // Get current block number
    this.lastBlock = await this.provider.getBlockNumber();
    console.log(`Current block: ${this.lastBlock}`);
  }
  
  /**
   * Set up event listeners for all contracts
   */
  setupEventListeners() {
    for (const [name, contract] of Object.entries(this.contracts)) {
      console.log(`Setting up listeners for ${name} contract...`);
      
      // Listen for all events with a filter
      contract.on("LoanCreated", async (loanId, borrower, amount, interestRate, duration, event) => {
        this.handleEvent("LoanFunded", {
          loanId: loanId.toString(),
          borrower,
          amount: amount.toString(),
          interestRate: interestRate.toString(),
          duration: duration.toString()
        }, event);
      });
      
      contract.on("LoanFunded", async (loanId, lender, amount, event) => {
        this.handleEvent("LoanFunded", {
          loanId: loanId.toString(),
          lender,
          amount: amount.toString()
        }, event);
      });
      
      contract.on("LoanRepaid", async (loanId, borrower, amount, event) => {
        this.handleEvent("LoanRepaid", {
          loanId: loanId.toString(),
          borrower,
          amount: amount.toString()
        }, event);
      });
      
      contract.on("LoanDefaulted", async (loanId, borrower, reason, event) => {
        this.handleEvent("DefaultDeclared", {
          loanId: loanId.toString(),
          borrower,
          reason: reason.toString()
        }, event);
      });
      
      contract.on("CollateralDeposited", async (loanId, collateralId, owner, value, event) => {
        this.handleEvent("CollateralDeposited", {
          loanId: loanId.toString(),
          collateralId: collateralId.toString(),
          owner,
          value: value.toString()
        }, event);
      });
      
      contract.on("CollateralSeized", async (loanId, collateralId, value, event) => {
        this.handleEvent("CollateralSeized", {
          loanId: loanId.toString(),
          collateralId: collateralId.toString(),
          value: value.toString()
        }, event);
      });
      
      contract.on("PaymentMade", async (loanId, payer, amount, principal, interest, event) => {
        this.handleEvent("PaymentMade", {
          loanId: loanId.toString(),
          payer,
          amount: amount.toString(),
          principal: principal.toString(),
          interest: interest.toString()
        }, event);
      });
    }
    
    console.log("Event listeners set up successfully");
  }
  
  /**
   * Handle a blockchain event
   */
  handleEvent(type, data, event) {
    const eventData = {
      type,
      data,
      transactionHash: event.log.transactionHash,
      blockNumber: event.log.blockNumber,
      blockHash: event.log.blockHash,
      timestamp: Date.now()
    };
    
    console.log(`Event: ${type}`, {
      loanId: data.loanId,
      tx: eventData.transactionHash
    });
    
    // Broadcast to Socket.io
    broadcaster.broadcast(eventData);
  }
  
  /**
   * Start polling for missed events
   */
  async startPolling() {
    this.isRunning = true;
    
    const poll = async () => {
      if (!this.isRunning) return;
      
      try {
        const currentBlock = await this.provider.getBlockNumber();
        
        if (currentBlock > this.lastBlock) {
          console.log(`Checking blocks ${this.lastBlock + 1} to ${currentBlock}`);
          
          // Query past events for each contract
          for (const [name, contract] of Object.entries(this.contracts)) {
            const events = await contract.queryFilter("*", this.lastBlock + 1, currentBlock);
            
            for (const event of events) {
              // Re-process events (they should already be caught by listeners)
              // This is a safety net for missed events
              console.log(`[Polling] Found event in ${name}:`, event.event);
            }
          }
          
          this.lastBlock = currentBlock;
        }
      } catch (e) {
        console.error("Polling error:", e.message);
      }
      
      // Schedule next poll
      setTimeout(poll, CONFIG.pollingInterval);
    };
    
    poll();
    console.log(`Polling started (interval: ${CONFIG.pollingInterval}ms)`);
  }
  
  /**
   * Stop the listener
   */
  stop() {
    this.isRunning = false;
    
    // Remove all listeners
    for (const contract of Object.values(this.contracts)) {
      contract.removeAllListeners();
    }
    
    console.log("Event listener stopped");
  }
  
  /**
   * Query historical events
   */
  async queryHistoricalEvents(fromBlock, toBlock = "latest") {
    const results = {};
    
    for (const [name, contract] of Object.entries(this.contracts)) {
      console.log(`Querying ${name} events from ${fromBlock} to ${toBlock}...`);
      
      try {
        const events = await contract.queryFilter("*", fromBlock, toBlock);
        results[name] = events.map(e => ({
          event: e.event,
          args: e.args,
          blockNumber: e.log.blockNumber,
          transactionHash: e.log.transactionHash
        }));
        
        console.log(`  Found ${events.length} events`);
      } catch (e) {
        console.error(`  Error querying ${name}:`, e.message);
        results[name] = [];
      }
    }
    
    return results;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("=".repeat(50));
  console.log("Lenda Smart Contract Event Listener");
  console.log("=".repeat(50));
  
  const listener = new ContractEventListener();
  
  try {
    await listener.initialize();
    
    // Connect to Socket.io
    await connectToSocket();
    
    // Set up real-time listeners
    listener.setupEventListeners();
    
    // Start polling as backup
    listener.startPolling();
    
    console.log("Event listener running...");
    
    // Handle shutdown
    process.on("SIGINT", () => {
      console.log("\nShutting down...");
      listener.stop();
      process.exit(0);
    });
    
    process.on("SIGTERM", () => {
      console.log("\nShutting down...");
      listener.stop();
      process.exit(0);
    });
    
  } catch (e) {
    console.error("Failed to start event listener:", e);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  ContractEventListener,
  CONFIG,
  broadcaster
};
