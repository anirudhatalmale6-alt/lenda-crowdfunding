import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    fetchReserveFundData,
    updateReserveFundSettings,
    triggerManualTopUp,
    selectReserveFundData,
    selectReserveFundSettings,
    selectReserveFundLoading,
    selectReserveFundError
} from '../../store/slices/reserveFundSlice';
import { 
    DollarSign, 
    TrendingUp, 
    TrendingDown, 
    Settings, 
    RefreshCw,
    Save,
    AlertCircle,
    CheckCircle,
    Clock,
    Plus,
    Shield,
    Activity,
    Bell,
    Loader
} from 'lucide-react';

/**
 * ReserveFundManagement - Admin reserve fund management with automation
 * Provides automated reserve fund monitoring and management features
 */
function ReserveFundManagement() {
    const dispatch = useDispatch();
    const data = useSelector(selectReserveFundData);
    const settings = useSelector(selectReserveFundSettings);
    const loading = useSelector(selectReserveFundLoading);
    const error = useSelector(selectReserveFundError);
    
    const [localSettings, setLocalSettings] = useState(null);
    const [saved, setSaved] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState(50000);
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [processingTopUp, setProcessingTopUp] = useState(false);
    
    useEffect(() => {
        dispatch(fetchReserveFundData());
    }, [dispatch]);
    
    useEffect(() => {
        if (settings) {
            setLocalSettings(settings);
            setTopUpAmount(settings.topUpAmount);
        }
    }, [settings]);
    
    const handleSettingChange = (key, value) => {
        setLocalSettings(prev => ({
            ...prev,
            [key]: value
        }));
        setSaved(false);
    };
    
    const handleSave = async () => {
        try {
            await dispatch(updateReserveFundSettings(localSettings)).unwrap();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to save settings:', err);
        }
    };
    
    const handleTopUp = async () => {
        setProcessingTopUp(true);
        try {
            await dispatch(triggerManualTopUp(topUpAmount)).unwrap();
            setShowTopUpModal(false);
            dispatch(fetchReserveFundData());
        } catch (err) {
            console.error('Failed to top up:', err);
        }
        setProcessingTopUp(false);
    };
    
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
    };
    
    if (!localSettings || !data.transactions) {
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
                            <Shield className="w-8 h-8 text-primary-500" />
                            Reserve Fund Management
                        </h1>
                        <p className="text-slate-600">
                            Automated reserve fund monitoring and management
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => dispatch(fetchReserveFundData())}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            Save Settings
                        </button>
                    </div>
                </div>
                
                {/* Success/Error Messages */}
                {saved && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span className="text-emerald-700">Settings saved successfully!</span>
                    </div>
                )}
                
                {/* Main Stats */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                        <p className="text-sm text-slate-500">Total Reserve</p>
                        <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.totalReserve)}</p>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-sm text-slate-500">Current Ratio</p>
                        <p className="text-2xl font-bold text-slate-900">{data.currentRatio}%</p>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Shield className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                        <p className="text-sm text-slate-500">Target Ratio</p>
                        <p className="text-2xl font-bold text-slate-900">{data.targetRatio}%</p>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                                <Activity className="w-6 h-6 text-amber-600" />
                            </div>
                            <button
                                onClick={() => setShowTopUpModal(true)}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                            >
                                + Top Up
                            </button>
                        </div>
                        <p className="text-sm text-slate-500">Status</p>
                        <p className={`text-2xl font-bold ${data.currentRatio >= data.targetRatio ? 'text-green-600' : 'text-amber-600'}`}>
                            {data.currentRatio >= data.targetRatio ? 'Healthy' : 'Below Target'}
                        </p>
                    </div>
                </div>
                
                {/* Coverage Progress */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
                    <h2 className="text-lg font-semibold mb-4">Coverage Progress</h2>
                    <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                            <div>
                                <span className="text-xs font-semibold inline-block text-blue-600">
                                    Current Coverage
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-semibold inline-block text-blue-600">
                                    {data.currentRatio}% / {data.targetRatio}%
                                </span>
                            </div>
                        </div>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-200">
                            <div 
                                style={{ width: `${Math.min((data.currentRatio / data.targetRatio) * 100, 100)}%` }} 
                                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${data.currentRatio >= data.targetRatio ? 'bg-green-500' : 'bg-amber-500'}`}
                            ></div>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500">
                        {data.currentRatio >= data.targetRatio 
                            ? 'Reserve fund is operating within healthy parameters.'
                            : `Reserve fund is below target by ${data.targetRatio - data.currentRatio}%. Consider enabling auto top-up.`
                        }
                    </p>
                </div>
                
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Automated Settings */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-slate-600" />
                            Automation Settings
                        </h2>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <div className="font-medium text-slate-900">Auto-contributions</div>
                                    <div className="text-sm text-slate-500">
                                        Automatically contribute a portion of platform fees to reserve
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.autoContributions}
                                        onChange={(e) => handleSettingChange('autoContributions', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                                </label>
                            </div>
                            
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <div className="font-medium text-slate-900">Auto Top-up</div>
                                    <div className="text-sm text-slate-500">
                                        Automatically top up when ratio falls below threshold
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.autoTopUp}
                                        onChange={(e) => handleSettingChange('autoTopUp', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                                </label>
                            </div>
                            
                            {localSettings.autoTopUp && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Threshold (%)
                                        </label>
                                        <div className="relative max-w-xs">
                                            <input
                                                type="number"
                                                value={localSettings.threshold}
                                                onChange={(e) => handleSettingChange('threshold', parseFloat(e.target.value))}
                                                min={5}
                                                max={25}
                                                step={1}
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Trigger auto top-up when ratio falls below this value
                                        </p>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Top-up Amount (USD)
                                        </label>
                                        <div className="relative max-w-xs">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                            <input
                                                type="number"
                                                value={localSettings.topUpAmount}
                                                onChange={(e) => handleSettingChange('topUpAmount', parseFloat(e.target.value))}
                                                min={10000}
                                                max={500000}
                                                step={5000}
                                                className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* Recent Transactions */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-600" />
                            Recent Transactions
                        </h2>
                        
                        <div className="space-y-3">
                            {data.transactions.slice(0, 5).map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        {tx.type === 'contribution' ? (
                                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                <TrendingUp className="w-4 h-4 text-green-600" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                                <TrendingDown className="w-4 h-4 text-red-600" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                {tx.type === 'contribution' ? 'Contribution' : 'Claim'}
                                            </p>
                                            <p className="text-xs text-slate-500">{tx.source}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-medium ${tx.type === 'contribution' ? 'text-green-600' : 'text-red-600'}`}>
                                            {tx.type === 'contribution' ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </p>
                                        <p className="text-xs text-slate-500">{tx.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Summary */}
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-green-50 rounded-xl border border-green-200 p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                            <h3 className="font-semibold text-green-800">Total Contributions</h3>
                        </div>
                        <p className="text-3xl font-bold text-green-700">{formatCurrency(data.contributions)}</p>
                    </div>
                    
                    <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <TrendingDown className="w-6 h-6 text-red-600" />
                            <h3 className="font-semibold text-red-800">Total Claims</h3>
                        </div>
                        <p className="text-3xl font-bold text-red-700">{formatCurrency(data.claims)}</p>
                    </div>
                </div>
                
                {/* Manual Top Up Modal */}
                {showTopUpModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                                    <Plus className="w-6 h-6 text-primary-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">Manual Top Up</h3>
                                    <p className="text-sm text-slate-500">Add funds to reserve</p>
                                </div>
                            </div>
                            
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Amount (USD)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                    <input
                                        type="number"
                                        value={topUpAmount}
                                        onChange={(e) => setTopUpAmount(parseFloat(e.target.value))}
                                        min={1000}
                                        max={1000000}
                                        step={1000}
                                        className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-lg"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowTopUpModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleTopUp}
                                    disabled={processingTopUp}
                                    className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center justify-center gap-2"
                                >
                                    {processingTopUp ? (
                                        <>
                                            <Loader className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>Top Up {formatCurrency(topUpAmount)}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReserveFundManagement;
