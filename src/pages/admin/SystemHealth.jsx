import { useState, useEffect } from 'react';
import { 
    Activity, 
    Server, 
    Database, 
    Cloud, 
    Zap, 
    Clock, 
    CheckCircle, 
    XCircle, 
    AlertTriangle,
    RefreshCw,
    Cpu,
    HardDrive,
    Wifi,
    WifiOff,
    Gauge,
    TrendingUp,
    TrendingDown,
    Users,
    DollarSign,
    FileText,
    Shield
} from 'lucide-react';

/**
 * SystemHealth - Admin system health monitoring dashboard
 * Real-time monitoring of platform services and infrastructure
 */
function SystemHealth() {
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);
    
    // Mock system data
    const [systemData, setSystemData] = useState({
        uptime: '99.98%',
        activeUsers: 1247,
        transactionsToday: 8934,
        avgResponseTime: 145,
        cpu: 42,
        memory: 68,
        storage: 45,
        bandwidth: 72
    });
    
    // Services status
    const [services, setServices] = useState([
        { name: 'API Server', status: 'healthy', uptime: '99.99%', responseTime: '45ms', lastCheck: 'Just now' },
        { name: 'Database', status: 'healthy', uptime: '99.99%', responseTime: '12ms', lastCheck: 'Just now' },
        { name: 'Blockchain Node', status: 'healthy', uptime: '99.95%', responseTime: '230ms', lastCheck: 'Just now' },
        { name: 'Email Service', status: 'healthy', uptime: '99.90%', responseTime: '89ms', lastCheck: 'Just now' },
        { name: 'Payment Gateway', status: 'healthy', uptime: '99.98%', responseTime: '156ms', lastCheck: 'Just now' },
        { name: 'Storage Service', status: 'warning', uptime: '99.75%', responseTime: '320ms', lastCheck: 'Just now' },
        { name: 'Cache Layer', status: 'healthy', uptime: '99.99%', responseTime: '5ms', lastCheck: 'Just now' },
        { name: 'CDN', status: 'healthy', uptime: '99.99%', responseTime: '23ms', lastCheck: 'Just now' },
    ]);
    
    // Smart contracts
    const [contracts, setContracts] = useState([
        { name: 'LendaLoan', address: '0x1234...5678', status: 'active', interactions: 45678, lastInteraction: '2 min ago' },
        { name: 'LendaEscrow', address: '0xabcd...efgh', status: 'active', interactions: 23456, lastInteraction: '5 min ago' },
        { name: 'LendaMarketMaker', address: '0x9876...5432', status: 'active', interactions: 12345, lastInteraction: '12 min ago' },
        { name: 'ReservePool', address: '0xdef0...1234', status: 'active', interactions: 8901, lastInteraction: '18 min ago' },
    ]);
    
    // Metrics history (mock)
    const metricsHistory = {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
        cpu: [35, 32, 45, 78, 65, 52, 42],
        memory: [55, 52, 58, 72, 68, 65, 68],
        responseTime: [120, 115, 145, 210, 165, 135, 145]
    };
    
    // Auto-refresh effect
    useEffect(() => {
        if (!autoRefresh) return;
        
        const interval = setInterval(() => {
            setLastUpdate(new Date());
            // Simulate data updates
            setSystemData(prev => ({
                ...prev,
                cpu: Math.floor(Math.random() * 30) + 30,
                memory: Math.floor(Math.random() * 20) + 60,
                activeUsers: prev.activeUsers + Math.floor(Math.random() * 20) - 10,
                transactionsToday: prev.transactionsToday + Math.floor(Math.random() * 50)
            }));
        }, 10000);
        
        return () => clearInterval(interval);
    }, [autoRefresh]);
    
    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy': return 'text-green-600 bg-green-50';
            case 'warning': return 'text-amber-600 bg-amber-50';
            case 'error': return 'text-red-600 bg-red-50';
            default: return 'text-slate-600 bg-slate-50';
        }
    };
    
    // Get status icon
    const getStatusIcon = (status) => {
        switch (status) {
            case 'healthy': return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-600" />;
            case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
            default: return <Activity className="w-5 h-5 text-slate-600" />;
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                            <Activity className="w-8 h-8 text-primary-500" />
                            System Health
                        </h1>
                        <p className="text-slate-600">
                            Real-time platform infrastructure monitoring
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Clock className="w-4 h-4" />
                            Last updated: {lastUpdate.toLocaleTimeString()}
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-primary-600"
                            />
                            <span className="text-sm text-slate-600">Auto-refresh</span>
                        </label>
                        <button 
                            onClick={() => setLastUpdate(new Date())}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>
                
                {/* Overview Stats */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <span className="text-xs text-green-600 font-medium">+0.02%</span>
                        </div>
                        <p className="text-sm text-slate-500">Uptime</p>
                        <p className="text-2xl font-bold text-slate-900">{systemData.uptime}</p>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="text-xs text-green-600 font-medium">+12%</span>
                        </div>
                        <p className="text-sm text-slate-500">Active Users</p>
                        <p className="text-2xl font-bold text-slate-900">{systemData.activeUsers.toLocaleString()}</p>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Zap className="w-6 h-6 text-purple-600" />
                            </div>
                            <span className="text-xs text-green-600 font-medium">+8%</span>
                        </div>
                        <p className="text-sm text-slate-500">Response Time</p>
                        <p className="text-2xl font-bold text-slate-900">{systemData.avgResponseTime}ms</p>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-6 h-6 text-amber-600" />
                            </div>
                            <span className="text-xs text-green-600 font-medium">+15%</span>
                        </div>
                        <p className="text-sm text-slate-500">Transactions Today</p>
                        <p className="text-2xl font-bold text-slate-900">{systemData.transactionsToday.toLocaleString()}</p>
                    </div>
                </div>
                
                {/* Resource Usage */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Cpu className="w-5 h-5 text-slate-600" />
                                <span className="font-medium">CPU Usage</span>
                            </div>
                            <span className={`text-sm font-medium ${
                                systemData.cpu > 80 ? 'text-red-600' : 
                                systemData.cpu > 60 ? 'text-amber-600' : 'text-green-600'
                            }`}>
                                {systemData.cpu}%
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                                className={`h-2 rounded-full ${
                                    systemData.cpu > 80 ? 'bg-red-500' : 
                                    systemData.cpu > 60 ? 'bg-amber-500' : 'bg-green-500'
                                }`} 
                                style={{ width: `${systemData.cpu}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <HardDrive className="w-5 h-5 text-slate-600" />
                                <span className="font-medium">Memory</span>
                            </div>
                            <span className={`text-sm font-medium ${
                                systemData.memory > 80 ? 'text-red-600' : 
                                systemData.memory > 60 ? 'text-amber-600' : 'text-green-600'
                            }`}>
                                {systemData.memory}%
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                                className={`h-2 rounded-full ${
                                    systemData.memory > 80 ? 'bg-red-500' : 
                                    systemData.memory > 60 ? 'bg-amber-500' : 'bg-green-500'
                                }`} 
                                style={{ width: `${systemData.memory}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Database className="w-5 h-5 text-slate-600" />
                                <span className="font-medium">Storage</span>
                            </div>
                            <span className="text-sm font-medium text-green-600">
                                {systemData.storage}%
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                                className="h-2 rounded-full bg-green-500" 
                                style={{ width: `${systemData.storage}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Cloud className="w-5 h-5 text-slate-600" />
                                <span className="font-medium">Bandwidth</span>
                            </div>
                            <span className={`text-sm font-medium ${
                                systemData.bandwidth > 80 ? 'text-red-600' : 
                                systemData.bandwidth > 60 ? 'text-amber-600' : 'text-green-600'
                            }`}>
                                {systemData.bandwidth}%
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                                className={`h-2 rounded-full ${
                                    systemData.bandwidth > 80 ? 'bg-red-500' : 
                                    systemData.bandwidth > 60 ? 'bg-amber-500' : 'bg-green-500'
                                }`} 
                                style={{ width: `${systemData.bandwidth}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
                
                {/* Services and Contracts */}
                <div className="grid lg:grid-cols-2 gap-6 mb-8">
                    {/* Services Status */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Server className="w-5 h-5 text-slate-600" />
                            Services Status
                        </h2>
                        <div className="space-y-3">
                            {services.map((service, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        {getStatusIcon(service.status)}
                                        <div>
                                            <p className="font-medium text-slate-900">{service.name}</p>
                                            <p className="text-xs text-slate-500">Uptime: {service.uptime}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-slate-700">{service.responseTime}</p>
                                        <p className="text-xs text-slate-500">{service.lastCheck}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Smart Contracts */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-slate-600" />
                            Smart Contracts
                        </h2>
                        <div className="space-y-3">
                            {contracts.map((contract, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                            <Shield className="w-5 h-5 text-primary-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{contract.name}</p>
                                            <p className="text-xs text-slate-500 font-mono">{contract.address}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-slate-700">
                                            {contract.interactions.toLocaleString()} interactions
                                        </p>
                                        <p className="text-xs text-slate-500">{contract.lastInteraction}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* LENDA Guarantee Fund */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-slate-600" />
                        LENDA Guarantee Fund
                    </h2>
                    <div className="grid md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-sm text-slate-500">Total Reserve</p>
                            <p className="text-2xl font-bold text-slate-900">$450,000</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Coverage Ratio</p>
                            <p className="text-2xl font-bold text-green-600">18.4%</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Target Ratio</p>
                            <p className="text-2xl font-bold text-slate-900">20%</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Status</p>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="font-medium text-green-600">Healthy</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-600">Current Coverage</span>
                            <span className="font-medium">18.4%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                            <div className="bg-green-500 h-3 rounded-full" style={{ width: '92%' }}></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Target: 20% - Reserve fund is operating within healthy parameters
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SystemHealth;
