import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchStressTestScenarios,
  runStressTest,
  fetchStressTestHistory,
  selectStressTestScenarios,
  selectStressTestLoading,
  selectStressTestResults,
  selectStressTestHistory
} from '../../store/slices/capitalProtectionSlice';

/**
 * Stress Test Engine Page
 * Admin page for running stress test simulations
 */
const StressTestEngine = () => {
  const dispatch = useDispatch();
  const scenarios = useSelector(selectStressTestScenarios);
  const loading = useSelector(selectStressTestLoading);
  const results = useSelector(selectStressTestResults);
  const history = useSelector(selectStressTestHistory);

  const [selectedScenario, setSelectedScenario] = useState(null);
  const [customMode, setCustomMode] = useState(false);
  const [customDefaultRate, setCustomDefaultRate] = useState(10);
  const [customRecoveryRate, setCustomRecoveryRate] = useState(50);

  useEffect(() => {
    dispatch(fetchStressTestScenarios());
    dispatch(fetchStressTestHistory());
  }, [dispatch]);

  const handleRunTest = async () => {
    const params = customMode 
      ? { 
          default_rate: customDefaultRate, 
          collateral_recovery_rate: customRecoveryRate 
        }
      : { scenario_id: selectedScenario };
    
    await dispatch(runStressTest(params));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const getStabilityColor = (score) => {
    if (score >= 70) return 'green';
    if (score >= 40) return 'yellow';
    return 'red';
  };

  const getCoverageColor = (ratio) => {
    if (ratio >= 25) return 'green';
    if (ratio >= 15) return 'yellow';
    return 'red';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stress Test Engine</h1>
        <p className="text-gray-600">Simulate default scenarios to assess platform resilience</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scenario Selection */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Scenario</h3>
          
          {/* Preset Scenarios */}
          <div className="space-y-3 mb-6">
            {scenarios.filter(s => s.is_preset).map((scenario) => (
              <div
                key={scenario.id}
                onClick={() => {
                  setSelectedScenario(scenario.id);
                  setCustomMode(false);
                }}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedScenario === scenario.id && !customMode
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{scenario.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{scenario.default_rate}%</div>
                    <p className="text-xs text-gray-500">Default Rate</p>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Collateral Recovery: {scenario.collateral_recovery_rate}%
                </div>
              </div>
            ))}
          </div>

          {/* Custom Scenario Toggle */}
          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={customMode}
                onChange={(e) => setCustomMode(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="font-medium text-gray-700">Use Custom Parameters</span>
            </label>

            {customMode && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Rate (%)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={customDefaultRate}
                    onChange={(e) => setCustomDefaultRate(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>1%</span>
                    <span className="font-medium text-blue-600">{customDefaultRate}%</span>
                    <span>50%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Collateral Recovery Rate (%)
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={customRecoveryRate}
                    onChange={(e) => setCustomRecoveryRate(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>10%</span>
                    <span className="font-medium text-blue-600">{customRecoveryRate}%</span>
                    <span>90%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Run Button */}
          <button
            onClick={handleRunTest}
            disabled={loading || (!selectedScenario && !customMode)}
            className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Running Simulation...' : 'Run Stress Test'}
          </button>
        </div>

        {/* Results Panel */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Simulation Results</h3>
          
          {results ? (
            <div className="space-y-6">
              {/* Scenario Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">{results.scenario}</span>
                  <span className="text-sm text-gray-500">
                    Default: {results.default_rate}% | Recovery: {results.collateral_recovery_rate}%
                  </span>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                {/* Coverage After */}
                <div className={`p-4 rounded-lg bg-${getCoverageColor(results.results?.coverage_after)}-50 border border-${getCoverageColor(results.results?.coverage_after)}-200`}>
                  <div className="text-sm text-gray-600">Coverage After</div>
                  <div className={`text-2xl font-bold text-${getCoverageColor(results.results?.coverage_after)}-700`}>
                    {results.results?.coverage_after?.toFixed(1)}%
                  </div>
                </div>

                {/* Stability Score */}
                <div className={`p-4 rounded-lg bg-${getStabilityColor(results.results?.stability_score)}-50 border border-${getStabilityColor(results.results?.stability_score)}-200`}>
                  <div className="text-sm text-gray-600">Stability Score</div>
                  <div className={`text-2xl font-bold text-${getStabilityColor(results.results?.stability_score)}-700`}>
                    {results.results?.stability_score?.toFixed(0)}/100
                  </div>
                </div>
              </div>

              {/* Financial Impact */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Financial Impact</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Loans Affected:</span>
                    <span className="font-medium">{formatCurrency(results.results?.total_loans_affected)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Estimated Defaults:</span>
                    <span className="font-medium text-red-600">{formatCurrency(results.results?.estimated_default_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Collateral Recovery:</span>
                    <span className="font-medium text-green-600">{formatCurrency(results.results?.collateral_recovery)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Guarantee Claims:</span>
                    <span className="font-medium text-red-600">{formatCurrency(results.results?.guarantee_claim)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-gray-500">Reserve Depletion:</span>
                    <span className="font-medium text-red-600">{formatCurrency(results.results?.reserve_depletion)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Reserve After Stress:</span>
                    <span className="font-medium">{formatCurrency(results.results?.reserve_after)}</span>
                  </div>
                </div>
              </div>

              {/* Depletion Timeline */}
              {results.results?.depletion_days > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-medium text-red-800">
                      Reserve would be depleted in ~{results.results.depletion_days} days
                    </span>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {results.results?.recommendations?.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Recommendations</h4>
                  <ul className="space-y-2">
                    {results.results.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-600">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>Select a scenario and run the stress test to see results</p>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test History</h3>
        {history.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No stress tests run yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Scenario</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Default Rate</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Coverage After</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Stability Score</th>
                </tr>
              </thead>
              <tbody>
                {history.map((test) => (
                  <tr key={test.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {new Date(test.ran_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{test.scenario_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{test.default_rate}%</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        test.coverage_ratio_after >= 25 ? 'bg-green-100 text-green-800' :
                        test.coverage_ratio_after >= 15 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {test.coverage_ratio_after}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        test.platform_stability_score >= 70 ? 'bg-green-100 text-green-800' :
                        test.platform_stability_score >= 40 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {test.platform_stability_score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StressTestEngine;
