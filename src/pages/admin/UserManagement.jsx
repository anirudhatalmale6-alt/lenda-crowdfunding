import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { getAllUsers, updateUserStatus, verifyUserKYC } from '../../store/slices/authSlice';

function UserManagement() {
    const dispatch = useDispatch();
    const { users, isLoading } = useSelector((state) => state.auth);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionType, setActionType] = useState(null);

    useEffect(() => {
        dispatch(getAllUsers());
    }, [dispatch]);

    const handleAction = async (userId, action) => {
        try {
            switch (action) {
                case 'activate':
                    await dispatch(updateUserStatus({ userId, status: 'active' })).unwrap();
                    toast.success('User activated');
                    break;
                case 'deactivate':
                    await dispatch(updateUserStatus({ userId, status: 'inactive' })).unwrap();
                    toast.success('User deactivated');
                    break;
                case 'verify_kyc':
                    await dispatch(verifyUserKYC(userId)).unwrap();
                    toast.success('KYC verified');
                    break;
                case 'ban':
                    await dispatch(updateUserStatus({ userId, status: 'banned' })).unwrap();
                    toast.success('User banned');
                    break;
                default:
                    break;
            }
            setShowActionModal(false);
            setSelectedUser(null);
            dispatch(getAllUsers());
        } catch (error) {
            toast.error(error.message || 'Action failed');
        }
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const filteredUsers = users?.filter(user => {
        const matchesFilter = filter === 'all' || user.role === filter || user.status === filter;
        const matchesSearch = !searchTerm ||
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.id?.toString().includes(searchTerm);
        return matchesFilter && matchesSearch;
    }) || [];

    const getStats = () => {
        if (!users) return { total: 0, lenders: 0, borrowers: 0, pendingKYC: 0 };
        return {
            total: users.length,
            lenders: users.filter(u => u.role === 'lender').length,
            borrowers: users.filter(u => u.role === 'borrower').length,
            pendingKYC: users.filter(u => u.kycStatus === 'pending').length,
        };
    };

    const stats = getStats();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">User Management</h1>
                <button
                    onClick={() => dispatch(getAllUsers())}
                    className="btn-secondary"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total Users</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">{stats.lenders}</p>
                        <p className="text-sm text-slate-500">Lenders</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{stats.borrowers}</p>
                        <p className="text-sm text-slate-500">Borrowers</p>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-600">{stats.pendingKYC}</p>
                        <p className="text-sm text-slate-500">Pending KYC</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
                <input
                    type="text"
                    className="input-field flex-1 min-w-[200px]"
                    placeholder="Search by name, email, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                    className="input-field"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >
                    <option value="all">All Users</option>
                    <option value="lender">Lenders</option>
                    <option value="borrower">Borrowers</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending Verification</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="card overflow-hidden">
                {isLoading ? (
                    <div className="p-6 text-center">
                        <div className="animate-pulse">Loading users...</div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">
                        No users found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left py-3 px-4">User</th>
                                    <th className="text-left py-3 px-4">Role</th>
                                    <th className="text-left py-3 px-4">Status</th>
                                    <th className="text-left py-3 px-4">KYC</th>
                                    <th className="text-left py-3 px-4">Joined</th>
                                    <th className="text-left py-3 px-4">Last Active</th>
                                    <th className="text-left py-3 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.slice(0, 50).map((user) => (
                                    <tr key={user.id} className="border-t hover:bg-slate-50">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                                    <span className="text-emerald-600 font-medium">
                                                        {user.name?.charAt(0).toUpperCase() || 'U'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium">{user.name || 'Anonymous'}</p>
                                                    <p className="text-sm text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${user.role === 'lender' ? 'bg-blue-100 text-blue-800' :
                                                user.role === 'borrower' ? 'bg-green-100 text-green-800' :
                                                    'bg-slate-100 text-slate-800'
                                                }`}>
                                                {user.role || 'User'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-800' :
                                                user.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                                                    user.status === 'banned' ? 'bg-red-100 text-red-800' :
                                                        'bg-slate-100 text-slate-800'
                                                }`}>
                                                {user.status || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${user.kycStatus === 'verified' ? 'bg-green-100 text-green-800' :
                                                user.kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    user.kycStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                                        'bg-slate-100 text-slate-800'
                                                }`}>
                                                {user.kycStatus || 'Not submitted'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-slate-600">
                                            {formatDate(user.createdAt)}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-slate-600">
                                            {formatDate(user.lastActive)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex gap-2">
                                                <button
                                                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowActionModal(true);
                                                    }}
                                                >
                                                    Manage
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Action Modal */}
            {showActionModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="card max-w-md w-full mx-4">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Manage User: {selectedUser.name}</h2>
                            <div className="space-y-3">
                                <button
                                    className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                    onClick={() => handleAction(selectedUser.id, 'activate')}
                                >
                                    <span className="font-medium">✓ Activate User</span>
                                    <p className="text-sm text-slate-600">Allow user to access the platform</p>
                                </button>
                                <button
                                    className="w-full p-3 text-left bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                                    onClick={() => handleAction(selectedUser.id, 'deactivate')}
                                >
                                    <span className="font-medium">⏸ Deactivate User</span>
                                    <p className="text-sm text-slate-600">Temporarily disable user access</p>
                                </button>
                                {selectedUser.kycStatus !== 'verified' && (
                                    <button
                                        className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                        onClick={() => handleAction(selectedUser.id, 'verify_kyc')}
                                    >
                                        <span className="font-medium">🆔 Verify KYC</span>
                                        <p className="text-sm text-slate-600">Mark user&apos;s identity as verified</p>
                                    </button>
                                )}
                                <button
                                    className="w-full p-3 text-left bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                    onClick={() => handleAction(selectedUser.id, 'ban')}
                                >
                                    <span className="font-medium">🚫 Ban User</span>
                                    <p className="text-sm text-slate-600">Permanently ban user from platform</p>
                                </button>
                            </div>
                            <button
                                className="btn-secondary w-full mt-4"
                                onClick={() => {
                                    setShowActionModal(false);
                                    setSelectedUser(null);
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserManagement;
