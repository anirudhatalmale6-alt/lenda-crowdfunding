import { useState, useEffect } from 'react';
import { 
    Shield, 
    Plus, 
    Edit2, 
    Trash2, 
    Users, 
    Key, 
    Check,
    X,
    Search,
    Filter,
    RefreshCw,
    Save,
    Lock,
    Unlock,
    AlertCircle
} from 'lucide-react';

/**
 * AdminRoleManagement - RBAC role management for administrators
 * Allows admins to create, edit, and manage admin roles with permissions
 */
function AdminRoleManagement() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // add, edit, permissions
    const [searchTerm, setSearchTerm] = useState('');
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_active: true
    });
    
    // Permissions state
    const [permissions, setPermissions] = useState({});
    
    // Mock roles data
    const mockRoles = [
        { 
            id: 1, 
            name: 'Super Admin', 
            description: 'Full access to all admin features',
            is_active: true,
            user_count: 3,
            created: '2024-01-15 10:30:00'
        },
        { 
            id: 2, 
            name: 'Content Manager', 
            description: 'Manage content and users only',
            is_active: true,
            user_count: 5,
            created: '2024-02-20 14:15:00'
        },
        { 
            id: 3, 
            name: 'Finance Manager', 
            description: 'Manage financial operations',
            is_active: true,
            user_count: 2,
            created: '2024-02-25 09:00:00'
        },
        { 
            id: 4, 
            name: 'Loan Officer', 
            description: 'Approve and manage loan applications',
            is_active: true,
            user_count: 8,
            created: '2024-03-01 11:30:00'
        },
        { 
            id: 5, 
            name: 'Support Staff', 
            description: 'View-only access for support',
            is_active: false,
            user_count: 0,
            created: '2024-03-05 16:00:00'
        }
    ];
    
    // Available permissions
    const availablePermissions = {
        'users': {
            label: 'User Management',
            actions: {
                'admin_index': 'View Users',
                'admin_view': 'View User Details',
                'admin_add': 'Add User',
                'admin_edit': 'Edit User',
                'admin_delete': 'Delete User',
                'admin_export': 'Export Users'
            }
        },
        'dashboard': {
            label: 'Dashboard',
            actions: {
                'admin_stats': 'View Stats',
                'admin_action_taken': 'View Action Taken'
            }
        },
        'settings': {
            label: 'Settings',
            actions: {
                'admin_index': 'View Settings',
                'admin_edit': 'Edit Settings',
                'admin_plugin_settings': 'Plugin Settings'
            }
        },
        'transactions': {
            label: 'Transactions',
            actions: {
                'admin_index': 'View Transactions',
                'admin_export': 'Export Transactions'
            }
        },
        'fees': {
            label: 'Fee Configuration',
            actions: {
                'admin_index': 'View Fees',
                'admin_add': 'Add Fee',
                'admin_edit': 'Edit Fee',
                'admin_delete': 'Delete Fee'
            }
        },
        'announcements': {
            label: 'Announcements',
            actions: {
                'admin_index': 'View Announcements',
                'admin_add': 'Add Announcement',
                'admin_edit': 'Edit Announcement',
                'admin_delete': 'Delete Announcement'
            }
        },
        'audit_logs': {
            label: 'Audit Logs',
            actions: {
                'admin_index': 'View Audit Logs',
                'admin_export': 'Export Logs'
            }
        }
    };
    
    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setRoles(mockRoles);
            setLoading(false);
        }, 500);
    }, []);
    
    // Filter roles
    const filteredRoles = roles.filter(role => 
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Handle form change
    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    // Handle permission toggle
    const togglePermission = (controller, action) => {
        setPermissions(prev => {
            const key = `${controller}.${action}`;
            if (prev[key]) {
                const { [key]: removed, ...rest } = prev;
                return rest;
            }
            return { ...prev, [key]: true };
        });
    };
    
    // Handle add role
    const handleAddRole = () => {
        setModalMode('add');
        setFormData({ name: '', description: '', is_active: true });
        setPermissions({});
        setShowModal(true);
    };
    
    // Handle edit role
    const handleEditRole = (role) => {
        setModalMode('edit');
        setSelectedRole(role);
        setFormData({ 
            name: role.name, 
            description: role.description, 
            is_active: role.is_active 
        });
        // Mock permissions - in real app would fetch from API
        setPermissions({
            'users.admin_index': true,
            'users.admin_view': true,
            'settings.admin_index': true
        });
        setShowModal(true);
    };
    
    // Handle permissions management
    const handlePermissions = (role) => {
        setModalMode('permissions');
        setSelectedRole(role);
        // Mock permissions - in real app would fetch from API
        setPermissions({
            'users.admin_index': true,
            'users.admin_view': true,
            'users.admin_edit': true,
            'dashboard.admin_stats': true,
            'settings.admin_index': true,
            'transactions.admin_index': true
        });
        setShowModal(true);
    };
    
    // Handle save
    const handleSave = () => {
        // API call would go here
        console.log('Saving role:', { formData, permissions });
        setShowModal(false);
    };
    
    // Handle delete
    const handleDelete = (roleId) => {
        if (window.confirm('Are you sure you want to delete this role?')) {
            setRoles(prev => prev.filter(r => r.id !== roleId));
        }
    };
    
    // Handle toggle active
    const toggleActive = (roleId) => {
        setRoles(prev => prev.map(r => 
            r.id === roleId ? { ...r, is_active: !r.is_active } : r
        ));
    };
    
    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                            <Shield className="w-8 h-8 text-primary-500" />
                            Admin Roles
                        </h1>
                        <p className="text-slate-600">
                            Manage role-based access control (RBAC) for administrators
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
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
                        <button 
                            onClick={handleAddRole}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                        >
                            <Plus className="w-4 h-4" />
                            Add Role
                        </button>
                    </div>
                </div>
                
                {/* Search */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search roles..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </div>
                
                {/* Roles Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                                <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
                                <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                            </div>
                        ))
                    ) : filteredRoles.length > 0 ? (
                        filteredRoles.map(role => (
                            <div key={role.id} className={`bg-white rounded-xl border p-6 ${role.is_active ? 'border-slate-200' : 'border-slate-300 bg-slate-50'}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                            {role.name}
                                            {role.id === 1 && <Lock className="w-4 h-4 text-amber-500" />}
                                        </h3>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                            role.is_active 
                                                ? 'bg-emerald-50 text-emerald-700' 
                                                : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {role.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                                
                                <p className="text-sm text-slate-600 mb-4">{role.description}</p>
                                
                                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                    <div className="flex items-center gap-1">
                                        <Users className="w-4 h-4" />
                                        {role.user_count} users
                                    </div>
                                    <div>
                                        Created: {role.created.split(' ')[0]}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                                    <button 
                                        onClick={() => handlePermissions(role)}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
                                    >
                                        <Key className="w-4 h-4" />
                                        Permissions
                                    </button>
                                    <button 
                                        onClick={() => handleEditRole(role)}
                                        className="p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                                        disabled={role.id === 1}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => toggleActive(role.id)}
                                        className={`p-2 rounded-lg ${
                                            role.is_active 
                                                ? 'text-amber-600 hover:bg-amber-50' 
                                                : 'text-emerald-600 hover:bg-emerald-50'
                                        }`}
                                        disabled={role.id === 1}
                                    >
                                        {role.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(role.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                        disabled={role.id === 1 || role.user_count > 0}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12">
                            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No roles found</p>
                        </div>
                    )}
                </div>
                
                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                            <div className="p-6 border-b border-slate-200">
                                <h2 className="text-xl font-semibold">
                                    {modalMode === 'add' && 'Add New Role'}
                                    {modalMode === 'edit' && 'Edit Role'}
                                    {modalMode === 'permissions' && `Manage Permissions - ${selectedRole?.name}`}
                                </h2>
                            </div>
                            
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                {(modalMode === 'add' || modalMode === 'edit') && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Role Name
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => handleFormChange('name', e.target.value)}
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                                placeholder="Enter role name"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Description
                                            </label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => handleFormChange('description', e.target.value)}
                                                rows={3}
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                                placeholder="Enter role description"
                                            />
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="is_active"
                                                checked={formData.is_active}
                                                onChange={(e) => handleFormChange('is_active', e.target.checked)}
                                                className="w-4 h-4 text-primary-500 rounded"
                                            />
                                            <label htmlFor="is_active" className="text-sm text-slate-700">
                                                Active
                                            </label>
                                        </div>
                                    </div>
                                )}
                                
                                {modalMode === 'permissions' && (
                                    <div className="space-y-4">
                                        {Object.entries(availablePermissions).map(([controller, controllerData]) => (
                                            <div key={controller} className="border border-slate-200 rounded-lg overflow-hidden">
                                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                                                    <h3 className="font-medium text-slate-900">{controllerData.label}</h3>
                                                </div>
                                                <div className="p-4 grid grid-cols-2 gap-2">
                                                    {Object.entries(controllerData.actions).map(([action, label]) => {
                                                        const key = `${controller}.${action}`;
                                                        const isSelected = permissions[key];
                                                        return (
                                                            <button
                                                                key={action}
                                                                onClick={() => togglePermission(controller, action)}
                                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left ${
                                                                    isSelected 
                                                                        ? 'bg-primary-50 text-primary-700 border border-primary-200' 
                                                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                {isSelected ? (
                                                                    <Check className="w-4 h-4 text-primary-500" />
                                                                ) : (
                                                                    <X className="w-4 h-4 text-slate-300" />
                                                                )}
                                                                {label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                                >
                                    <Save className="w-4 h-4" />
                                    {modalMode === 'permissions' ? 'Save Permissions' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Warning for Super Admin */}
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-800">Important Notice</p>
                        <p className="text-sm text-amber-700 mt-1">
                            The Super Admin role cannot be edited or deleted. 
                            Role permissions changes take effect immediately.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminRoleManagement;
