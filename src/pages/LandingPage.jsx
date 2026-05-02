import { Link } from 'react-router-dom';
import {
    ArrowRight,
    Shield,
    TrendingUp,
    Clock,
    Users,
    Star,
    ChevronRight,
    Building2,
    Car,
    Gem,
    Laptop,
    Gavel,
    Lock,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

// Trust Components
import { 
    PlatformSecurityBadges, 
    InsuranceGuaranteeDisplay, 
    PerformanceStatistics,
    ReserveCoverageIndicator,
    PlatformStats,
    RiskDisclosurePanel
} from '../components/trust';

// Featured loans data (mock)
const featuredLoans = [
    {
        id: 1,
        title: 'Business Expansion Loan',
        borrower: 'TechStart Inc.',
        amount: 50000,
        rate: 12.5,
        duration: 24,
        funded: 75,
        risk: 'A',
    },
    {
        id: 2,
        title: 'Real Estate Development',
        borrower: 'Urban Properties LLC',
        amount: 150000,
        rate: 10.5,
        duration: 36,
        funded: 45,
        risk: 'AA',
    },
    {
        id: 3,
        title: 'Equipment Financing',
        borrower: 'Manufacturing Co.',
        amount: 25000,
        rate: 14.0,
        duration: 18,
        funded: 90,
        risk: 'B',
    },
];

// How it works steps
const steps = [
    {
        icon: Users,
        title: 'Create Your Profile',
        description: 'Sign up as a borrower or lender and complete your verification.',
    },
    {
        icon: Building2,
        title: 'Post or Browse Loans',
        description: 'Borrowers create loan requests with collateral. Lenders browse opportunities.',
    },
    {
        icon: TrendingUp,
        title: 'Fund or Get Funded',
        description: 'Lenders fund loans and earn interest. Borrowers receive funds.',
    },
    {
        icon: Clock,
        title: 'Repay & Earn',
        description: 'Borrowers make scheduled repayments. Lenders receive their returns.',
    },
];

// Collateral types
const collateralTypes = [
    { icon: Building2, label: 'Real Estate', count: 1250 },
    { icon: Car, label: 'Vehicles', count: 890 },
    { icon: Gem, label: 'Jewelry', count: 560 },
    { icon: Laptop, label: 'Equipment', count: 340 },
];

function LandingPage() {
    return (
        <div className="overflow-hidden">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 text-white py-24 lg:py-32">
                <div className="absolute inset-0 bg-pattern opacity-10" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="animate-fade-in">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/20 rounded-full text-primary-300 text-sm font-medium mb-6">
                                <Star className="w-4 h-4" />
                                Trusted by 10,000+ users worldwide
                            </div>
                            <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight">
                                Peer-to-Peer Lending
                                <span className="block text-gradient">Reimagined</span>
                            </h1>
                            <p className="text-base md:text-lg text-slate-300 mb-6 md:mb-8 max-w-lg">
                                Connect directly with borrowers and lenders. Earn competitive returns
                                on your investments with our secure, transparent platform backed by
                                the LENDA Guarantee.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                <Link to="/register" className="btn-primary text-base md:text-lg px-6 md:px-8 py-3 md:py-4 text-center">
                                    Get Started
                                    <ArrowRight className="inline ml-2 w-5 h-5" />
                                </Link>
                                <Link to="/loans" className="btn-secondary border-white/30 text-white hover:bg-white/10 px-6 md:px-8 py-3 md:py-4 text-center">
                                    Browse Loans
                                </Link>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 md:gap-8 mt-8 md:pt-8 border-t border-white/10">
                                <div>
                                    <div className="text-3xl font-bold">{formatCurrency(50000000)}+</div>
                                    <div className="text-slate-400 text-sm">Loans Funded</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold">15%</div>
                                                <div className="text-2xl font-bold">{formatCurrency(50000)}</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold">10K+</div>
                                    <div className="text-slate-400 text-sm">Active Users</div>
                                </div>
                            </div>
                        </div>

                        {/* Hero Image/Illustration */}
                        <div className="relative hidden lg:block">
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/20 to-transparent rounded-3xl" />
                            <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                                <div className="space-y-6">
                                    {/* Loan Card */}
                                    <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
                                                    <Building2 className="w-6 h-6 text-primary-400" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold">TechStart Inc.</div>
                                                    <div className="text-sm text-slate-400">Business Expansion</div>
                                                </div>
                                            </div>
                                            <div className="badge-success">AA Risk</div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <div className="text-2xl font-bold">{formatCurrency(50000)}</div>
                                                <div className="text-xs text-slate-400">Amount</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold">12.5%</div>
                                                <div className="text-xs text-slate-400">Interest</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold">24mo</div>
                                                <div className="text-xs text-slate-400">Duration</div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-2">
                                            <div className="bg-primary-500 h-2 rounded-full" style={{ width: '75%' }} />
                                        </div>
                                        <div className="flex justify-between mt-2 text-sm text-slate-400">
                                            <span>75% Funded</span>
                                            <span>{formatCurrency(37500)} / {formatCurrency(50000)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-12 md:py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="section-title">Why Choose LENDA?</h2>
                        <p className="section-subtitle mx-auto">
                            Our platform combines security, transparency, and competitive returns
                            to create the best lending experience.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="card p-8 text-center">
                            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Shield className="w-8 h-8 text-primary-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">LENDA Guarantee</h3>
                            <p className="text-slate-600">
                                Every lender is protected by our reserve fund. If a borrower defaults,
                                LENDA covers your principal.
                            </p>
                        </div>
                        <div className="card p-8 text-center">
                            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <TrendingUp className="w-8 h-8 text-primary-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Competitive Returns</h3>
                            <p className="text-slate-600">
                                Earn up to 18% annual interest on your investments with our
                                diversified loan portfolio.
                            </p>
                        </div>
                        <div className="card p-8 text-center">
                            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Lock className="w-8 h-8 text-primary-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Bank-Level Security</h3>
                            <p className="text-slate-600">
                                Your funds are protected by industry-leading encryption and
                                smart contract technology.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Signals Section - Platform Security */}
            <section className="py-12 md:py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="section-title">Platform Security</h2>
                        <p className="section-subtitle mx-auto">
                            Your trust and security are our top priorities. Learn about our security measures.
                        </p>
                    </div>
                    <PlatformSecurityBadges />
                </div>
            </section>

            {/* Trust Signals Section - LENDA Guarantee */}
            <section className="py-12 md:py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="section-title">LENDA Guarantee</h2>
                        <p className="section-subtitle mx-auto">
                            Learn how we protect your investments with our reserve fund and protection programs.
                        </p>
                    </div>
                    <InsuranceGuaranteeDisplay />
                </div>
            </section>

            {/* Trust Signals Section - Performance Statistics */}
            <section className="py-12 md:py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="section-title">Platform Performance</h2>
                        <p className="section-subtitle mx-auto">
                            Transparent, real-time performance metrics for complete visibility.
                        </p>
                    </div>
                    <PerformanceStatistics compact />
                </div>
            </section>

            {/* Trust Signals Section - Reserve Coverage */}
            <section className="py-12 md:py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="section-title">Investor Protection</h2>
                        <p className="section-subtitle mx-auto">
                            Our reserve fund provides a safety net for your investments.
                        </p>
                    </div>
                    <div className="max-w-md mx-auto">
                        <ReserveCoverageIndicator showDetails />
                    </div>
                </div>
            </section>

            {/* Trust Signals Section - Risk Disclosure */}
            <section className="py-12 md:py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="section-title">Risk Disclosure</h2>
                        <p className="section-subtitle mx-auto">
                            Important information about the risks involved in lending and borrowing.
                        </p>
                    </div>
                    <RiskDisclosurePanel userType="investor" expanded={false} />
                </div>
            </section>

            {/* How It Works */}
            <section className="py-12 md:py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="section-title">How It Works</h2>
                        <p className="section-subtitle mx-auto">
                            Getting started with LENDA is simple. Follow these steps to begin
                            your lending journey.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8">
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            return (
                            <div key={index} className="relative">
                                <div className="card p-6 text-center h-full">
                                    <div className="w-16 h-16 bg-primary-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Icon className="w-8 h-8" />
                                    </div>
                                    <div className="text-primary-600 font-bold text-sm mb-2">
                                        Step {index + 1}
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                                    <p className="text-slate-600 text-sm">{step.description}</p>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                                        <ChevronRight className="w-8 h-8 text-primary-300" />
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Featured Loans */}
            <section className="py-12 md:py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <h2 className="section-title mb-2">Featured Loan Opportunities</h2>
                            <p className="text-slate-600">Hand-picked loans with excellent risk-adjusted returns</p>
                        </div>
                        <Link to="/loans" className="btn-secondary hidden md:flex items-center gap-2">
                            View All Loans
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {featuredLoans.map((loan) => (
                            <Link
                                key={loan.id}
                                to={`/loans/${loan.id}`}
                                className="card card-hover p-6"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-lg mb-1">{loan.title}</h3>
                                        <p className="text-sm text-slate-500">{loan.borrower}</p>
                                    </div>
                                    <div className="badge-success">Risk {loan.risk}</div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mb-4 py-4 border-y border-slate-100">
                                    <div>
                                        <div className="text-lg font-bold">{formatCurrency(loan.amount)}</div>
                                        <div className="text-xs text-slate-500">Amount</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold">{loan.rate}%</div>
                                        <div className="text-xs text-slate-500">Interest</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold">{loan.duration}mo</div>
                                        <div className="text-xs text-slate-500">Duration</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Progress</span>
                                        <span className="font-medium">{loan.funded}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-primary-500 h-2 rounded-full transition-all"
                                            style={{ width: `${loan.funded}%` }}
                                        />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="mt-8 text-center md:hidden">
                        <Link to="/loans" className="btn-secondary">
                            View All Loans
                        </Link>
                    </div>
                </div>
            </section>

            {/* Recovery Marketplace Preview */}
            <section className="py-12 md:py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="section-title mb-4">LENDA Recovery Marketplace</h2>
                            <p className="text-slate-600 mb-8">
                                When borrowers default, their collateral goes to our Recovery Marketplace.
                                Purchase recovered assets at discounted prices through buy-now or auction.
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                {collateralTypes.map((type, index) => {
                                    const TypeIcon = type.icon;
                                    return (
                                    <div key={index} className="card p-4 flex items-center gap-3">
                                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                                            <TypeIcon className="w-6 h-6 text-primary-600" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{type.label}</div>
                                            <div className="text-sm text-slate-500">{type.count}+ items</div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>

                            <Link to="/marketplace" className="btn-primary">
                                Browse Marketplace
                            </Link>
                        </div>

                        <div className="relative">
                            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                                        <Gavel className="w-8 h-8 text-slate-600" />
                                    </div>
                                    <div>
                                        <div className="font-semibold">Toyota Camry 2023</div>
                                        <div className="text-sm text-slate-500">Recovered from Defaulted Loan</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <div className="text-sm text-slate-500">Current Bid</div>
                                        <div className="text-xl font-bold">$18,500</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-500">Market Value</div>
                                        <div className="text-xl font-bold text-slate-400 line-through">$25,000</div>
                                    </div>
                                </div>
                                <button className="w-full btn-primary">
                                    Place Bid
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Escrow Section */}
            <section className="py-12 md:py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="order-2 lg:order-1">
                            <div className="card p-8">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                            <span className="text-emerald-600 font-bold">1</span>
                                        </div>
                                        <div>
                                            <div className="font-medium">Buyer Pays</div>
                                            <div className="text-sm text-slate-500">Funds held in secure escrow</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                            <span className="text-emerald-600 font-bold">2</span>
                                        </div>
                                        <div>
                                            <div className="font-medium">Seller Ships</div>
                                            <div className="text-sm text-slate-500">Track delivery in real-time</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                            <span className="text-emerald-600 font-bold">3</span>
                                        </div>
                                        <div>
                                            <div className="font-medium">Buyer Confirms</div>
                                            <div className="text-sm text-slate-500">Funds released to seller</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="order-1 lg:order-2">
                            <h2 className="section-title mb-4">Secure Business Transactions</h2>
                            <p className="text-slate-600 mb-6">
                                Our escrow service protects both buyers and sellers in business transactions.
                                Funds are held securely until the buyer confirms delivery.
                            </p>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-3">
                                    <Shield className="w-5 h-5 text-primary-600" />
                                    <span>100% buyer protection</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-primary-600" />
                                    <span>Real-time tracking</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <Users className="w-5 h-5 text-primary-600" />
                                    <span>Dispute resolution included</span>
                                </li>
                            </ul>
                            <Link to="/escrow" className="btn-primary">
                                Learn More
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-12 md:py-20 bg-primary-600">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                        Ready to Start Your Lending Journey?
                    </h2>
                    <p className="text-primary-100 text-lg mb-8">
                        Join thousands of investors earning competitive returns on LENDA.
                        Create your free account today.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link to="/register" className="bg-white text-primary-600 font-semibold px-8 py-4 rounded-lg hover:bg-primary-50 transition-colors">
                            Create Free Account
                        </Link>
                        <Link to="/contact" className="border-2 border-white text-white font-semibold px-8 py-4 rounded-lg hover:bg-white/10 transition-colors">
                            Contact Sales
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default LandingPage;
