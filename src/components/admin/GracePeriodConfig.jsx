import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { 
  getGracePeriodConfig, 
  updateGracePeriodConfig,
  GRACE_PERIOD_CONFIG 
} from '../../services/riskService';

/**
 * Grace Period Configuration Component (RISK-002)
 * UI for configuring the grace period settings
 */
function GracePeriodConfig() {
  const dispatch = useDispatch();
  const { isAdmin } = useSelector((state) => state.auth);
  
  const [config, setConfig] = useState({
    defaultDays: GRACE_PERIOD_CONFIG.defaultDays,
    minDays: GRACE_PERIOD_CONFIG.minDays,
    maxDays: GRACE_PERIOD_CONFIG.maxDays,
    warningDays: GRACE_PERIOD_CONFIG.warningDays,
    autoAdvanceWorkflow: true,
    sendNotifications: true
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const serverConfig = await getGracePeriodConfig();
      if (serverConfig && serverConfig.config) {
        setConfig(prev => ({
          ...prev,
          ...serverConfig.config
        }));
      }
    } catch (error) {
      console.error('Error loading grace period config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleWarningDayToggle = (day) => {
    setConfig(prev => {
      const currentDays = prev.warningDays || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day].sort((a, b) => a - b);
      
      return {
        ...prev,
        warningDays: newDays
      };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateGracePeriodConfig(config);
      toast.success('Grace period configuration saved');
      setHasChanges(false);
    } catch (error) {
      toast.error(error.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({
      defaultDays: GRACE_PERIOD_CONFIG.defaultDays,
      minDays: GRACE_PERIOD_CONFIG.minDays,
      maxDays: GRACE_PERIOD_CONFIG.maxDays,
      warningDays: GRACE_PERIOD_CONFIG.warningDays,
      autoAdvanceWorkflow: true,
      sendNotifications: true
    });
    setHasChanges(true);
  };

  const getWarningLevel = (days) => {
    if (days <= 3) return { label: 'Critical', color: 'text-red-600', bg: 'bg-red-50' };
    if (days <= 5) return { label: 'Warning', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-50' };
  };

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Grace Period Configuration</h2>
              <p className="text-sm text-slate-500 mt-1">
                Configure the grace period settings for default workflow
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="btn-secondary"
                disabled={isSaving}
              >
                Reset to Default
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={`btn-primary ${!hasChanges || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Default Grace Period */}
        <div className="card">
          <div className="p-6">
            <h3 className="font-semibold mb-4">Default Grace Period</h3>
            <div>
              <label className="block text-sm font-medium mb-2">
                Number of Days (1-30)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={config.minDays}
                  max={config.maxDays}
                  value={config.defaultDays}
                  onChange={(e) => handleChange('defaultDays', parseInt(e.target.value))}
                  className="flex-1"
                />
                <div className="w-16 text-center">
                  <span className="text-2xl font-bold text-emerald-600">
                    {config.defaultDays}
                  </span>
                  <span className="text-sm text-slate-500">days</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>{config.minDays} day</span>
                <span>{config.maxDays} days</span>
              </div>
            </div>
            
            {/* Visual Timeline */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium mb-2">Grace Period Timeline</p>
              <div className="relative">
                <div className="flex items-center">
                  <div className="flex-1 h-2 bg-slate-200 rounded-l">
                    <div 
                      className="h-2 bg-emerald-500 rounded-l"
                      style={{ width: `${(config.defaultDays / config.maxDays) * 100}%` }}
                    ></div>
                  </div>
                  <div className="w-3 h-3 bg-emerald-500 rounded-full -ml-2 relative z-10"></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>Due Date</span>
                  <span>Day {config.defaultDays} (Default)</span>
                  <span>Day {config.maxDays} (Max)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Days Configuration */}
        <div className="card">
          <div className="p-6">
            <h3 className="font-semibold mb-4">Warning Notifications</h3>
            <p className="text-sm text-slate-500 mb-4">
              Select when to send payment reminders before default
            </p>
            <div className="space-y-3">
              {[7, 5, 3, 2, 1].map((day) => (
                <div 
                  key={day}
                  onClick={() => handleWarningDayToggle(day)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-colors flex items-center justify-between ${
                    config.warningDays?.includes(day)
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={config.warningDays?.includes(day)}
                      onChange={() => handleWarningDayToggle(day)}
                      className="w-4 h-4 text-emerald-600"
                    />
                    <span className="font-medium">
                      {day === 1 ? '1 day before' : `${day} days before`}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getWarningLevel(day).bg} ${getWarningLevel(day).color}`}>
                    {getWarningLevel(day).label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Automation */}
      <div className="card">
        <div className="p-6">
          <h3 className="font-semibold mb-4">Workflow Automation</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">Auto-Advance Workflow</p>
                <p className="text-sm text-slate-500">
                  Automatically move loans through workflow stages after grace period
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoAdvanceWorkflow}
                  onChange={(e) => handleChange('autoAdvanceWorkflow', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">Send Notifications</p>
                <p className="text-sm text-slate-500">
                  Send email/SMS notifications to borrowers during grace period
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.sendNotifications}
                  onChange={(e) => handleChange('sendNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Contract Configuration Info */}
      <div className="card bg-blue-50 border border-blue-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <span className="text-3xl">⛽</span>
            <div>
              <h3 className="font-semibold text-blue-800">Smart Contract Integration</h3>
              <p className="text-sm text-blue-600 mt-1">
                The grace period is also configurable in the LendaLoan smart contract. 
                Current on-chain value: <strong>{config.defaultDays} days</strong>.
                Changes here will be synced with the blockchain when saved.
              </p>
              <div className="mt-3 flex gap-2">
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  Contract: LendaLoan.sol
                </span>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  Function: setGracePeriodDays()
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Stages Reference */}
      <div className="card">
        <div className="p-6">
          <h3 className="font-semibold mb-4">Default Workflow Stages</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Stage</th>
                  <th className="text-left py-2">Duration</th>
                  <th className="text-left py-2">Action</th>
                  <th className="text-left py-2">Auto-Advance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-medium">Grace Period</td>
                  <td className="py-2">{config.defaultDays} days</td>
                  <td className="py-2">Payment reminder</td>
                  <td className="py-2">
                    <span className="text-emerald-600">✓ Yes</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Refinance Attempt</td>
                  <td className="py-2">14 days</td>
                  <td className="py-2">Refinancing marketplace listing</td>
                  <td className="py-2">
                    <span className="text-emerald-600">✓ Yes</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Pre-Liquidation</td>
                  <td className="py-2">5 days</td>
                  <td className="py-2">Warning notification</td>
                  <td className="py-2">
                    <span className="text-emerald-600">✓ Yes</span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Liquidation</td>
                  <td className="py-2">0 days</td>
                  <td className="py-2">Collateral auction</td>
                  <td className="py-2">
                    <span className="text-emerald-600">✓ Yes</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Recovery</td>
                  <td className="py-2">0 days</td>
                  <td className="py-2">Recovery marketplace</td>
                  <td className="py-2">
                    <span className="text-slate-400">Manual</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GracePeriodConfig;
