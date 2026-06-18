import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ChangePassword = () => {
    const { changePassword, user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [form, setForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [error, setError]   = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showCurrent, setShowCurrent]   = useState(false);
    const [showNew, setShowNew]           = useState(false);
    const [showConfirm, setShowConfirm]   = useState(false);

    // Password strength calculator
    const getStrength = (pwd) => {
        let score = 0;
        if (pwd.length >= 6)  score++;
        if (pwd.length >= 10) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        return score;
    };

    const strengthLabels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    const strengthColors = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-emerald-500'];

    const strength = getStrength(form.newPassword);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (form.newPassword !== form.confirmPassword) {
            return setError('New password and confirm password do not match');
        }
        if (form.newPassword.length < 6) {
            return setError('Password must be at least 6 characters');
        }

        setLoading(true);
        const res = await changePassword(form.currentPassword, form.newPassword, form.confirmPassword);
        setLoading(false);

        if (res.success) {
            setSuccess('Password changed successfully! Redirecting...');
            setTimeout(() => navigate('/'), 1500);
        } else {
            setError(res.message);
        }
    };

    const isFirstLogin = user?.isFirstLogin;

    return (
        <div className="min-h-screen flex items-center justify-center bg-background font-body p-6">
            <div className="w-full max-w-lg">
                {/* Header Card */}
                <div className="bg-surface-container-lowest rounded-2xl shadow-ambient border border-outline-variant/10 overflow-hidden">
                    {/* Top Banner */}
                    <div className="clinical-gradient px-8 py-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {isFirstLogin ? 'key' : 'lock_reset'}
                                </span>
                            </div>
                            <div>
                                <h1 className="font-headline font-bold text-xl text-white">
                                    {isFirstLogin ? 'Set Your Password' : 'Change Password'}
                                </h1>
                                <p className="text-white/70 text-sm">
                                    {isFirstLogin
                                        ? 'You must set a new password before continuing'
                                        : 'Update your account password'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* First Login Notice */}
                    {isFirstLogin && (
                        <div className="mx-6 mt-6 flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                            <span className="material-symbols-outlined text-yellow-600 text-xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                            <div>
                                <p className="text-sm font-semibold text-yellow-800">First Login Detected</p>
                                <p className="text-xs text-yellow-700 mt-0.5">
                                    Your account was created by an administrator. You must change your password before accessing the system.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Form */}
                    <div className="p-8">
                        {error && (
                            <div className="bg-error-container text-on-error-container p-3 rounded-xl mb-6 text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">error</span>
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-green-50 text-green-800 border border-green-200 p-3 rounded-xl mb-6 text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Current Password */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                                    Current Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-on-surface-variant text-lg group-focus-within:text-primary transition-colors">lock</span>
                                    </div>
                                    <input
                                        type={showCurrent ? 'text' : 'password'}
                                        className="w-full pl-11 pr-12 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/40 text-on-surface transition-all"
                                        placeholder="Enter current password"
                                        value={form.currentPassword}
                                        onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                                        required
                                    />
                                    <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                                        className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-on-surface transition-colors">
                                        <span className="material-symbols-outlined text-lg">{showCurrent ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                                    New Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-on-surface-variant text-lg group-focus-within:text-primary transition-colors">key</span>
                                    </div>
                                    <input
                                        type={showNew ? 'text' : 'password'}
                                        className="w-full pl-11 pr-12 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/40 text-on-surface transition-all"
                                        placeholder="Min. 6 characters"
                                        value={form.newPassword}
                                        onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                                        required
                                    />
                                    <button type="button" onClick={() => setShowNew(!showNew)}
                                        className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-on-surface transition-colors">
                                        <span className="material-symbols-outlined text-lg">{showNew ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                                {/* Strength Bar */}
                                {form.newPassword && (
                                    <div className="mt-2 space-y-1">
                                        <div className="flex gap-1">
                                            {[1,2,3,4,5].map(i => (
                                                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColors[strength] : 'bg-slate-200'}`}></div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-on-surface-variant ml-1">{strengthLabels[strength]}</p>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                                    Confirm New Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                        <span className={`material-symbols-outlined text-lg transition-colors ${
                                            form.confirmPassword && form.newPassword === form.confirmPassword
                                                ? 'text-green-500'
                                                : form.confirmPassword
                                                    ? 'text-red-400'
                                                    : 'text-on-surface-variant group-focus-within:text-primary'
                                        }`}>
                                            {form.confirmPassword && form.newPassword === form.confirmPassword ? 'check_circle' : 'key'}
                                        </span>
                                    </div>
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        className={`w-full pl-11 pr-12 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-1 transition-all text-on-surface ${
                                            form.confirmPassword && form.newPassword !== form.confirmPassword
                                                ? 'focus:ring-red-300'
                                                : 'focus:ring-primary/40'
                                        }`}
                                        placeholder="Repeat new password"
                                        value={form.confirmPassword}
                                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                        required
                                    />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-on-surface transition-colors">
                                        <span className="material-symbols-outlined text-lg">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                                {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                                    <p className="text-xs text-red-500 ml-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">close</span>
                                        Passwords do not match
                                    </p>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                        </svg>
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock_reset</span>
                                        Change Password
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
