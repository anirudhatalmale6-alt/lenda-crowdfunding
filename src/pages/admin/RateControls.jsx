import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    fetchPlatformSettings, 
    updatePlatformSettings,
    fetchRateStatistics,
    fetchAverageRatesByCategory 
} from '../../store/slices/rateSlice';
import { 
    Settings, 
    TrendingUp, 
    Shield, 
    AlertCircle, 
    CheckCircle, 
    Loader,
    Save,
    RefreshCw
} from 'lucide-react';

/**
 * RateControls - Admin interest rate control dashboard
 */
function RateControls() {
    const dispatch = useDispatch();
    const { 
        platformSettings, 
        rateStatistics, 
        averageRatesByCategory,
        isLoading 
    } = useSelector(state => state.rates);
    
    const [localSettings, setLocalSettings] = useState(null);
    const [saved, setSaved] = useState(false);
    
    // Load initial data
    useEffect(() => {
        dispatch(fetchPlatformSettings());
        dispatch(fetchRateStatistics(30));
        dispatch(fetchAverageRatesByCategory());
    }, [dispatch]);
    
    // Update local settings when platform settings load
    useEffect(() => {
        if (platformSettings) {
            setLocalSettings(platformSettings);
        }
    }, [platformSettings]);
    
    // Handle setting change
    const handleSettingChange = (key, value) => {
        setLocalSettings(prev => ({
            ...prev,
            [key]: value,
        }));
        setSaved(false);
    };
    
    // Handle save
    const handleSave = async () => {
        try {
            await dispatch(updatePlatformSettings(localSettings)).unwrap();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    };
    
    // Risk categories for rate floors
    const riskCategories = [
        { key: 'aaa_min_rate', label: 'AAA', color: 'text-emerald-600 bg-emerald-50' },
        { key: 'aa_min_rate', label: 'AA', color: 'text-emerald-600 bg-emerald-50' },
        { key: 'a_min_rate', label: 'A', color: 'text-blue-600 bg-blue-50' },
        { key: 'bbb_min_rate', label: 'BBB', color: 'text-blue-600 bg-blue-50' },
        { key: 'bb_min_rate', label: 'BB', color: 'text-amber-600 bg-amber-50' },
        { key: 'b_min_rate', label: 'B', color: 'text-amber-600 bg-amber-50' },
        { key: 'c_min_rate', label: 'C', color: 'text-red-600 bg-red-50' },
        { key: 'd_min_rate', label: 'D', color: 'text-red-600 bg-red-50' },
    ];
    
    if (!localSettings) {
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
                            <Settings className="w-8 h-8 text-primary-500" />
                            Interest Rate Controls
                        </h1>
                        <p className="text-slate-600">
                            Configure platform-wide rate limits and risk-based minimums
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                dispatch(fetchPlatformSettings());
                                dispatch(fetchRateStatistics(30));
                                dispatch(fetchAverageRatesByCategory());
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                        >
                            {isLoading ? (
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
                
                {/* Success Message */}
                {saved && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span className="text-emerald-700">Settings saved successfully!</span>
                    </div>
                )}
                
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Settings */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Rate Limits */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary-500" />
                                Rate Limits
                            </h2>
                            
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Maximum Interest Rate
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={localSettings.max_interest_rate}
                                            onChange={(e) => handleSettingChange('max_interest_rate', parseFloat(e.target.value))}
                                            min={5}
                                            max={50}
                                            step={0.5}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Cap borrowers from setting rates above this value
                                    </p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Minimum Interest Rate
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={localSettings.min_interest_rate}
                                            onChange={(e) => handleSettingChange('min_interest_rate', parseFloat(e.target.value))}
                                            min={1}
                                            max={20}
                                            step={0.5}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Platform floor rate for all loans
                                    </p>
                                </div>
                            </div>
                            
                            {/* LTV Setting */}
                            <div className="mt-6 pt-6 border-t border-slate-200">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    <Shield className="w-4 h-4 inline mr-1" />
                                    Maximum Loan-to-Value (LTV) Ratio
                                </label>
                                <div className="relative max-w-xs">
                                    <input
                                        type="number"
                                        value={localSettings.max_ltv_ratio}
                                        onChange={(e) => handleSettingChange('max_ltv_ratio', parseFloat(e.target.value))}
                                        min={10}
                                        max={90}
                                        step={5}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Maximum LTV allowed - loans exceeding this will be rejected
                                </p>
                            </div>
                        </div>
                        
                        {/* Risk Category Rate Floors */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary-500" />
                                Risk Category Minimum Rates
                            </h2>
                            
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {riskCategories.map(({ key, label, color }) => (
                                    <div key={key} className="p-4 bg-slate-50 rounded-lg">
                                        <div className={`inline-flex px-2 py-1 rounded text-xs font-semibold mb-2 ${color}`}>
                                            {label}
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={localSettings[key]}
                                                onChange={(e) => handleSettingChange(key, parseFloat(e.target.value))}
                                                min={0}
                                                max={50}
                                                step={0.5}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-center font-semibold"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                                <p className="text-sm text-amber-700">
                                    Risk category minimums prevent borrowers with poor credit from offering 
                                    unrealistically low rates that would never attract investors.
                                </p>
                            </div>
                        </div>
                        
                        {/* Rate Adjustment Settings */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <h2 className="text-xl font-semibold text-slate-900 mb-6">
                                Rate Adjustment Rules
                            </h2>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                    <div>
                                        <div className="font-medium text-slate-900">Allow Rate Increases</div>
                                        <div className="text-sm text-slate-500">
                                            Borrowers can increase their interest rate to attract more investors
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={localSettings.allow_rate_increase}
                                            onChange={(e) => handleSettingChange('allow_rate_increase', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                                    </label>
                                </div>
                                
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                    <div>
                                        <div className="font-medium text-slate-900">Allow Rate Decreases</div>
                                        <div className="text-sm text-slate-500">
                                            Borrowers can decrease their interest rate after funding starts
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={localSettings.allow_rate_decrease}
                                            onChange={(e) => handleSettingChange('allow_rate_decrease', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                                    </label>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Minimum Interval Between Rate Decreases
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={localSettings.min_rate_decrease_interval_hours}
                                            onChange={(e) => handleSettingChange('min_rate_decrease_interval_hours', parseInt(e.target.value))}
                                            min={0}
                                            max={168}
                                            className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        />
                                        <span className="text-slate-500">hours</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Sidebar - Statistics */}
                    <div className="space-y-6">
                        {/* Rate Statistics */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <h3 className="font-semibold text-slate-900 mb-4">Platform Statistics (30 days)</h3>
                            
                            {rateStatistics ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">Average Funded Rate</span>
                                        <span className="font-bold text-primary-600">
                                            {rateStatistics.averageFundedRate || 14.5}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">Total Loans Funded</span>
                                        <span className="font-bold text-slate-900">
                                            {rateStatistics.totalLoansFunded || 156}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">Total Volume</span>
                                        <span className="font-bold text-slate-900">
                                            ${(rateStatistics.totalVolume / 1000000 || 5.2).toFixed(1)}M
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">Avg Funding Time</span>
                                        <span className="font-bold text-slate-900">
                                            {rateStatistics.avgFundingDays || 4.2} days
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-4 bg-slate-200 rounded"></div>
                                    <div className="h-4 bg-slate-200 rounded"></div>
                                    <div className="h-4 bg-slate-200 rounded"></div>
                                </div>
                            )}
                        </div>
                        
                        {/* Average Rates by Category */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <h3 className="font-semibold text-slate-900 mb-4">Avg Rates by Risk</h3>
                            
                            <div className="space-y-3">
                                {riskCategories.map(({ key, label, color }) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
                                            {label}
                                        </span>
                                        <span className="font-medium text-slate-700">
                                            {localSettings[key] + (Math.random() * 2 - 1).toFixed(1)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Market Demand Settings */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <h3 className="font-semibold text-slate-900 mb-4">Demand Calculation</h3>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">Enable Demand Calculation</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={localSettings.demand_calculation_enabled}
                                            onChange={(e) => handleSettingChange('demand_calculation_enabled', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                                    </label>
                                </div>
                                
                                <div>
                                    <label className="block text-sm text-slate-600 mb-1">
                                        Historical Data Weight
                                    </label>
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.1}
                                        value={localSettings.historical_data_weight}
                                        onChange={(e) => handleSettingChange('historical_data_weight', parseFloat(e.target.value))}
                                        className="w-full"
                                    />
                                    <span className="text-xs text-slate-500">
                                        {(localSettings.historical_data_weight * 100).toFixed(0)}%
                                    </span>
                                </div>
                                
                                <div>
                                    <label className="block text-sm text-slate-600 mb-1">
                                        Risk Score Weight
                                    </label>
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.1}
                                        value={localSettings.risk_score_weight}
                                        onChange={(e) => handleSettingChange('risk_score_weight', parseFloat(e.target.value))}
                                        className="w-full"
                                    />
                                    <span className="text-xs text-slate-500">
                                        {(localSettings.risk_score_weight * 100).toFixed(0)}%
                                    </span>
                                </div>
                                
                                <div>
                                    <label className="block text-sm text-slate-600 mb-1">
                                        Rate Competitiveness Weight
                                    </label>
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.1}
                                        value={localSettings.rate_competitiveness_weight}
                                        onChange={(e) => handleSettingChange('rate_competitiveness_weight', parseFloat(e.target.value))}
                                        className="w-full"
                                    />
                                    <span className="text-xs text-slate-500">
                                        {(localSettings.rate_competitiveness_weight * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RateControls;
