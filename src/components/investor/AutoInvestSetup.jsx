import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
    Settings,
    Plus,
    Trash2,
    Play,
    Pause,
    Edit2,
    DollarSign,
    Percent,
    Calendar,
    Target,
    AlertCircle,
    CheckCircle,
    Loader,
    X,
    Shield,
    TrendingUp
} from 'lucide-react';

/**
 * AutoInvestSetup - Component for setting up automated/recurring investments
 * Addresses FEAT-006: Automated Investing feature
 */
function AutoInvestSetup({ onSuccess, onError }) {
    const dispatch = useDispatch();
    const { isLoading } = useSelector(state => state.loans);
    const { wallet } = useSelector(state => state.wallet);
    
    const [rules, setRules] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [success, setSuccess] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        minAmount: '',
        maxAmount: '',
        minRate: '',
        maxRate: '',
        minDuration: '',
        maxDuration: '',
        minRiskScore: '',
        investmentFrequency: 'daily',
        maxInvestmentsPerDay: 5,
        stopOnDefault: true,
        diversify: true,
        maxPerLoan: 1000,
        autoApprove: false
    });
    
    // Load existing auto-invest rules (mock data)
    useEffect(() => {
        setRules([
            {
                id: 1,
                name: 'Conservative Portfolio',
                amount: 500,
                frequency: 'daily',
                criteria: {
                    minRate: 8,
                    maxRate: 15,
                    minDuration: 12,
                    maxDuration: 24,
                    minRiskScore: 'A',
                    maxPerLoan: 500
                },
                status: 'active',
                totalInvested: 12500,
                investmentsCount: 25
            },
            {
                id: 2,
                name: 'High Yield Strategy',
                amount: 1000,
                frequency: 'weekly',
                criteria: {
                    minRate: 15,
                    maxRate: 25,
                    minDuration: 6,
                    maxDuration: 12,
                    minRiskScore: 'BB',
                    maxPerLoan: 1000
                },
                status: 'paused',
                totalInvested: 8000,
                investmentsCount: 8
            }
        ]);
    }, []);
    
    const resetForm = () => {
        setFormData({
            name: '',
            amount: '',
            minAmount: '',
            maxAmount: '',
            minRate: '',
            maxRate: '',
            minDuration: '',
            maxDuration: '',
            minRiskScore: '',
            investmentFrequency: 'daily',
            maxInvestmentsPerDay: 5,
            stopOnDefault: true,
            diversify: true,
            maxPerLoan: 1000,
            autoApprove: false
        });
        setEditingRule(null);
    };
    
    const handleEdit = (rule) => {
        setEditingRule(rule);
        setFormData({
            name: rule.name,
            amount: rule.amount,
            minAmount: rule.criteria?.minAmount || '',
            maxAmount: rule.criteria?.maxAmount || '',
            minRate: rule.criteria?.minRate || '',
            maxRate: rule.criteria?.maxRate || '',
            minDuration: rule.criteria?.minDuration || '',
            maxDuration: rule.criteria?.maxDuration || '',
            minRiskScore: rule.criteria?.minRiskScore || '',
            investmentFrequency: rule.frequency,
            maxInvestmentsPerDay: rule.maxInvestmentsPerDay || 5,
            stopOnDefault: rule.stopOnDefault !== false,
            diversify: rule.diversify !== false,
            maxPerLoan: rule.criteria?.maxPerLoan || 1000,
            autoApprove: rule.autoApprove || false
        });
        setShowModal(true);
    };
    
    const handleDelete = (ruleId) => {
        if (!window.confirm('Are you sure you want to delete this auto-invest rule?')) {
            return;
        }
        
        setRules(rules.filter(r => r.id !== ruleId));
        toast.success('Auto-invest rule deleted');
    };
    
    const handleToggleStatus = (ruleId) => {
        setRules(rules.map(r => {
            if (r.id === ruleId) {
                return {
                    ...r,
                    status: r.status === 'active' ? 'paused' : 'active'
                };
            }
            return r;
        }));
        toast.success('Auto-invest rule status updated');
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.amount) {
            toast.error('Please fill in required fields');
            return;
        }
        
        try {
            const newRule = {
                id: editingRule?.id || Date.now(),
                name: formData.name,
                amount: parseFloat(formData.amount),
                frequency: formData.investmentFrequency,
                criteria: {
                    minRate: parseFloat(formData.minRate) || 0,
                    maxRate: parseFloat(formData.maxRate) || 30,
                    minDuration: parseInt(formData.minDuration) || 1,
                    maxDuration: parseInt(formData.maxDuration) || 36,
                    minRiskScore: formData.minRiskScore || 'AAA',
                    maxPerLoan: parseFloat(formData.maxPerLoan) || 1000
                },
                status: 'active',
                maxInvestmentsPerDay: formData.maxInvestmentsPerDay,
                stopOnDefault: formData.stopOnDefault,
                diversify: formData.diversify,
                autoApprove: formData.autoApprove,
                totalInvested: editingRule?.totalInvested || 0,
                investmentsCount: editingRule?.investmentsCount || 0
            };
            
            if (editingRule) {
                setRules(rules.map(r => r.id === editingRule.id ? newRule : r));
                toast.success('Auto-invest rule updated');
            } else {
                setRules([...rules, newRule]);
                toast.success('Auto-invest rule created');
            }
            
            setShowModal(false);
            resetForm();
            
            if (onSuccess) {
                onSuccess(newRule);
            }
            
        } catch (error) {
            toast.error(error.message || 'Failed to save rule');
            if (onError) {
                onError(error);
            }
        }
    };
    
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };
    
    const getStatusColor = (status) => {
        return status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-slate-100 text-slate-800';
    };
    
    const totalActiveRules = rules.filter(r => r.status === 'active').length;
    const totalInvested = rules.reduce((sum, r) => sum + (r.totalInvested || 0), 0);
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-primary-500" />
                        Auto-Invest Rules
                    </h2>
                    <p className="text-slate-500 mt-1">
                        Set up automated investment rules to invest in loans automatically
                    </p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Rule
                </button>
            </div>
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                    <div className="p-4">
                        <p className="text-sm opacity-90">Total Rules</p>
                        <p className="text-3xl font-bold mt-1">{rules.length}</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4">
                        <p className="text-sm text-slate-500">Active Rules</p>
                        <p className="text-3xl font-bold mt-1 text-green-600">{totalActiveRules}</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4">
                        <p className="text-sm text-slate-500">Total Auto-Invested</p>
                        <p className="text-3xl font-bold mt-1 text-emerald-600">{formatCurrency(totalInvested)}</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4">
                        <p className="text-sm text-slate-500">Total Investments</p>
                        <p className="text-3xl font-bold mt-1">
                            {rules.reduce((sum, r) => sum + (r.investmentsCount || 0), 0)}
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Rules List */}
            {rules.length === 0 ? (
                <div className="card p-12 text-center">
                    <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">No Auto-Invest Rules</h3>
                    <p className="text-slate-500 mt-2">Create your first auto-invest rule to start automated investing</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-primary mt-4"
                    >
                        Create Your First Rule
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {rules.map((rule) => (
                        <div key={rule.id} className="card hover:shadow-lg transition-shadow">
                            <div className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold">{rule.name}</h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rule.status)}`}>
                                                {rule.status}
                                            </span>
                                        </div>
                                        <p className="text-slate-500 mt-1">
                                            Invest {formatCurrency(rule.amount)} {rule.frequency}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleToggleStatus(rule.id)}
                                            className={`p-2 rounded-lg ${rule.status === 'active' 
                                                ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
                                                : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                                            title={rule.status === 'active' ? 'Pause' : 'Activate'}
                                        >
                                            {rule.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleEdit(rule)}
                                            className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rule.id)}
                                            className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Criteria */}
                                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div className="bg-slate-50 p-2 rounded">
                                        <span className="text-slate-500">Rate Range:</span>
                                        <span className="font-medium ml-1">{rule.criteria?.minRate || 0}% - {rule.criteria?.maxRate || 30}%</span>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded">
                                        <span className="text-slate-500">Duration:</span>
                                        <span className="font-medium ml-1">{rule.criteria?.minDuration || 1} - {rule.criteria?.maxDuration || 36} mo</span>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded">
                                        <span className="text-slate-500">Min Risk:</span>
                                        <span className="font-medium ml-1">{rule.criteria?.minRiskScore || 'AAA'}</span>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded">
                                        <span className="text-slate-500">Max per Loan:</span>
                                        <span className="font-medium ml-1">{formatCurrency(rule.criteria?.maxPerLoan || 1000)}</span>
                                    </div>
                                </div>
                                
                                {/* Stats */}
                                <div className="mt-4 flex gap-6 text-sm text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <DollarSign className="w-4 h-4" />
                                        Total Invested: <span className="font-medium text-slate-900">{formatCurrency(rule.totalInvested)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Target className="w-4 h-4" />
                                        Investments: <span className="font-medium text-slate-900">{rule.investmentsCount}</span>
                                    </div>
                                </div>
                                
                                {/* Options */}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {rule.stopOnDefault && (
                                        <span className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded">
                                            Stop on Default
                                        </span>
                                    )}
                                    {rule.diversify && (
                                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
                                            Diversify
                                        </span>
                                    )}
                                    {rule.autoApprove && (
                                        <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded">
                                            Auto-Approve
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold">
                                    {editingRule ? 'Edit Auto-Invest Rule' : 'Create Auto-Invest Rule'}
                                </h2>
                                <button 
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Rule Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g., Conservative Strategy"
                                            className="input-field w-full"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Investment Amount *
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                            <input
                                                type="number"
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                placeholder="100"
                                                min={10}
                                                className="input-field w-full pl-8"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Frequency */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Investment Frequency
                                    </label>
                                    <select
                                        value={formData.investmentFrequency}
                                        onChange={(e) => setFormData({ ...formData, investmentFrequency: e.target.value })}
                                        className="input-field w-full"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="biweekly">Bi-Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                                
                                {/* Loan Criteria */}
                                <div className="border-t pt-4">
                                    <h4 className="font-medium text-slate-900 mb-3">Loan Criteria</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Min Interest Rate (%)</label>
                                            <input
                                                type="number"
                                                value={formData.minRate}
                                                onChange={(e) => setFormData({ ...formData, minRate: e.target.value })}
                                                placeholder="5"
                                                min={0}
                                                max={30}
                                                step={0.5}
                                                className="input-field w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Max Interest Rate (%)</label>
                                            <input
                                                type="number"
                                                value={formData.maxRate}
                                                onChange={(e) => setFormData({ ...formData, maxRate: e.target.value })}
                                                placeholder="25"
                                                min={0}
                                                max={50}
                                                step={0.5}
                                                className="input-field w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Min Duration (months)</label>
                                            <input
                                                type="number"
                                                value={formData.minDuration}
                                                onChange={(e) => setFormData({ ...formData, minDuration: e.target.value })}
                                                placeholder="6"
                                                min={1}
                                                className="input-field w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Max Duration (months)</label>
                                            <input
                                                type="number"
                                                value={formData.maxDuration}
                                                onChange={(e) => setFormData({ ...formData, maxDuration: e.target.value })}
                                                placeholder="36"
                                                min={1}
                                                className="input-field w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Min Risk Score</label>
                                            <select
                                                value={formData.minRiskScore}
                                                onChange={(e) => setFormData({ ...formData, minRiskScore: e.target.value })}
                                                className="input-field w-full"
                                            >
                                                <option value="">Any</option>
                                                <option value="AAA">AAA</option>
                                                <option value="AA">AA</option>
                                                <option value="A">A</option>
                                                <option value="BBB">BBB</option>
                                                <option value="BB">BB</option>
                                                <option value="B">B</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Max per Loan ($)</label>
                                            <input
                                                type="number"
                                                value={formData.maxPerLoan}
                                                onChange={(e) => setFormData({ ...formData, maxPerLoan: e.target.value })}
                                                placeholder="1000"
                                                min={10}
                                                className="input-field w-full"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Advanced Options */}
                                <div className="border-t pt-4">
                                    <h4 className="font-medium text-slate-900 mb-3">Advanced Options</h4>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.stopOnDefault}
                                                onChange={(e) => setFormData({ ...formData, stopOnDefault: e.target.checked })}
                                                className="rounded text-primary-500"
                                            />
                                            <span className="text-sm text-slate-700">Stop investing if a loan defaults</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.diversify}
                                                onChange={(e) => setFormData({ ...formData, diversify: e.target.checked })}
                                                className="rounded text-primary-500"
                                            />
                                            <span className="text-sm text-slate-700">Diversify across multiple loans</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.autoApprove}
                                                onChange={(e) => setFormData({ ...formData, autoApprove: e.target.checked })}
                                                className="rounded text-primary-500"
                                            />
                                            <span className="text-sm text-slate-700">Automatically approve matching loans</span>
                                        </label>
                                    </div>
                                </div>
                                
                                {/* Warning */}
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                                        <div className="text-sm text-amber-700">
                                            <p className="font-medium">Auto-invest operates automatically</p>
                                            <p className="text-xs mt-1">Ensure you have sufficient funds in your wallet. The system will skip investments if funds are insufficient.</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            resetForm();
                                        }}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || !formData.name || !formData.amount}
                                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-4 h-4" />
                                                {editingRule ? 'Update Rule' : 'Create Rule'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AutoInvestSetup;
