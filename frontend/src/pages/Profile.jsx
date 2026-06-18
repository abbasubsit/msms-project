import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const Profile = () => {
    const { user, updateProfile, changePassword } = useContext(AuthContext);

    const [profile, setProfile]         = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [editMode, setEditMode]       = useState(false);
    const [editData, setEditData]       = useState({ fullName: '', phone: '' });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError]     = useState(null);
    const [editSuccess, setEditSuccess] = useState(null);

    // Fetch full profile from API
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/auth/profile');
                setProfile(res.data.user);
                setEditData({ fullName: res.data.user.fullName, phone: res.data.user.phone });
            } catch { /* handled by interceptor */ }
            finally { setProfileLoading(false); }
        };
        fetchProfile();
    }, []);

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setEditError(null);
        setEditSuccess(null);
        setEditLoading(true);
        const res = await updateProfile(editData);
        setEditLoading(false);
        if (res.success) {
            setProfile(res.user);
            setEditSuccess('Profile updated successfully!');
            setEditMode(false);
        } else {
            setEditError(res.message);
        }
    };

    const roleBadge = {
        super_admin:  { label: 'Super Admin',  cls: 'bg-purple-100 text-purple-700 border-purple-200' },
        pharmacist:   { label: 'Pharmacist',   cls: 'bg-blue-100 text-blue-700 border-blue-200' },
        sales_staff:  { label: 'Sales Staff',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    };

    const badge = roleBadge[profile?.role] || roleBadge.sales_staff;

    if (profileLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <div className="mb-8">
                <h1 className="font-headline text-2xl font-bold text-on-surface">My Profile</h1>
                <p className="text-on-surface-variant text-sm mt-1">Manage your personal information</p>
            </div>

            {/* Profile Card */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-ambient border border-outline-variant/10 overflow-hidden mb-6">
                {/* Header Banner */}
                <div className="clinical-gradient h-24 relative">
                    <div className="absolute -bottom-8 left-8">
                        <div className="w-16 h-16 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                        </div>
                    </div>
                </div>

                <div className="pt-12 px-8 pb-8">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="font-headline text-xl font-bold text-on-surface">{profile?.fullName}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.cls}`}>
                                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                                    {badge.label}
                                </span>
                                {profile?.isActive ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                        Active
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                        Inactive
                                    </span>
                                )}
                            </div>
                        </div>
                        {!editMode && (
                            <button onClick={() => setEditMode(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors">
                                <span className="material-symbols-outlined text-base">edit</span>
                                Edit Profile
                            </button>
                        )}
                    </div>

                    {/* Info Grid */}
                    {!editMode ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { icon: 'email',       label: 'Email',      value: profile?.email,     note: 'Cannot be changed' },
                                { icon: 'phone',       label: 'Phone',      value: profile?.phone },
                                { icon: 'person',      label: 'Full Name',  value: profile?.fullName },
                                { icon: 'schedule',    label: 'Last Login', value: profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'N/A' },
                                { icon: 'calendar_today', label: 'Member Since', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A' },
                                { icon: 'manage_accounts', label: 'Created By', value: profile?.createdBy?.fullName || 'System' },
                            ].map(item => (
                                <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="material-symbols-outlined text-primary text-base">{item.icon}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-on-surface-variant font-medium">{item.label}</p>
                                        <p className="text-sm font-semibold text-on-surface truncate">{item.value || '—'}</p>
                                        {item.note && <p className="text-[10px] text-on-surface-variant mt-0.5">{item.note}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Edit Form */
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            {editError && (
                                <div className="bg-error-container text-on-error-container p-3 rounded-xl text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">error</span>
                                    {editError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/40 text-on-surface transition-all"
                                        value={editData.fullName}
                                        onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                                        placeholder="Your full name"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Phone</label>
                                    <input
                                        type="tel"
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/40 text-on-surface transition-all"
                                        value={editData.phone}
                                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                        placeholder="Your phone number"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={editLoading}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-container transition-colors disabled:opacity-60 text-sm">
                                    {editLoading && <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                                    {editLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button type="button" onClick={() => { setEditMode(false); setEditError(null); }}
                                    className="px-6 py-2.5 border border-outline-variant text-on-surface-variant font-semibold rounded-xl hover:bg-surface-container transition-colors text-sm">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}

                    {editSuccess && !editMode && (
                        <div className="mt-4 bg-green-50 text-green-800 border border-green-200 p-3 rounded-xl text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            {editSuccess}
                        </div>
                    )}
                </div>
            </div>

            {/* Security Card */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-ambient border border-outline-variant/10 p-6">
                <h3 className="font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                    Security
                </h3>
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary">lock</span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-on-surface">Password</p>
                            <p className="text-xs text-on-surface-variant">Update your account password</p>
                        </div>
                    </div>
                    <Link to="/change-password"
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-base">lock_reset</span>
                        Change
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Profile;
