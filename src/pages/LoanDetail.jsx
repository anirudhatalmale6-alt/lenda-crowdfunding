import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Clock, Building2, Flame, Zap, TrendingUp } from 'lucide-react';
import TrendingLoanBadge, { FundingProgressBar } from '../components/loans/TrendingLoanBadge';
import HotOpportunitiesPanel from '../components/loans/HotOpportunitiesPanel';
import { formatCurrency } from '../utils/formatters';

function LoanDetail() {
    const { id } = useParams();

    // Mock data - in real app would fetch from API
    const loan = {
        id: id || 1,
        title: 'Business Expansion Loan',
        borrower: 'TechStart Inc.',
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
        fundedAmount: 37500,
        remainingAmount: 12500
    };

    // Determine accelerator stage based on funding percentage
    const getAcceleratorStage = () => {
        if (loan.funded >= 90) return 'almost_funded';
        if (loan.funded >= 75) return 'hot';
        if (loan.funded >= 50) return 'trending';
        return 'none';
    };

    const acceleratorStage = getAcceleratorStage();

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <Link to="/loans" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Loans
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
                                                ? `Only ${formatCurrency(loan.remainingAmount)} remaining to close this loan!`
                                                : acceleratorStage === 'hot'
                                                ? 'This loan is getting attention from investors. Close to funding!'
                                                : 'This loan is gaining momentum in the marketplace.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="card p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h1 className="text-2xl font-bold text-slate-900">{loan.title}</h1>
                                        <TrendingLoanBadge fundingPercentage={loan.funded} />
                                    </div>
                                    <p className="text-slate-600">{loan.borrower}</p>
                                </div>
                                <span className="badge-success">Risk {loan.borrowerRisk}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-100">
                                <div>
                                    <div className="text-2xl font-bold">{formatCurrency(loan.amount)}</div>
                                    <div className="text-sm text-slate-500">Loan Amount</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{loan.rate}%</div>
                                    <div className="text-sm text-slate-500">Interest Rate</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{loan.duration}mo</div>
                                    <div className="text-sm text-slate-500">Duration</div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <FundingProgressBar 
                                    fundedAmount={loan.fundedAmount} 
                                    totalAmount={loan.amount}
                                    showLabel={true}
                                    animated={acceleratorStage !== 'none'}
                                    size="lg"
                                />
                            </div>

                            <div className="mt-6">
                                <h3 className="font-semibold mb-2">Description</h3>
                                <p className="text-slate-600">{loan.description}</p>
                            </div>

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

                        {/* Collateral Info */}
                        <div className="card p-6">
                            <h2 className="font-semibold text-lg mb-4">Collateral Information</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-slate-500">Type</div>
                                    <div className="font-medium">{loan.collateral}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-500">Estimated Value</div>
                                    <div className="font-medium">{formatCurrency(loan.collateralValue)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-500">LTV Ratio</div>
                                    <div className="font-medium">{loan.ltv}%</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-500">Status</div>
                                    <div className="badge-success">Verified</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Almost Funded Call-to-Action */}
                        {acceleratorStage === 'almost_funded' && (
                            <div className="card p-6 border-2 border-green-500 bg-green-50">
                                <div className="text-center">
                                    <TrendingUp className="w-10 h-10 text-green-600 mx-auto mb-2" />
                                    <h3 className="font-bold text-green-800 mb-2">Last Chance!</h3>
                                    <p className="text-sm text-green-700 mb-4">
                                        This loan is {loan.funded}% funded.
                                        <br />
                                        Only {formatCurrency(loan.remainingAmount)} remaining!
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="card p-6">
                            <h3 className="font-semibold mb-4">Fund This Loan</h3>

                            <div className="mb-4">
                                <label className="block text-sm text-slate-600 mb-2">Investment Amount</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    placeholder={`Min ${formatCurrency(loan.minInvestment)}`}
                                />
                            </div>

                            <div className="text-sm text-slate-500 mb-4">
                                Expected return: {formatCurrency((loan.amount * loan.rate) / 100)} over {loan.duration} months
                            </div>

                            <button className="w-full btn-primary">
                                Fund Loan
                            </button>

                            <div className="mt-4 text-center text-sm text-slate-500">
                                {loan.lenders} lenders already invested
                            </div>
                        </div>

                        <div className="card p-6">
                            <h3 className="font-semibold mb-4">Loan Details</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Status</span>
                                    <span className="badge-success">{loan.status}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Payment Schedule</span>
                                    <span>Monthly</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">First Payment Due</span>
                                    <span>Apr 15, 2026</span>
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
