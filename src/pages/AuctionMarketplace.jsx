import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Gavel, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Users, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/formatters';
import { 
  getActiveAuctions, 
  getAuctionById, 
  placeBid, 
  getMyBids,
  getAuctionStats,
  clearAuctionDetails,
} from '../store/slices/auctionSlice';

export default function AuctionMarketplace() {
  const dispatch = useDispatch();
  const { 
    activeAuctions, 
    auctionDetails, 
    myBids, 
    auctionStats, 
    isLoading, 
    error 
  } = useSelector((state) => state.auctions);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { balance } = useSelector((state) => state.wallet);

  const [selectedAuction, setSelectedAuction] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    dispatch(getActiveAuctions());
    dispatch(getAuctionStats());
    if (isAuthenticated) {
      dispatch(getMyBids());
    }
  }, [dispatch, isAuthenticated]);

  const handleSelectAuction = async (auctionId) => {
    setSelectedAuction(auctionId);
    await dispatch(getAuctionById(auctionId));
  };

  const handlePlaceBid = async () => {
    if (!bidAmount || !selectedAuction) return;
    
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid bid amount');
      return;
    }

    try {
      await dispatch(placeBid({ auctionId: selectedAuction, amount })).unwrap();
      toast.success('Bid placed successfully!');
      setBidAmount('');
      // Refresh auction details
      await dispatch(getAuctionById(selectedAuction));
    } catch (err) {
      toast.error(err || 'Failed to place bid');
    }
  };

  const formatTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getMinBid = (currentBid, startingBid, minIncrement) => {
    return currentBid ? currentBid + minIncrement : startingBid;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Gavel className="w-6 h-6" />
          Loan Auction Marketplace
        </h1>
        <p className="text-gray-600 mt-1">
          Bid on defaulted loans and recover your investment
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Gavel className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Auctions</p>
              <p className="text-xl font-bold text-gray-900">
                {auctionStats?.activeAuctions || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Volume</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(auctionStats?.totalBidVolume || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">My Bids</p>
              <p className="text-xl font-bold text-gray-900">
                {myBids.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">My Wallet</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(balance || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Auction List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Available Auctions</h2>
              <button
                onClick={() => dispatch(getActiveAuctions())}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            
            {isLoading && activeAuctions.length === 0 ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : activeAuctions.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No active auctions at the moment</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {activeAuctions.map((auction) => (
                  <div
                    key={auction.id}
                    onClick={() => handleSelectAuction(auction.id)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedAuction === auction.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Loan #{auction.loanId.slice(0, 8)}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Starting: {formatCurrency(auction.startingBid)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(auction.currentBid || auction.startingBid)}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />
                          {formatTimeRemaining(auction.endTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Auction Details & Bidding */}
        <div className="lg:col-span-1">
          {selectedAuction && auctionDetails ? (
            <div className="bg-white rounded-lg border border-gray-200 sticky top-4">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Auction Details</h2>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Loan ID</p>
                  <p className="font-medium text-gray-900">{auctionDetails.loanId}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Starting Bid</p>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(auctionDetails.startingBid)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Current Bid</p>
                  <p className="font-bold text-xl text-green-600">
                    {formatCurrency(auctionDetails.currentBid)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Minimum Increment</p>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(auctionDetails.minIncrement)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Time Remaining</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTimeRemaining(auctionDetails.endTime)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Total Bids</p>
                  <p className="font-medium text-gray-900">
                    {auctionDetails.bids?.length || 0} bids
                  </p>
                </div>

                {/* Bid History */}
                {auctionDetails.bids && auctionDetails.bids.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Recent Bids</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {auctionDetails.bids.slice(-5).reverse().map((bid, index) => (
                        <div key={bid.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {index === 0 ? 'You' : `Bidder ${bid.bidderId.slice(0, 4)}`}
                          </span>
                          <span className="font-medium">{formatCurrency(bid.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bid Form */}
                {isAuthenticated ? (
                  <div className="pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Bid (min: {formatCurrency(getMinBid(
                        auctionDetails.currentBid,
                        auctionDetails.startingBid,
                        auctionDetails.minIncrement
                      ))})
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          placeholder="Enter amount"
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min={getMinBid(
                            auctionDetails.currentBid,
                            auctionDetails.startingBid,
                            auctionDetails.minIncrement
                          )}
                        />
                      </div>
                      <button
                        onClick={handlePlaceBid}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Bid'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 text-center">
                      Please log in to place a bid
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Gavel className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">
                Select an auction to view details and place bids
              </p>
            </div>
          )}
        </div>
      </div>

      {/* My Bids Section */}
      {isAuthenticated && myBids.length > 0 && (
        <div className="mt-8 bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">My Bids</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auction</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">My Bid</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Bid</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {myBids.map((bid) => (
                  <tr key={bid.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {bid.auctionId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(bid.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatCurrency(bid.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
