import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import auctionService from '../../services/auctionService';
import type { Auction, AuctionBid } from '../../types';

interface AuctionState {
  auctions: Auction[];
  activeAuctions: Auction[];
  auctionDetails: Auction | null;
  myBids: AuctionBid[];
  auctionStats: {
    totalAuctions: number;
    activeAuctions: number;
    completedAuctions: number;
    totalBidVolume: number;
  } | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const initialState: AuctionState = {
  auctions: [],
  activeAuctions: [],
  auctionDetails: null,
  myBids: [],
  auctionStats: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },
};

// Create a new auction
export const createAuction = createAsyncThunk(
  'auctions/create',
  async (auctionData: {
    loanId: string;
    startingBid: number;
    minIncrement?: number;
    duration: number;
  }, { rejectWithValue }) => {
    try {
      const response = await auctionService.createAuction(auctionData);
      return response.data as Auction;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Get all auctions
export const getAuctions = createAsyncThunk(
  'auctions/getAll',
  async (filters: {
    status?: string;
    page?: number;
    limit?: number;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await auctionService.getAuctions(filters);
      return response.data as {
        auctions: Auction[];
        pagination: { page: number; limit: number; total: number };
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Get active auctions
export const getActiveAuctions = createAsyncThunk(
  'auctions/getActive',
  async (_, { rejectWithValue }) => {
    try {
      const response = await auctionService.getActiveAuctions();
      return response.data as Auction[];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Get single auction
export const getAuctionById = createAsyncThunk(
  'auctions/getById',
  async (auctionId: string, { rejectWithValue }) => {
    try {
      const response = await auctionService.getAuctionById(auctionId);
      return response.data as Auction;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Place a bid
export const placeBid = createAsyncThunk(
  'auctions/placeBid',
  async (bidData: { auctionId: string; amount: number }, { rejectWithValue }) => {
    try {
      const response = await auctionService.placeBid(bidData);
      return response.data as AuctionBid;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Get user's bids
export const getMyBids = createAsyncThunk(
  'auctions/getMyBids',
  async (_, { rejectWithValue }) => {
    try {
      const response = await auctionService.getMyBids();
      return response.data as AuctionBid[];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Get auction stats
export const getAuctionStats = createAsyncThunk(
  'auctions/getStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await auctionService.getAuctionStats();
      return response.data as {
        totalAuctions: number;
        activeAuctions: number;
        completedAuctions: number;
        totalBidVolume: number;
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Cancel auction
export const cancelAuction = createAsyncThunk(
  'auctions/cancel',
  async (auctionId: string, { rejectWithValue }) => {
    try {
      const response = await auctionService.cancelAuction(auctionId);
      return response.data as Auction;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// End auction
export const endAuction = createAsyncThunk(
  'auctions/end',
  async (auctionId: string, { rejectWithValue }) => {
    try {
      const response = await auctionService.endAuction(auctionId);
      return response.data as Auction;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Withdraw bid
export const withdrawBid = createAsyncThunk(
  'auctions/withdrawBid',
  async (auctionId: string, { rejectWithValue }) => {
    try {
      const response = await auctionService.withdrawBid(auctionId);
      const data = response.data;
      if (data && 'success' in data) {
        return { auctionId, success: data.success };
      }
      return { auctionId, success: true };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const auctionSlice = createSlice({
  name: 'auctions',
  initialState,
  reducers: {
    clearAuctionError: (state) => {
      state.error = null;
    },
    clearAuctionDetails: (state) => {
      state.auctionDetails = null;
    },
    setAuctionPage: (state, action) => {
      state.pagination.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create auction
      .addCase(createAuction.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createAuction.fulfilled, (state, action) => {
        state.isLoading = false;
        state.auctions.unshift(action.payload);
      })
      .addCase(createAuction.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Get auctions
      .addCase(getAuctions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getAuctions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.auctions = action.payload.auctions;
        state.pagination = action.payload.pagination;
      })
      .addCase(getAuctions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Get active auctions
      .addCase(getActiveAuctions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getActiveAuctions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeAuctions = action.payload;
      })
      .addCase(getActiveAuctions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Get auction by ID
      .addCase(getAuctionById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getAuctionById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.auctionDetails = action.payload;
      })
      .addCase(getAuctionById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Place bid
      .addCase(placeBid.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(placeBid.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myBids.unshift(action.payload);
        // Update auction details with new bid
        if (state.auctionDetails) {
          state.auctionDetails.currentBid = action.payload.amount;
          state.auctionDetails.highestBidderId = action.payload.bidderId;
        }
      })
      .addCase(placeBid.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Get my bids
      .addCase(getMyBids.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getMyBids.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myBids = action.payload;
      })
      .addCase(getMyBids.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Get auction stats
      .addCase(getAuctionStats.fulfilled, (state, action) => {
        state.auctionStats = action.payload;
      })
      // Cancel auction
      .addCase(cancelAuction.fulfilled, (state, action) => {
        const index = state.auctions.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.auctions[index] = action.payload;
        }
        if (state.auctionDetails?.id === action.payload.id) {
          state.auctionDetails = action.payload;
        }
      })
      // End auction
      .addCase(endAuction.fulfilled, (state, action) => {
        const index = state.auctions.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.auctions[index] = action.payload;
        }
        if (state.auctionDetails?.id === action.payload.id) {
          state.auctionDetails = action.payload;
        }
        // Remove from active auctions if completed
        state.activeAuctions = state.activeAuctions.filter(
          a => a.id !== action.payload.id
        );
      })
      // Withdraw bid
      .addCase(withdrawBid.fulfilled, (state, action) => {
        const { auctionId } = action.payload;
        state.myBids = state.myBids.filter(
          b => b.auctionId !== auctionId
        );
      });
  },
});

export const { clearAuctionError, clearAuctionDetails, setAuctionPage } = auctionSlice.actions;
export default auctionSlice.reducer;
