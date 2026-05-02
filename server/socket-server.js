/**
 * Lenda Socket.io Server for Real-time Updates (PERF-08, PERF-09)
 * 
 * This server handles WebSocket connections for:
 * - Real-time loan status updates
 * - Funding notifications
 * - Payment/repayment alerts
 * - Admin dashboard live updates
 * - Smart contract event notifications
 */

const { Server } = require("socket.io");
const { createServer } = require("http");
const fs = require("fs");
const path = require("path");

// HTTP server configuration
const PORT = process.env.SOCKET_PORT || 3001;
const httpServer = createServer();

// Socket.io server with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Redis adapter for scalability (if available)
let redisAdapter;
try {
  const redis = require("redis");
  const { RedisAdapter } = require("socket.io-redis");
  
  const pubClient = redis.createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
  });
  
  const subClient = redis.createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
  });
  
  redisAdapter = new RedisAdapter(pubClient, subClient);
  io.adapter(redisAdapter);
  console.log("Redis adapter configured for Socket.io");
} catch (e) {
  console.log("Redis not available, using default adapter");
}

// Connected clients tracking
const connectedUsers = new Map();
const adminClients = new Set();

// Room management
const ROOMS = {
  PUBLIC: "public",
  AUTHENTICATED: "authenticated",
  ADMINS: "admins",
  LOAN_PREFIX: "loan:",
  USER_PREFIX: "user:",
  MARKET: "market"
};

/**
 * Authentication middleware for WebSocket
 */
function authenticateSocket(socket, next) {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  
  if (!token) {
    // Allow unauthenticated connections for public updates
    return next();
  }
  
  try {
    // Verify JWT token (simplified - in production use proper JWT verification)
    const payload = verifyToken(token);
    if (payload) {
      socket.userId = payload.userId;
      socket.role = payload.role || "user";
    }
  } catch (e) {
    // Invalid token - allow connection but mark as unauthenticated
  }
  
  next();
}

/**
 * Verify JWT token (simplified implementation)
 */
