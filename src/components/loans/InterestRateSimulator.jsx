import { useState, useEffect, useMemo } from 'react';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

/**
 * InterestRateSimulator - UX-008: Interactive rate calculator for loan creation
 * Shows monthly payments, total interest, and amortization schedule
 */
function InterestRateSimulator({ 
    initialAmount = 10000, 
    initialRate = 12, 
    initialTerm = 12,
    onChange,
    compact = false 
}) {
    const [loanAmount, setLoanAmount] = useState(initialAmount);
    const [interestRate, setInterestRate] = useState(initialRate);
    const [termMonths, setTermMonths] = useState(initialTerm);
    const [showSchedule, setShowSchedule] = useState(false);

    // Calculate loan details
    const calculations = useMemo(() => {
        const principal = parseFloat(loanAmount) || 0;
        const annualRate = parseFloat(interestRate) || 0;
        const months = parseInt(termMonths) || 1;
        
        // Monthly interest rate
        const monthlyRate = annualRate / 100 / 12;
        
        // Monthly payment calculation (amortizing loan)
        let monthlyPayment;
        if (monthlyRate === 0) {
            monthlyPayment = principal / months;
        } else {
            monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                            (Math.pow(1 + monthlyRate, months) - 1);
        }
        
        // Total payment over loan term
        const totalPayment = monthlyPayment * months;
        
        // Total interest paid
        const totalInterest = totalPayment - principal;
        
        // Generate amortization schedule
        const schedule = [];
        let balance = principal;
        
        for (let month = 1; month <= months; month++) {
            const interestPayment = balance * monthlyRate;
            const principalPayment = monthlyPayment - interestPayment;
            balance -= principalPayment;
            
            schedule.push({
                month,
                payment: monthlyPayment,
                principal: principalPayment,
                interest: interestPayment,
                balance: Math.max(0, balance),
            });
        }
        
        return {
            monthlyPayment,
            totalPayment,
            totalInterest,
            schedule,
            principal,
            annualRate,
            months,
        };
    }, [loanAmount, interestRate, termMonths]);

    useEffect(() => {
        onChange?.({
            amount: loanAmount,
            rate: interestRate,
            term: termMonths,
            monthlyPayment: calculations.monthlyPayment,
            totalInterest: calculations.totalInterest,
            totalPayment: calculations.totalPayment,
        });
    }, [loanAmount, interestRate, termMonths, calculations, onChange]);

    const handleAmountChange = (value) => {
        const num = parseFloat(value) || 0;
        setLoanAmount(Math.max(100, Math.min(1000000, num)));
    };

    const handleRateChange = (value) => {
        const num = parseFloat(value) || 0;
        setInterestRate(Math.max(0, Math.min(50, num)));
    };

    const handleTermChange = (value) => {
        const num = parseInt(value) || 1;
        setTermMonths(Math.max(1, Math.min(60, num)));
    };

    if (compact) {
        return (
            <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-xs text-gray-500">Monthly Payment</p>
                        <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(calculations.monthlyPayment)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Total Interest</p>
                        <p className="text-lg font-semibold text-amber-600">
                            {formatCurrency(calculations.totalInterest)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Total Payment</p>
                        <p className="text-lg font-semibold text-emerald-600">
                            {formatCurrency(calculations.totalPayment)}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Interest Rate Simulator</h3>
                <button
                    onClick={() => setShowSchedule(!showSchedule)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                >
                    {showSchedule ? 'Hide Schedule' : 'Show Schedule'}
                </button>
            </div>

            {/* Input Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Loan Amount */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loan Amount
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                            type="number"
                            value={loanAmount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="100"
                            max="1000000"
                            step="100"
                        />
                    </div>
                    <input
                        type="range"
                        value={loanAmount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        min="100"
                        max="100000"
                        step="100"
                        className="w-full mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>$100</span>
                        <span>$100K</span>
                    </div>
                </div>

                {/* Interest Rate */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Annual Interest Rate (APR)
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={interestRate}
                            onChange={(e) => handleRateChange(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                            max="50"
                            step="0.1"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                    <input
                        type="range"
                        value={interestRate}
                        onChange={(e) => handleRateChange(e.target.value)}
                        min="1"
                        max="30"
                        step="0.5"
                        className="w-full mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>1%</span>
                        <span>30%</span>
                    </div>
                </div>

                {/* Term */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loan Term
                    </label>
                    <select
                        value={termMonths}
                        onChange={(e) => handleTermChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value={3}>3 Months</option>
                        <option value={6}>6 Months</option>
                        <option value={9}>9 Months</option>
                        <option value={12}>12 Months</option>
                        <option value={18}>18 Months</option>
                        <option value={24}>24 Months</option>
                        <option value={36}>36 Months</option>
                        <option value={48}>48 Months</option>
                        <option value={60}>60 Months</option>
                    </select>
                    <input
                        type="range"
                        value={termMonths}
                        onChange={(e) => handleTermChange(e.target.value)}
                        min="3"
                        max="60"
                        step="1"
                        className="w-full mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>3 mo</span>
                        <span>60 mo</span>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Monthly Payment</p>
                        <p className="text-3xl font-bold text-gray-900">
                            {formatCurrency(calculations.monthlyPayment)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">per month</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Total Interest</p>
                        <p className="text-3xl font-semibold text-amber-600">
                            {formatCurrency(calculations.totalInterest)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {((calculations.totalInterest / calculations.principal) * 100).toFixed(1)}% of principal
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Total Payment</p>
                        <p className="text-3xl font-semibold text-emerald-600">
                            {formatCurrency(calculations.totalPayment)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">over {termMonths} months</p>
                    </div>
                </div>
            </div>

            {/* Amortization Schedule */}
            {showSchedule && (
                <div className="border-t border-gray-200 pt-6">
                    <h4 className="font-medium text-gray-900 mb-4">Amortization Schedule</h4>
                    <div className="max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left text-gray-500">Month</th>
                                    <th className="px-3 py-2 text-right text-gray-500">Payment</th>
                                    <th className="px-3 py-2 text-right text-gray-500">Principal</th>
                                    <th className="px-3 py-2 text-right text-gray-500">Interest</th>
                                    <th className="px-3 py-2 text-right text-gray-500">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {calculations.schedule.map((row) => (
                                    <tr key={row.month} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 text-gray-900">{row.month}</td>
                                        <td className="px-3 py-2 text-right">{formatCurrency(row.payment)}</td>
                                        <td className="px-3 py-2 text-right text-emerald-600">{formatCurrency(row.principal)}</td>
                                        <td className="px-3 py-2 text-right text-amber-600">{formatCurrency(row.interest)}</td>
                                        <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(row.balance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Chart Placeholder */}
            <div className="border-t border-gray-200 pt-6">
                <h4 className="font-medium text-gray-900 mb-4">Payment Breakdown</h4>
                <div className="h-8 bg-gray-100 rounded-full overflow-hidden flex">
                    <div 
                        className="bg-emerald-500 h-full flex items-center justify-center text-xs text-white font-medium"
                        style={{ width: `${(calculations.principal / calculations.totalPayment) * 100}%` }}
                    >
                        Principal
                    </div>
                    <div 
                        className="bg-amber-500 h-full flex items-center justify-center text-xs text-white font-medium"
                        style={{ width: `${(calculations.totalInterest / calculations.totalPayment) * 100}%` }}
                    >
                        Interest
                    </div>
                </div>
                <div className="flex justify-center gap-6 mt-3 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                        <span className="text-gray-600">Principal: {formatCurrency(calculations.principal)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-amber-500 rounded-full" />
                        <span className="text-gray-600">Interest: {formatCurrency(calculations.totalInterest)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InterestRateSimulator;
