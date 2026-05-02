import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

/**
 * LoanComparisonTool - UX-006: Multi-loan comparison tool for investors
 * Allows investors to compare multiple loans side-by-side
 */
function LoanComparisonTool({ loans = [], onCompare, maxLoans = 4 }) {
    const [selectedLoans, setSelectedLoans] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    const toggleLoan = (loan) => {
        const isSelected = selectedLoans.some(l => l.id === loan.id);
        
        if (isSelected) {
            setSelectedLoans(selectedLoans.filter(l => l.id !== loan.id));
        } else if (selectedLoans.length < maxLoans) {
            setSelectedLoans([...selectedLoans, loan]);
        }
    };

    const clearSelection = () => {
        setSelectedLoans([]);
    };

    const getRiskColor = (rating) => {
        const colors = {
            'AAA': 'bg-green-100 text-green-800',
            'AA': 'bg-green-50 text-green-700',
            'A': 'bg-blue-100 text-blue-800',
            'BBB': 'bg-blue-50 text-blue-700',
            'BB': 'bg-yellow-100 text-yellow-800',
            'B': 'bg-orange-100 text-orange-800',
            'CCC': 'bg-red-100 text-red-800',
            'D': 'bg-red-200 text-red-900',
        };
        return colors[rating] || 'bg-gray-100 text-gray-800';
    };

    const getStatusColor = (status) => {
        const colors = {
            REQUESTED: 'bg-blue-100 text-blue-800',
            FUNDED: 'bg-yellow-100 text-yellow-800',
            ACTIVE: 'bg-green-100 text-green-800',
            REPAID: 'bg-gray-100 text-gray-800',
            DEFAULTED: 'bg-red-100 text-red-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const handleCompare = () => {
        onCompare?.(selectedLoans);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-medium">Compare Loans</span>
                {selectedLoans.length > 0 && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {selectedLoans.length}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900">Compare Loans</h3>
                            <div className="flex items-center gap-2">
                                {selectedLoans.length > 0 && (
                                    <button
                                        onClick={clearSelection}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        Clear
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Select up to {maxLoans} loans to compare
                        </p>
                    </div>

                    {/* Loan List */}
                    <div className="max-h-80 overflow-y-auto">
                        {loans.length === 0 ? (
                            <p className="p-4 text-center text-gray-500 text-sm">
                                No loans available to compare
                            </p>
                        ) : (
                            <div className="p-2">
                                {loans.map((loan) => {
                                    const isSelected = selectedLoans.some(l => l.id === loan.id);
                                    const isDisabled = !isSelected && selectedLoans.length >= maxLoans;
                                    
                                    return (
                                        <button
                                            key={loan.id}
                                            onClick={() => !isDisabled && toggleLoan(loan)}
                                            disabled={isDisabled}
                                            className={`w-full p-3 text-left rounded-lg border transition-colors ${
                                                isSelected 
                                                    ? 'border-blue-500 bg-blue-50' 
                                                    : isDisabled
                                                        ? 'border-gray-100 opacity-50 cursor-not-allowed'
                                                        : 'border-gray-100 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                                    isSelected 
                                                        ? 'bg-blue-600 border-blue-600' 
                                                        : 'border-gray-300'
                                                }`}>
                                                    {isSelected && (
                                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <p className="font-medium text-gray-900 truncate">
                                                            Loan #{loan.id}
                                                        </p>
                                                        <span className={`px-2 py-0.5 rounded text-xs ${getRiskColor(loan.riskRating)}`}>
                                                            {loan.riskRating}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between mt-1">
                                                        <span className="text-sm text-gray-500">
                                                            {formatCurrency(loan.loanAmount)}
                                                        </span>
                                                        <span className="text-sm font-medium text-emerald-600">
                                                            {loan.interestRate}% APR
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {selectedLoans.length > 0 && (
                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                            <button
                                onClick={handleCompare}
                                className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Compare {selectedLoans.length} Loans
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Comparison Modal */}
            {selectedLoans.length > 0 && isOpen === false && (
                <ComparisonModal 
                    loans={selectedLoans} 
                    onClose={clearSelection}
                    onUpdate={() => setIsOpen(true)}
                />
            )}
        </div>
    );
}

/**
 * ComparisonModal - Displays loans side-by-side for comparison
 */
function ComparisonModal({ loans, onClose, onUpdate }) {
    if (loans.length < 2) return null;

    const metrics = [
        { key: 'loanAmount', label: 'Loan Amount', format: 'currency' },
        { key: 'interestRate', label: 'Interest Rate', format: 'percentage', suffix: 'APR' },
        { key: 'durationMonths', label: 'Duration', format: 'months' },
        { key: 'riskRating', label: 'Risk Rating', format: 'text' },
        { key: 'collateralType', label: 'Collateral', format: 'text' },
        { key: 'fundedAmount', label: 'Funded', format: 'currency' },
        { key: 'borrowerScore', label: 'Borrower Score', format: 'number' },
    ];

    const getRiskColor = (rating) => {
        const colors = {
            'AAA': 'text-green-600',
            'AA': 'text-green-500',
            'A': 'text-blue-500',
            'BBB': 'text-blue-400',
            'BB': 'text-yellow-500',
            'B': 'text-orange-500',
            'CCC': 'text-red-500',
            'D': 'text-red-600',
        };
        return colors[rating] || 'text-gray-600';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Loan Comparison</h2>
                            <p className="text-gray-500 mt-1">
                                Comparing {loans.length} loans side-by-side
                            </p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Comparison Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-40">
                                    Metric
                                </th>
                                {loans.map((loan) => (
                                    <th key={loan.id} className="px-4 py-3 text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-900">Loan #{loan.id}</span>
                                            <Link 
                                                to={`/loans/${loan.id}`} 
                                                className="text-blue-600 hover:text-blue-800 text-xs"
                                            >
                                                View
                                            </Link>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {metrics.map((metric) => (
                                <tr key={metric.key} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-500">
                                        {metric.label}
                                    </td>
                                    {loans.map((loan) => {
                                        const value = loan[metric.key];
                                        let displayValue = value;
                                        
                                        if (metric.format === 'currency') {
                                            displayValue = formatCurrency(value);
                                        } else if (metric.format === 'percentage') {
                                            displayValue = formatPercentage(value);
                                        } else if (metric.format === 'months') {
                                            displayValue = `${value} months`;
                                        }
                                        
                                        return (
                                            <td key={loan.id} className="px-4 py-3">
                                                <span className={metric.key === 'riskRating' ? getRiskColor(value) : 'text-gray-900'}>
                                                    {displayValue || 'N/A'}
                                                </span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between">
                    <button
                        onClick={onUpdate}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                    >
                        Update Selection
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LoanComparisonTool;
