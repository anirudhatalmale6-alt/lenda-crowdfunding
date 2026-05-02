import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    fetchFeeConfig, 
    updateFeeConfig,
    selectFeeConfig,
    selectRevenueLoading,
    selectRevenueError
} from '../../store/slices/revenueSlice';
import { 
    DollarSign, 
    Percent, 
    Shield, 
    AlertCircle, 
    CheckCircle, 
    Loader,
    Save,
    RefreshCw,
    Info,
    TrendingUp,
    ArrowDownCircle,
    ArrowUpCircle,
    Building
} from 'lucide-react';

/**
 * FeeControls - Admin fee configuration dashboard
 * Allows admins to configure all platform fees
 */
function FeeControls() {
    const dispatch = useDispatch();
    const feeConfig = useSelector(selectFeeConfig);
    const loading = useSelector(selectRevenueLoading);
    const error = useSelector(selectRevenueError);
    
    const [localConfig, setLocalConfig] = useState(null);
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState('lending');
    
    // Load initial data
    useEffect(() => {
        dispatch(fetchFeeConfig());
    }, [dispatch]);
    
    // Update local config when fee config loads
    useEffect(() => {
        if (feeConfig) {
            setLocalConfig(feeConfig);
        }
    }, [feeConfig]);
    
    // Handle setting change
    const handleFeeChange = (category, field, value) => {
        setLocalConfig(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [field]: parseFloat(value) || 0
            }
        }));
        setSaved(false);
    };
    
    // Handle save
    const handleSave = async () => {
        try {
            await dispatch(updateFeeConfig(localConfig)).unwrap();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to save fees:', err);
        }
    };
    
    // Fee categories
    const feeCategories = {
        lending: {
            label: 'Lending Fees',
            icon: TrendingUp,
            fees: [
                { key: 'origination_fee', label: 'Origination Fee', description: 'Fee charged to borrowers when loan is created', min: 0, max: 10, step: 0.1 },
            ]
        },
        investor: {
            label: 'Investor Fees',
            icon: ArrowUpCircle,
            fees: [
                { key: 'investor_service_fee', label: 'Service Fee', description: 'Fee on investor interest earnings', min: 0, max: 15, step: 0.1 },
            ]
        },
        marketplace: {
            label: 'Marketplace Fees',
            icon: Building,
            fees: [
                { key: 'trading_fee', label: 'Trading Fee', description: 'Fee on secondary market trades', min: 0, max: 5, step: 0.1 },
                { key: 'escrow_fee', label: 'Escrow Fee', description: 'Fee for escrow services', min: 0, max: 5, step: 0.1 },
            ]
        },
        recovery: {
            label: 'Recovery Fees',
            icon: ArrowDownCircle,
            fees: [
                { key: 'liquidation_commission', label: 'Liquidation Commission', description: 'Commission on defaulted loan recoveries', min: 0, max: 30, step: 0.5 },
            ]
        }
    };
    
    if (!localConfig) {
        return (
            <div className="min-h-screen bg-slate-50 py-8">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="animate-pulse">
                        <div className="h-8 bg-slate-200 rounded w-1/3 mb-8"></div>
                        <div className="grid lg:grid-cols-2 gap-6">
                            <div className="h-64 bg-slate-200 rounded"></div>
                            <div className="h-64 bg-slate-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                            <DollarSign className="w-8 h-8 text-primary-500" />
                            Fee Configuration
                        </h1>
                        <p className="text-slate-600">
                            Configure all platform fees and service charges
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => dispatch(fetchFeeConfig())}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading.updating}
                            className="flex items-center gap-2 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                        >
                            {loading.updating ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
                
                {/* Success/Error Messages */}
                {saved && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span className="text-emerald-700">Fee configuration saved successfully!</span>
                    </div>
                )}
                
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-red-700">{error}</span>
                    </div>
                )}
                
                {/* Tabs */}
                <div className="bg-white rounded-xl border border-slate-200 mb-6">
                    <div className="flex overflow-x-auto">
                        {Object.entries(feeCategories).map(([key, category]) => {
                            const Icon = category.icon;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key)}
                                    className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors whitespace-nowrap ${
                                        activeTab === key
                                            ? 'border-primary-500 text-primary-600 bg-primary-50/50'
                                            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {category.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                {/* Fee Configuration Cards */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {feeCategories[activeTab].fees.map((fee) => (
                        <div key={fee.key} className="bg-white rounded-xl border border-slate-200 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">{fee.label}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{fee.description}</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Percent className="w-4 h-4" />
                                    <span>Percentage</span>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Rate (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={localConfig[fee.key]?.percentage ?? 0}
                                            onChange={(e) => handleFeeChange(fee.key, 'percentage', e.target.value)}
                                            min={fee.min}
                                            max={fee.max}
                                            step={fee.step}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-lg font-semibold"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                                        <span>Min: {fee.min}%</span>
                                        <span>Max: {fee.max}%</span>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Fixed Amount (USD)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                        <input
                                            type="number"
                                            value={localConfig[fee.key]?.fixed_amount || 0}
                                            onChange={(e) => handleFeeChange(fee.key, 'fixed_amount', e.target.value)}
                                            min={0}
                                            max={1000}
                                            step={1}
                                            className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Impact Preview */}
                            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Info className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm font-medium text-slate-700">Example Impact</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-slate-500">On $10,000 loan:</span>
                                        <div className="font-semibold text-slate-900">
                                            ${(10000 * (localConfig[fee.key]?.percentage ?? 0) / 100).toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Fixed amount:</span>
                                        <div className="font-semibold text-slate-900">
                                            ${localConfig[fee.key]?.fixed_amount ?? 0}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Summary Card */}
                <div className="mt-8 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
                    <h2 className="text-xl font-semibold mb-4">Fee Summary</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-primary-100 text-sm">Total Fee Categories</p>
                            <p className="text-3xl font-bold">{Object.keys(feeCategories).length}</p>
                        </div>
                        <div>
                            <p className="text-primary-100 text-sm">Active Fees</p>
                            <p className="text-3xl font-bold">
                                {Object.keys(localConfig).filter(k => localConfig[k]?.percentage != null && localConfig[k]?.percentage > 0).length}
                            </p>
                        </div>
                        <div>
                            <p className="text-primary-100 text-sm">Configurable Rates</p>
                            <p className="text-3xl font-bold">
                                {Object.keys(localConfig).length}
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Warning */}
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-800">Important Notice</p>
                        <p className="text-sm text-amber-700 mt-1">
                            Fee changes take effect immediately for new transactions. 
                            Existing loans are not affected by fee configuration changes.
                            Consider notifying users before making significant changes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FeeControls;
