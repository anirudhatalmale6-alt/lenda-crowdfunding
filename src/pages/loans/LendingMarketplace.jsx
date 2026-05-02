import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getLoanRequests, setFilters } from '../../store/slices/loanSlice';
import { LoanReputationIndicator } from '../../components/reputation';
import TrendingLoanBadge from '../../components/loans/TrendingLoanBadge';
import { 
    RiskBadge, 
    ReputationBadge, 
    TrustScoreIndicator,
    PlatformStats,
    ReserveCoverageIndicator,
    CollateralVerificationBadge
} from '../../components/trust';
import { 
    Search, 
    Filter, 
    TrendingUp, 
    Shield, 
    Clock,
    ArrowRight,
    DollarSign,
    Percent,
    Users,
    Star,
    LayoutGrid,
    List,
    Flame,
    Zap
} from 'lucide-react';

/**
 * LendingMarketplace - Loan marketplace for lenders
 */
function LendingMarketplace() {
    const dispatch = useDispatch();
    const { loanRequests, isLoading, pagination } = useSelector(state => state.loans);
    const { filters } = useSelector(state => state.rates);
    const { user } = useSelector(state => state.auth);
    
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    
    // Load loans on mount
    useEffect(() => {
        dispatch(getLoanRequests(filters));
    }, [dispatch, filters]);
    
    // Mock data for demonstration
    const mockLoans = [
        {
            id: 1,
            title: 'Business Expansion Loan',
            borrower: 'TechStart Inc.',
            borrowerId: 101,
            borrowerRisk: 'AA',
            amount: 50000,
            funded: 75,
            rate: 12.5,
            duration: 24,
            description: 'Funding for business expansion and equipment purchase.',
            collateral: 'Real Estate',
            collateralValue: 85000,
            ltv: 58.8,
            status: 'ACTIVE',
            lenders: 12,
            minInvestment: 100,
        },
        {
            id: 2,
            title: 'Inventory Financing',
            borrower: 'RetailPro LLC',
            borrowerId: 102,
            borrowerRisk: 'A',
            amount: 25000,
            funded: 40,
            rate: 15.0,
            duration: 12,
            description: 'Seasonal inventory purchase for Q4 sales.',
            collateral: 'Equipment',
            collateralValue: 45000,
            ltv: 55.5,
            status: 'ACTIVE',
            lenders: 5,
            minInvestment: 100,
        },
        {
            id: 3,
            title: 'Working Capital',
            borrower: 'Green Energy Co.',
            borrowerId: 103,
            borrowerRisk: 'AAA',
            amount: 100000,
            funded: 90,
            rate: 8.5,
            duration: 36,
            description: 'Working capital for renewable energy project.',
            collateral: 'Real Estate',
            collateralValue: 200000,
            ltv: 50,
            status: 'ACTIVE',
            lenders: 28,
            minInvestment: 500,
        },
        {
            id: 4,
            title: 'Equipment Purchase',
            borrower: 'ConstructAll Ltd.',
            borrowerId: 104,
            borrowerRisk: 'BBB',
            amount: 75000,
            funded: 20,
            rate: 18.0,
            duration: 24,
            description: 'Heavy machinery for construction projects.',
            collateral: 'Vehicle',
            collateralValue: 100000,
            ltv: 75,
            status: 'ACTIVE',
            lenders: 3,
            minInvestment: 250,
        },
        {
            id: 5,
            title: 'Restaurant Renovation',
            borrower: 'TastyBites LLC',
            borrowerId: 105,
            borrowerRisk: 'B',
            amount: 30000,
            funded: 60,
            rate: 22.0,
            duration: 18,
            description: 'Restaurant renovation and kitchen upgrade.',
            collateral: 'Real Estate',
            collateralValue: 60000,
            ltv: 50,
            status: 'ACTIVE',
            lenders: 8,
            minInvestment: 100,
        },
    ];
    
    const loans = Array.isArray(loanRequests) && loanRequests.length > 0 ? loanRequests : mockLoans;
    
    // Filter loans by search
    const filteredLoans = loans.filter(loan => 
        loan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.borrower.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Get risk badge color
    const getRiskBadge = (risk) => {
        const colors = {
            'AAA': 'bg-emerald-100 text-emerald-700',
            'AA': 'bg-emerald-50 text-emerald-600',
            'A': 'bg-blue-50 text-blue-600',
            'BBB': 'bg-blue-50 text-blue-600',
            'BB': 'bg-amber-50 text-amber-600',
            'B': 'bg-amber-50 text-amber-600',
            'C': 'bg-red-50 text-red-600',
            'D': 'bg-red-100 text-red-700',
        };
        return colors[risk] || 'bg-slate-100 text-slate-600';
    };
    
    // Get yield badge
    const getYieldBadge = (rate) => {
        if (rate >= 20) return { label: 'High Yield', color: 'bg-emerald-100 text-emerald-700' };
        if (rate >= 15) return { label: 'Good Yield', color: 'bg-blue-100 text-blue-700' };
        return { label: 'Standard', color: 'bg-slate-100 text-slate-600' };
    };
    
    // Get accelerator badge info
    const getAcceleratorBadge = (funded) => {
        if (funded >= 90) return { label: 'Almost Funded', color: 'bg-green-500', icon: '🎉' };
        if (funded >= 75) return { label: 'Hot', color: 'bg-red-500', icon: '🔥' };
        if (funded >= 50) return { label: 'Trending', color: 'bg-orange-500', icon: '⚡' };
        return null;
    };
    
    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };
    
    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        Lending Marketplace
                    </h1>
                    <p className="text-slate-600">
                        Browse available loans and invest in ones that match your risk tolerance.
                    </p>
                </div>
                
                {/* Trust Signals - Platform Stats */}
                <div className="mb-6">
                    <PlatformStats compact />
                </div>
                
                {/* Search and Filters */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search loans..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        
                        {/* Filter Toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            <Filter className="w-4 h-4" />
                            Filters
                        </button>
                        
                        {/* View Mode */}
                        <div className="flex border border-slate-300 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 ${viewMode === 'grid' ? 'bg-primary-500 text-white' : 'bg-white text-slate-600'}`}
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'bg-white text-slate-600'}`}
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Filter Panel */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-600 mb-1">Min Amount</label>
                                    <select className="w-full border rounded-lg p-2">
                                        <option>Any</option>
                                        <option>₦1,000+</option>
                                        <option>₦5,000+</option>
                                        <option>₦10,000+</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-600 mb-1">Max Amount</label>
                                    <select className="w-full border rounded-lg p-2">
                                        <option>Any</option>
                                        <option>₦25,000</option>
                                        <option>₦50,000</option>
                                        <option>₦100,000</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-600 mb-1">Min Rate</label>
                                    <select className="w-full border rounded-lg p-2">
                                        <option>Any</option>
                                        <option>5%+</option>
                                        <option>10%+</option>
                                        <option>15%+</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-600 mb-1">Duration</label>
                                    <select className="w-full border rounded-lg p-2">
                                        <option>Any</option>
                                        <option>≤12 months</option>
                                        <option>≤24 months</option>
                                        <option>≤36 months</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Results Count */}
                <div className="flex items-center justify-between mb-4">
                    <p className="text-slate-600">
                        Showing <span className="font-semibold">{filteredLoans.length}</span> loans
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Sort by:</span>
                        <select className="border-0 text-sm font-medium text-slate-700 focus:ring-0">
                            <option>Highest Yield</option>
                            <option>Most Funded</option>
                            <option>Ending Soon</option>
                            <option>Newest</option>
                        </select>
                    </div>
                </div>
                
                {/* Loan Grid/List */}
                {isLoading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                                <div className="h-8 bg-slate-200 rounded w-3/4 mb-4"></div>
                                <div className="h-3 bg-slate-200 rounded w-full"></div>
                            </div>
                        ))}
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredLoans.map(loan => {
                            const yieldBadge = getYieldBadge(loan.rate);
                            return (
                                <Link 
                                    key={loan.id} 
                                    to={`/loans/${loan.id}`}
                                    className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-primary-300 transition-all group"
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="font-semibold text-slate-900 group-hover:text-primary-600">
                                                {loan.title}
                                            </h3>
                                            <p className="text-sm text-slate-500">{loan.borrower}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskBadge(loan.borrowerRisk)}`}>
                                            {loan.borrowerRisk}
                                        </span>
                                    </div>
                                    
                                    {/* Badges */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${yieldBadge.color}`}>
                                            {yieldBadge.label}
                                        </span>
                                        {loan.funded >= 75 && (
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                                                High Demand
                                            </span>
                                        )}
                                        {/* Accelerator Badge */}
                                        {getAcceleratorBadge(loan.funded) && (
                                            <TrendingLoanBadge fundingPercentage={loan.funded} />
                                        )}
                                    </div>
                                    
                                    {/* Borrower Reputation */}
                                    {loan.borrowerId && (
                                        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <ReputationBadge score={75 + (loan.id * 5) % 20} showScore />
                                            </div>
                                            <TrustScoreIndicator 
                                                reputationScore={75 + (loan.id * 5) % 20}
                                                riskRating={loan.borrowerRisk}
                                                successRate={90 + (loan.id * 2) % 10}
                                                completedLoans={loan.id * 3}
                                            />
                                        </div>
                                    )}
                                    
                                    {/* Collateral Verification */}
                                    <div className="mb-4">
                                        <CollateralVerificationBadge 
                                            status="verified"
                                            collateralType={loan.collateral || 'Real Estate'}
                                            showDetails={false}
                                            compact
                                        />
                                    </div>
                                    
                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <div>
                                            <div className="text-lg font-bold text-slate-900">{loan.rate}%</div>
                                            <div className="text-xs text-slate-500">Interest</div>
                                        </div>
                                        <div>
                                            <div className="text-lg font-bold text-slate-900">{loan.duration}mo</div>
                                            <div className="text-xs text-slate-500">Duration</div>
                                        </div>
                                        <div>
                                            <div className="text-lg font-bold text-slate-900">{loan.ltv}%</div>
                                            <div className="text-xs text-slate-500">LTV</div>
                                        </div>
                                    </div>
                                    
                                    {/* Funding Progress */}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-600">Funding</span>
                                            <span className="font-medium">{loan.funded}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div 
                                                className={`h-2 rounded-full ${
                                                    loan.funded >= 75 ? 'bg-emerald-500' :
                                                    loan.funded >= 50 ? 'bg-primary-500' : 'bg-amber-500'
                                                }`}
                                                style={{ width: `${loan.funded}%` }}
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-1 text-slate-500">
                                            <Users className="w-4 h-4" />
                                            <span className="text-sm">{loan.lenders} investors</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-primary-600 font-medium text-sm">
                                            View Details
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                    
                                    {/* Trust Signal - Risk Rating Badge */}
                                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                        <RiskBadge rating={loan.borrowerRisk} showLabel size="sm" />
                                        <ReserveCoverageIndicator compact />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredLoans.map(loan => (
                            <Link 
                                key={loan.id} 
                                to={`/loans/${loan.id}`}
                                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-primary-300 transition-all group"
                            >
                                <div className="flex items-center gap-6">
                                    {/* Left */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-slate-900 group-hover:text-primary-600">
                                                {loan.title}
                                            </h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskBadge(loan.borrowerRisk)}`}>
                                                {loan.borrowerRisk}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500">{loan.borrower}</p>
                                    </div>
                                    
                                    {/* Stats */}
                                    <div className="flex items-center gap-8">
                                        <div className="text-center">
                                            <div className="font-bold text-slate-900">{formatCurrency(loan.amount)}</div>
                                            <div className="text-xs text-slate-500">Amount</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-bold text-primary-600">{loan.rate}%</div>
                                            <div className="text-xs text-slate-500">Interest</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-bold text-slate-900">{loan.duration}mo</div>
                                            <div className="text-xs text-slate-500">Duration</div>
                                        </div>
                                        <div className="w-32">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-500">{loan.funded}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${loan.funded}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default LendingMarketplace;
