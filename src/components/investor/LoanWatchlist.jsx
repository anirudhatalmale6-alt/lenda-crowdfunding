import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { formatCurrency, formatPercentage, formatDate } from '../../utils/formatters';
import { addToWatchlist, removeFromWatchlist, getWatchlist } from '../../store/slices/uiSlice';

/**
 * LoanWatchlist - UX-009: Watchlist functionality for tracking loans
 * Allows investors to save and monitor loans they're interested in
 */
function LoanWatchlist({ loans = [], showHeader = true, onRemove }) {
    const dispatch = useDispatch();
    const { watchlist } = useSelector((state) => state.ui);
    
    const [isExpanded, setIsExpanded] = useState(true);

    // Get full loan details for watchlist items
    const watchlistLoans = loans.filter(loan => watchlist.includes(loan.id));

    const handleRemove = async (loanId) => {
        await dispatch(removeFromWatchlist(loanId));
        toast.success('Removed from watchlist');
        onRemove?.(loanId);
    };

    const getRiskColor = (rating) => {
        const colors = {
            'AAA': 'bg-green-100 text-green-800',
            'AA': 'bg-green-50 text-green-700',
            'A': 'bg-blue-100 text-blue-800',
            'BBB': 'bg-blue-50 text-blue-700',
            'BB': 'bg-yellow-100 text-yellow-800',
            'B': 'bg-orange-100 text-orange-800',
            'CCC': 'bg-red-100 text-red-800',
            'D': 'bg-red-200 text-red-900',
        };
        return colors[rating] || 'bg-gray-100 text-gray-800';
    };

    // Empty state
    if (watchlistLoans.length === 0) {
        return (
            <div className="card p-6 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <p className="text-gray-500">Your watchlist is empty</p>
                <p className="text-sm text-gray-400 mt-1">
                    Browse loans and click the eye icon to add them here
                </p>
                <Link 
                    to="/dashboard/invest" 
                    className="inline-block mt-3 text-blue-600 hover:text-blue-800 font-medium"
                >
                    Browse Loans →
                </Link>
            </div>
        );
    }

    return (
        <div className="card overflow-hidden">
            {showHeader && (
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <h3 className="font-semibold text-gray-900">Watchlist</h3>
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                            {watchlistLoans.length}
                        </span>
                    </div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg 
                            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            )}

            {isExpanded && (
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {watchlistLoans.map((loan) => (
                        <div key={loan.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Link 
                                            to={`/loans/${loan.id}`}
                                            className="font-medium text-gray-900 hover:text-blue-600 truncate"
                                        >
                                            Loan #{loan.id}
                                        </Link>
                                        <span className={`px-2 py-0.5 rounded text-xs ${getRiskColor(loan.riskRating)}`}>
                                            {loan.riskRating}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 text-sm text-gray-500">
                                        <span>{formatCurrency(loan.loanAmount)}</span>
                                        <span className="text-emerald-600 font-medium">{loan.interestRate}% APR</span>
                                        <span>{loan.durationMonths} mo</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    <Link
                                        to={`/loans/${loan.id}`}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="View Details"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </Link>
                                    <button
                                        onClick={() => handleRemove(loan.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Remove from Watchlist"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Funding Progress */}
                            <div className="mt-3">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Funding</span>
                                    <span>{Math.round((loan.fundedAmount / loan.loanAmount) * 100)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div 
                                        className="bg-emerald-500 h-1.5 rounded-full"
                                        style={{ width: `${(loan.fundedAmount / loan.loanAmount) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showHeader && isExpanded && (
                <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                    <Link 
                        to="/dashboard/invest" 
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        View All Loans →
                    </Link>
                </div>
            )}
        </div>
    );
}

/**
 * WatchlistButton - Toggle button to add/remove loans from watchlist
 */
function WatchlistButton({ loanId, size = 'md', showLabel = false }) {
    const dispatch = useDispatch();
    const { watchlist } = useSelector((state) => state.ui);
    
    const isWatched = watchlist.includes(loanId);
    
    const handleToggle = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isWatched) {
            await dispatch(removeFromWatchlist(loanId));
            toast.success('Removed from watchlist');
        } else {
            await dispatch(addToWatchlist(loanId));
            toast.success('Added to watchlist');
        }
    };

    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-10 h-10',
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };

    return (
        <button
            onClick={handleToggle}
            className={`inline-flex items-center gap-1.5 rounded-lg transition-colors ${
                isWatched 
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
            } ${showLabel ? 'px-3 py-1.5' : `p-1.5 ${sizeClasses[size]}`} `}
            title={isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
        >
            <svg 
                className={iconSizes[size]} 
                fill={isWatched ? 'currentColor' : 'none'} 
                stroke="currentColor" 
                viewBox="0 0 24 24"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {showLabel && (
                <span className="text-sm font-medium">
                    {isWatched ? 'Watching' : 'Watch'}
                </span>
            )}
        </button>
    );
}

export { LoanWatchlist, WatchlistButton };
export default LoanWatchlist;
