import { useState, useEffect } from 'react';
import { 
    Shield, 
    Users, 
    Settings, 
    Trash2, 
    RefreshCw,
    Search,
    Clock,
    Monitor,
    Smartphone,
    Globe,
    LogOut,
    AlertCircle,
    CheckCircle,
    XCircle,
    Save
} from 'lucide-react';

/**
 * SessionManagement - Admin session management with concurrent login limits
 * Allows admins to view and manage admin sessions
 */
function SessionManagement() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        max_concurrent_sessions: 3,
        session_timeout_minutes: 60,
        is_active: true
    });
    const [showSettings, setShowSettings] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Mock sessions data
    const mockSessions = [
        { 
            id: 'sess_001', 
            user_id: 1, 
            username: 'admin@lenda.com', 
            email: 'admin@lenda.com',
            role: 'Super Admin',
            ip_address: '192.168.1.100', 
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
            device: 'desktop',
            created: '2024-03-15 14:30:00',
            expires: '2024-03-15 15:30:00',
            status: 'active'
        },
        { 
            id: 'sess_002', 
            user_id: 2, 
            username: 'manager@lenda.com', 
            email: 'manager@lenda.com',
            role: 'Finance Manager',
            ip_address: '192.168.1.105', 
            user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
            device: 'desktop',
            created: '2024-03-15 13:45:00',
            expires: '2024-03-15 14:45:00',
            status: 'active'
        },
        { 
            id: 'sess_003', 
            user_id: 3, 
            username: 'loan@lenda.com', 
            email: 'loan@lenda.com',
            role: 'Loan Officer',
            ip_address: '192.168.1.110', 
            user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148',
            device: 'mobile',
            created: '2024-03-15 12:00:00',
            expires: '2024-03-15 13:00:00',
            status: 'active'
        },
        { 
            id: 'sess_004', 
            user_id: 4, 
            username: 'support@lenda.com', 
            email: 'support@lenda.com',
            role: 'Support Staff',
            ip_address: '192.168.1.115', 
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101',
            device: 'desktop',
            created: '2024-03-15 11:30:00',
            expires: '2024-03-15 12:30:00',
            status: 'active'
        },
        { 
            id: 'sess_005', 
            user_id: 5, 
            username: 'risk@lenda.com', 
            email: 'risk@lenda.com',
            role: 'Risk Manager',
            ip_address: '192.168.1.120', 
            user_agent: 'Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile',
            device: 'mobile',
            created: '2024-03-15 10:15:00',
            expires: '2024-03-15 11:15:00',
            status: 'active'
        }
    ];
    
    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setSessions(mockSessions);
            setLoading(false);
        }, 500);
    }, []);
    
    // Filter sessions
    const filteredSessions = sessions.filter(session => 
        session.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.ip_address.includes(searchTerm)
    );
    
    // Get device icon
    const getDeviceIcon = (device) => {
        switch (device) {
            case 'mobile': return <Smartphone className="w-4 h-4" />;
            case 'desktop': return <Monitor className="w-4 h-4" />;
            default: return <Globe className="w-4 h-4" />;
        }
    };
    
    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'text-emerald-600 bg-emerald-50';
            case 'expired': return 'text-red-600 bg-red-50';
            case 'idle': return 'text-amber-600 bg-amber-50';
            default: return 'text-slate-600 bg-slate-50';
        }
    };
    
    // Handle terminate session
    const handleTerminateSession = (sessionId) => {
        if (window.confirm('Are you sure you want to terminate this session?')) {
            setSessions(prev => prev.filter(s => s.id !== sessionId));
        }
    };
    
    // Handle terminate all user sessions
    const handleTerminateUserSessions = (userId, username) => {
        if (window.confirm(`Are you sure you want to terminate all sessions for ${username}?`)) {
            setSessions(prev => prev.filter(s => s.user_id !== userId));
        }
    };
    
    // Handle save settings
    const handleSaveSettings = () => {
        // API call would go here
        console.log('Saving settings:', settings);
        setShowSettings(false);
    };
    
    // Handle cleanup
    const handleCleanup = () => {
        if (window.confirm('This will remove all expired sessions. Continue?')) {
            setSessions(prev => prev.filter(s => s.status === 'active'));
        }
    };
    
    // Get unique users with session count
    const userSessionCounts = sessions.reduce((acc, session) => {
        if (!acc[session.user_id]) {
            acc[session.user_id] = { username: session.username, count: 0 };
        }
        acc[session.user_id].count++;
        return acc;
    }, {});
    
    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                            <Users className="w-8 h-8 text-primary-500" />
                            Session Management
                        </h1>
                        <p className="text-slate-600">
                            Manage admin sessions and concurrent login limits
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setShowSettings(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </button>
                        <button 
                            onClick={handleCleanup}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            <Trash2 className="w-4 h-4" />
                            Cleanup Expired
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
                
                {/* Stats Cards */}
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Active Sessions</p>
                                <p className="text-2xl font-bold text-slate-900">{sessions.length}</p>
                            </div>
                            <Users className="w-8 h-8 text-slate-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Unique Users</p>
                                <p className="text-2xl font-bold text-slate-900">{Object.keys(userSessionCounts).length}</p>
                            </div>
                            <Shield className="w-8 h-8 text-slate-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Max Concurrent</p>
                                <p className="text-2xl font-bold text-slate-900">{settings.max_concurrent_sessions}</p>
                            </div>
                            <Settings className="w-8 h-8 text-slate-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Session Timeout</p>
                                <p className="text-2xl font-bold text-slate-900">{settings.session_timeout_minutes} min</p>
                            </div>
                            <Clock className="w-8 h-8 text-slate-400" />
                        </div>
                    </div>
                </div>
                
                {/* Search */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by username, email, or IP..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </div>
                
                {/* Sessions Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">User</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Role</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Device</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">IP Address</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Started</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Expires</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
                                        <p className="text-slate-500 mt-2">Loading sessions...</p>
                                    </td>
                                </tr>
                            ) : filteredSessions.length > 0 ? (
                                filteredSessions.map(session => (
                                    <tr key={session.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-slate-900">{session.username}</p>
                                                <p className="text-sm text-slate-500">{session.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {session.role}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                {getDeviceIcon(session.device)}
                                                <span className="text-sm capitalize">{session.device}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                                            {session.ip_address}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {session.created}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {session.expires}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                                                {session.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                {session.status === 'expired' && <XCircle className="w-3 h-3 mr-1" />}
                                                {session.status === 'idle' && <AlertCircle className="w-3 h-3 mr-1" />}
                                                {session.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleTerminateSession(session.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                    title="Terminate session"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleTerminateUserSessions(session.user_id, session.username)}
                                                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                                                    title="Terminate all user sessions"
                                                >
                                                    <Users className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                        <p className="text-slate-500">No sessions found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Settings Modal */}
                {showSettings && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl w-full max-w-md">
                            <div className="p-6 border-b border-slate-200">
                                <h2 className="text-xl font-semibold">Session Settings</h2>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Maximum Concurrent Sessions
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.max_concurrent_sessions}
                                        onChange={(e) => setSettings(prev => ({ ...prev, max_concurrent_sessions: parseInt(e.target.value) }))}
                                        min={1}
                                        max={10}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Maximum number of simultaneous sessions per admin user (1-10)</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Session Timeout (minutes)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.session_timeout_minutes}
                                        onChange={(e) => setSettings(prev => ({ ...prev, session_timeout_minutes: parseInt(e.target.value) }))}
                                        min={5}
                                        max={1440}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Session expires after this period of inactivity (5-1440 minutes)</p>
                                </div>
                                
                                <div className="flex items-center gap-2 pt-4">
                                    <input
                                        type="checkbox"
                                        id="settings_active"
                                        checked={settings.is_active}
                                        onChange={(e) => setSettings(prev => ({ ...prev, is_active: e.target.checked }))}
                                        className="w-4 h-4 text-primary-500 rounded"
                                    />
                                    <label htmlFor="settings_active" className="text-sm text-slate-700">
                                        Enable session management
                                    </label>
                                </div>
                            </div>
                            
                            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                                <button 
                                    onClick={() => setShowSettings(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveSettings}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Settings
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Info */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                        <p className="font-medium text-blue-800">How Session Management Works</p>
                        <p className="text-sm text-blue-700 mt-1">
                            When a user exceeds the maximum concurrent sessions, the oldest session will be automatically terminated.
                            Sessions automatically expire after the timeout period of inactivity.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SessionManagement;
