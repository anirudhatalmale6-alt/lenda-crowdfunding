import { useState, useEffect } from 'react';
import { 
    FileText, 
    Calendar, 
    Clock, 
    Play, 
    Pause, 
    Plus, 
    Trash2, 
    Download,
    Mail,
    Settings,
    CheckCircle,
    XCircle,
    AlertCircle,
    BarChart3,
    PieChart,
    TrendingUp,
    DollarSign,
    Users,
    RefreshCw,
    Bell
} from 'lucide-react';

/**
 * AutomatedReports - Admin automated report scheduling
 * Allows admins to create, manage, and schedule automated reports
 */
function AutomatedReports() {
    const [reports, setReports] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [activeTab, setActiveTab] = useState('scheduled');
    
    // Mock scheduled reports
    const mockReports = [
        {
            id: 1,
            name: 'Daily Loan Summary',
            type: 'loans',
            frequency: 'daily',
            time: '08:00',
            recipients: ['admin@lenda.com', 'ops@lenda.com'],
            lastRun: '2024-03-15 08:00',
            nextRun: '2024-03-16 08:00',
            status: 'active',
            format: 'pdf'
        },
        {
            id: 2,
            name: 'Weekly Revenue Report',
            type: 'revenue',
            frequency: 'weekly',
            time: '09:00',
            day: 'monday',
            recipients: ['finance@lenda.com'],
            lastRun: '2024-03-11 09:00',
            nextRun: '2024-03-18 09:00',
            status: 'active',
            format: 'xlsx'
        },
        {
            id: 3,
            name: 'Monthly Risk Analysis',
            type: 'risk',
            frequency: 'monthly',
            time: '10:00',
            day: '1',
            recipients: ['risk@lenda.com', 'compliance@lenda.com'],
            lastRun: '2024-03-01 10:00',
            nextRun: '2024-04-01 10:00',
            status: 'active',
            format: 'pdf'
        },
        {
            id: 4,
            name: 'Daily Default Monitoring',
            type: 'defaults',
            frequency: 'daily',
            time: '18:00',
            recipients: ['risk@lenda.com'],
            lastRun: '2024-03-15 18:00',
            nextRun: '2024-03-16 18:00',
            status: 'paused',
            format: 'pdf'
        }
    ];
    
    // Mock report history
    const reportHistory = [
        { id: 1, reportName: 'Daily Loan Summary', generatedAt: '2024-03-15 08:00', status: 'success', size: '2.4 MB' },
        { id: 2, reportName: 'Weekly Revenue Report', generatedAt: '2024-03-11 09:00', status: 'success', size: '1.8 MB' },
        { id: 3, reportName: 'Monthly Risk Analysis', generatedAt: '2024-03-01 10:00', status: 'success', size: '5.2 MB' },
        { id: 4, reportName: 'Daily Default Monitoring', generatedAt: '2024-03-15 18:00', status: 'failed', size: '-' },
    ];
    
    useEffect(() => {
        setReports(mockReports);
    }, []);
    
    // Toggle report status
    const toggleReportStatus = (reportId) => {
        setReports(reports.map(r => 
            r.id === reportId 
                ? { ...r, status: r.status === 'active' ? 'paused' : 'active' }
                : r
        ));
    };
    
    // Delete report
    const deleteReport = (reportId) => {
        setReports(reports.filter(r => r.id !== reportId));
    };
    
    // Report type options
    const reportTypes = [
        { value: 'loans', label: 'Loan Summary', icon: FileText, description: 'Overview of all loan activities' },
        { value: 'revenue', label: 'Revenue Report', icon: DollarSign, description: 'Revenue and fee collection' },
        { value: 'risk', label: 'Risk Analysis', icon: AlertCircle, description: 'Portfolio risk metrics' },
        { value: 'defaults', label: 'Default Monitoring', icon: TrendingUp, description: 'Default tracking and recovery' },
        { value: 'users', label: 'User Activity', icon: Users, description: 'User registration and activity' },
        { value: 'analytics', label: 'Platform Analytics', icon: BarChart3, description: 'Comprehensive platform stats' },
    ];
    
    // Frequency options
    const frequencyOptions = [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
    ];
    
    // Format options
    const formatOptions = [
        { value: 'pdf', label: 'PDF' },
        { value: 'xlsx', label: 'Excel (XLSX)' },
        { value: 'csv', label: 'CSV' },
    ];
    
    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                            <FileText className="w-8 h-8 text-primary-500" />
                            Automated Reports
                        </h1>
                        <p className="text-slate-600">
                            Schedule and manage automated report generation
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                    >
                        <Plus className="w-4 h-4" />
                        Create Report
                    </button>
                </div>
                
                {/* Tabs */}
                <div className="bg-white rounded-xl border border-slate-200 mb-6">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('scheduled')}
                            className={`px-6 py-4 border-b-2 transition-colors ${
                                activeTab === 'scheduled'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Calendar className="w-4 h-4 inline mr-2" />
                            Scheduled Reports
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-6 py-4 border-b-2 transition-colors ${
                                activeTab === 'history'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Clock className="w-4 h-4 inline mr-2" />
                            Report History
                        </button>
                    </div>
                </div>
                
                {/* Scheduled Reports */}
                {activeTab === 'scheduled' && (
                    <div className="space-y-4">
                        {reports.map((report) => (
                            <div key={report.id} className="bg-white rounded-xl border border-slate-200 p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                            report.type === 'loans' ? 'bg-blue-100' :
                                            report.type === 'revenue' ? 'bg-green-100' :
                                            report.type === 'risk' ? 'bg-red-100' :
                                            'bg-purple-100'
                                        }`}>
                                            {report.type === 'loans' && <FileText className="w-6 h-6 text-blue-600" />}
                                            {report.type === 'revenue' && <DollarSign className="w-6 h-6 text-green-600" />}
                                            {report.type === 'risk' && <AlertCircle className="w-6 h-6 text-red-600" />}
                                            {report.type === 'defaults' && <TrendingUp className="w-6 h-6 text-purple-600" />}
                                            {report.type === 'users' && <Users className="w-6 h-6 text-purple-600" />}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-900">{report.name}</h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {report.frequency === 'daily' && `Runs daily at ${report.time}`}
                                                {report.frequency === 'weekly' && `Runs weekly on ${report.day}s at ${report.time}`}
                                                {report.frequency === 'monthly' && `Runs monthly on day ${report.day} at ${report.time}`}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className="text-xs text-slate-500">
                                                    Last run: {report.lastRun}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    Next: {report.nextRun}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            report.status === 'active' 
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {report.status === 'active' ? 'Active' : 'Paused'}
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                            {report.format.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Mail className="w-4 h-4" />
                                        <span>{report.recipients.join(', ')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleReportStatus(report.id)}
                                            className={`p-2 rounded-lg ${
                                                report.status === 'active'
                                                    ? 'text-yellow-600 hover:bg-yellow-50'
                                                    : 'text-green-600 hover:bg-green-50'
                                            }`}
                                            title={report.status === 'active' ? 'Pause' : 'Activate'}
                                        >
                                            {report.status === 'active' ? (
                                                <Pause className="w-4 h-4" />
                                            ) : (
                                                <Play className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg">
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => deleteReport(report.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {reports.length === 0 && (
                            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500">No scheduled reports yet</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                                >
                                    Create your first report
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Report History */}
                {activeTab === 'history' && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Report Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Generated</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Size</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {reportHistory.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">{item.reportName}</td>
                                        <td className="px-6 py-4 text-slate-600">{item.generatedAt}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                item.status === 'success'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {item.status === 'success' ? (
                                                    <CheckCircle className="w-3 h-3" />
                                                ) : (
                                                    <XCircle className="w-3 h-3" />
                                                )}
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{item.size}</td>
                                        <td className="px-6 py-4">
                                            {item.status === 'success' && (
                                                <button className="flex items-center gap-1 text-primary-600 hover:text-primary-700">
                                                    <Download className="w-4 h-4" />
                                                    Download
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {/* Quick Stats */}
                <div className="grid md:grid-cols-4 gap-4 mt-8">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Active Reports</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {reports.filter(r => r.status === 'active').length}
                                </p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Paused</p>
                                <p className="text-2xl font-bold text-slate-600">
                                    {reports.filter(r => r.status === 'paused').length}
                                </p>
                            </div>
                            <Pause className="w-8 h-8 text-slate-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">This Week</p>
                                <p className="text-2xl font-bold text-primary-600">{reportHistory.length}</p>
                            </div>
                            <Calendar className="w-8 h-8 text-primary-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Success Rate</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {Math.round((reportHistory.filter(r => r.status === 'success').length / reportHistory.length) * 100)}%
                                </p>
                            </div>
                            <BarChart3 className="w-8 h-8 text-green-400" />
                        </div>
                    </div>
                </div>
                
                {/* Create Report Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold">Create Scheduled Report</h2>
                                <button 
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            <div className="space-y-6">
                                {/* Report Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Report Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Daily Loan Summary"
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                
                                {/* Report Type */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Report Type
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {reportTypes.map((type) => {
                                            const Icon = type.icon;
                                            return (
                                                <button
                                                    key={type.value}
                                                    className="p-3 border border-slate-200 rounded-lg text-left hover:border-primary-500 hover:bg-primary-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Icon className="w-5 h-5 text-slate-600" />
                                                        <div>
                                                            <p className="font-medium text-slate-900">{type.label}</p>
                                                            <p className="text-xs text-slate-500">{type.description}</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                {/* Frequency */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Frequency
                                        </label>
                                        <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                                            {frequencyOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Time
                                        </label>
                                        <input
                                            type="time"
                                            defaultValue="09:00"
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>
                                
                                {/* Format */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Output Format
                                    </label>
                                    <div className="flex gap-3">
                                        {formatOptions.map((format) => (
                                            <label key={format.value} className="flex items-center gap-2">
                                                <input type="radio" name="format" value={format.value} defaultChecked={format.value === 'pdf'} />
                                                <span className="text-sm">{format.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Recipients */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Email Recipients
                                    </label>
                                    <textarea
                                        placeholder="Enter email addresses (one per line)"
                                        rows={3}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        defaultValue="admin@lenda.com"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Reports will be sent to these email addresses
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                                >
                                    Create Report
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AutomatedReports;
