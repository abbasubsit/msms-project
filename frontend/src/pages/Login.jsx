import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [error, setError]             = useState(null);
    const [loading, setLoading]         = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const res = await login(credentials.email, credentials.password);
        setLoading(false);

        if (res.success) {
            // If first login — force password change
            if (res.isFirstLogin) {
                navigate('/change-password');
            } else {
                navigate('/');
            }
        } else {
            setError(res.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-on-surface font-body p-6 selection:bg-primary/20 selection:text-primary">
            <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 bg-surface-container-lowest rounded-xl overflow-hidden shadow-ambient border border-outline-variant/10">

                {/* ── Left Side: Branding ── */}
                <section className="hidden md:flex flex-col justify-between p-12 bg-surface-container-low relative overflow-hidden">
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary-container/40 rounded-full blur-3xl"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-12">
                            <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg shadow-sm">
                                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
                            </div>
                            <h1 className="font-headline font-extrabold text-2xl tracking-tight text-primary">Clinical Sanctum</h1>
                        </div>
                        <div className="space-y-6">
                            <h2 className="font-headline text-4xl font-bold leading-tight text-on-surface">
                                Precision Care Starts with <br />
                                <span className="text-primary-container">Total Inventory Control.</span>
                            </h2>
                            <p className="text-on-surface-variant leading-relaxed max-w-sm">
                                Experience the sanctuary of organized data. Our intelligent pharmacy management system ensures patient safety and operational excellence.
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <div className="glass-panel p-6 rounded-xl border border-outline-variant/20 shadow-sm">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-on-surface">System Reliability</p>
                                    <div className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
                                        <span className="text-xs text-on-surface-variant font-medium">99.9% Uptime Verified</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-on-surface-variant italic">"The Clinical Sanctum has redefined how we track high-risk medications, providing peace of mind through automation."</p>
                        </div>
                    </div>
                </section>

                {/* ── Right Side: Login Form ── */}
                <section className="flex flex-col justify-center p-8 md:p-16 lg:p-24 bg-surface-container-lowest relative z-20">
                    {/* Mobile Logo */}
                    <div className="flex md:hidden items-center gap-2 mb-10">
                        <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
                        <span className="font-headline font-extrabold text-xl text-primary">Clinical Sanctum</span>
                    </div>

                    <div className="mb-10">
                        <h3 className="font-headline text-3xl font-bold text-on-surface mb-2">Login</h3>
                        <p className="text-on-surface-variant">Enter your credentials to access the system.</p>
                    </div>

                    {error && (
                        <div className="bg-error-container text-on-error-container p-3 rounded-xl mb-6 text-sm text-center font-medium shadow-sm flex items-center gap-2 justify-center">
                            <span className="material-symbols-outlined text-base">error</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="block font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1" htmlFor="email">
                                Email Address
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-on-surface-variant text-lg transition-colors group-focus-within:text-primary">email</span>
                                </div>
                                <input
                                    className="w-full pl-11 pr-4 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/40 text-on-surface placeholder:text-outline transition-all"
                                    id="email"
                                    name="email"
                                    placeholder="admin@pharmacy.com"
                                    required
                                    type="email"
                                    value={credentials.email}
                                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="block font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant" htmlFor="password">
                                    Password
                                </label>
                                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:text-primary-container transition-colors">
                                    Forgot Password?
                                </Link>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-on-surface-variant text-lg transition-colors group-focus-within:text-primary">lock</span>
                                </div>
                                <input
                                    className="w-full pl-11 pr-12 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/40 text-on-surface placeholder:text-outline transition-all"
                                    id="password"
                                    name="password"
                                    placeholder="••••••••••••"
                                    required
                                    type={showPassword ? 'text' : 'password'}
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                />
                                <button
                                    className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-on-surface transition-colors focus:outline-none"
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            className="w-full mt-2 group relative flex items-center justify-center py-4 px-6 bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <span>Authorize Access</span>
                                    <span className="material-symbols-outlined ml-2 text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <footer className="mt-12 pt-8 border-t border-outline-variant/10 text-center space-y-4">
                        <div className="flex justify-center gap-6">
                            <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1", color: '#007236' }}>verified_user</span>
                                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">HIPAA Compliant</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1", color: '#793100' }}>gpp_good</span>
                                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">TLS 1.3 SECURE</span>
                            </div>
                        </div>
                    </footer>
                </section>
            </main>
        </div>
    );
};

export default Login;
