import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// ─── Role Config ──────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
    super_admin: { label: 'Super Admin', cls: 'bg-purple-50 text-purple-700 border border-purple-100/50', icon: 'shield_person' },
    pharmacist:  { label: 'Pharmacist',  cls: 'bg-blue-50 text-blue-700 border border-blue-100/50',       icon: 'medication' },
    sales_staff: { label: 'Sales Staff', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100/50', icon: 'point_of_sale' },
};

// ─── Reusable Input ───────────────────────────────────────────────────────────
const FormInput = ({ label, icon, type = 'text', value, onChange, placeholder, required, disabled, readOnly, note, showToggle, show, onToggle }) => (
    <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider ml-1">{label}</label>
        <div className="relative group">
            {icon && (
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-lg group-focus-within:text-cyan-600 transition-colors">{icon}</span>
                </div>
            )}
            <input
                type={showToggle ? (show ? 'text' : 'password') : type}
                className={`w-full ${icon ? 'pl-11' : 'pl-4'} ${showToggle ? 'pr-12' : 'pr-4'} py-3.5 bg-slate-50 text-slate-700 text-xs border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl outline-none transition-all placeholder:text-slate-400 font-medium ${disabled || readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
                disabled={disabled}
                readOnly={readOnly}
            />
            {showToggle && (
                <button type="button" onClick={onToggle} className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors">
                    <span className="material-symbols-outlined text-lg">{show ? 'visibility_off' : 'visibility'}</span>
                </button>
            )}
        </div>
        {note && <p className="text-[10px] text-slate-400 ml-1 mt-1 font-medium leading-relaxed">{note}</p>}
    </div>
);

// ─── Stats Card ───────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }) => (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${color}`}>
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        <div>
            <p className="text-xl font-black text-slate-800 leading-none">{value ?? '—'}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">{label}</p>
        </div>
    </div>
);

