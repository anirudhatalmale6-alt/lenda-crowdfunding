/**
 * Hybrid Auction System Service (RISK-005)
 * Off-chain auction management with blockchain settlement
 */

import apiClient from '../utils/api/client';

/**
 * Get all auctions with hybrid support
 * @param {Object} filters - Filter options
 * @returns {Promise}
 */
export const getAuctions = async (filters = {}) => {
  try {
    const response = await apiClient.get('/api/auctions/hybrid', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching auctions:', error);
    throw error;
  }
};

/**
 * Get active hybrid auctions
 * @returns {Promise}
 */
export const getActiveAuctions = async () => {
  try {
    const response = await apiClient.get('/api/auctions/hybrid/active');
    return response.data;
  } catch (error) {
    console.error('Error fetching active auctions:', error);
    throw error;
  }
};

/**
 * Create a new hybrid auction
 * @param {Object} auctionData - Auction configuration
 * @returns {Promise}
 */
export const createAuction = async (auctionData) => {
  try {
    const response = await apiClient.post('/api/auctions/hybrid', auctionData);
    return response.data;
  } catch (error) {
    console.error('Error creating auction:', error);
    throw error;
  }
};

/**
 * Get auction details
 * @param {number} auctionId - Auction ID
 * @returns {Promise}
 */
export const getAuctionDetails = async (auctionId) => {
  try {
    const response = await apiClient.get(`/api/auctions/hybrid/${auctionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching auction details:', error);
    throw error;
  }
};

/**
 * Place a bid on auction (off-chain)
 * @param {number} auctionId - Auction ID
 * @param {number} amount - Bid amount
 * @returns {Promise}
 */
export const placeBid = async (auctionId, amount) => {
  try {
    const response = await apiClient.post(`/api/auctions/hybrid/${auctionId}/bid`, { amount });
    return response.data;
  } catch (error) {
    console.error('Error placing bid:', error);
    throw error;
  }
};

/**
 * Settle auction on blockchain
 * @param {number} auctionId - Auction ID
 * @returns {Promise}
 */
export const settleAuction = async (auctionId) => {
  try {
    const response = await apiClient.post(`/api/auctions/hybrid/${auctionId}/settle`);
    return response.data;
  } catch (error) {
    console.error('Error settling auction:', error);
    throw error;
  }
};

/**
 * Cancel auction
 * @param {number} auctionId - Auction ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise}
 */
export const cancelAuction = async (auctionId, reason) => {
  try {
    const response = await apiClient.post(`/api/auctions/hybrid/${auctionId}/cancel`, { reason });
    return response.data;
  } catch (error) {
    console.error('Error canceling auction:', error);
    throw error;
  }
};

/**
 * Get auction statistics
 * @returns {Promise}
 */
export const getAuctionStats = async () => {
  try {
    const response = await apiClient.get('/api/auctions/hybrid/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching auction stats:', error);
    throw error;
  }
};

/**
 * Get auction timeline for a loan
 * @param {number} loanId - Loan ID
 * @returns {Promise}
 */
export const getLoanAuctionTimeline = async (loanId) => {
  try {
    const response = await apiClient.get(`/api/auctions/hybrid/loan/${loanId}/timeline`);
    return response.data;
  } catch (error) {
    console.error('Error fetching auction timeline:', error);
    throw error;
  }
};

/**
 * Get user's auction activity
 * @returns {Promise}
 */
export const getMyAuctionActivity = async () => {
  try {
    const response = await apiClient.get('/api/auctions/hybrid/my-activity');
    return response.data;
  } catch (error) {
    console.error('Error fetching auction activity:', error);
    throw error;
  }
};

/**
 * Run auction completion check
 * This should be called by a cron job
 * @returns {Promise}
 */
export const runAuctionCompletionCheck = async () => {
  try {
    const response = await apiClient.post('/api/auctions/hybrid/cron/check-completion');
    return response.data;
  } catch (error) {
    console.error('Error running auction completion check:', error);
    throw error;
  }
};

/**
 * Get auction bid history
 * @param {number} auctionId - Auction ID
 * @returns {Promise}
 */
export const getAuctionBidHistory = async (auctionId) => {
  try {
    const response = await apiClient.get(`/api/auctions/hybrid/${auctionId}/bids`);
    return response.data;
  } catch (error) {
    console.error('Error fetching bid history:', error);
    throw error;
  }
};

// Auction status constants
export const AUCTION_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  EXTENDED: 'extended',
  SETTLING: 'settling',
  SETTLED: 'settled',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

// Auction types
export const AUCTION_TYPES = {
  ENGLISH: 'english',         // Price increases with each bid
  DUTCH: 'dutch',            // Price starts high, decreases
  SEALED_BID: 'sealed_bid',  // Highest bid wins, bids hidden
  DUTCH_ENGLISH_HYBRID: 'dutch_english_hybrid' // Combination
};

// Auction configuration templates
export const AUCTION_CONFIG_TEMPLATES = {
  STANDARD: {
    name: 'Standard Auction',
    type: AUCTION_TYPES.ENGLISH,
    duration: 7, // days
    extensionWindow: 15, // minutes
    minIncrement: 50,
    startingPricePercentage: 70, // % of collateral value
    reservePricePercentage: 50
  },
  QUICK: {
    name: 'Quick Auction',
    type: AUCTION_TYPES.ENGLISH,
    duration: 3,
    extensionWindow: 5,
    minIncrement: 100,
    startingPricePercentage: 60,
    reservePricePercentage: 40
  },
  SEALED: {
    name: 'Sealed Bid Auction',
    type: AUCTION_TYPES.SEALED_BID,
    duration: 5,
    extensionWindow: 0,
    minIncrement: 0,
    startingPricePercentage: 70,
    reservePricePercentage: 50
  },
  AGGRESSIVE: {
    name: 'Aggressive Discount',
    type: AUCTION_TYPES.DUTCH,
    duration: 14,
    extensionWindow: 0,
    minIncrement: 0,
    startingPricePercentage: 80,
    reservePricePercentage: 30,
    priceDecrementRate: 2 // % per day
  }
};

export default {
  getAuctions,
  getActiveAuctions,
  createAuction,
  getAuctionDetails,
  placeBid,
  settleAuction,
  cancelAuction,
  getAuctionStats,
  getLoanAuctionTimeline,
  getMyAuctionActivity,
  runAuctionCompletionCheck,
  getAuctionBidHistory,
  AUCTION_STATUS,
  AUCTION_TYPES,
  AUCTION_CONFIG_TEMPLATES
};
