import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Clock, Car } from 'lucide-react';
import { AuctionSaleSummary } from '../components/revenue';
import { formatCurrency } from '../utils/formatters';

function ItemDetail() {
    const { id } = useParams();

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                <Link to="/recovery-marketplace" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Marketplace
                </Link>

                <div className="grid lg:grid-cols-2 gap-8">
                    <div className="aspect-square bg-slate-200 rounded-xl flex items-center justify-center">
                        <Car className="w-24 h-24 text-slate-400" />
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Toyota Camry 2023</h1>
                        <p className="text-slate-600 mb-6">Recovered from defaulted loan - Excellent condition</p>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="card p-4">
                                <div className="text-sm text-slate-500">Market Value</div>
                                <div className="text-xl font-bold line-through">{formatCurrency(25000)}</div>
                            </div>
                            <div className="card p-4">
                                <div className="text-sm text-slate-500">Current Bid</div>
                                <div className="text-xl font-bold text-primary-600">{formatCurrency(18500)}</div>
                            </div>
                        </div>

                        <div className="flex gap-4 mb-6">
                            <div className="input-field w-32">{formatCurrency(18500)}</div>
                            <button className="btn-primary flex-1">Place Bid</button>
                            <button className="btn-gold flex-1">Buy Now {formatCurrency(22000)}</button>
                        </div>

                        <div className="card p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <Shield className="w-5 h-5 text-emerald-600" />
                                <span className="font-medium">Buyer Protection</span>
                            </div>
                            <p className="text-sm text-slate-600">All purchases include LENDA Buyer Guarantee</p>
                        </div>
                        
                        {/* Auction Sale Summary */}
                        <div className="mt-6">
                            <AuctionSaleSummary winningBid={18500} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ItemDetail;
