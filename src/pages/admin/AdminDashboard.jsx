import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getAdminDashboardStats } from '../../store/slices/loanSlice';
import { formatCurrency } from '../../utils/formatters';

function AdminDashboard() {
    const dispatch = useDispatch();
    const { adminStats, isLoading } = useSelector((state) => state.loans);

    // Mock data for demonstration
    const stats = adminStats || {
        totalLoans: 342,
        totalVolume: 2450000,
        activeUsers: 1250,
        defaultRate: 2.3,
        reserveFund: 450000,
        pendingApprovals: 12,
        pendingCollateral: 8,
        openDisputes: 3,
        defaultedLoans: 5,
    };

    const recentActivity = [
        { id: 1, type: 'loan_approved', message: 'Loan #452 approved', time: '5 min ago' },
        { id: 2, type: 'kyc_verified', message: 'User John D. KYC verified', time: '12 min ago' },
        { id: 3, type: 'dispute_opened', message: 'New dispute in Escrow #221', time: '25 min ago' },
        { id: 4, type: 'collateral_verified', message: 'Collateral #89 verified', time: '1 hour ago' },
        { id: 5, type: 'loan_funded', message: 'Loan #451 fully funded', time: '2 hours ago' },
    ];

    const pendingTasks = [
        { id: 1, type: 'approval', title: 'Loan Approvals', count: stats.pendingApprovals, link: '/admin/loan-approvals', color: 'bg-blue-500' },
        { id: 2, type: 'collateral', title: 'Collateral Verification', count: stats.pendingCollateral, link: '/admin/collateral-verification', color: 'bg-purple-500' },
        { id: 3, type: 'dispute', title: 'Open Disputes', count: stats.openDisputes, link: '/admin/escrow-disputes', color: 'bg-red-500' },
        { id: 4, type: 'default', title: 'Default Management', count: stats.defaultedLoans, link: '/admin/default-management', color: 'bg-orange-500' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <button className="btn-secondary">
                    📥 Export Report
                </button>
            </div>

            {/* Main Stats */}
            <div className="grid md:grid-cols-4 gap-6">
                <div className="card">
                    <div className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Total Loans</p>
                                <div className="text-3xl font-bold mt-1">{stats.totalLoans}</div>
                                <p className="text-xs text-green-600 mt-1">↑ 12% from last month</p>
                            </div>
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                <span className="text-2xl">📋</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Total Volume</p>
                                <div className="text-3xl font-bold mt-1">{formatCurrency(stats.totalVolume)}</div>
                                <p className="text-xs text-green-600 mt-1">↑ 18% from last month</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-2xl">💰</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Active Users</p>
                                <div className="text-3xl font-bold mt-1">{stats.activeUsers}</div>
                                <p className="text-xs text-green-600 mt-1">↑ 8% from last month</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-2xl">👥</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Default Rate</p>
                                <div className={`text-3xl font-bold mt-1 ${stats.defaultRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                                    {stats.defaultRate}%
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Industry avg: 4.2%</p>
                            </div>
                            <div className={`w-12 h-12 ${stats.defaultRate > 5 ? 'bg-red-100' : 'bg-green-100'} rounded-full flex items-center justify-center`}>
                                <span className="text-2xl">📉</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Tasks */}
            <div className="grid md:grid-cols-4 gap-4">
                {pendingTasks.map((task) => (
                    <Link
                        key={task.id}
                        to={task.link}
                        className="card hover:shadow-lg transition-shadow cursor-pointer"
                    >
                        <div className="p-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 ${task.color} rounded-lg flex items-center justify-center text-white font-bold`}>
                                    {task.count}
                                </div>
                                <div>
                                    <p className="font-medium">{task.title}</p>
                                    <p className="text-xs text-slate-500">Requires attention</p>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Actions and Recent Activity */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="card">
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <Link to="/admin/loan-approvals" className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center transition-colors">
                                <span className="text-2xl">✓</span>
                                <p className="font-medium mt-2">Approve Loans</p>
                            </Link>
                            <Link to="/admin/collateral-verification" className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center transition-colors">
                                <span className="text-2xl">🛡️</span>
                                <p className="font-medium mt-2">Verify Collateral</p>
                            </Link>
                            <Link to="/admin/escrow-disputes" className="p-4 bg-red-50 hover:bg-red-100 rounded-lg text-center transition-colors">
                                <span className="text-2xl">⚖️</span>
                                <p className="font-medium mt-2">Resolve Disputes</p>
                            </Link>
                            <Link to="/admin/user-management" className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-center transition-colors">
                                <span className="text-2xl">👤</span>
                                <p className="font-medium mt-2">Manage Users</p>
                            </Link>
                            <Link to="/admin/recovery-management" className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-center transition-colors">
                                <span className="text-2xl">🏦</span>
                                <p className="font-medium mt-2">Recovery</p>
                            </Link>
                            <Link to="/admin/analytics" className="p-4 bg-slate-50 hover:bg-slate-100 rounded-lg text-center transition-colors">
                                <span className="text-2xl">📊</span>
                                <p className="font-medium mt-2">Analytics</p>
                            </Link>
                            <Link to="/admin/fees" className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-center transition-colors">
                                <span className="text-2xl">💵</span>
                                <p className="font-medium mt-2">Fee Controls</p>
                            </Link>
                            <Link to="/admin/bulk-loans" className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center transition-colors">
                                <span className="text-2xl">📋</span>
                                <p className="font-medium mt-2">Bulk Loans</p>
                            </Link>
                            <Link to="/admin/reports" className="p-4 bg-amber-50 hover:bg-amber-100 rounded-lg text-center transition-colors">
                                <span className="text-2xl">📑</span>
                                <p className="font-medium mt-2">Reports</p>
                            </Link>
                            <Link to="/admin/audit-logs" className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center transition-colors">
                                <span className="text-2xl">🛡️</span>
                                <p className="font-medium mt-2">Audit Logs</p>
                            </Link>
                            <Link to="/admin/system-health" className="p-4 bg-cyan-50 hover:bg-cyan-100 rounded-lg text-center transition-colors">
                                <span className="text-2xl">⚡</span>
                                <p className="font-medium mt-2">System Health</p>
                            </Link>
                            <Link to="/admin/reserve-fund" className="p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-center transition-colors">
                                <span className="text-2xl">🏦</span>
                                <p className="font-medium mt-2">Reserve Fund</p>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="card">
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
                        <div className="space-y-3">
                            {recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">
                                            {activity.type === 'loan_approved' && '✓'}
                                            {activity.type === 'kyc_verified' && '🆔'}
                                            {activity.type === 'dispute_opened' && '⚠️'}
                                            {activity.type === 'collateral_verified' && '🏠'}
                                            {activity.type === 'loan_funded' && '💵'}
                                        </span>
                                        <span className="text-sm">{activity.message}</span>
                                    </div>
                                    <span className="text-xs text-slate-500">{activity.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* System Health */}
            <div className="card">
                <div className="p-6">
                    <h2 className="text-lg font-semibold mb-4">System Health</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">LENDA Guarantee Fund</span>
                                <span className="text-green-600 text-sm">✓ Healthy</span>
                            </div>
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.reserveFund)}</div>
                            <p className="text-xs text-slate-500 mt-1">18.4% of total loan volume</p>
                            <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">Smart Contracts</span>
                                <span className="text-green-600 text-sm">✓ Active</span>
                            </div>
                            <div className="text-2xl font-bold">2</div>
                            <p className="text-xs text-slate-500 mt-1">Deployed on network</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">API Services</span>
                                <span className="text-green-600 text-sm">✓ Operational</span>
                            </div>
                            <div className="text-2xl font-bold">99.9%</div>
                            <p className="text-xs text-slate-500 mt-1">Uptime this month</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;