function verifyToken(token) {
  try {
    // In production, use proper JWT library
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      return payload;
    }
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * Broadcast loan status update
 */
function broadcastLoanUpdate(loanId, data) {
  io.to(`${ROOMS.LOAN_PREFIX}${loanId}`).emit("loan:updated", {
    loanId,
    ...data,
    timestamp: new Date().toISOString()
  });
  
  // Also notify market watchers
  io.to(ROOMS.MARKET).emit("loan:updated", {
    loanId,
    ...data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast new funding event
 */
function broadcastFundingEvent(loanId, funderId, amount) {
  io.to(`${ROOMS.LOAN_PREFIX}${loanId}`).emit("loan:funded", {
    loanId,
    funderId,
    amount,
    timestamp: new Date().toISOString()
  });
  
  // Notify borrower
  io.to(`${ROOMS.USER_PREFIX}${funderId}`).emit("notification", {
    type: "funding_received",
    loanId,
    amount,
    message: `Your loan received ${amount} in funding`,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast repayment event
 */
function broadcastRepaymentEvent(loanId, amount) {
  io.to(`${ROOMS.LOAN_PREFIX}${loanId}`).emit("loan:repayment", {
    loanId,
    amount,
    timestamp: new Date().toISOString()
  });
  
  // Notify lenders
  io.to(`${ROOMS.LOAN_PREFIX}${loanId}`).emit("notification", {
    type: "repayment_received",
    loanId,
    amount,
    message: `A repayment of ${amount} was received`,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast admin alerts
 */
function broadcastAdminAlert(type, data) {
  io.to(ROOMS.ADMINS).emit("admin:alert", {
    type,
    data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Smart Contract Event Handler (PERF-10)
 */
class SmartContractEventListener {
  constructor() {
    this.eventQueue = [];
    this.isProcessing = false;
  }
  
  /**
   * Handle blockchain event
   */
  async handleEvent(event) {
    console.log("Smart contract event received:", event.type);
    
    const { type, data, transactionHash, blockNumber } = event;
    
    switch (type) {
      case "LoanFunded":
        await this.handleLoanFunded(data, transactionHash, blockNumber);
        break;
      case "LoanRepaid":
        await this.handleLoanRepaid(data, transactionHash, blockNumber);
        break;
      case "CollateralDeposited":
        await this.handleCollateralDeposited(data, transactionHash, blockNumber);
        break;
      case "CollateralSeized":
        await this.handleCollateralSeized(data, transactionHash, blockNumber);
        break;
      case "DefaultDeclared":
        await this.handleDefaultDeclared(data, transactionHash, blockNumber);
        break;
      default:
        console.log("Unknown event type:", type);
    }
  }
  
  async handleLoanFunded(data, txHash, blockNumber) {
    const { loanId, lender, amount } = data;
    
    broadcastFundingEvent(loanId, lender, amount);
    
    // Also notify market
    io.to(ROOMS.MARKET).emit("blockchain:loan_funded", {
      loanId,
      lender,
      amount,
      transactionHash: txHash,
      blockNumber,
      timestamp: new Date().toISOString()
    });
  }
  
  async handleLoanRepaid(data, txHash, blockNumber) {
    const { loanId, borrower, amount } = data;
    
    broadcastRepaymentEvent(loanId, amount);
    
    io.to(ROOMS.MARKET).emit("blockchain:loan_repaid", {
      loanId,
      borrower,
      amount,
      transactionHash: txHash,
      blockNumber,
      timestamp: new Date().toISOString()
    });
  }
  
  async handleCollateralDeposited(data, txHash, blockNumber) {
    const { loanId, collateralId, value } = data;
    
    io.to(`${ROOMS.LOAN_PREFIX}${loanId}`).emit("collateral:deposited", {
      loanId,
      collateralId,
      value,
      transactionHash: txHash,
      blockNumber,
      timestamp: new Date().toISOString()
    });
    
    broadcastAdminAlert("collateral_deposited", { loanId, collateralId, value });
  }
  
  async handleCollateralSeized(data, txHash, blockNumber) {
    const { loanId, collateralId, value } = data;
    
    io.to(`${ROOMS.LOAN_PREFIX}${loanId}`).emit("collateral:seized", {
      loanId,
      collateralId,
      value,
      transactionHash: txHash,
      blockNumber,
      timestamp: new Date().toISOString()
    });
    
    broadcastAdminAlert("collateral_seized", { loanId, collateralId, value });
  }
  
  async handleDefaultDeclared(data, txHash, blockNumber) {
    const { loanId, reason } = data;
    
    io.to(`${ROOMS.LOAN_PREFIX}${loanId}`).emit("loan:defaulted", {
      loanId,
      reason,
      transactionHash: txHash,
      blockNumber,
      timestamp: new Date().toISOString()
    });
    
    broadcastAdminAlert("loan_defaulted", { loanId, reason });
  }
}

// Initialize event listener
const eventListener = new SmartContractEventListener();

// Socket.io connection handler
io.use(authenticateSocket);

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Track connected user
  if (socket.userId) {
    connectedUsers.set(socket.userId, socket.id);
    
    // Join authenticated room
    socket.join(ROOMS.AUTHENTICATED);
    
    // Join user-specific room
    socket.join(`${ROOMS.USER_PREFIX}${socket.userId}`);
    
    // If admin, join admin room
    if (socket.role === "admin") {
      adminClients.add(socket.id);
      socket.join(ROOMS.ADMINS);
    }
    
    // Send user their notification history or pending updates
    socket.emit("user:connected", {
      userId: socket.userId,
      timestamp: new Date().toISOString()
    });
  } else {
    // Public connection - join public room
    socket.join(ROOMS.PUBLIC);
  }
  
  // Join market updates room
  socket.join(ROOMS.MARKET);
  
  /**
   * Subscribe to loan updates
   */
  socket.on("loan:subscribe", (loanId) => {
    socket.join(`${ROOMS.LOAN_PREFIX}${loanId}`);
    socket.emit("loan:subscribed", { loanId });
  });
  
  /**
   * Unsubscribe from loan updates
   */
  socket.on("loan:unsubscribe", (loanId) => {
    socket.leave(`${ROOMS.LOAN_PREFIX}${loanId}`);
    socket.emit("loan:unsubscribed", { loanId });
  });
  
  /**
   * Request loan status (for reconnection sync)
   */
  socket.on("loan:status", async (loanId) => {
    // In production, fetch from database/cache
    socket.emit("loan:status", {
      loanId,
      status: "active",
      timestamp: new Date().toISOString()
    });
  });
  
  /**
   * Get connected users count (admin only)
   */
  socket.on("admin:getStats", () => {
    if (socket.role === "admin") {
      socket.emit("admin:stats", {
        connectedUsers: connectedUsers.size,
        adminClients: adminClients.size,
        totalRooms: io.sockets.adapter.rooms.size,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  /**
   * Broadcast message to loan subscribers (from API)
   */
  socket.on("loan:broadcast", (data) => {
    if (socket.role === "admin" || socket.userId) {
      broadcastLoanUpdate(data.loanId, data);
    }
  });
  
  /**
   * Handle disconnect
   */
  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      adminClients.delete(socket.id);
    }
  });
  
  /**
   * Handle errors
   */
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

// Health check endpoint
httpServer.on("request", (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      connectedClients: io.engine.clientsCount,
      timestamp: new Date().toISOString()
    }));
  }
});

// Export for external use
module.exports = {
  io,
  broadcastLoanUpdate,
  broadcastFundingEvent,
  broadcastRepaymentEvent,
  broadcastAdminAlert,
  eventListener,
  ROOMS
};

// Start server
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
  console.log(`WebSocket real-time updates enabled for:`);
  console.log(`  - Loan status updates`);
  console.log(`  - Funding notifications`);
  console.log(`  - Repayment alerts`);
  console.log(`  - Admin dashboard updates`);
  console.log(`  - Smart contract events`);
});
