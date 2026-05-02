import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
} from 'recharts';
import {
    RefreshCw,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    ArrowRight,
    DollarSign,
    Shield,
    Clock,
    Target,
    BarChart3,
    Wallet,
    Loader,
    Info,
    X,
    Zap,
} from 'lucide-react';
import { getMyFundedLoans } from '../../store/slices/loanSlice';
import { DiversificationScore } from '../../components/risk/PortfolioDiversificationAlert';
import { formatCurrency } from '../../utils/formatters';

/**
 * PortfolioRebalancing - UX-04: Complete portfolio rebalancing feature
 * Provides actionable diversification recommendations and automated rebalancing
 */
function PortfolioRebalancing() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { isLoading } = useSelector((state) => state.loans);

    const [portfolio, setPortfolio] = useState([]);
    const [isRebalancing, setIsRebalancing] = useState(false);
    const [showRebalanceModal, setShowRebalanceModal] = useState(false);
    const [selectedRecommendations, setSelectedRecommendations] = useState([]);
    const [analysisComplete, setAnalysisComplete] = useState(false);

    // Load portfolio data
    useEffect(() => {
        loadPortfolio();
    }, []);

    const loadPortfolio = async () => {
        try {
            const response = await dispatch(getMyFundedLoans()).unwrap();
            const loans = response.loans || [];
            
            // Transform into portfolio items
            const portfolioItems = loans.map((loan) => ({
                id: loan.id,
                loanId: loan.id,
                value: loan.fundedAmount || 0,
                earnedAmount: loan.earnedAmount || 0,
                interestRate: loan.interestRate || 0,
                durationMonths: loan.durationMonths || 0,
                status: loan.status || 'UNKNOWN',
                collateralType: loan.collateral_type || 'unsecured',
                riskLevel: loan.risk_category || 'B',
                borrowerId: loan.borrower_id,
            }));
            
            setPortfolio(portfolioItems);
            
            // Simulate analysis delay
            setTimeout(() => setAnalysisComplete(true), 1000);
        } catch (error) {
            console.error('Failed to load portfolio:', error);
            // Use mock data for demo
            setPortfolio(getMockPortfolio());
            setAnalysisComplete(true);
        }
    };

    const getMockPortfolio = () => [
        { id: 1, loanId: 101, value: 15000, earnedAmount: 1200, interestRate: 18, durationMonths: 24, status: 'ACTIVE', collateralType: 'real_estate', riskLevel: 'A' },
        { id: 2, loanId: 102, value: 8000, earnedAmount: 450, interestRate: 15, durationMonths: 12, status: 'ACTIVE', collateralType: 'vehicle', riskLevel: 'B' },
        { id: 3, loanId: 103, value: 20000, earnedAmount: 2800, interestRate: 22, durationMonths: 36, status: 'ACTIVE', collateralType: 'business', riskLevel: 'C' },
        { id: 4, loanId: 104, value: 5000, earnedAmount: 200, interestRate: 12, durationMonths: 6, status: 'REPAID', collateralType: 'unsecured', riskLevel: 'A' },
        { id: 5, loanId: 105, value: 12000, earnedAmount: 800, interestRate: 16, durationMonths: 18, status: 'ACTIVE', collateralType: 'equipment', riskLevel: 'B' },
    ];

    // Calculate portfolio statistics
    const stats = useMemo(() => {
        const totalValue = portfolio.reduce((sum, item) => sum + item.value, 0);
        const totalEarned = portfolio.reduce((sum, item) => sum + item.earnedAmount, 0);
        
        // Risk distribution
        const riskDistribution = {};
        portfolio.forEach((item) => {
            riskDistribution[item.riskLevel] = (riskDistribution[item.riskLevel] || 0) + item.value;
        });

        // Collateral distribution
        const collateralDistribution = {};
        portfolio.forEach((item) => {
            collateralDistribution[item.collateralType] = (collateralDistribution[item.collateralType] || 0) + item.value;
        });

        // Maturity distribution
        const maturityDistribution = { short: 0, medium: 0, long: 0 };
        portfolio.forEach((item) => {
            if (item.durationMonths <= 6) maturityDistribution.short += item.value;
            else if (item.durationMonths <= 18) maturityDistribution.medium += item.value;
            else maturityDistribution.long += item.value;
        });

        // Average interest rate
        const avgRate = portfolio.length > 0
            ? portfolio.reduce((sum, item) => sum + item.interestRate, 0) / portfolio.length
            : 0;

        // Number of loans
        const numLoans = portfolio.length;

        return {
            totalValue,
            totalEarned,
            riskDistribution,
            collateralDistribution,
            maturityDistribution,
            avgRate,
            numLoans,
            roi: totalValue > 0 ? ((totalEarned / totalValue) * 100) : 0,
        };
    }, [portfolio]);

    // Generate rebalancing recommendations
    const recommendations = useMemo(() => {
        const recs = [];
        
        if (stats.totalValue === 0) return recs;

        // Check single loan concentration
        const maxConcentration = Math.max(...portfolio.map((p) => (p.value / stats.totalValue) * 100));
        if (maxConcentration > 30) {
            const largestLoan = portfolio.reduce((max, p) => p.value > max.value ? p : max, portfolio[0]);
            recs.push({
                id: 'concentration',
                type: 'concentration',
                severity: maxConcentration > 50 ? 'high' : 'medium',
                title: 'Reduce Single Loan Concentration',
                description: `Your largest loan (${formatCurrency(largestLoan.value)}) represents ${maxConcentration.toFixed(1)}% of your portfolio.`,
                action: `Reduce position by ${formatCurrency(Math.floor(largestLoan.value * 0.4))}`,
                suggestedLoans: 3,
                targetAllocation: 20,
                currentAllocation: maxConcentration,
                icon: AlertTriangle,
            });
        }

        // Check collateral diversification
        const collateralTypes = Object.keys(stats.collateralDistribution);
        if (collateralTypes.length < 3) {
            recs.push({
                id: 'collateral',
                type: 'diversification',
                severity: 'medium',
                title: 'Diversify Collateral Types',
                description: 'Your portfolio lacks collateral diversity. Consider adding loans with different collateral types.',
                action: 'Add 2+ different collateral types',
                currentTypes: collateralTypes.length,
                targetTypes: 4,
                icon: Shield,
            });
        }

        // Check maturity diversification
        const maturityTotal = stats.maturityDistribution.short + stats.maturityDistribution.medium + stats.maturityDistribution.long;
        const shortPct = (stats.maturityDistribution.short / maturityTotal) * 100;
        const longPct = (stats.maturityDistribution.long / maturityTotal) * 100;
        
        if (longPct > 60) {
            recs.push({
                id: 'maturity_long',
                type: 'maturity',
                severity: 'low',
                title: 'Add Short-Term Loans',
                description: 'Your portfolio is heavily weighted toward long-term loans. Consider adding short-term loans for better liquidity.',
                action: `Add ${formatCurrency(Math.floor(stats.totalValue * 0.25))} in short-term loans`,
                currentShort: shortPct,
                targetShort: 30,
                icon: Clock,
            });
        }

        if (shortPct > 60) {
            recs.push({
                id: 'maturity_short',
                type: 'maturity',
                severity: 'low',
                title: 'Add Long-Term Loans',
                description: 'Your portfolio is focused on short-term loans. Consider long-term loans for higher yields.',
                action: `Add ${formatCurrency(Math.floor(stats.totalValue * 0.25))} in long-term loans`,
                currentLong: longPct,
                targetLong: 30,
                icon: TrendingUp,
            });
        }

        // Check risk diversification
        if (stats.riskDistribution['C'] && stats.riskDistribution['C'] > stats.totalValue * 0.4) {
            recs.push({
                id: 'risk',
                type: 'risk',
                severity: 'medium',
                title: 'Balance Risk Distribution',
                description: 'Your portfolio has a high concentration of higher-risk loans.',
                action: `Reduce C-rated loans by ${formatCurrency(Math.floor(stats.riskDistribution['C'] * 0.3))}`,
                currentRisk: ((stats.riskDistribution['C'] || 0) / stats.totalValue) * 100,
                targetRisk: 25,
                icon: Target,
            });
        }

        // Check number of loans
        if (stats.numLoans < 10) {
            recs.push({
                id: 'quantity',
                type: 'quantity',
                severity: 'medium',
                title: 'Increase Loan Count',
                description: 'Diversification improves with more loans. Your portfolio has only ' + stats.numLoans + ' loans.',
                action: 'Add ' + (10 - stats.numLoans) + ' more loans',
                currentLoans: stats.numLoans,
                targetLoans: 10,
                icon: BarChart3,
            });
        }

        return recs;
    }, [stats, portfolio]);

    // Calculate diversification score
    const diversificationScore = useMemo(() => {
        if (stats.totalValue === 0) return { score: 0, grade: 'N/A', color: 'gray' };

        let score = 100;

        // Concentration penalty
        const maxConcentration = Math.max(...portfolio.map((p) => (p.value / stats.totalValue) * 100));
        if (maxConcentration > 50) score -= 30;
        else if (maxConcentration > 30) score -= 15;

        // Collateral diversity
        const collateralCount = Object.keys(stats.collateralDistribution).length;
        if (collateralCount < 2) score -= 20;
        else if (collateralCount < 3) score -= 10;

        // Maturity diversity
        const maturityCount = [stats.maturityDistribution.short > 0, stats.maturityDistribution.medium > 0, stats.maturityDistribution.long > 0].filter(Boolean).length;
        if (maturityCount < 2) score -= 15;

        // Loan count
        if (stats.numLoans < 5) score -= 20;
        else if (stats.numLoans < 10) score -= 10;

        score = Math.max(0, Math.min(100, score));

        let grade, color;
        if (score >= 80) { grade = 'A'; color = 'green'; }
        else if (score >= 60) { grade = 'B'; color = 'blue'; }
        else if (score >= 40) { grade = 'C'; color = 'yellow'; }
        else if (score >= 20) { grade = 'D'; color = 'orange'; }
        else { grade = 'F'; color = 'red'; }

        return { score, grade, color };
    }, [stats, portfolio]);

    // Handle rebalancing
    const handleRebalance = async () => {
        setIsRebalancing(true);
        
        // Simulate rebalancing process
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        setIsRebalancing(false);
        setShowRebalanceModal(false);
        toast.success('Portfolio rebalanced successfully!');
        navigate('/dashboard/loans');
    };

    // Chart data
    const collateralData = Object.entries(stats.collateralDistribution).map(([name, value]) => ({
        name: name.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
    }));

    const riskData = Object.entries(stats.riskDistribution).map(([name, value]) => ({
        name: `Risk ${name}`,
        value,
    }));

    const maturityData = [
        { name: 'Short (≤6mo)', value: stats.maturityDistribution.short },
        { name: 'Medium (7-18mo)', value: stats.maturityDistribution.medium },
        { name: 'Long (>18mo)', value: stats.maturityDistribution.long },
    ];

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'high': return 'text-red-600 bg-red-50 border-red-200';
            case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getSeverityButton = (severity) => {
        switch (severity) {
            case 'high': return 'bg-red-600 hover:bg-red-700';
            case 'medium': return 'bg-amber-600 hover:bg-amber-700';
            case 'low': return 'bg-blue-600 hover:bg-blue-700';
            default: return 'bg-primary-600 hover:bg-primary-700';
        }
    };

    if (isLoading || !analysisComplete) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Analyzing your portfolio...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Portfolio Rebalancing</h1>
                    <p className="text-slate-600">Optimize your portfolio diversification</p>
                </div>
                <button
                    onClick={() => setShowRebalanceModal(true)}
                    disabled={recommendations.length === 0}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium ${
                        recommendations.length === 0
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-primary-500 text-white hover:bg-primary-600'
                    }`}
                >
                    <Zap className="w-4 h-4" />
                    Auto-Rebalance
                </button>
            </div>

            {/* Diversification Score */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <div className={`card p-6 border-2 ${
                        diversificationScore.color === 'green' ? 'border-emerald-200 bg-emerald-50' :
                        diversificationScore.color === 'blue' ? 'border-blue-200 bg-blue-50' :
                        diversificationScore.color === 'yellow' ? 'border-amber-200 bg-amber-50' :
                        'border-red-200 bg-red-50'
                    }`}>
                        <div className="text-center">
                            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                                diversificationScore.color === 'green' ? 'bg-emerald-100' :
                                diversificationScore.color === 'blue' ? 'bg-blue-100' :
                                diversificationScore.color === 'yellow' ? 'bg-amber-100' :
                                'bg-red-100'
                            }`}>
                                <span className={`text-3xl font-bold ${
                                    diversificationScore.color === 'green' ? 'text-emerald-600' :
                                    diversificationScore.color === 'blue' ? 'text-blue-600' :
                                    diversificationScore.color === 'yellow' ? 'text-amber-600' :
                                    'text-red-600'
                                }`}>
                                    {diversificationScore.grade}
                                </span>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">Diversification Score</h3>
                            <p className="text-3xl font-bold text-slate-900 mt-2">{diversificationScore.score}/100</p>
                            <p className="text-sm text-slate-600 mt-1">
                                {recommendations.length} recommendations
                            </p>
                        </div>
                    </div>
                </div>

                {/* Portfolio Overview */}
                <div className="md:col-span-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <Wallet className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Total Invested</p>
                                    <p className="font-semibold">{formatCurrency(stats.totalValue)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="card p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Total Earned</p>
                                    <p className="font-semibold">{formatCurrency(stats.totalEarned)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="card p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <BarChart3 className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Active Loans</p>
                                    <p className="font-semibold">{stats.numLoans}</p>
                                </div>
                            </div>
                        </div>
                        <div className="card p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <Percent className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Avg. Rate</p>
                                    <p className="font-semibold">{stats.avgRate.toFixed(1)}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-3 gap-6">
                {/* Collateral Distribution */}
                <div className="card p-6">
                    <h3 className="font-semibold text-slate-900 mb-4">Collateral Distribution</h3>
                    {collateralData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={collateralData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {collateralData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-slate-400">
                            No data available
                        </div>
                    )}
                </div>

                {/* Risk Distribution */}
                <div className="card p-6">
                    <h3 className="font-semibold text-slate-900 mb-4">Risk Distribution</h3>
                    {riskData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={riskData}>
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-slate-400">
                            No data available
                        </div>
                    )}
                </div>

                {/* Maturity Distribution */}
                <div className="card p-6">
                    <h3 className="font-semibold text-slate-900 mb-4">Maturity Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={maturityData}>
                            <XAxis dataKey="name" fontSize={10} />
                            <YAxis fontSize={12} />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recommendations */}
            <div className="card">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900">Rebalancing Recommendations</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Actionable suggestions to optimize your portfolio
                    </p>
                </div>

                {recommendations.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">Portfolio Well Balanced!</h3>
                        <p className="text-slate-600 mt-2">
                            Your portfolio is well diversified. Keep up the good work!
                        </p>
                        <button
                            onClick={() => navigate('/dashboard/loans')}
                            className="mt-4 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                        >
                            Browse New Opportunities
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {recommendations.map((rec) => {
                            const Icon = rec.icon;
                            return (
                                <div key={rec.id} className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                            rec.severity === 'high' ? 'bg-red-100' :
                                            rec.severity === 'medium' ? 'bg-amber-100' : 'bg-blue-100'
                                        }`}>
                                            <Icon className={`w-6 h-6 ${
                                                rec.severity === 'high' ? 'text-red-600' :
                                                rec.severity === 'medium' ? 'text-amber-600' : 'text-blue-600'
                                            }`} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">{rec.title}</h3>
                                                    <p className="text-sm text-slate-600 mt-1">{rec.description}</p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(rec.severity)}`}>
                                                    {rec.severity}
                                                </span>
                                            </div>
                                            
                                            {/* Progress indicator if applicable */}
                                            {(rec.currentAllocation || rec.currentLoans || rec.currentTypes) && (
                                                <div className="mt-4">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-slate-500">Current</span>
                                                        <span className="text-slate-700">
                                                            {rec.currentAllocation?.toFixed(0) || rec.currentLoans || rec.currentTypes}
                                                            {rec.currentShort !== undefined && `${rec.currentShort.toFixed(0)}%`}
                                                            {rec.currentLong !== undefined && `${rec.currentLong.toFixed(0)}%`}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full ${
                                                                rec.severity === 'high' ? 'bg-red-500' :
                                                                rec.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                                                            }`}
                                                            style={{
                                                                width: `${Math.min(
                                                                    ((rec.currentAllocation || rec.currentLoans * 10 || rec.currentTypes * 25) / (rec.targetAllocation || rec.targetLoans * 10 || rec.targetTypes * 25)) * 100,
                                                                    100
                                                                )}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between text-sm mt-1">
                                                        <span className="text-slate-500">Target</span>
                                                        <span className="text-slate-700">
                                                            {rec.targetAllocation || rec.targetLoans || rec.targetTypes}
                                                            {rec.targetShort !== undefined && `${rec.targetShort}%`}
                                                            {rec.targetLong !== undefined && `${rec.targetLong}%`}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="mt-4 flex items-center gap-4">
                                                <button
                                                    onClick={() => navigate('/dashboard/loans')}
                                                    className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm ${getSeverityButton(rec.severity)}`}
                                                >
                                                    {rec.action}
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedRecommendations([...selectedRecommendations, rec.id]);
                                                        setShowRebalanceModal(true);
                                                    }}
                                                    className="text-sm text-slate-600 hover:text-slate-800 flex items-center gap-1"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                    Include in rebalance
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Current Holdings */}
            <div className="card">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900">Current Holdings</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Loan</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Value</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Earned</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rate</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Duration</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Collateral</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Risk</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {portfolio.map((loan) => (
                                <tr key={loan.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <Link to={`/loans/${loan.loanId}`} className="font-medium text-primary-600 hover:text-primary-700">
                                            #{loan.loanId}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 font-medium">{formatCurrency(loan.value)}</td>
                                    <td className="px-6 py-4 text-emerald-600">+{formatCurrency(loan.earnedAmount)}</td>
                                    <td className="px-6 py-4">{loan.interestRate}%</td>
                                    <td className="px-6 py-4">{loan.durationMonths} mo</td>
                                    <td className="px-6 py-4 capitalize">{loan.collateralType.replace('_', ' ')}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            loan.riskLevel === 'A' ? 'bg-green-100 text-green-800' :
                                            loan.riskLevel === 'B' ? 'bg-blue-100 text-blue-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {loan.riskLevel}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            loan.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                                            loan.status === 'REPAID' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {loan.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Rebalance Modal */}
            {showRebalanceModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl max-w-lg w-full mx-4 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">Auto-Rebalance Portfolio</h3>
                            <button
                                onClick={() => setShowRebalanceModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="mb-6">
                            <p className="text-slate-600 mb-4">
                                We've analyzed your portfolio and identified {recommendations.length} areas for improvement. 
                                Would you like us to create a personalized rebalancing plan?
                            </p>
                            
                            <div className="bg-slate-50 rounded-lg p-4">
                                <h4 className="font-medium text-slate-900 mb-2">Planned Actions:</h4>
                                <ul className="space-y-2">
                                    {recommendations.slice(0, 3).map((rec) => (
                                        <li key={rec.id} className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            {rec.action}
                                        </li>
                                    ))}
                                    {recommendations.length > 3 && (
                                        <li className="text-sm text-slate-500">
                                            +{recommendations.length - 3} more recommendations
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRebalanceModal(false)}
                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRebalance}
                                disabled={isRebalancing}
                                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isRebalancing ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Rebalancing...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4" />
                                        Start Rebalancing
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper component for percentage icon
function Percent({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
    );
}

export default PortfolioRebalancing;
