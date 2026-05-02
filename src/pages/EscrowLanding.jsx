import { Link } from 'react-router-dom';
import { Shield, Clock, Truck, CheckCircle } from 'lucide-react';

function EscrowLanding() {
    const steps = [
        { icon: Shield, title: 'Buyer Pays', desc: 'Funds held securely' },
        { icon: Truck, title: 'Seller Ships', desc: 'Track delivery' },
        { icon: CheckCircle, title: 'Buyer Confirms', desc: 'Verify receipt' },
        { icon: Clock, title: 'Funds Released', desc: 'Seller gets paid' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 py-16">
            <div className="max-w-4xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">Secure Escrow Service</h1>
                    <p className="text-lg text-slate-600">Protect your business transactions with LENDA Escrow</p>
                </div>

                <div className="card p-8 mb-8">
                    <h2 className="text-2xl font-bold mb-6">How It Works</h2>
                    <div className="grid md:grid-cols-4 gap-6">
                        {steps.map((step, i) => {
                            const Icon = step.icon;
                            return (
                                <div key={i} className="text-center">
                                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Icon className="w-8 h-8 text-primary-600" />
                                    </div>
                                <h3 className="font-semibold mb-1">{step.title}</h3>
                                    <p className="text-sm text-slate-500">{step.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="text-center">
                    <Link to="/dashboard/escrow/create" className="btn-primary">Create Escrow Transaction</Link>
                </div>
            </div>
        </div>
    );
}

export default EscrowLanding;
