import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useParams, useNavigate, Link } from 'react-router-dom';

const ResetPassword = () => {
    const { resetPassword } = useContext(AuthContext);
    const { token } = useParams();
    const navigate  = useNavigate();

    const [form, setForm]     = useState({ newPassword: '', confirmPassword: '' });
    const [error, setError]   = useState(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showNew, setShowNew]       = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const getStrength = (pwd) => {
        let s = 0;
        if (pwd.length >= 6)  s++;
        if (pwd.length >= 10) s++;
        if (/[A-Z]/.test(pwd)) s++;
        if (/[0-9]/.test(pwd)) s++;
        if (/[^A-Za-z0-9]/.test(pwd)) s++;
        return s;
    };
    const strengthColors = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-emerald-500'];
    const strengthLabels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    const strength = getStrength(form.newPassword);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (form.newPassword !== form.confirmPassword) return setError('Passwords do not match');
        if (form.newPassword.length < 6) return setError('Password must be at least 6 characters');

        setLoading(true);
        const res = await resetPassword(token, form.newPassword, form.confirmPassword);
        setLoading(false);

        if (res.success) {
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } else {
            setError(res.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background font-body p-6">
            <div className="w-full max-w-md">
                <div className="bg-surface-container-lowest rounded-2xl shadow-ambient border border-outline-variant/10 p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg">
                            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
                        </div>
                        <span className="font-headline font-extrabold text-xl text-primary">Clinical Sanctum</span>
                    </div>

                    {!success ? (
                        <>
                            <div className="mb-8">
                                <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">Reset Password</h2>
                                <p className="text-on-surface-variant text-sm">Enter your new password below.</p>
                            </div>

                            {error && (
                                <div className="bg-error-container text-on-error-container p-3 rounded-xl mb-6 text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">error</span>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* New Password */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">New Password</label>
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
                                        <button type="button" onClick={() => setShowNew(!showNew)} className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-on-surface transition-colors">
                                            <span className="material-symbols-outlined text-lg">{showNew ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                    {form.newPassword && (
                                        <div className="mt-2 space-y-1">
                                            <div className="flex gap-1">
                                                {[1,2,3,4,5].map(i => (
                                                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : 'bg-slate-200'}`}></div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-on-surface-variant ml-1">{strengthLabels[strength]}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Confirm Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <span className={`material-symbols-outlined text-lg ${form.confirmPassword && form.newPassword === form.confirmPassword ? 'text-green-500' : 'text-on-surface-variant group-focus-within:text-primary'} transition-colors`}>
                                                {form.confirmPassword && form.newPassword === form.confirmPassword ? 'check_circle' : 'key'}
                                            </span>
                                        </div>
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            className="w-full pl-11 pr-12 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/40 text-on-surface transition-all"
                                            placeholder="Repeat new password"
                                            value={form.confirmPassword}
                                            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                            required
                                        />
                                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-on-surface transition-colors">
                                            <span className="material-symbols-outlined text-lg">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">
                                    {loading ? (
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                        </svg>
                                    ) : (
                                        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock_reset</span>
                                    )}
                                    {loading ? 'Resetting...' : 'Reset Password'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-green-600 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            </div>
                            <h3 className="font-headline text-xl font-bold text-on-surface mb-2">Password Reset!</h3>
                            <p className="text-on-surface-variant text-sm">Redirecting to login...</p>
                        </div>
                    )}

                    <div className="mt-6 pt-6 border-t border-outline-variant/10 text-center">
                        <Link to="/login" className="text-sm text-primary font-semibold hover:underline flex items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-base">arrow_back</span>
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
