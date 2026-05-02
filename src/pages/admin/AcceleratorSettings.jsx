import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  BarChart3,
  TrendingUp,
  Zap,
  Bell
} from 'lucide-react';
import { 
  getAcceleratorSettings, 
  updateAcceleratorSettings,
  getAcceleratorAnalytics 
} from '../../services/acceleratorService';

/**
 * AcceleratorSettings - Admin panel to control accelerator behavior
 */
const AcceleratorSettings = () => {
  const [settings, setSettings] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsData, analyticsData] = await Promise.all([
        getAcceleratorSettings(),
        getAcceleratorAnalytics(6)
      ]);
      
      // Convert settings array to object
      const settingsObj = {};
      settingsData.forEach(s => {
        settingsObj[s.setting_key] = s.setting_value;
      });
      setSettings(settingsObj);
      setAnalytics(analyticsData);
    } catch (err) {
      setError('Failed to load accelerator data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value: String(value)
      }));

      const result = await updateAcceleratorSettings(settingsArray);
      
      if (result.success) {
        setMessage(`Successfully updated ${result.updated_count} settings`);
      } else {
        setError(result.message || 'Failed to save settings');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-7 h-7" />
          Accelerator Settings
        </h1>
        <p className="text-gray-600 mt-1">
          Configure the loan funding accelerator thresholds and behaviors
        </p>
      </div>

      {/* Analytics Overview */}
      {analytics && analytics.live_stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center gap-2 text-orange-700 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">Trending Loans</span>
            </div>
            <p className="text-3xl font-bold text-orange-800">
              {analytics.live_stats.trending_loans || 0}
            </p>
            <p className="text-xs text-orange-600">50%+ funded</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <Zap className="w-5 h-5" />
              <span className="font-medium">Hot Opportunities</span>
            </div>
            <p className="text-3xl font-bold text-red-800">
              {analytics.live_stats.hot_opportunities || 0}
            </p>
            <p className="text-xs text-red-600">75%+ funded</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">Almost Funded</span>
            </div>
            <p className="text-3xl font-bold text-green-800">
              {analytics.live_stats.almost_funded || 0}
            </p>
            <p className="text-xs text-green-600">90%+ funded</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">Avg Funding Time</span>
            </div>
            <p className="text-3xl font-bold text-blue-800">
              {analytics.summary?.average_funding_time_hours || 0}h
            </p>
            <p className="text-xs text-blue-600">Per loan</p>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span>{message}</span>
          </div>
        </div>
      )}

      {/* Threshold Settings */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Funding Thresholds
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trending Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trending Threshold (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="100"
                value={settings.trending_threshold || 50}
                onChange={(e) => handleSettingChange('trending_threshold', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500 text-sm">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Loans at this funding % get "Trending" badge
            </p>
          </div>

          {/* Notification Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Threshold (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="100"
                value={settings.notification_threshold || 75}
                onChange={(e) => handleSettingChange('notification_threshold', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500 text-sm">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Investors notified when loan reaches this %
            </p>
          </div>

          {/* Liquidity Pool Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Liquidity Pool Threshold (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="100"
                value={settings.liquidity_pool_threshold || 90}
                onChange={(e) => handleSettingChange('liquidity_pool_threshold', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500 text-sm">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Platform can complete loan at this funding %
            </p>
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-600" />
          Feature Toggles
        </h2>
        
        <div className="space-y-4">
          {/* Auto Notifications */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Auto Investor Notifications</h3>
              <p className="text-sm text-gray-500">
                Automatically notify investors when loans reach notification threshold
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_notifications_enabled === 'true'}
                onChange={(e) => handleSettingChange('auto_notifications_enabled', e.target.checked ? 'true' : 'false')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          {/* Visibility Boost */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Visibility Boost</h3>
              <p className="text-sm text-gray-500">
                Highlight trending loans in marketplace listings
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.visibility_boost_enabled === 'true'}
                onChange={(e) => handleSettingChange('visibility_boost_enabled', e.target.checked ? 'true' : 'false')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          {/* Liquidity Pool */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Liquidity Pool Participation</h3>
              <p className="text-sm text-gray-500">
                Allow platform liquidity pool to complete nearly-funded loans
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.liquidity_pool_enabled === 'true'}
                onChange={(e) => handleSettingChange('liquidity_pool_enabled', e.target.checked ? 'true' : 'false')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Rate Boost Settings */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          Borrower Rate Boost Settings
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Rate Increase (%)
            </label>
            <input
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              value={settings.min_rate_increase || 0.5}
              onChange={(e) => handleSettingChange('min_rate_increase', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Smallest allowed rate increase
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Rate Increase (%)
            </label>
            <input
              type="number"
              min="0.1"
              max="20"
              step="0.1"
              value={settings.max_rate_increase || 5}
              onChange={(e) => handleSettingChange('max_rate_increase', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Largest allowed rate increase
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`
            px-6 py-3 rounded-lg font-medium
            flex items-center gap-2
            ${saving 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AcceleratorSettings;
