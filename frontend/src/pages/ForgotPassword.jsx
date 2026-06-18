import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
    const { forgotPassword } = useContext(AuthContext);
    const [email, setEmail]     = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError]     = useState(null);
    // Dev-only: show reset token/url from response
    const [devData, setDevData] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const res = await forgotPassword(email);
        setLoading(false);
        if (res.success) {
            setSubmitted(true);
            if (res.data?.resetToken) setDevData(res.data);
        } else {
            setError(res.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background font-body p-6">
            <div className="w-full max-w-md">
                <div className="bg-surface-container-lowest rounded-2xl shadow-ambient border border-outline-variant/10 p-8">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg">
                            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
                        </div>
                        <span className="font-headline font-extrabold text-xl text-primary">Clinical Sanctum</span>
                    </div>

                    {!submitted ? (
                        <>
                            <div className="mb-8">
                                <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">Forgot Password?</h2>
                                <p className="text-on-surface-variant text-sm">
                                    Enter your registered email address and we'll send you password reset instructions.
                                </p>
                            </div>

                            {error && (
                                <div className="bg-error-container text-on-error-container p-3 rounded-xl mb-6 text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">error</span>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                                        Email Address
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-on-surface-variant text-lg group-focus-within:text-primary transition-colors">email</span>
                                        </div>
                                        <input
                                            type="email"
                                            className="w-full pl-11 pr-4 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/40 text-on-surface transition-all"
                                            placeholder="admin@pharmacy.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                        </svg>
                                    ) : (
                                        <span className="material-symbols-outlined text-xl">send</span>
                                    )}
                                    {loading ? 'Sending...' : 'Send Reset Instructions'}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Success State */
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-green-600 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
                            </div>
                            <h3 className="font-headline text-xl font-bold text-on-surface mb-2">Check Your Email</h3>
                            <p className="text-on-surface-variant text-sm mb-6">
                                If <strong>{email}</strong> is registered, you will receive password reset instructions shortly.
                            </p>

                            {/* Dev-only reset link display */}
                            {devData?.resetUrl && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left">
                                    <p className="text-xs font-bold text-yellow-800 mb-1">⚠️ Development Only — Reset Link:</p>
                                    <Link
                                        to={`/reset-password/${devData.resetToken}`}
                                        className="text-xs text-primary break-all hover:underline"
                                    >
                                        Click here to reset password
                                    </Link>
                                </div>
                            )}
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

export default ForgotPassword;
