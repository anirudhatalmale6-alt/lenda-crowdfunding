import { useState, useEffect } from 'react';
import { 
    Bell, 
    Plus, 
    Edit2, 
    Trash2, 
    Search,
    Filter,
    RefreshCw,
    Save,
    X,
    Info,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Eye,
    Users,
    Calendar,
    Globe,
    Lock
} from 'lucide-react';

/**
 * PlatformAnnouncements - Admin announcement management
 * Allows admins to create and manage platform-wide announcements
 */
function PlatformAnnouncements() {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // add, edit, view
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterAudience, setFilterAudience] = useState('all');
    
    // Form state
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        announcement_type: 'info',
        target_audience: 'all',
        is_active: true,
        start_date: '',
        end_date: ''
    });
    
    // Mock announcements data
    const mockAnnouncements = [
        {
            id: 1,
            title: 'System Maintenance Scheduled',
            message: 'The platform will undergo scheduled maintenance on Saturday, March 20th from 2:00 AM to 6:00 AM UTC. Some services may be temporarily unavailable.',
            announcement_type: 'warning',
            target_audience: 'all',
            is_active: true,
            start_date: '2024-03-15 00:00:00',
            end_date: '2024-03-21 23:59:59',
            created_by: 'admin@lenda.com',
            created: '2024-03-15 10:00:00',
            read_count: 145
        },
        {
            id: 2,
            title: 'New Fee Structure Implementation',
            message: 'We are introducing a new fee structure for loanOrigination starting April 1st. Please review the updated fee schedule in the Fee Controls section.',
            announcement_type: 'info',
            target_audience: 'borrowers',
            is_active: true,
            start_date: '2024-03-10 00:00:00',
            end_date: '2024-04-01 23:59:59',
            created_by: 'admin@lenda.com',
            created: '2024-03-10 09:00:00',
            read_count: 89
        },
        {
            id: 3,
            title: 'Platform Upgrade Complete',
            message: 'We are happy to announce that the platform upgrade has been completed successfully. All systems are now operational.',
            announcement_type: 'success',
            target_audience: 'all',
            is_active: false,
            start_date: '2024-03-01 00:00:00',
            end_date: '2024-03-10 23:59:59',
            created_by: 'admin@lenda.com',
            created: '2024-03-01 08:00:00',
            read_count: 234
        },
        {
            id: 4,
            title: 'Security Alert: Phishing Attempts',
            message: 'We have detected phishing attempts targeting our users. Please be cautious of emails asking for your login credentials. Always verify the sender\'s email address.',
            announcement_type: 'danger',
            target_audience: 'all',
            is_active: true,
            start_date: '2024-03-14 00:00:00',
            end_date: null,
            created_by: 'admin@lenda.com',
            created: '2024-03-14 14:00:00',
            read_count: 312
        },
        {
            id: 5,
            title: 'Holiday Schedule',
            message: 'Our support team will have limited availability during the upcoming holiday period. Emergency support will still be available for critical issues.',
            announcement_type: 'info',
            target_audience: 'lenders',
            is_active: true,
            start_date: '2024-03-18 00:00:00',
            end_date: '2024-03-25 23:59:59',
            created_by: 'admin@lenda.com',
            created: '2024-03-16 11:00:00',
            read_count: 45
        }
    ];
    
    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setAnnouncements(mockAnnouncements);
            setLoading(false);
        }, 500);
    }, []);
    
    // Filter announcements
    const filteredAnnouncements = announcements.filter(announcement => {
        const matchesSearch = 
            announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            announcement.message.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = 
            filterStatus === 'all' || 
            (filterStatus === 'active' && announcement.is_active) ||
            (filterStatus === 'inactive' && !announcement.is_active);
        
        const matchesAudience = 
            filterAudience === 'all' || 
            announcement.target_audience === filterAudience;
        
        return matchesSearch && matchesStatus && matchesAudience;
    });
    
    // Handle form change
    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    // Handle add announcement
    const handleAdd = () => {
        setModalMode('add');
        setFormData({
            title: '',
            message: '',
            announcement_type: 'info',
            target_audience: 'all',
            is_active: true,
            start_date: '',
            end_date: ''
        });
        setShowModal(true);
    };
    
    // Handle edit announcement
    const handleEdit = (announcement) => {
        setModalMode('edit');
        setSelectedAnnouncement(announcement);
        setFormData({
            title: announcement.title,
            message: announcement.message,
            announcement_type: announcement.announcement_type,
            target_audience: announcement.target_audience,
            is_active: announcement.is_active,
            start_date: announcement.start_date ? announcement.start_date.split(' ')[0] : '',
            end_date: announcement.end_date ? announcement.end_date.split(' ')[0] : ''
        });
        setShowModal(true);
    };
    
    // Handle view announcement
    const handleView = (announcement) => {
        setModalMode('view');
        setSelectedAnnouncement(announcement);
        setShowModal(true);
    };
    
    // Handle save
    const handleSave = () => {
        console.log('Saving announcement:', formData);
        setShowModal(false);
    };
    
    // Handle delete
    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this announcement?')) {
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        }
    };
    
    // Handle toggle active
    const toggleActive = (id) => {
        setAnnouncements(prev => prev.map(a => 
            a.id === id ? { ...a, is_active: !a.is_active } : a
        ));
    };
    
    // Get type icon and color
    const getTypeStyle = (type) => {
        switch (type) {
            case 'info': 
                return { icon: Info, color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200' };
            case 'warning': 
                return { icon: AlertTriangle, color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200' };
            case 'success': 
                return { icon: CheckCircle, color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200' };
            case 'danger': 
                return { icon: XCircle, color: 'red', bg: 'bg-red-50', border: 'border-red-200' };
            default: 
                return { icon: Info, color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200' };
        }
    };
    
    // Get audience label
    const getAudienceLabel = (audience) => {
        switch (audience) {
            case 'all': return 'All Users';
            case 'lenders': return 'Lenders';
            case 'borrowers': return 'Borrowers';
            case 'admins': return 'Admins';
            default: return audience;
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                            <Bell className="w-8 h-8 text-primary-500" />
                            Announcements
                        </h1>
                        <p className="text-slate-600">
                            Manage platform-wide announcements and notifications
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
                            onClick={handleAdd}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                        >
                            <Plus className="w-4 h-4" />
                            New Announcement
                        </button>
                    </div>
                </div>
                
                {/* Filters */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search announcements..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        
                        <select
                            value={filterAudience}
                            onChange={(e) => setFilterAudience(e.target.value)}
                            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="all">All Audiences</option>
                            <option value="all">All Users</option>
                            <option value="lenders">Lenders</option>
                            <option value="borrowers">Borrowers</option>
                            <option value="admins">Admins</option>
                        </select>
                    </div>
                </div>
                
                {/* Stats */}
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Total</p>
                                <p className="text-2xl font-bold text-slate-900">{announcements.length}</p>
                            </div>
                            <Bell className="w-8 h-8 text-slate-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Active</p>
                                <p className="text-2xl font-bold text-emerald-600">
                                    {announcements.filter(a => a.is_active).length}
                                </p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-emerald-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Target: All</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {announcements.filter(a => a.target_audience === 'all').length}
                                </p>
                            </div>
                            <Globe className="w-8 h-8 text-blue-400" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Total Reads</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {announcements.reduce((sum, a) => sum + a.read_count, 0)}
                                </p>
                            </div>
                            <Eye className="w-8 h-8 text-slate-400" />
                        </div>
                    </div>
                </div>
                
                {/* Announcements Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {loading ? (
                        [...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                                <div className="h-6 bg-slate-200 rounded w-2/3 mb-4"></div>
                                <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                            </div>
                        ))
                    ) : filteredAnnouncements.length > 0 ? (
                        filteredAnnouncements.map(announcement => {
                            const typeStyle = getTypeStyle(announcement.announcement_type);
                            const TypeIcon = typeStyle.icon;
                            
                            return (
                                <div key={announcement.id} className={`bg-white rounded-xl border p-6 ${announcement.is_active ? 'border-slate-200' : 'border-slate-300 bg-slate-50'}`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${typeStyle.bg} text-${typeStyle.color}-700`}>
                                            <TypeIcon className="w-4 h-4" />
                                            {announcement.announcement_type}
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                            announcement.is_active 
                                                ? 'bg-emerald-50 text-emerald-700' 
                                                : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {announcement.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{announcement.title}</h3>
                                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{announcement.message}</p>
                                    
                                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                        <div className="flex items-center gap-1">
                                            <Users className="w-4 h-4" />
                                            {getAudienceLabel(announcement.target_audience)}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Eye className="w-4 h-4" />
                                            {announcement.read_count} reads
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {announcement.created.split(' ')[0]}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                                        <button 
                                            onClick={() => handleView(announcement)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
                                        >
                                            <Eye className="w-4 h-4" />
                                            View
                                        </button>
                                        <button 
                                            onClick={() => handleEdit(announcement)}
                                            className="p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => toggleActive(announcement.id)}
                                            className={`p-2 rounded-lg ${
                                                announcement.is_active 
                                                    ? 'text-amber-600 hover:bg-amber-50' 
                                                    : 'text-emerald-600 hover:bg-emerald-50'
                                            }`}
                                        >
                                            {announcement.is_active ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(announcement.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full text-center py-12">
                            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No announcements found</p>
                        </div>
                    )}
                </div>
                
                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                                <h2 className="text-xl font-semibold">
                                    {modalMode === 'add' && 'Create Announcement'}
                                    {modalMode === 'edit' && 'Edit Announcement'}
                                    {modalMode === 'view' && 'Announcement Details'}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                {modalMode === 'view' ? (
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className={`px-3 py-1 rounded-full text-sm ${
                                                getTypeStyle(selectedAnnouncement?.announcement_type).bg
                                            } text-${
                                                getTypeStyle(selectedAnnouncement?.announcement_type).color
                                            }-700`}>
                                                {selectedAnnouncement?.announcement_type}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                selectedAnnouncement?.is_active 
                                                    ? 'bg-emerald-50 text-emerald-700' 
                                                    : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {selectedAnnouncement?.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-semibold mb-4">{selectedAnnouncement?.title}</h3>
                                        <p className="text-slate-600 mb-4 whitespace-pre-wrap">{selectedAnnouncement?.message}</p>
                                        <div className="flex items-center gap-4 text-sm text-slate-500 pt-4 border-t border-slate-200">
                                            <span>Audience: {getAudienceLabel(selectedAnnouncement?.target_audience)}</span>
                                            <span>Created: {selectedAnnouncement?.created}</span>
                                            <span>Reads: {selectedAnnouncement?.read_count}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Title
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.title}
                                                onChange={(e) => handleFormChange('title', e.target.value)}
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                                placeholder="Enter announcement title"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Message
                                            </label>
                                            <textarea
                                                value={formData.message}
                                                onChange={(e) => handleFormChange('message', e.target.value)}
                                                rows={5}
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                                placeholder="Enter announcement message"
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                                    Type
                                                </label>
                                                <select
                                                    value={formData.announcement_type}
                                                    onChange={(e) => handleFormChange('announcement_type', e.target.value)}
                                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                                >
                                                    <option value="info">Information</option>
                                                    <option value="warning">Warning</option>
                                                    <option value="success">Success</option>
                                                    <option value="danger">Danger</option>
                                                </select>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                                    Target Audience
                                                </label>
                                                <select
                                                    value={formData.target_audience}
                                                    onChange={(e) => handleFormChange('target_audience', e.target.value)}
                                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                                >
                                                    <option value="all">All Users</option>
                                                    <option value="lenders">Lenders Only</option>
                                                    <option value="borrowers">Borrowers Only</option>
                                                    <option value="admins">Admins Only</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                                    Start Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={formData.start_date}
                                                    onChange={(e) => handleFormChange('start_date', e.target.value)}
                                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                                    End Date (Optional)
                                                </label>
                                                <input
                                                    type="date"
                                                    value={formData.end_date}
                                                    onChange={(e) => handleFormChange('end_date', e.target.value)}
                                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 pt-4">
                                            <input
                                                type="checkbox"
                                                id="is_active"
                                                checked={formData.is_active}
                                                onChange={(e) => handleFormChange('is_active', e.target.checked)}
                                                className="w-4 h-4 text-primary-500 rounded"
                                            />
                                            <label htmlFor="is_active" className="text-sm text-slate-700">
                                                Active (visible immediately)
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {modalMode !== 'view' && (
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
                                        {modalMode === 'edit' ? 'Update' : 'Create'} Announcement
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PlatformAnnouncements;