// ─── Modal Wrapper ────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-extrabold text-slate-800 text-base font-headline">{title}</h3>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
            </div>
            <div className="p-8 flex-1">{children}</div>
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const UserManagement = () => {
    // ── State ─────────────────────────────────────────────────────────────────
    const [users, setUsers]           = useState([]);
    const [stats, setStats]           = useState(null);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState(null);

    // Filters & Pagination
    const [search, setSearch]         = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage]             = useState(1);
    const [pagination, setPagination] = useState({});

    // Modals
    const [modal, setModal]           = useState(null); // 'create' | 'edit' | 'delete' | 'resetPw' | 'tempPw'
    const [selectedUser, setSelectedUser] = useState(null);

    // Form state
    const [form, setForm]             = useState({ fullName: '', email: '', phone: '', password: '', role: 'sales_staff' });
    const [formError, setFormError]   = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Temp password after reset
    const [tempPassword, setTempPassword] = useState(null);

    // ── Fetch Data ────────────────────────────────────────────────────────────
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page, limit: 10 });
            if (search)       params.set('search', search);
            if (filterRole)   params.set('role', filterRole);
            if (filterStatus !== '') params.set('isActive', filterStatus);

            const [usersRes, statsRes] = await Promise.all([
                api.get(`/users?${params}`),
                api.get('/users/stats'),
            ]);
            setUsers(usersRes.data.users);
            setPagination(usersRes.data.pagination);
            setStats(statsRes.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [page, search, filterRole, filterStatus]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // Reset page on filter change
    useEffect(() => { setPage(1); }, [search, filterRole, filterStatus]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const openModal = (type, user = null) => {
        setSelectedUser(user);
        setFormError(null);
        setForm(user
            ? { fullName: user.fullName, email: user.email, phone: user.phone, password: '', role: user.role }
            : { fullName: '', email: '', phone: '', password: '', role: 'sales_staff' }
        );
        setModal(type);
    };

    const closeModal = () => { setModal(null); setSelectedUser(null); setFormError(null); setTempPassword(null); };

    // ── CRUD Handlers ─────────────────────────────────────────────────────────

    // Create user
    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError(null);
        setFormLoading(true);
        try {
            await api.post('/users', form);
            closeModal();
            fetchUsers();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to create user');
        } finally {
            setFormLoading(false);
        }
    };

    // Update user
    const handleUpdate = async (e) => {
        e.preventDefault();
        setFormError(null);
        setFormLoading(true);
        try {
            await api.put(`/users/${selectedUser._id}`, {
                fullName: form.fullName,
                phone: form.phone,
                role: form.role,
            });
            closeModal();
            fetchUsers();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to update user');
        } finally {
            setFormLoading(false);
        }
    };

    // Toggle status
    const handleToggleStatus = async (user) => {
        try {
            await api.patch(`/users/${user._id}/status`);
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to toggle status');
        }
    };

    // Delete (soft)
    const handleDelete = async () => {
        setFormLoading(true);
        try {
            await api.delete(`/users/${selectedUser._id}`);
            closeModal();
            fetchUsers();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to delete user');
        } finally {
            setFormLoading(false);
        }
    };

    // Reset password
    const handleResetPassword = async () => {
        setFormLoading(true);
        try {
            const res = await api.put(`/users/${selectedUser._id}/reset-password`);
            setTempPassword(res.data.tempPassword);
            setModal('tempPw');
            fetchUsers();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setFormLoading(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="p-8 lg:p-12 space-y-10 animate-fade-in font-body bg-slate-50 text-slate-800 min-h-screen">
            {/* ── Page Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-805 tracking-tight font-headline">User Directory</h2>
                    <p className="text-slate-405 mt-1 text-xs font-semibold tracking-wide uppercase">Manage system users, roles, and access controls</p>
                </div>
                <button
                    id="add-user-btn"
                    onClick={() => openModal('create')}
                    className="flex items-center gap-2 px-5 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl shadow-lg shadow-cyan-600/15 transition-all active:scale-[0.98] text-xs uppercase tracking-wider"
                >
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    Add New User
                </button>
            </div>

            {/* ── Stats ── */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
                    <StatCard icon="group" label="Total Users" value={stats.total} color="bg-cyan-50 text-cyan-600" />
                    <StatCard icon="check_circle" label="Active" value={stats.active} color="bg-emerald-50 text-emerald-600" />
                    <StatCard icon="cancel" label="Inactive" value={stats.inactive} color="bg-rose-50 text-rose-600" />
                    <StatCard icon="shield_person" label="Super Admin" value={stats.byRole.super_admin} color="bg-purple-50 text-purple-650" />
                    <StatCard icon="medication" label="Pharmacists" value={stats.byRole.pharmacist} color="bg-blue-50 text-blue-650" />
                    <StatCard icon="point_of_sale" label="Sales Staff" value={stats.byRole.sales_staff} color="bg-amber-50 text-amber-650" />
                </div>
            )}

            {/* ── Filters ── */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-wrap gap-4 shadow-sm items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-48">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Search by name, email, phone..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 text-slate-700 text-xs border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-505/10 rounded-2xl outline-none transition-all placeholder:text-slate-400 font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Role Filter */}
                <select
                    className="px-4 py-3 bg-slate-50 text-slate-705 text-xs border border-slate-200 focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-2xl font-bold transition-all min-w-36"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                >
                    <option value="">All Roles</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="pharmacist">Pharmacist</option>
                    <option value="sales_staff">Sales Staff</option>
                </select>

                {/* Status Filter */}
                <select
                    className="px-4 py-3 bg-slate-50 text-slate-705 text-xs border border-slate-200 focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-2xl font-bold transition-all min-w-36"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="">All Statuses</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                </select>

                <button onClick={fetchUsers} className="px-5 py-3 bg-slate-105 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95">
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    Refresh
                </button>
            </div>

            {/* ── Users Table ── */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <span className="material-symbols-outlined text-4xl text-cyan-600 mb-4 animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <span className="material-symbols-outlined text-rose-450 text-4xl mb-3">error</span>
                        <p className="text-slate-800 font-semibold">{error}</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <span className="material-symbols-outlined text-slate-350 text-4xl mb-3">group_off</span>
                        <p className="text-slate-800 font-semibold">No users found</p>
                        <p className="text-slate-400 text-xs mt-1">Try adjusting your filters or add a new user</p>
                    </div>
                ) : (
                    <>
                        {/* Table Header */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100">
                                        {['User Details', 'Access Role', 'Access Status', 'Last Activity', 'Registered By', 'Actions'].map(h => (
                                            <th key={h} className="px-6 py-4.5 text-[10px] font-bold text-slate-405 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                                    {users.map(u => {
                                        const role = ROLE_CONFIG[u.role] || ROLE_CONFIG.sales_staff;
                                        return (
                                            <tr key={u._id} className="hover:bg-slate-50/30 transition-colors border-l-2 border-l-transparent hover:border-l-cyan-500 group">
                                                {/* User info */}
                                                <td className="px-6 py-4.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                                                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-extrabold text-slate-800 truncate max-w-[160px] leading-tight">{u.fullName}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[160px] mt-0.5">{u.email}</p>
                                                            {u.phone && <p className="text-[10px] text-slate-405 font-medium mt-0.5">{u.phone}</p>}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role Badge */}
                                                <td className="px-6 py-4.5">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${role.cls}`}>
                                                        <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>{role.icon}</span>
                                                        {role.label}
                                                    </span>
                                                </td>

                                                {/* Status Toggle */}
                                                <td className="px-6 py-4.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <button
                                                            onClick={() => u.role !== 'super_admin' && handleToggleStatus(u)}
                                                            disabled={u.role === 'super_admin'}
                                                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${u.isActive ? 'bg-emerald-500' : 'bg-slate-200'} ${u.role === 'super_admin' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                                            title={u.role === 'super_admin' ? 'Cannot deactivate super_admin' : (u.isActive ? 'Click to deactivate' : 'Click to activate')}
                                                        >
                                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${u.isActive ? 'translate-x-[18px]' : 'translate-x-0.5'}`}></span>
                                                        </button>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${u.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                            {u.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Last Login */}
                                                <td className="px-6 py-4.5">
                                                    <div className="text-slate-700">
                                                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'}) : 'Never'}
                                                    </div>
                                                    {u.isFirstLogin && (
                                                        <span className="mt-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 text-[8px] font-extrabold uppercase tracking-wider">
                                                            <span className="material-symbols-outlined text-[10px]">warning</span>
                                                            First Login
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Created By */}
                                                <td className="px-6 py-4.5 text-slate-500">
                                                    {u.createdBy?.fullName || 'System'}
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-4.5">
                                                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        {/* Edit */}
                                                        <button
                                                            onClick={() => openModal('edit', u)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                                                            title="Edit user"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                                        </button>

                                                        {/* Reset Password */}
                                                        <button
                                                            onClick={() => openModal('resetPw', u)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                                            title="Reset password"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                                                        </button>

                                                        {/* Delete (disabled for super_admin) */}
                                                        {u.role !== 'super_admin' && (
                                                            <button
                                                                onClick={() => openModal('delete', u)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                                title="Deactivate user"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">person_off</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100">
                                <p className="text-xs text-slate-400 font-semibold">
                                    Showing {((pagination.currentPage - 1) * pagination.limit) + 1}–{Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount} users
                                </p>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        <span className="material-symbols-outlined text-base">chevron_left</span>
                                    </button>
                                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${p === page ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                        disabled={page === pagination.totalPages}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        <span className="material-symbols-outlined text-base">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ─────────────────────────── MODALS ─────────────────────────────── */}

            {/* Create User Modal */}
            {modal === 'create' && (
                <Modal title="Add New User" onClose={closeModal}>
                    <form onSubmit={handleCreate} className="space-y-5">
                        {formError && (
                            <div className="bg-rose-50 text-rose-600 border border-rose-100 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">error</span>
                                {formError}
                            </div>
                        )}

                        <FormInput label="Full Name" icon="person" value={form.fullName}
                            onChange={e => setForm({ ...form, fullName: e.target.value })}
                            placeholder="e.g. John Doe" required />

                        <FormInput label="Email Address" icon="email" type="email" value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            placeholder="john@pharmacy.com" required />

                        <FormInput label="Phone Number" icon="phone" type="tel" value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                            placeholder="0300-1234567" required />

                        <FormInput label="Temporary Password" icon="lock" value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            placeholder="Min. 6 characters" required
                            showToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)}
                            note="User will be prompted to change this on first login" />

                        {/* Role */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider ml-1">Role</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">badge</span>
                                <select
                                    className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-205 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl focus:outline-none text-slate-700 text-xs font-bold appearance-none transition-all"
                                    value={form.role}
                                    onChange={e => setForm({ ...form, role: e.target.value })}
                                    required
                                >
                                    <option value="pharmacist">Pharmacist</option>
                                    <option value="sales_staff">Sales Staff</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-100">
                            <button type="submit" disabled={formLoading}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-md shadow-cyan-650/10 transition-all active:scale-[0.98] disabled:opacity-60 text-xs uppercase tracking-wider">
                                {formLoading ? <span className="material-symbols-outlined text-sm animate-spin">autorenew</span> : <span className="material-symbols-outlined text-lg">person_add</span>}
                                {formLoading ? 'Creating...' : 'Create User'}
                            </button>
                            <button type="button" onClick={closeModal}
                                className="px-5 py-3 border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-colors text-xs">
                                Cancel
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Edit User Modal */}
            {modal === 'edit' && selectedUser && (
                <Modal title="Edit User" onClose={closeModal}>
                    <form onSubmit={handleUpdate} className="space-y-5">
                        {formError && (
                            <div className="bg-rose-50 text-rose-600 border border-rose-100 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">error</span>
                                {formError}
                            </div>
                        )}

                        <FormInput label="Full Name" icon="person" value={form.fullName}
                            onChange={e => setForm({ ...form, fullName: e.target.value })}
                            placeholder="Full name" required />

                        <FormInput label="Email Address" icon="email" type="email" value={form.email}
                            readOnly note="Email cannot be changed" />

                        <FormInput label="Phone Number" icon="phone" type="tel" value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                            placeholder="Phone number" />

                        {/* Role (disabled for super_admin) */}
                        {selectedUser.role !== 'super_admin' && (
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider ml-1">Role</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">badge</span>
                                    <select
                                        className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-205 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl focus:outline-none text-slate-700 text-xs font-bold appearance-none transition-all"
                                        value={form.role}
                                        onChange={e => setForm({ ...form, role: e.target.value })}
                                    >
                                        <option value="pharmacist">Pharmacist</option>
                                        <option value="sales_staff">Sales Staff</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4 border-t border-slate-100">
                            <button type="submit" disabled={formLoading}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-md shadow-cyan-650/10 transition-all active:scale-[0.98] disabled:opacity-60 text-xs uppercase tracking-wider">
                                {formLoading && <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>}
                                {formLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button type="button" onClick={closeModal}
                                className="px-5 py-3 border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-colors text-xs">
                                Cancel
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {modal === 'delete' && selectedUser && (
                <Modal title="Deactivate User" onClose={closeModal}>
                    <div className="space-y-5">
                        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
                            <span className="material-symbols-outlined text-yellow-605 text-xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                            <div>
                                <p className="text-xs font-extrabold text-yellow-800 uppercase tracking-wider">Soft Delete (Deactivate)</p>
                                <p className="text-xs text-yellow-700 mt-1 font-semibold leading-relaxed">
                                    The user <strong>{selectedUser.fullName}</strong> will be deactivated and will not be able to log in. Their data will be preserved.
                                </p>
                            </div>
                        </div>

                        {formError && (
                            <div className="bg-rose-50 text-rose-600 border border-rose-100 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">{formError}</div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button onClick={handleDelete} disabled={formLoading}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-650 text-white font-bold rounded-xl transition-all disabled:opacity-60 text-xs uppercase tracking-wider shadow-md shadow-red-500/10 active:scale-95">
                                {formLoading ? <span className="material-symbols-outlined text-sm animate-spin">autorenew</span> : <span className="material-symbols-outlined text-lg">person_off</span>}
                                {formLoading ? 'Deactivating...' : 'Deactivate User'}
                            </button>
                            <button onClick={closeModal}
                                className="px-5 py-3 border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-55 transition-colors text-xs">
                                Cancel
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Reset Password Confirmation Modal */}
            {modal === 'resetPw' && selectedUser && (
                <Modal title="Reset Password" onClose={closeModal}>
                    <div className="space-y-5">
                        <div className="flex items-start gap-3 bg-cyan-50 border border-cyan-100 rounded-2xl p-4">
                            <span className="material-symbols-outlined text-cyan-600 text-xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                            <div>
                                <p className="text-xs font-extrabold text-cyan-800 uppercase tracking-wider">Reset Password for {selectedUser.fullName}</p>
                                <p className="text-xs text-cyan-705 mt-1 font-semibold leading-relaxed">
                                    A random temporary password will be generated. The user will be required to change it on next login.
                                </p>
                            </div>
                        </div>

                        {formError && (
                            <div className="bg-rose-50 text-rose-605 border border-rose-100 p-4 rounded-2xl text-xs font-bold">{formError}</div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button onClick={handleResetPassword} disabled={formLoading}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all disabled:opacity-60 text-xs uppercase tracking-wider shadow-md shadow-amber-500/10 active:scale-95">
                                {formLoading ? <span className="material-symbols-outlined text-sm animate-spin">autorenew</span> : <span className="material-symbols-outlined text-lg">lock_reset</span>}
                                {formLoading ? 'Resetting...' : 'Reset Password'}
                            </button>
                            <button onClick={closeModal}
                                className="px-5 py-3 border border-slate-200 text-slate-505 font-bold rounded-xl hover:bg-slate-50 transition-colors text-xs">
                                Cancel
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Temp Password Display Modal */}
            {modal === 'tempPw' && tempPassword && (
                <Modal title="Temporary Password Generated" onClose={closeModal}>
                    <div className="space-y-5">
                        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                            <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            <p className="text-xs text-emerald-800 font-semibold leading-relaxed">Password reset successfully. Share this temporary password with the user.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider ml-1">Temporary Password</label>
                            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                <span className="material-symbols-outlined text-cyan-600 text-lg">key</span>
                                <span className="font-mono text-slate-800 font-black tracking-widest flex-1 select-all text-xs">{tempPassword}</span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(tempPassword);
                                        alert('Temporary password copied to clipboard!');
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-cyan-650 hover:bg-cyan-50 transition-colors"
                                    title="Copy to clipboard"
                                >
                                    <span className="material-symbols-outlined text-base">content_copy</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-2.5">
                            <span className="material-symbols-outlined text-amber-600 text-base mt-0.5">warning</span>
                            <p className="text-[10px] text-amber-800 font-semibold leading-relaxed">This password will NOT be shown again. Copy it now and share it securely with the user.</p>
                        </div>

                        <button onClick={closeModal}
                            className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition-colors text-xs uppercase tracking-wider shadow-md shadow-cyan-600/10 active:scale-95">
                            Done
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default UserManagement;
