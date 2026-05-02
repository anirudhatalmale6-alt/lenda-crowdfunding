import { createApiClient } from '../utils/api/client';
import type { Auction, AuctionBid, CreateAuctionData, PlaceBidData, ApiResponse } from '../types';

const API_URL = '/api/auctions';

// Create auction-specific API client
const api = createApiClient(API_URL);

const auctionService = {
  /**
   * Create a new auction for a loan
   */
  createAuction: async (auctionData: CreateAuctionData): Promise<ApiResponse<Auction>> => {
    const response = await api.post('/', auctionData);
    return response.data;
  },

  /**
   * Get all auctions (with optional filters)
   */
  getAuctions: async (filters: {
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<{ auctions: Auction[]; pagination: { page: number; limit: number; total: number } }>> => {
    const response = await api.get('/', { params: filters });
    return response.data;
  },

  /**
   * Get a single auction by ID
   */
  getAuctionById: async (auctionId: string): Promise<ApiResponse<Auction>> => {
    const response = await api.get(`/${auctionId}`);
    return response.data;
  },

  /**
   * Get auction for a specific loan
   */
  getAuctionByLoanId: async (loanId: string): Promise<ApiResponse<Auction>> => {
    const response = await api.get(`/loan/${loanId}`);
    return response.data;
  },

  /**
   * Place a bid on an auction
   */
  placeBid: async (bidData: PlaceBidData): Promise<ApiResponse<AuctionBid>> => {
    const response = await api.post(`/${bidData.auctionId}/bid`, { amount: bidData.amount });
    return response.data;
  },

  /**
   * Get all bids for an auction
   */
  getAuctionBids: async (auctionId: string): Promise<ApiResponse<AuctionBid[]>> => {
    const response = await api.get(`/${auctionId}/bids`);
    return response.data;
  },

  /**
   * Get user's bids
   */
  getMyBids: async (): Promise<ApiResponse<AuctionBid[]>> => {
    const response = await api.get('/my-bids');
    return response.data;
  },

  /**
   * Cancel an auction (owner or admin only)
   */
  cancelAuction: async (auctionId: string): Promise<ApiResponse<Auction>> => {
    const response = await api.post(`/${auctionId}/cancel`);
    return response.data;
  },

  /**
   * End auction manually (admin only)
   */
  endAuction: async (auctionId: string): Promise<ApiResponse<Auction>> => {
    const response = await api.post(`/${auctionId}/end`);
    return response.data;
  },

  /**
   * Get active auctions
   */
  getActiveAuctions: async (): Promise<ApiResponse<Auction[]>> => {
    const response = await api.get('/active');
    return response.data;
  },

  /**
   * Get auction statistics
   */
  getAuctionStats: async (): Promise<ApiResponse<{
    totalAuctions: number;
    activeAuctions: number;
    completedAuctions: number;
    totalBidVolume: number;
  }>> => {
    const response = await api.get('/stats');
    return response.data;
  },

  /**
   * Withdraw from an auction (withdraw own bid)
   */
  withdrawBid: async (auctionId: string): Promise<ApiResponse<{ success: boolean }>> => {
    const response = await api.post(`/${auctionId}/withdraw`);
    return response.data;
  },

  /**
   * Schedule an auction for a future time
   */
  scheduleAuction: async (auctionData: CreateAuctionData & { startTime: string }): Promise<ApiResponse<Auction>> => {
    const response = await api.post('/schedule', auctionData);
    return response.data;
  },
};

export default auctionService;
