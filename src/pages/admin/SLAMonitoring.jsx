import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    Activity, 
    Clock, 
    CheckCircle, 
    AlertCircle, 
    XCircle,
    Server,
    Database,
    Zap,
    Shield,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Bell,
    Settings,
    ExternalLink
} from 'lucide-react';

/**
 * SLAMonitoring - Admin dashboard for monitoring service level agreements
 * Addresses FEAT-011: SLA Monitoring dashboard
 */
function SLAMonitoring() {
    const dispatch = useDispatch();
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [selectedService, setSelectedService] = useState('all');
    
    // Mock SLA data
    const [services, setServices] = useState([
        {
            id: 'api',
            name: 'API Service',
            status: 'operational',
            uptime: 99.98,
            responseTime: 145,
            avgResponseTime: 150,
            incidents: 0,
            uptimeHistory: [99.9, 99.95, 100, 99.98, 99.99, 100, 99.97],
            slaTarget: 99.9
        },
        {
            id: 'payment',
            name: 'Payment Processing',
            status: 'operational',
            uptime: 99.95,
            responseTime: 890,
            avgResponseTime: 850,
            incidents: 1,
            uptimeHistory: [99.8, 99.9, 99.95, 99.98, 99.99, 100, 99.95],
            slaTarget: 99.5
        },
        {
            id: 'escrow',
            name: 'Escrow Service',
            status: 'degraded',
            uptime: 98.5,
            responseTime: 2500,
            avgResponseTime: 1200,
            incidents: 2,
            uptimeHistory: [99.2, 99.0, 98.8, 99.1, 98.9, 99.0, 98.5],
            slaTarget: 99.0
        },
        {
            id: 'blockchain',
            name: 'Blockchain Operations',
            status: 'operational',
            uptime: 99.99,
            responseTime: 15000,
            avgResponseTime: 14500,
            incidents: 0,
            uptimeHistory: [100, 99.99, 100, 99.98, 100, 99.99, 99.99],
            slaTarget: 99.0
        },
        {
            id: 'notifications',
            name: 'Notification Service',
            status: 'operational',
            uptime: 99.8,
            responseTime: 320,
            avgResponseTime: 300,
            incidents: 0,
            uptimeHistory: [99.7, 99.85, 99.9, 99.8, 99.75, 99.9, 99.8],
            slaTarget: 99.0
        },
        {
            id: 'database',
            name: 'Database Service',
            status: 'operational',
            uptime: 99.99,
            responseTime: 45,
            avgResponseTime: 42,
            incidents: 0,
            uptimeHistory: [100, 99.99, 100, 100, 99.98, 100, 99.99],
            slaTarget: 99.9
        }
    ]);
    
    const [alerts, setAlerts] = useState([
        {
            id: 1,
            service: 'Escrow Service',
            severity: 'warning',
            message: 'Response time exceeds threshold (2500ms > 2000ms)',
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            acknowledged: false
        },
        {
            id: 2,
            service: 'Payment Processing',
            severity: 'info',
            message: 'Scheduled maintenance completed successfully',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            acknowledged: true
        },
        {
            id: 3,
            service: 'API Service',
            severity: 'warning',
            message: 'SLA breach risk: Uptime at 99.98%, target 99.9%',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            acknowledged: false
        }
    ]);
    
    const [slaMetrics, setSlaMetrics] = useState({
        totalRequests: 1542000,
        successfulRequests: 1538900,
        failedRequests: 3100,
        avgResponseTime: 1250,
        p95ResponseTime: 2800,
        p99ResponseTime: 5500,
        uptimePercentage: 99.85,
        slaBreaches: 1,
        mttr: 45 // Mean Time to Recovery in minutes
    });
    
    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(() => {
                setLastRefresh(new Date());
            }, 30000); // Refresh every 30 seconds
            
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);
    
    const getStatusColor = (status) => {
        switch (status) {
            case 'operational': return 'bg-green-500';
            case 'degraded': return 'bg-yellow-500';
            case 'outage': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };
    
    const getStatusIcon = (status) => {
        switch (status) {
            case 'operational': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'degraded': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
            case 'outage': return <XCircle className="w-5 h-5 text-red-500" />;
            default: return <Activity className="w-5 h-5 text-gray-500" />;
        }
    };
    
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-US').format(num);
    };
    
    const acknowledgeAlert = (alertId) => {
        setAlerts(alerts.map(alert => 
            alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ));
    };
    
    const filteredServices = selectedService === 'all' 
        ? services 
        : services.filter(s => s.id === selectedService);
    
    const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Activity className="w-7 h-7 text-primary-500" />
                        SLA Monitoring
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Real-time service level agreement monitoring and alerts
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="rounded text-primary-500"
                            />
                            Auto-refresh (30s)
                        </label>
                    </div>
                    <button
                        onClick={() => setLastRefresh(new Date())}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>
            
            {/* Last Updated */}
            <div className="text-sm text-slate-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
            
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                    <div className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">Overall Uptime</p>
                                <p className="text-3xl font-bold mt-1">{slaMetrics.uptimePercentage}%</p>
                            </div>
                            <TrendingUp className="w-8 h-8 opacity-80" />
                        </div>
                        <p className="text-sm opacity-80 mt-2">Last 30 days</p>
                    </div>
                </div>
                
                <div className="card">
                    <div className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Total Requests</p>
                                <p className="text-2xl font-bold mt-1">{formatNumber(slaMetrics.totalRequests)}</p>
                            </div>
                            <Server className="w-8 h-8 text-blue-500" />
                        </div>
                        <p className="text-sm text-green-600 mt-2">
                            {((slaMetrics.successfulRequests / slaMetrics.totalRequests) * 100).toFixed(2)}% success rate
                        </p>
                    </div>
                </div>
                
                <div className="card">
                    <div className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Avg Response Time</p>
                                <p className="text-2xl font-bold mt-1">{slaMetrics.avgResponseTime}ms</p>
                            </div>
                            <Zap className="w-8 h-8 text-amber-500" />
                        </div>
                        <p className="text-sm text-slate-500 mt-2">
                            P95: {slaMetrics.p95ResponseTime}ms | P99: {slaMetrics.p99ResponseTime}ms
                        </p>
                    </div>
                </div>
                
                <div className="card">
                    <div className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Active Alerts</p>
                                <p className="text-2xl font-bold mt-1 text-yellow-600">{unacknowledgedAlerts.length}</p>
                            </div>
                            <Bell className="w-8 h-8 text-yellow-500" />
                        </div>
                        <p className="text-sm text-slate-500 mt-2">
                            {alerts.length} total | {alerts.filter(a => a.acknowledged).length} acknowledged
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Services Grid */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Filter */}
                    <div className="flex gap-2">
                        <select
                            value={selectedService}
                            onChange={(e) => setSelectedService(e.target.value)}
                            className="input-field"
                        >
                            <option value="all">All Services</option>
                            {services.map(service => (
                                <option key={service.id} value={service.id}>{service.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Services List */}
                    {filteredServices.map((service) => (
                        <div key={service.id} className="card p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`} />
                                    <h3 className="font-semibold text-slate-900">{service.name}</h3>
                                </div>
                                {getStatusIcon(service.status)}
                            </div>
                            
                            <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Uptime</p>
                                    <p className={`font-bold ${service.uptime >= service.slaTarget ? 'text-green-600' : 'text-red-600'}`}>
                                        {service.uptime}%
                                    </p>
                                    <p className="text-xs text-slate-400">Target: {service.slaTarget}%</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Response</p>
                                    <p className="font-bold">{service.responseTime}ms</p>
                                    <p className="text-xs text-slate-400">Avg: {service.avgResponseTime}ms</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Incidents</p>
                                    <p className={`font-bold ${service.incidents > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {service.incidents}
                                    </p>
                                    <p className="text-xs text-slate-400">This month</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Status</p>
                                    <p className="font-medium capitalize">{service.status}</p>
                                </div>
                            </div>
                            
                            {/* Uptime History Bar */}
                            <div className="mt-4">
                                <p className="text-xs text-slate-500 mb-1">7-day Uptime History</p>
                                <div className="flex gap-1">
                                    {service.uptimeHistory.map((uptime, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex-1 h-2 rounded ${
                                                uptime >= service.slaTarget 
                                                    ? 'bg-green-500' 
                                                    : uptime >= 95 
                                                        ? 'bg-yellow-500' 
                                                        : 'bg-red-500'
                                            }`}
                                            title={`Day ${idx + 1}: ${uptime}%`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Alerts Panel */}
                <div className="space-y-4">
                    <div className="card p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-900">Active Alerts</h3>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                {unacknowledgedAlerts.length} new
                            </span>
                        </div>
                        
                        {alerts.length === 0 ? (
                            <div className="text-center py-8">
                                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                                <p className="text-slate-500">No active alerts</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {alerts.map((alert) => (
                                    <div 
                                        key={alert.id} 
                                        className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)} ${
                                            alert.acknowledged ? 'opacity-60' : ''
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-medium text-sm">{alert.service}</p>
                                                <p className="text-xs mt-1">{alert.message}</p>
                                                <p className="text-xs opacity-70 mt-1">
                                                    {new Date(alert.timestamp).toLocaleTimeString()}
                                                </p>
                                            </div>
                                            {!alert.acknowledged && (
                                                <button
                                                    onClick={() => acknowledgeAlert(alert.id)}
                                                    className="text-xs underline"
                                                >
                                                    Acknowledge
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="card p-4">
                        <h3 className="font-semibold text-slate-900 mb-4">SLA Summary</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">SLA Met</span>
                                <span className="font-medium text-green-600">
                                    {services.filter(s => s.uptime >= s.slaTarget).length}/{services.length}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">SLA Breaches</span>
                                <span className="font-medium text-red-600">
                                    {services.filter(s => s.uptime < s.slaTarget).length}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">MTTR</span>
                                <span className="font-medium">{slaMetrics.mttr} min</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Failed Requests</span>
                                <span className="font-medium text-red-600">
                                    {formatNumber(slaMetrics.failedRequests)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SLAMonitoring;
