import { Link } from 'react-router-dom';
import { Search, Filter, Car, Building2, Gem, Laptop, Gavel } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

const items = [
    { id: 1, title: 'Toyota Camry 2023', type: 'vehicle', value: 25000, price: 18500, bids: 5, endsIn: '2d' },
    { id: 2, title: 'Downtown Office Space', type: 'property', value: 150000, price: 120000, bids: 8, endsIn: '5d' },
    { id: 3, title: 'CNC Machine', type: 'equipment', value: 35000, price: 25000, bids: 3, endsIn: '1d' },
    { id: 4, title: 'Gold Jewelry Set', type: 'jewelry', value: 12000, price: 8500, bids: 12, endsIn: '3d' },
];

const typeIcons = { vehicle: Car, property: Building2, equipment: Laptop, jewelry: Gem };

function RecoveryMarketplace() {
    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">Recovery Marketplace</h1>
                    <p className="text-lg text-slate-600">Purchase recovered collateral at discounted prices</p>
                </div>

                {/* Filters */}
                <div className="card p-4 mb-8">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="text" placeholder="Search items..." className="input-field pl-10" />
                            </div>
                        </div>
                        <select className="input-field w-auto">
                            <option>All Types</option>
                            <option>Vehicles</option>
                            <option>Properties</option>
                            <option>Equipment</option>
                            <option>Jewelry</option>
                        </select>
                        <select className="input-field w-auto">
                            <option>All Status</option>
                            <option>Buy Now</option>
                            <option>Auction</option>
                        </select>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {items.map((item) => {
                        const Icon = typeIcons[item.type] || Building2;
                        return (
                            <Link key={item.id} to={`/recovery-marketplace/${item.id}`} className="card card-hover p-4">
                                <div className="aspect-video bg-slate-100 rounded-lg mb-4 flex items-center justify-center">
                                    <Icon className="w-12 h-12 text-slate-400" />
                                </div>
                                <h3 className="font-semibold mb-2">{item.title}</h3>
                                <div className="flex justify-between text-sm mb-3">
                                    <span className="text-slate-500">Market Value</span>
                                    <span className="line-through text-slate-400">{formatCurrency(item.value)}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-3">
                                    <span className="text-slate-500">Current Price</span>
                                    <span className="font-bold text-primary-600">{formatCurrency(item.price)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="badge-info">{item.bids} bids</span>
                                    <span className="text-slate-500">Ends in {item.endsIn}</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default RecoveryMarketplace;
