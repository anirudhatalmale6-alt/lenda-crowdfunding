import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    getReservePools, 
    getClaims,
    getRiskAssessments 
} from '../../store/slices/tokenSlice';
import { formatCurrency, formatPercentage, formatDate } from '../../utils/formatters';

const RiskControls = () => {
    const dispatch = useDispatch();
    const { reservePools, claims, riskAssessments, isLoading } = useSelector(
        (state) => state.tokens
    );
    
    const [activeTab, setActiveTab] = useState('reserves');
    const [alerts, setAlerts] = useState([]);
    
    useEffect(() => {
        dispatch(getReservePools());
        dispatch(getClaims());
        dispatch(getRiskAssessments());
    }, [dispatch]);

    // Generate alerts based on coverage ratios
    useEffect(() => {
        const newAlerts = [];
        
        reservePools?.forEach(pool => {
            if (pool.currentCoverageRatio < pool.minCoverageRatio) {
                newAlerts.push({
                    type: 'critical',
                    title: 'Low Coverage Ratio',
                    message: `${pool.name} has coverage ratio of ${formatPercentage(pool.currentCoverageRatio)} which is below minimum ${formatPercentage(pool.minCoverageRatio)}`,
                    poolId: pool.id
                });
            } else if (pool.currentCoverageRatio < pool.targetCoverageRatio * 0.8) {
                newAlerts.push({
                    type: 'warning',
                    title: 'Coverage Ratio Warning',
                    message: `${pool.name} coverage ratio is below target`,
                    poolId: pool.id
                });
            }
            
            if (pool.balance < pool.lockedBalance * 1.5) {
                newAlerts.push({
                    type: 'warning',
                    title: 'Low Liquidity',
                    message: `${pool.name} has limited available liquidity`,
                    poolId: pool.id
                });
            }
        });
        
        setAlerts(newAlerts);
    }, [reservePools]);

    const getStatusColor = (status) => {
        const colors = {
            'active': 'bg-green-100 text-green-800',
            'depleted': 'bg-red-100 text-red-800',
            'paused': 'bg-yellow-100 text-yellow-800',
            'closed': 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getPoolTypeLabel = (type) => {
        const labels = {
            'guarantee': 'Guarantee',
            'insurance': 'Insurance',
            'liquidity': 'Liquidity',
            'recovery': 'Recovery'
        };
        return labels[type] || type;
    };

    const renderAlerts = () => (
        <div className="space-y-4">
            {alerts.map((alert, index) => (
                <div 
                    key={index}
                    className={`p-4 rounded-lg border ${
                        alert.type === 'critical' 
                            ? 'bg-red-50 border-red-200' 
                            : 'bg-yellow-50 border-yellow-200'
                    }`}
                >
                    <div className="flex items-start">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            alert.type === 'critical' ? 'bg-red-100' : 'bg-yellow-100'
                        }`}>
                            {alert.type === 'critical' ? (
                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                        <div className="ml-3 flex-1">
                            <h4 className={`text-sm font-medium ${
                                alert.type === 'critical' ? 'text-red-800' : 'text-yellow-800'
                            }`}>
                                {alert.title}
                            </h4>
                            <p className={`text-sm mt-1 ${
                                alert.type === 'critical' ? 'text-red-700' : 'text-yellow-700'
                            }`}>
                                {alert.message}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
            
            {alerts.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-800">All systems operating normally</span>
                    </div>
                </div>
            )}
        </div>
    );

    const renderReservePools = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {reservePools?.map((pool) => (
                    <div key={pool.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-semibold text-gray-900">{pool.name}</h4>
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getStatusColor(pool.status)}`}>
                                    {pool.status}
                                </span>
                            </div>
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                                {getPoolTypeLabel(pool.poolType)}
                            </span>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-500">Total Balance</p>
                                <p className="text-xl font-bold text-gray-900">{formatCurrency(pool.balance)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Available</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {formatCurrency(pool.balance - pool.lockedBalance)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Coverage Ratio</p>
                                <div className="flex items-center">
                                    <p className={`text-lg font-semibold ${
                                        pool.currentCoverageRatio < pool.minCoverageRatio 
                                            ? 'text-red-600' 
                                            : 'text-green-600'
                                    }`}>
                                        {formatPercentage(pool.currentCoverageRatio)}
                                    </p>
                                    <span className="text-xs text-gray-500 ml-2">
                                        / {formatPercentage(pool.targetCoverageRatio)} target
                                    </span>
                                </div>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className={`h-2 rounded-full ${
                                            pool.currentCoverageRatio < pool.minCoverageRatio 
                                                ? 'bg-red-500' 
                                                : pool.currentCoverageRatio < pool.targetCoverageRatio * 0.8
                                                    ? 'bg-yellow-500'
                                                    : 'bg-green-500'
                                        }`}
                                        style={{ 
                                            width: `${Math.min((pool.currentCoverageRatio / pool.targetCoverageRatio) * 100, 100)}%` 
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Claims Paid</span>
                                <span className="font-medium text-gray-900">{formatCurrency(pool.totalClaimsPaid)}</span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="text-gray-500">Replenished</span>
                                <span className="font-medium text-gray-900">{formatCurrency(pool.totalReplenished)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderClaims = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Reserve Claims</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Claim ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pool</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {claims?.map((claim) => (
                            <tr key={claim.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-gray-900">#{claim.id}</td>
                                <td className="px-6 py-4 text-gray-600">{claim.poolName}</td>
                                <td className="px-6 py-4 text-gray-600">Loan #{claim.loanId}</td>
                                <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(claim.claimAmount)}</td>
                                <td className="px-6 py-4 text-gray-600 capitalize">{claim.reason}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        claim.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        claim.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                        claim.status === 'paid' ? 'bg-green-100 text-green-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {claim.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500">{formatDate(claim.createdAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {(!claims || claims.length === 0) && (
                <p className="p-6 text-center text-gray-500">No claims</p>
            )}
        </div>
    );

    const renderRiskAssessments = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Loan Risk Assessments</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Score</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">PD</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">LGD</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">EL</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assessment</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {riskAssessments?.map((assessment) => (
                            <tr key={assessment.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-gray-900">Loan #{assessment.loanId}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        ['AAA', 'AA', 'A'].includes(assessment.riskRating) ? 'bg-green-100 text-green-800' :
                                        ['BBB', 'BB'].includes(assessment.riskRating) ? 'bg-blue-100 text-blue-800' :
                                        ['B', 'CCC'].includes(assessment.riskRating) ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {assessment.riskRating}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-gray-900">{assessment.riskScore}</td>
                                <td className="px-6 py-4 text-right text-gray-600">{formatPercentage(assessment.probabilityOfDefault * 100)}</td>
                                <td className="px-6 py-4 text-right text-gray-600">{formatPercentage(assessment.lossGivenDefault * 100)}</td>
                                <td className="px-6 py-4 text-right text-gray-900 font-medium">{formatPercentage(assessment.expectedLoss * 100)}</td>
                                <td className="px-6 py-4 text-gray-500">{formatDate(assessment.assessedAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {(!riskAssessments || riskAssessments.length === 0) && (
                <p className="p-6 text-center text-gray-500">No risk assessments</p>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Risk Controls</h1>
                    <p className="text-gray-600 mt-2">Monitor reserve pools, coverage ratios, and risk assessments</p>
                </div>

                {/* Alerts */}
                {renderAlerts()}

                {/* Tabs */}
                <div className="border-b border-gray-200 mt-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('reserves')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'reserves'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Reserve Pools
                        </button>
                        <button
                            onClick={() => setActiveTab('claims')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'claims'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Claims
                        </button>
                        <button
                            onClick={() => setActiveTab('risk')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'risk'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Risk Assessments
                        </button>
                    </nav>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'reserves' && renderReservePools()}
                        {activeTab === 'claims' && renderClaims()}
                        {activeTab === 'risk' && renderRiskAssessments()}
                    </>
                )}
            </div>
        </div>
    );
};

export default RiskControls;
