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
        super_admin:  { label: 'Super Admin',  cls: 'bg-purple-50 text-purple-700 border border-purple-100/50' },
        pharmacist:   { label: 'Pharmacist',   cls: 'bg-blue-50 text-blue-700 border border-blue-100/50' },
        sales_staff:  { label: 'Sales Staff',  cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' },
    };

    const badge = roleBadge[profile?.role] || roleBadge.sales_staff;

    if (profileLoading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 font-body">
                <span className="material-symbols-outlined text-4xl text-cyan-600 mb-4 animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                <p className="font-bold text-xs text-slate-400 uppercase tracking-widest">Loading Account Settings...</p>
            </div>
        );
    }

    return (
        <div className="p-8 lg:p-12 space-y-10 animate-fade-in font-body bg-slate-50 text-slate-800 min-h-screen max-w-4xl mx-auto">
            <div className="border-b border-slate-100 pb-8">
                <h2 className="text-3xl font-black text-slate-805 tracking-tight font-headline">My Profile</h2>
                <p className="text-slate-405 mt-1 text-xs font-semibold tracking-wide uppercase">Manage your personal information and security credentials</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/50 border border-slate-100 overflow-hidden">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/10 h-28 relative">
                    <div className="absolute -bottom-8 left-8">
                        <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                            <span className="material-symbols-outlined text-cyan-600 text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                        </div>
                    </div>
                </div>

                <div className="pt-14 px-8 pb-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2">
                            <h2 className="font-headline text-xl font-extrabold text-slate-800 leading-tight">{profile?.fullName}</h2>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badge.cls}`}>
                                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                                    {badge.label}
                                </span>
                                {profile?.isActive ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-705 border border-emerald-100/50">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        Active
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-100/50">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                        Inactive
                                    </span>
                                )}
                            </div>
                        </div>
                        {!editMode && (
                            <button 
                                onClick={() => setEditMode(true)}
                                className="px-4.5 py-2.5 bg-slate-50 hover:bg-cyan-600 hover:text-white border border-slate-205 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 active:scale-95 duration-300"
                            >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                Edit Profile Details
                            </button>
                        )}
                    </div>

                    {/* Info Grid */}
                    {!editMode ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {[
                                { icon: 'email',       label: 'Email Address',      value: profile?.email,     note: 'Cannot be changed' },
                                { icon: 'phone',       label: 'Phone Line',      value: profile?.phone },
                                { icon: 'person',      label: 'Full Name',  value: profile?.fullName },
                                { icon: 'schedule',    label: 'Last Login Activity', value: profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'N/A' },
                                { icon: 'calendar_today', label: 'Member Since', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, {month:'long', day:'numeric', year:'numeric'}) : 'N/A' },
                                { icon: 'manage_accounts', label: 'Registered By', value: profile?.createdBy?.fullName || 'System' },
                            ].map(item => (
                                <div key={item.label} className="flex items-start gap-3.5 p-4 bg-slate-50/70 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors duration-300">
                                    <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.label}</p>
                                        <p className="text-xs font-extrabold text-slate-750 truncate mt-1 leading-tight">{item.value || '—'}</p>
                                        {item.note && <p className="text-[9px] text-slate-400 font-medium mt-1 leading-relaxed">{item.note}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Edit Form */
                        <form onSubmit={handleEditSubmit} className="space-y-5 animate-fade-in">
                            {editError && (
                                <div className="bg-rose-50 text-rose-600 border border-rose-100 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">error</span>
                                    {editError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3.5 bg-slate-50 text-slate-750 text-xs border border-slate-205 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl outline-none transition-all placeholder:text-slate-400 font-bold"
                                        value={editData.fullName}
                                        onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                                        placeholder="Your full name"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider ml-1">Phone</label>
                                    <input
                                        type="tel"
                                        className="w-full px-4 py-3.5 bg-slate-50 text-slate-750 text-xs border border-slate-205 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl outline-none transition-all placeholder:text-slate-400 font-bold"
                                        value={editData.phone}
                                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                        placeholder="Your phone number"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button 
                                    type="submit" 
                                    disabled={editLoading}
                                    className="flex-1 py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-xs shadow-md shadow-cyan-600/10 transition-all flex justify-center items-center gap-1.5 uppercase tracking-wider active:scale-95 disabled:opacity-60"
                                >
                                    {editLoading && <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>}
                                    {editLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => { setEditMode(false); setEditError(null); }}
                                    className="px-5 py-3 border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-colors text-xs"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}

                    {editSuccess && !editMode && (
                        <div className="bg-emerald-50 text-emerald-705 border border-emerald-100/50 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            {editSuccess}
                        </div>
                    )}
                </div>
            </div>

            {/* Security Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 p-8 space-y-6">
                <h3 className="font-headline font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-4">
                    <span className="material-symbols-outlined text-cyan-605" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                    Account Security settings
                </h3>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[20px]">lock</span>
                        </div>
                        <div>
                            <p className="text-xs font-extrabold text-slate-800">Password manager</p>
                            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-1">Update your account password</p>
                        </div>
                    </div>
                    <Link 
                        to="/change-password"
                        className="px-4.5 py-2.5 bg-slate-100 hover:bg-cyan-600 hover:text-white border border-slate-205 text-slate-700 text-xs font-bold rounded-xl transition-all active:scale-95 duration-305 flex items-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                        Change Password
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Profile;
