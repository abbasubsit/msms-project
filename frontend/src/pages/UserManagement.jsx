import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// ─── Role Config ──────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
    super_admin: { label: 'Super Admin', cls: 'bg-purple-100 text-purple-700 border border-purple-200', icon: 'shield_person' },
    pharmacist:  { label: 'Pharmacist',  cls: 'bg-blue-100 text-blue-700 border border-blue-200',       icon: 'medication' },
    sales_staff: { label: 'Sales Staff', cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200', icon: 'point_of_sale' },
};

// ─── Reusable Input ───────────────────────────────────────────────────────────
const FormInput = ({ label, icon, type = 'text', value, onChange, placeholder, required, disabled, readOnly, note, showToggle, show, onToggle }) => (
    <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">{label}</label>
        <div className="relative group">
            {icon && (
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-on-surface-variant text-lg group-focus-within:text-primary transition-colors">{icon}</span>
                </div>
            )}
            <input
                type={showToggle ? (show ? 'text' : 'password') : type}
                className={`w-full ${icon ? 'pl-11' : 'pl-4'} ${showToggle ? 'pr-12' : 'pr-4'} py-3 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/40 text-on-surface transition-all text-sm ${disabled || readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
                disabled={disabled}
                readOnly={readOnly}
            />
            {showToggle && (
                <button type="button" onClick={onToggle} className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined text-lg">{show ? 'visibility_off' : 'visibility'}</span>
                </button>
            )}
        </div>
        {note && <p className="text-[10px] text-on-surface-variant ml-1 mt-0.5">{note}</p>}
    </div>
);

// ─── Stats Card ───────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }) => (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-4 flex items-center gap-3 shadow-sm">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        <div>
            <p className="text-2xl font-bold font-headline text-on-surface">{value ?? '—'}</p>
            <p className="text-xs text-on-surface-variant font-medium">{label}</p>
        </div>
    </div>
);

// ─── Modal Wrapper ────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
        <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-outline-variant/10">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/10">
                <h3 className="font-headline font-bold text-on-surface text-lg">{title}</h3>
                <button onClick={onClose} className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
            <div className="p-6">{children}</div>
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
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* ── Page Header ── */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-headline text-2xl font-bold text-on-surface">User Management</h1>
                    <p className="text-on-surface-variant text-sm mt-1">Manage system users, roles, and access</p>
                </div>
                <button
                    id="add-user-btn"
                    onClick={() => openModal('create')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary-container text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] text-sm"
                >
                    <span className="material-symbols-outlined text-xl">person_add</span>
                    Add User
                </button>
            </div>

            {/* ── Stats ── */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <StatCard icon="group" label="Total Users" value={stats.total} color="bg-primary/10 text-primary" />
                    <StatCard icon="check_circle" label="Active" value={stats.active} color="bg-emerald-100 text-emerald-600" />
                    <StatCard icon="cancel" label="Inactive" value={stats.inactive} color="bg-red-100 text-red-500" />
                    <StatCard icon="shield_person" label="Super Admin" value={stats.byRole.super_admin} color="bg-purple-100 text-purple-600" />
                    <StatCard icon="medication" label="Pharmacists" value={stats.byRole.pharmacist} color="bg-blue-100 text-blue-600" />
                    <StatCard icon="point_of_sale" label="Sales Staff" value={stats.byRole.sales_staff} color="bg-amber-100 text-amber-600" />
                </div>
            )}

            {/* ── Filters ── */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-4 mb-6 flex flex-wrap gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-48">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
                    <input
                        type="text"
                        placeholder="Search name, email, phone..."
                        className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border-none rounded-lg text-sm focus:ring-1 focus:ring-primary/40 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Role Filter */}
                <select
                    className="px-3 py-2.5 bg-surface-container-low border-none rounded-lg text-sm focus:ring-1 focus:ring-primary/40 text-on-surface min-w-36"
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
                    className="px-3 py-2.5 bg-surface-container-low border-none rounded-lg text-sm focus:ring-1 focus:ring-primary/40 text-on-surface min-w-36"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                </select>

                <button onClick={fetchUsers} className="px-4 py-2.5 bg-primary/10 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">refresh</span>
                    Refresh
                </button>
            </div>

            {/* ── Users Table ── */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <span className="material-symbols-outlined text-red-400 text-4xl mb-3">error</span>
                        <p className="text-on-surface font-semibold">{error}</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-3">group_off</span>
                        <p className="text-on-surface font-semibold">No users found</p>
                        <p className="text-on-surface-variant text-sm mt-1">Try adjusting your filters or add a new user</p>
                    </div>
                ) : (
                    <>
                        {/* Table Header */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-outline-variant/10 bg-surface-container-low">
                                        {['User', 'Role', 'Status', 'Last Login', 'Created By', 'Actions'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/5">
                                    {users.map(u => {
                                        const role = ROLE_CONFIG[u.role] || ROLE_CONFIG.sales_staff;
                                        return (
                                            <tr key={u._id} className="hover:bg-surface-container-low/50 transition-colors group">
                                                {/* User info */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                            <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-on-surface truncate max-w-[140px]">{u.fullName}</p>
                                                            <p className="text-xs text-on-surface-variant truncate max-w-[140px]">{u.email}</p>
                                                            <p className="text-xs text-on-surface-variant">{u.phone}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role Badge */}
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${role.cls}`}>
                                                        <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>{role.icon}</span>
                                                        {role.label}
                                                    </span>
                                                </td>

                                                {/* Status Toggle */}
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => u.role !== 'super_admin' && handleToggleStatus(u)}
                                                        disabled={u.role === 'super_admin'}
                                                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-200 focus:outline-none ${u.isActive ? 'bg-emerald-500' : 'bg-slate-300'} ${u.role === 'super_admin' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                                        title={u.role === 'super_admin' ? 'Cannot deactivate super_admin' : (u.isActive ? 'Click to deactivate' : 'Click to activate')}
                                                    >
                                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${u.isActive ? 'translate-x-5' : 'translate-x-0.5'}`}></span>
                                                    </button>
                                                    <span className={`ml-2 text-xs font-medium ${u.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                        {u.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>

                                                {/* Last Login */}
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-on-surface-variant">
                                                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                                                    </span>
                                                    {u.isFirstLogin && (
                                                        <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
                                                            <span className="material-symbols-outlined text-[10px]">warning</span>
                                                            First Login
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Created By */}
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-on-surface-variant">
                                                        {u.createdBy?.fullName || 'System'}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {/* Edit */}
                                                        <button
                                                            onClick={() => openModal('edit', u)}
                                                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                                                            title="Edit user"
                                                        >
                                                            <span className="material-symbols-outlined text-base">edit</span>
                                                        </button>

                                                        {/* Reset Password */}
                                                        <button
                                                            onClick={() => openModal('resetPw', u)}
                                                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                                            title="Reset password"
                                                        >
                                                            <span className="material-symbols-outlined text-base">lock_reset</span>
                                                        </button>

                                                        {/* Delete (disabled for super_admin) */}
                                                        {u.role !== 'super_admin' && (
                                                            <button
                                                                onClick={() => openModal('delete', u)}
                                                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-600 hover:bg-red-50 transition-colors"
                                                                title="Deactivate user"
                                                            >
                                                                <span className="material-symbols-outlined text-base">person_off</span>
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
                            <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/10">
                                <p className="text-xs text-on-surface-variant">
                                    Showing {((pagination.currentPage - 1) * pagination.limit) + 1}–{Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount} users
                                </p>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-base">chevron_left</span>
                                    </button>
                                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                        disabled={page === pagination.totalPages}
                                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                    <form onSubmit={handleCreate} className="space-y-4">
                        {formError && (
                            <div className="bg-error-container text-on-error-container p-3 rounded-xl text-sm flex items-center gap-2">
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
                            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Role</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">badge</span>
                                <select
                                    className="w-full pl-11 pr-10 py-3 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/40 text-on-surface text-sm appearance-none"
                                    value={form.role}
                                    onChange={e => setForm({ ...form, role: e.target.value })}
                                    required
                                >
                                    <option value="pharmacist">Pharmacist</option>
                                    <option value="sales_staff">Sales Staff</option>
                                    {/* super_admin NOT listed — only 1 allowed, created via seeder */}
                                </select>
                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={formLoading}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary to-primary-container text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 text-sm">
                                {formLoading ? <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : <span className="material-symbols-outlined text-lg">person_add</span>}
                                {formLoading ? 'Creating...' : 'Create User'}
                            </button>
                            <button type="button" onClick={closeModal}
                                className="px-4 py-3 border border-outline-variant text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container transition-colors text-sm">
                                Cancel
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Edit User Modal */}
            {modal === 'edit' && selectedUser && (
                <Modal title="Edit User" onClose={closeModal}>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        {formError && (
                            <div className="bg-error-container text-on-error-container p-3 rounded-xl text-sm flex items-center gap-2">
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
                                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Role</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">badge</span>
                                    <select
                                        className="w-full pl-11 pr-10 py-3 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/40 text-on-surface text-sm appearance-none"
                                        value={form.role}
                                        onChange={e => setForm({ ...form, role: e.target.value })}
                                    >
                                        <option value="pharmacist">Pharmacist</option>
                                        <option value="sales_staff">Sales Staff</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={formLoading}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-container transition-colors disabled:opacity-60 text-sm">
                                {formLoading && <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                                {formLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button type="button" onClick={closeModal}
                                className="px-4 py-3 border border-outline-variant text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container transition-colors text-sm">
                                Cancel
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {modal === 'delete' && selectedUser && (
                <Modal title="Deactivate User" onClose={closeModal}>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                            <span className="material-symbols-outlined text-yellow-600 text-xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                            <div>
                                <p className="text-sm font-semibold text-yellow-800">Soft Delete (Deactivate)</p>
                                <p className="text-xs text-yellow-700 mt-0.5">
                                    The user <strong>{selectedUser.fullName}</strong> will be deactivated and will not be able to log in. Their data will be preserved.
                                </p>
                            </div>
                        </div>

                        {formError && (
                            <div className="bg-error-container text-on-error-container p-3 rounded-xl text-sm">{formError}</div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={handleDelete} disabled={formLoading}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60 text-sm">
                                {formLoading && <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                                <span className="material-symbols-outlined text-lg">person_off</span>
                                {formLoading ? 'Deactivating...' : 'Deactivate User'}
                            </button>
                            <button onClick={closeModal}
                                className="px-4 py-3 border border-outline-variant text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container transition-colors text-sm">
                                Cancel
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Reset Password Confirmation Modal */}
            {modal === 'resetPw' && selectedUser && (
                <Modal title="Reset Password" onClose={closeModal}>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <span className="material-symbols-outlined text-blue-600 text-xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                            <div>
                                <p className="text-sm font-semibold text-blue-800">Reset Password for {selectedUser.fullName}</p>
                                <p className="text-xs text-blue-700 mt-0.5">
                                    A random temporary password will be generated. The user will be required to change it on next login.
                                </p>
                            </div>
                        </div>

                        {formError && (
                            <div className="bg-error-container text-on-error-container p-3 rounded-xl text-sm">{formError}</div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={handleResetPassword} disabled={formLoading}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 text-sm">
                                {formLoading && <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                                <span className="material-symbols-outlined text-lg">lock_reset</span>
                                {formLoading ? 'Resetting...' : 'Reset Password'}
                            </button>
                            <button onClick={closeModal}
                                className="px-4 py-3 border border-outline-variant text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container transition-colors text-sm">
                                Cancel
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Temp Password Display Modal */}
            {modal === 'tempPw' && tempPassword && (
                <Modal title="Temporary Password Generated" onClose={closeModal}>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                            <span className="material-symbols-outlined text-green-600 text-xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            <p className="text-sm text-green-800">Password reset successfully. Share this temporary password with the user.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Temporary Password</label>
                            <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-4 py-3">
                                <span className="material-symbols-outlined text-primary text-lg">key</span>
                                <span className="font-mono text-on-surface font-bold tracking-widest flex-1 select-all">{tempPassword}</span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(tempPassword)}
                                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                                    title="Copy to clipboard"
                                >
                                    <span className="material-symbols-outlined text-base">content_copy</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-2">
                            <span className="material-symbols-outlined text-yellow-600 text-base mt-0.5">warning</span>
                            <p className="text-xs text-yellow-800">This password will NOT be shown again. Copy it now and share it securely with the user.</p>
                        </div>

                        <button onClick={closeModal}
                            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-container transition-colors text-sm">
                            Done
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default UserManagement;
