import { useState, useEffect } from 'react';
import { 
    Search, 
    Filter, 
    Download, 
    Calendar,
    User,
    Activity,
    Shield,
    DollarSign,
    Settings,
    LogIn,
    LogOut,
    FileText,
    AlertTriangle,
    CheckCircle,
    XCircle,
    ChevronDown,
    RefreshCw,
    Eye,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal
} from 'lucide-react';

/**
 * AuditLogs - Admin audit log search with advanced filtering
 * Allows admins to search and filter system audit logs
 */
function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedLogs, setSelectedLogs] = useState(new Set());
    
    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        action: 'all',
        user: 'all',
        dateRange: 'all',
        severity: 'all'
    });
    const [showFilters, setShowFilters] = useState(false);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(10);
    
    // Mock audit logs
    const mockLogs = [
        { id: 1, timestamp: '2024-03-15 14:32:15', user: 'admin@lenda.com', action: 'loan_approve', details: 'Approved loan LN-4523', ip: '192.168.1.100', severity: 'info' },
        { id: 2, timestamp: '2024-03-15 14:28:45', user: 'borrower@email.com', action: 'loan_create', details: 'Created new loan request LN-4524', ip: '192.168.1.105', severity: 'info' },
        { id: 3, timestamp: '2024-03-15 14:25:30', user: 'investor@email.com', action: 'fund_loan', details: 'Funded $5,000 to loan LN-4520', ip: '192.168.1.110', severity: 'info' },
        { id: 4, timestamp: '2024-03-15 14:20:12', user: 'system', action: 'auto_repayment', details: 'Processed automatic repayment for loan LN-4498', ip: 'N/A', severity: 'info' },
        { id: 5, timestamp: '2024-03-15 14:18:00', user: 'admin@lenda.com', action: 'fee_update', details: 'Updated origination fee to 2.5%', ip: '192.168.1.100', severity: 'warning' },
        { id: 6, timestamp: '2024-03-15 14:15:33', user: 'user@email.com', action: 'login_failed', details: 'Failed login attempt - invalid password', ip: '192.168.1.120', severity: 'warning' },
        { id: 7, timestamp: '2024-03-15 14:12:20', user: 'admin@lenda.com', action: 'user_suspend', details: 'Suspended user account user@email.com', ip: '192.168.1.100', severity: 'warning' },
        { id: 8, timestamp: '2024-03-15 14:10:45', user: 'system', action: 'contract_deploy', details: 'Deployed new loan contract v2.1', ip: 'N/A', severity: 'info' },
        { id: 9, timestamp: '2024-03-15 14:08:15', user: 'borrower@email.com', action: 'collateral_upload', details: 'Uploaded collateral document for loan LN-4522', ip: '192.168.1.108', severity: 'info' },
        { id: 10, timestamp: '2024-03-15 14:05:00', user: 'admin@lenda.com', action: 'rate_change', details: 'Updated platform minimum rate to 8%', ip: '192.168.1.100', severity: 'info' },
        { id: 11, timestamp: '2024-03-15 14:02:30', user: 'risk@lenda.com', action: 'loan_reject', details: 'Rejected loan LN-4521 - insufficient collateral', ip: '192.168.1.115', severity: 'warning' },
        { id: 12, timestamp: '2024-03-15 14:00:00', user: 'system', action: 'backup_complete', details: 'Daily database backup completed successfully', ip: 'N/A', severity: 'info' },
        { id: 13, timestamp: '2024-03-15 13:55:22', user: 'admin@lenda.com', action: 'kyc_verify', details: 'Verified KYC documents for user borrower@email.com', ip: '192.168.1.100', severity: 'info' },
        { id: 14, timestamp: '2024-03-15 13:50:10', user: 'system', action: 'default_detected', details: 'Default detected on loan LN-4485 - 30 days overdue', ip: 'N/A', severity: 'error' },
        { id: 15, timestamp: '2024-03-15 13:45:00', user: 'investor@email.com', action: 'withdrawal', details: 'Withdrew $10,000 from wallet', ip: '192.168.1.110', severity: 'info' },
    ];
    
    useEffect(() => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLogs(mockLogs);
            setLoading(false);
        }, 500);
    }, []);
    
    // Filter logs based on search and filters
    const filteredLogs = logs.filter(log => {
        const matchesSearch = searchTerm === '' || 
            log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesAction = filters.action === 'all' || log.action === filters.action;
        const matchesUser = filters.user === 'all' || log.user.includes(filters.user);
        const matchesSeverity = filters.severity === 'all' || log.severity === filters.severity;
        
        return matchesSearch && matchesAction && matchesUser && matchesSeverity;
    });
    
    // Get unique values for filter dropdowns
    const uniqueActions = [...new Set(logs.map(l => l.action))];
    const uniqueUsers = [...new Set(logs.map(l => l.user))];
    
    // Action type icons
    const getActionIcon = (action) => {
        if (action.includes('login')) return <LogIn className="w-4 h-4" />;
        if (action.includes('logout')) return <LogOut className="w-4 h-4" />;
        if (action.includes('loan')) return <FileText className="w-4 h-4" />;
        if (action.includes('fund') || action.includes('withdrawal')) return <DollarSign className="w-4 h-4" />;
        if (action.includes('user')) return <User className="w-4 h-4" />;
        if (action.includes('rate') || action.includes('fee')) return <Settings className="w-4 h-4" />;
        if (action.includes('default') || action.includes('reject')) return <AlertTriangle className="w-4 h-4" />;
        return <Activity className="w-4 h-4" />;
    };
    
    // Severity colors
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'error': return 'text-red-600 bg-red-50';
            case 'warning': return 'text-amber-600 bg-amber-50';
            case 'info': return 'text-blue-600 bg-blue-50';
            default: return 'text-slate-600 bg-slate-50';
        }
    };
    
    // Action display
    const formatAction = (action) => {
        return action.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };
    
    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                            <Shield className="w-8 h-8 text-primary-500" />
                            Audit Logs
                        </h1>
                        <p className="text-slate-600">
                            Search and filter system audit logs
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                        <button 
                            onClick={() => {
                                setLoading(true);
                                setTimeout(() => setLoading(false), 500);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
                
                {/* Search and Filter Bar */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="relative flex-1 min-w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by action, user, or details..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        
                        {/* Toggle Filters */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                                showFilters 
                                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                                    : 'border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <Filter className="w-4 h-4" />
                            Filters
                            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                    
                    {/* Advanced Filters */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Action Type
                                </label>
                                <select
                                    value={filters.action}
                                    onChange={(e) => setFilters({...filters, action: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="all">All Actions</option>
                                    {uniqueActions.map(action => (
                                        <option key={action} value={action}>{formatAction(action)}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    User
                                </label>
                                <select
                                    value={filters.user}
                                    onChange={(e) => setFilters({...filters, user: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="all">All Users</option>
                                    {uniqueUsers.map(user => (
                                        <option key={user} value={user}>{user}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Severity
                                </label>
                                <select
                                    value={filters.severity}
                                    onChange={(e) => setFilters({...filters, severity: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="all">All Severities</option>
                                    <option value="info">Info</option>
                                    <option value="warning">Warning</option>
                                    <option value="error">Error</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Date Range
                                </label>
                                <select
                                    value={filters.dateRange}
                                    onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="7days">Last 7 Days</option>
                                    <option value="30days">Last 30 Days</option>
                                    <option value="90days">Last 90 Days</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Results Summary */}
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-slate-600">
                        Showing <span className="font-medium">{filteredLogs.length}</span> of <span className="font-medium">{logs.length}</span> log entries
                    </p>
                </div>
                
                {/* Logs Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Timestamp</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">User</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Action</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Details</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">IP Address</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Severity</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
                                        <p className="text-slate-500 mt-2">Loading logs...</p>
                                    </td>
                                </tr>
                            ) : filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                {log.timestamp}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-slate-400" />
                                                <span className="text-sm text-slate-900">{log.user}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-500">{getActionIcon(log.action)}</span>
                                                <span className="text-sm font-medium text-slate-700">
                                                    {formatAction(log.action)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                                            {log.details}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                                            {log.ip}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
                                                {log.severity === 'error' && <XCircle className="w-3 h-3 mr-1" />}
                                                {log.severity === 'warning' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                                {log.severity === 'info' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                {log.severity}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                        <p className="text-slate-500">No logs found matching your criteria</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-slate-500">
                        Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {[1, 2, 3, 4, 5].map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-10 h-10 rounded-lg ${
                                    currentPage === page
                                        ? 'bg-primary-500 text-white'
                                        : 'border border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid md:grid-cols-4 gap-4 mt-8">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Total Logs</p>
                                <p className="text-2xl font-bold text-slate-900">{logs.length}</p>
                            </div>
                            <FileText className="w-8 h-8 text-slate-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Info</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {logs.filter(l => l.severity === 'info').length}
                                </p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-blue-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Warnings</p>
                                <p className="text-2xl font-bold text-amber-600">
                                    {logs.filter(l => l.severity === 'warning').length}
                                </p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-amber-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Errors</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {logs.filter(l => l.severity === 'error').length}
                                </p>
                            </div>
                            <XCircle className="w-8 h-8 text-red-400" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AuditLogs;
