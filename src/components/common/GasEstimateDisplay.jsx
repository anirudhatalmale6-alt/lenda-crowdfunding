import { useState, useEffect } from 'react';
import { Fuel, Zap, Clock, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import gasEstimationService from '../../services/gasEstimationService';

/**
 * GasEstimateDisplay - UI component for displaying gas estimation
 * Shows transaction costs before signing
 * 
 * @param {Object} props
 * @param {string} props.operation - Operation type (createLoan, fundLoan, etc.)
 * @param {Object} props.contract - Optional ethers contract for dynamic estimation
 * @param {string} props.functionName - Contract function name
 * @param {Array} props.args - Function arguments
 * @param {boolean} props.showSpeedSelector - Show speed selector
 * @param {Function} props.onSpeedChange - Callback when speed changes
 */
function GasEstimateDisplay({ 
    operation, 
    contract = null, 
    functionName = null, 
    args = [],
    showSpeedSelector = true,
    onSpeedChange = null,
    compact = false 
}) {
    const [estimation, setEstimation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSpeed, setSelectedSpeed] = useState('standard');

    useEffect(() => {
        fetchEstimation();
    }, [operation, contract, functionName, args]);

    const fetchEstimation = async () => {
        setLoading(true);
        setError(null);

        try {
            let result;
            
            if (contract && functionName) {
                // Use contract estimation
                result = await gasEstimationService.getFullEstimation(
                    contract, 
                    functionName, 
                    args
                );
            } else {
                // Use fallback estimation based on operation
                result = await gasEstimationService.estimateGas(null, operation);
                const costs = {
                    slow: gasEstimationService.calculateCost(result.gasLimit, 'slow'),
                    standard: gasEstimationService.calculateCost(result.gasLimit, 'standard'),
                    fast: gasEstimationService.calculateCost(result.gasLimit, 'fast'),
                    instant: gasEstimationService.calculateCost(result.gasLimit, 'instant'),
                };
                result = {
                    ...result,
                    costs,
                    recommendedSpeed: 'standard',
                    recommendedCost: costs.standard,
                };
            }

            setEstimation(result);
        } catch (err) {
            console.error('Gas estimation error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSpeedChange = (speed) => {
        setSelectedSpeed(speed);
        if (onSpeedChange) {
            onSpeedChange(speed);
        }
    };

    const getSpeedIcon = (speed) => {
        switch (speed) {
            case 'slow':
                return <Clock className="w-4 h-4" />;
            case 'fast':
                return <Zap className="w-4 h-4" />;
            case 'instant':
                return <Fuel className="w-4 h-4" />;
            default:
                return <CheckCircle className="w-4 h-4" />;
        }
    };

    const getSpeedLabel = (speed) => {
        switch (speed) {
            case 'slow':
                return 'Slow';
            case 'fast':
                return 'Fast';
            case 'instant':
                return 'Instant';
            default:
                return 'Standard';
        }
    };

    if (loading) {
        return (
            <div className={`bg-slate-50 rounded-lg ${compact ? 'p-2' : 'p-4'}`}>
                <div className="flex items-center gap-2 text-slate-500">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Calculating gas...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-amber-50 border border-amber-200 rounded-lg ${compact ? 'p-2' : 'p-4'}`}>
                <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">Gas estimation unavailable</span>
                </div>
            </div>
        );
    }

    if (!estimation || !estimation.costs) {
        return null;
    }

    const currentCost = estimation.costs[selectedSpeed];

    if (compact) {
        return (
            <div className="flex items-center gap-2 text-sm">
                <Fuel className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">
                    ≈ {currentCost?.totalCostETH || '0'} ETH 
                    <span className="text-slate-400 ml-1">(${currentCost?.totalCostUSD || '0'})</span>
                </span>
                {estimation.method === 'fallback_table' && (
                    <span className="text-xs text-slate-400" title="Estimated value">*</span>
                )}
            </div>
        );
    }

    return (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Fuel className="w-5 h-5 text-primary-500" />
                    <h4 className="font-medium text-slate-900">Transaction Cost</h4>
                </div>
                <span className="text-xs text-slate-500">
                    {estimation.estimated ? 'Live estimate' : 'Estimated'}
                </span>
            </div>

            {/* Gas Limit Info */}
            <div className="text-sm text-slate-600 mb-3">
                <span className="font-medium">{estimation.gasLimitFormatted?.toLocaleString() || estimation.gasLimit}</span> gas units
                {estimation.method === 'fallback_table' && (
                    <span className="ml-1 text-xs text-amber-600">(approximate)</span>
                )}
            </div>

            {/* Speed Selector */}
            {showSpeedSelector && (
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {['slow', 'standard', 'fast', 'instant'].map((speed) => (
                        <button
                            key={speed}
                            onClick={() => handleSpeedChange(speed)}
                            className={`p-2 rounded-lg text-center transition-all ${
                                selectedSpeed === speed
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-300'
                            }`}
                        >
                            <div className="flex justify-center mb-1">
                                {getSpeedIcon(speed)}
                            </div>
                            <div className="text-xs font-medium">{getSpeedLabel(speed)}</div>
                            <div className="text-xs opacity-75">
                                {estimation.costs[speed]?.gasPriceGwei || '0'} gwei
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Cost Display */}
            <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-2xl font-bold text-slate-900">
                            {currentCost?.totalCostETH || '0'}
                            <span className="text-sm font-normal text-slate-500 ml-1">ETH</span>
                        </div>
                        <div className="text-sm text-slate-500">
                            ≈ ${currentCost?.totalCostUSD || '0'} USD
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-slate-500">Gas Price</div>
                        <div className="text-sm font-medium text-slate-700">
                            {currentCost?.gasPriceGwei || '0'} gwei
                        </div>
                    </div>
                </div>
            </div>

            {/* Confidence Note */}
            {estimation.method === 'fallback_table' && (
                <div className="mt-3 flex items-start gap-2 text-xs text-amber-600">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>This is an estimate. Actual gas may vary based on network conditions.</p>
                </div>
            )}
        </div>
    );
}

export default GasEstimateDisplay;
