import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getLoanDetails } from '../../store/slices/loanSlice';
import { fetchCurrentDemand, fetchRateHistory } from '../../store/slices/rateSlice';
import { 
    ArrowLeft, 
    Shield, 
    Clock, 
    Building2, 
    DollarSign, 
    Calendar,
    Users,
    TrendingUp,
    FileText,
    CheckCircle,
    AlertCircle,
    Flame,
    Zap
} from 'lucide-react';
import FundingProgressBar from '../../components/loans/FundingProgressBar';
import TokenPurchasePanel from '../../components/loans/TokenPurchasePanel';
import MarketDemandMeter from '../../components/loans/MarketDemandMeter';
import RateAdjustmentPanel from '../../components/loans/RateAdjustmentPanel';
import FundingBoostPanel from '../../components/loans/FundingBoostPanel';
import TrendingLoanBadge from '../../components/loans/TrendingLoanBadge';
import { LoanReputationIndicator } from '../../components/reputation';
import LoanRiskStatus from '../../components/risk/LoanRiskStatus';
import RiskDisclosurePanel from '../../components/trust/RiskDisclosurePanel';

/**
 * LoanDetail - Loan opportunity detail page
 */
function LoanDetail() {
    const { id } = useParams();
    const dispatch = useDispatch();
    const { loanDetails, isLoading } = useSelector(state => state.loans);
    const { user } = useSelector(state => state.auth);
    const { currentDemandLevel, rateHistory } = useSelector(state => state.rates);
    
    const [activeTab, setActiveTab] = useState('overview');
    
    // Load loan details
    useEffect(() => {
        if (id) {
            dispatch(getLoanDetails(id));
            dispatch(fetchCurrentDemand(id));
            dispatch(fetchRateHistory(id));
        }
    }, [dispatch, id]);
    
    // Mock data
    const loan = {
        id: id || 1,
        title: 'Business Expansion Loan',
        borrower: 'TechStart Inc.',
        borrowerId: 101,
        borrowerRisk: 'AA',
        amount: 50000,
        funded: 75,
        rate: 12.5,
        duration: 24,
        description: 'Funding for business expansion and equipment purchase. TechStart Inc. is a growing technology company looking to expand their operations and purchase new equipment to increase productivity.',
        collateral: 'Real Estate',
        collateralValue: 85000,
        ltv: 58.8,
        status: 'ACTIVE',
        lenders: 12,
        minInvestment: 100,
        repaymentSchedule: 'monthly',
        firstPaymentDue: '2026-04-15',
    };
    
    const isBorrower = user?.role === 'borrower' || user?.id === loan.borrower_id;
    const isLender = user?.role === 'lender' || user?.role === 'both';
    
    // Determine accelerator stage
    const getAcceleratorStage = () => {
        if (loan.funded >= 90) return 'almost_funded';
        if (loan.funded >= 75) return 'hot';
        if (loan.funded >= 50) return 'trending';
        return 'none';
    };
    
    const acceleratorStage = getAcceleratorStage();
    
    // Repayment schedule mock
    const repaymentSchedule = Array.from({ length: loan.duration }, (_, i) => ({
        paymentNumber: i + 1,
        dueDate: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        amount: (loan.amount * (1 + loan.rate / 100)) / loan.duration,
        principal: loan.amount / loan.duration,
        interest: (loan.amount * loan.rate / 100) / loan.duration,
    }));
    
    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                {/* Back Link */}
                <Link to="/marketplace" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Marketplace
                </Link>
                
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Accelerator Status Banner */}
                        {acceleratorStage !== 'none' && (
                            <div className={`rounded-lg p-4 ${
                                acceleratorStage === 'almost_funded' 
                                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                                    : acceleratorStage === 'hot'
                                    ? 'bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200'
                                    : 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200'
                            }`}>
                                <div className="flex items-center gap-3">
                                    {acceleratorStage === 'almost_funded' ? (
                                        <TrendingUp className="w-6 h-6 text-green-600" />
                                    ) : acceleratorStage === 'hot' ? (
                                        <Flame className="w-6 h-6 text-orange-600 animate-pulse" />
                                    ) : (
                                        <Zap className="w-6 h-6 text-yellow-600" />
                                    )}
                                    <div>
                                        <h3 className={`font-bold ${
                                            acceleratorStage === 'almost_funded' 
                                                ? 'text-green-800'
                                                : acceleratorStage === 'hot'
                                                ? 'text-orange-800'
                                                : 'text-yellow-800'
                                        }`}>
                                            {acceleratorStage === 'almost_funded' 
                                                ? '🎉 Almost Funded!'
                                                : acceleratorStage === 'hot'
                                                ? '🔥 Hot Opportunity!'
                                                : '⚡ Trending Loan'
                                            }
                                        </h3>
                                        <p className={`text-sm ${
                                            acceleratorStage === 'almost_funded' 
                                                ? 'text-green-600'
                                                : acceleratorStage === 'hot'
                                                ? 'text-orange-600'
                                                : 'text-yellow-600'
                                        }`}>
                                            {acceleratorStage === 'almost_funded' 
                                                ? `Only ${((loan.amount * (100 - loan.funded)) / 100).toLocaleString()} remaining to close this loan!`
                                                : acceleratorStage === 'hot'
                                                ? 'This loan is getting attention from investors. Close to funding!'
                                                : 'This loan is gaining momentum in the marketplace.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Loan Overview */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h1 className="text-2xl font-bold text-slate-900">{loan.title}</h1>
                                        <TrendingLoanBadge fundingPercentage={loan.funded} />
                                    </div>
                                    <p className="text-slate-600">{loan.borrower}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    loan.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {loan.status}
                                </span>
                            </div>
                            
                            {/* Key Stats */}
                            <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-100">
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">
                                        ${loan.amount.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-slate-500">Loan Amount</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-primary-600">{loan.rate}%</div>
                                    <div className="text-sm text-slate-500">Interest Rate</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">{loan.duration}mo</div>
                                    <div className="text-sm text-slate-500">Duration</div>
                                </div>
                            </div>
                            
                            {/* Description */}
                            <div className="mt-4">
                                <h3 className="font-semibold mb-2">Description</h3>
                                <p className="text-slate-600">{loan.description}</p>
                            </div>
                            
                            {/* Guarantee */}
                            <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-6 h-6 text-emerald-600" />
                                    <div>
                                        <div className="font-medium text-emerald-800">LENDA Guarantee</div>
                                        <div className="text-sm text-emerald-600">Protected by reserve fund</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Tabs */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="flex border-b border-slate-200">
                                {[
                                    { id: 'overview', label: 'Overview' },
                                    { id: 'repayment', label: 'Repayment Schedule' },
                                    { id: 'documents', label: 'Documents' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 py-3 text-sm font-medium ${
                                            activeTab === tab.id
                                                ? 'text-primary-600 border-b-2 border-primary-500'
                                                : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="p-6">
                                {activeTab === 'overview' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-50 rounded-lg">
                                                <div className="text-sm text-slate-500 mb-1">Collateral Type</div>
                                                <div className="font-medium">{loan.collateral}</div>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-lg">
                                                <div className="text-sm text-slate-500 mb-1">Collateral Value</div>
                                                <div className="font-medium">${loan.collateralValue.toLocaleString()}</div>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-lg">
                                                <div className="text-sm text-slate-500 mb-1">LTV Ratio</div>
                                                <div className="font-medium">{loan.ltv}%</div>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-lg">
                                                <div className="text-sm text-slate-500 mb-1">Risk Rating</div>
                                                <div className="font-medium text-emerald-600">{loan.borrowerRisk}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {activeTab === 'repayment' && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left py-2 text-slate-500">#</th>
                                                    <th className="text-left py-2 text-slate-500">Due Date</th>
                                                    <th className="text-right py-2 text-slate-500">Payment</th>
                                                    <th className="text-right py-2 text-slate-500">Principal</th>
                                                    <th className="text-right py-2 text-slate-500">Interest</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {repaymentSchedule.slice(0, 6).map(payment => (
                                                    <tr key={payment.paymentNumber} className="border-b">
                                                        <td className="py-2">{payment.paymentNumber}</td>
                                                        <td className="py-2">{payment.dueDate}</td>
                                                        <td className="text-right py-2 font-medium">
                                                            ${payment.amount.toFixed(2)}
                                                        </td>
                                                        <td className="text-right py-2">
                                                            ${payment.principal.toFixed(2)}
                                                        </td>
                                                        <td className="text-right py-2">
                                                            ${payment.interest.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {loan.duration > 6 && (
                                            <p className="text-sm text-slate-500 mt-2 text-center">
                                                + {loan.duration - 6} more payments
                                            </p>
                                        )}
                                    </div>
                                )}
                                
                                {activeTab === 'documents' && (
                                    <div className="space-y-2">
                                        {[
                                            'Business Plan.pdf',
                                            'Financial Statements.pdf',
                                            'Collateral Valuation Report.pdf',
                                            'KYC Documents.pdf',
                                        ].map((doc, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="w-5 h-5 text-slate-400" />
                                                    <span className="text-sm">{doc}</span>
                                                </div>
                                                <button className="text-primary-600 text-sm hover:underline">
                                                    Download
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Market Demand */}
                        <MarketDemandMeter 
                            loanId={loan.id}
                            showDetails
                        />
                        
                        {/* Risk Disclosure */}
                        <RiskDisclosurePanel 
                            userType="investor" 
                            expanded={false}
                        />
                        
                        {/* Rate Adjustment (for borrower) */}
                        {isBorrower && (
                            <>
                                <RateAdjustmentPanel loan={loan} />
                                <FundingBoostPanel 
                                    loanId={loan.id}
                                    currentRate={loan.rate}
                                    maxRateIncrease={5}
                                    minRateIncrease={0.5}
                                    disabled={loan.status !== 'ACTIVE' || loan.funded >= 100}
                                />
                            </>
                        )}
                    </div>
                    
                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Funding Progress */}
                        <FundingProgressBar 
                            totalAmount={loan.amount}
                            fundedAmount={loan.amount * loan.funded / 100}
                            funderCount={loan.lenders}
                            status={loan.status}
                        />
                        
                        {/* Borrower Reputation */}
                        {loan.borrowerId && (
                            <LoanReputationIndicator 
                                borrowerId={loan.borrowerId}
                                loanId={loan.id}
                                showFullDetails={true}
                            />
                        )}
                        
                        {/* Loan Risk Status */}
                        <LoanRiskStatus 
                            loanId={loan.id}
                            showDetails={true}
                        />
                        
                        {/* Token Purchase (for lenders) */}
                        {isLender && loan.status === 'ACTIVE' && (
                            <TokenPurchasePanel loan={loan} />
                        )}
                        
                        {/* Quick Stats */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <h3 className="font-semibold mb-4">Quick Stats</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Payment Schedule
                                    </span>
                                    <span className="font-medium capitalize">{loan.repaymentSchedule}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Investors
                                    </span>
                                    <span className="font-medium">{loan.lenders}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        Min Investment
                                    </span>
                                    <span className="font-medium">${loan.minInvestment}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" />
                                        Remaining
                                    </span>
                                    <span className="font-medium">
                                        ${((loan.amount * (100 - loan.funded)) / 100).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Risk Warning */}
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                                <div className="text-sm text-amber-700">
                                    <strong>Risk Notice:</strong> All investments carry risk. 
                                    Past performance does not guarantee future results.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoanDetail;
