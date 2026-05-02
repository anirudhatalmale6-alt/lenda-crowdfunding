import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
    FileText,
    Download,
    Calendar,
    DollarSign,
    TrendingUp,
    Building,
    Receipt,
    Printer,
    Mail,
    X,
    CheckCircle,
    AlertCircle,
    PieChart,
    Filter
} from 'lucide-react';

/**
 * InvestmentTaxReport - Component for generating investment tax reports
 * Addresses FEAT-007: Investment Tax Report generation
 */
function InvestmentTaxReport({ onGenerate, onDownload }) {
    const { user } = useSelector(state => state.auth);
    const { myLoans } = useSelector(state => state.loans);
    const { tokenHoldings, myTrades } = useSelector(state => state.tokens);
    
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [reportType, setReportType] = useState('annual');
    const [includeCapitalGains, setIncludeCapitalGains] = useState(true);
    const [includeInterest, setIncludeInterest] = useState(true);
    const [includeFees, setIncludeFees] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [generated, setGenerated] = useState(false);
    
    // Calculate tax report data
    const taxData = useMemo(() => {
        const year = selectedYear;
        
        // Mock data - in production, this would come from API
        const interestIncome = [
            { loanId: 101, borrower: 'TechStart Inc.', amount: 1250.00, date: '2025-03-15', loanTitle: 'Business Expansion Loan' },
            { loanId: 102, borrower: 'Green Energy Co.', amount: 890.50, date: '2025-06-20', loanTitle: 'Equipment Financing' },
            { loanId: 103, borrower: 'Retail Solutions LLC', amount: 567.25, date: '2025-09-10', loanTitle: 'Working Capital' },
            { loanId: 104, borrower: 'HealthTech Startup', amount: 432.75, date: '2025-12-05', loanTitle: 'Growth Capital' },
        ];
        
        const capitalGains = [
            { tokenId: 'LOAN-101-T', saleDate: '2025-04-10', proceeds: 2500.00, costBasis: 2200.00, gain: 300.00, loanTitle: 'Business Expansion Loan' },
            { tokenId: 'LOAN-102-T', saleDate: '2025-08-22', proceeds: 1800.00, costBasis: 1650.00, gain: 150.00, loanTitle: 'Equipment Financing' },
        ];
        
        const fees = [
            { type: 'Origination Fee', amount: 150.00, date: '2025-01-15' },
            { type: 'Service Fee', amount: 75.00, date: '2025-06-30' },
            { type: 'Withdrawal Fee', amount: 25.00, date: '2025-09-15' },
        ];
        
        const totalInterest = interestIncome.reduce((sum, item) => sum + item.amount, 0);
        const totalGains = capitalGains.reduce((sum, item) => sum + item.gain, 0);
        const totalFees = fees.reduce((sum, item) => sum + item.amount, 0);
        const grossIncome = totalInterest + totalGains;
        const netIncome = grossIncome - totalFees;
        
        return {
            year,
            interestIncome,
            capitalGains,
            fees,
            totals: {
                interest: totalInterest,
                capitalGains: totalGains,
                fees: totalFees,
                grossIncome,
                netIncome
            }
        };
    }, [selectedYear]);
    
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };
    
    const handleGenerate = async () => {
        setGenerating(true);
        
        // Simulate report generation
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setGenerating(false);
        setGenerated(true);
        
        if (onGenerate) {
            onGenerate({
                year: selectedYear,
                type: reportType,
                data: taxData
            });
        }
    };
    
    const handleDownload = (format) => {
        if (onDownload) {
            onDownload({ year: selectedYear, format });
        }
    };
    
    const years = [2025, 2024, 2023, 2022];
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-primary-500" />
                        Tax Report Generator
                    </h2>
                    <p className="text-slate-500 mt-1">
                        Generate tax documents for your LENDA investments
                    </p>
                </div>
            </div>
            
            {/* Report Configuration */}
            <div className="card p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Report Configuration
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Tax Year
                        </label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="input-field w-full"
                        >
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Report Type
                        </label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="input-field w-full"
                        >
                            <option value="annual">Annual Summary</option>
                            <option value="detailed">Detailed Breakdown</option>
                            <option value="irs">IRS Form 1099</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Include
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={includeInterest}
                                    onChange={(e) => setIncludeInterest(e.target.checked)}
                                    className="rounded text-primary-500"
                                />
                                <span className="text-sm">Interest Income</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={includeCapitalGains}
                                    onChange={(e) => setIncludeCapitalGains(e.target.checked)}
                                    className="rounded text-primary-500"
                                />
                                <span className="text-sm">Capital Gains</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={includeFees}
                                    onChange={(e) => setIncludeFees(e.target.checked)}
                                    className="rounded text-primary-500"
                                />
                                <span className="text-sm">Deductible Fees</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div className="mt-4 flex gap-3">
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="btn-primary flex items-center gap-2"
                    >
                        {generating ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                Generating...
                            </>
                        ) : (
                            <>
                                <FileText className="w-4 h-4" />
                                Generate Report
                            </>
                        )}
                    </button>
                </div>
            </div>
            
            {/* Generated Report Preview */}
            {generated && (
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-900">
                                {selectedYear} Tax Year Summary
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDownload('pdf')}
                                    className="btn-secondary flex items-center gap-2 text-sm"
                                >
                                    <Download className="w-4 h-4" />
                                    PDF
                                </button>
                                <button
                                    onClick={() => handleDownload('csv')}
                                    className="btn-secondary flex items-center gap-2 text-sm"
                                >
                                    <Download className="w-4 h-4" />
                                    CSV
                                </button>
                                <button
                                    onClick={() => handleDownload('print')}
                                    className="btn-secondary flex items-center gap-2 text-sm"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print
                                </button>
                            </div>
                        </div>
                        
                        {/* Income Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                    <span className="font-medium text-green-800">Interest Income</span>
                                </div>
                                <p className="text-2xl font-bold text-green-700">
                                    {formatCurrency(taxData.totals.interest)}
                                </p>
                                <p className="text-sm text-green-600">{taxData.interestIncome.length} payments received</p>
                            </div>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <PieChart className="w-5 h-5 text-blue-600" />
                                    <span className="font-medium text-blue-800">Capital Gains</span>
                                </div>
                                <p className="text-2xl font-bold text-blue-700">
                                    {formatCurrency(taxData.totals.capitalGains)}
                                </p>
                                <p className="text-sm text-blue-600">{taxData.capitalGains.length} transactions</p>
                            </div>
                            
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Receipt className="w-5 h-5 text-purple-600" />
                                    <span className="font-medium text-purple-800">Deductible Fees</span>
                                </div>
                                <p className="text-2xl font-bold text-purple-700">
                                    {formatCurrency(taxData.totals.fees)}
                                </p>
                                <p className="text-sm text-purple-600">{taxData.fees.length} fee transactions</p>
                            </div>
                        </div>
                        
                        {/* Net Summary */}
                        <div className="bg-slate-50 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-slate-900">Gross Investment Income</p>
                                    <p className="text-sm text-slate-500">Interest + Capital Gains</p>
                                </div>
                                <p className="text-xl font-bold text-slate-900">
                                    {formatCurrency(taxData.totals.grossIncome)}
                                </p>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                <div>
                                    <p className="font-medium text-slate-900">Net Investment Income</p>
                                    <p className="text-sm text-slate-500">After Deductible Fees</p>
                                </div>
                                <p className="text-xl font-bold text-green-600">
                                    {formatCurrency(taxData.totals.netIncome)}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Interest Income Details */}
                    {includeInterest && taxData.interestIncome.length > 0 && (
                        <div className="card p-6">
                            <h4 className="font-semibold text-slate-900 mb-4">Interest Income Details</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 text-slate-500">Date</th>
                                            <th className="text-left py-2 text-slate-500">Loan</th>
                                            <th className="text-left py-2 text-slate-500">Borrower</th>
                                            <th className="text-right py-2 text-slate-500">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {taxData.interestIncome.map((item, idx) => (
                                            <tr key={idx} className="border-b">
                                                <td className="py-2">{item.date}</td>
                                                <td className="py-2">{item.loanTitle}</td>
                                                <td className="py-2">{item.borrower}</td>
                                                <td className="py-2 text-right font-medium text-green-600">
                                                    {formatCurrency(item.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="font-medium">
                                            <td className="py-2" colSpan={3}>Total</td>
                                            <td className="py-2 text-right">{formatCurrency(taxData.totals.interest)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                    
                    {/* Capital Gains Details */}
                    {includeCapitalGains && taxData.capitalGains.length > 0 && (
                        <div className="card p-6">
                            <h4 className="font-semibold text-slate-900 mb-4">Capital Gains Details</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 text-slate-500">Sale Date</th>
                                            <th className="text-left py-2 text-slate-500">Token</th>
                                            <th className="text-left py-2 text-slate-500">Loan</th>
                                            <th className="text-right py-2 text-slate-500">Cost Basis</th>
                                            <th className="text-right py-2 text-slate-500">Proceeds</th>
                                            <th className="text-right py-2 text-slate-500">Gain/Loss</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {taxData.capitalGains.map((item, idx) => (
                                            <tr key={idx} className="border-b">
                                                <td className="py-2">{item.saleDate}</td>
                                                <td className="py-2 font-mono text-xs">{item.tokenId}</td>
                                                <td className="py-2">{item.loanTitle}</td>
                                                <td className="py-2 text-right">{formatCurrency(item.costBasis)}</td>
                                                <td className="py-2 text-right">{formatCurrency(item.proceeds)}</td>
                                                <td className={`py-2 text-right font-medium ${item.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(item.gain)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="font-medium">
                                            <td className="py-2" colSpan={5}>Total Capital Gains</td>
                                            <td className="py-2 text-right">{formatCurrency(taxData.totals.capitalGains)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                    
                    {/* Fees Details */}
                    {includeFees && taxData.fees.length > 0 && (
                        <div className="card p-6">
                            <h4 className="font-semibold text-slate-900 mb-4">Deductible Fees</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 text-slate-500">Date</th>
                                            <th className="text-left py-2 text-slate-500">Fee Type</th>
                                            <th className="text-right py-2 text-slate-500">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {taxData.fees.map((item, idx) => (
                                            <tr key={idx} className="border-b">
                                                <td className="py-2">{item.date}</td>
                                                <td className="py-2">{item.type}</td>
                                                <td className="py-2 text-right text-red-600">
                                                    {formatCurrency(item.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="font-medium">
                                            <td className="py-2" colSpan={2}>Total Fees</td>
                                            <td className="py-2 text-right">{formatCurrency(taxData.totals.fees)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                    
                    {/* Disclaimer */}
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div className="text-sm text-amber-700">
                                <p className="font-medium">Tax Disclaimer</p>
                                <p className="mt-1">
                                    This report is provided for informational purposes only and should not be considered 
                                    tax advice. Please consult with a qualified tax professional for your specific tax situation. 
                                    Form 1099-INT will be mailed by January 31st if you earned $10 or more in interest.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InvestmentTaxReport;
