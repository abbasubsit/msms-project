import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Signup = () => {
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', password: '', role: '' });
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        // The context register takes (name, username, password). We pass role as name
        const res = await register(formData.role, formData.username, formData.password);
        if (res.success) {
            navigate('/');
        } else {
            setError(res.message);
        }
    };

    return (
        <main className="min-h-screen flex bg-surface font-body text-on-surface overflow-hidden">
            {/* Left Section: Visual Branding Area */}
            <section className="hidden lg:flex w-1/2 clinical-gradient relative flex-col justify-between p-16 text-white">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>health_metrics</span>
                        <span className="font-headline text-2xl font-bold tracking-tight">Clinical Sanctum</span>
                    </div>
                    <h1 className="font-headline text-5xl font-extrabold leading-tight mb-6 max-w-lg">
                        The precision of science, the sanctity of care.
                    </h1>
                    <p className="text-white/80 text-lg leading-relaxed max-w-md font-light">
                        Redefining pharmacy operations with a system that treats medical data as a sacred asset. Efficient, editorial, and effortless.
                    </p>
                </div>

                <div className="relative z-10 flex flex-col gap-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="glass-panel p-6 rounded-xl text-on-surface-variant flex flex-col gap-3">
                            <span className="material-symbols-outlined text-primary">verified_user</span>
                            <div className="text-sm font-semibold text-on-surface">Secure Vault</div>
                            <div className="text-xs opacity-70">HIPAA compliant architecture protecting every record.</div>
                        </div>
                        <div className="glass-panel p-6 rounded-xl text-on-surface-variant flex flex-col gap-3">
                            <span className="material-symbols-outlined text-primary">clinical_notes</span>
                            <div className="text-sm font-semibold text-on-surface">Precision Ledger</div>
                            <div className="text-xs opacity-70">Real-time SKU tracking with zero-line efficiency.</div>
                        </div>
                    </div>
                    <p className="text-xs font-label uppercase tracking-widest text-[#d6e3ff]/60">
                        Trusted by leading medical laboratories worldwide
                    </p>
                </div>
                
                <div className="absolute inset-0 z-0 opacity-20 overflow-hidden pointer-events-none">
                    <img 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGOuKMURHyDTVVwpM8BdGm2IQglVv6fjkqgF3KENTrPaBTRvwBmZRqCVrLqvymTGHHF7FJ7dXJoJWrZGyWqs2_BzUto7aMTSiReczFWSxNS4gJvl4ZUlT1WQwRPs_57byRlRNrzM3Ubb8ofgv5-U7FkcnuoEhJ8UpwlJ0L5VRqwEF1MblEUuTElM1UAuJlipRV7QP6F6iwF3vtz8SW1DVDA8PfaufLmSf8ub8wTANb6IF2HogZZKWI0LZGsV_lGgFHP-LQUX7GCII5" 
                        alt="Clean laboratory interior" 
                        className="w-full h-full object-cover mix-blend-overlay" 
                    />
                </div>
            </section>

            {/* Right Section: Signup Form */}
            <section className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 bg-surface">
                <div className="w-full max-w-md">
                    <header className="mb-10">
                        <div className="lg:hidden flex items-center gap-2 mb-8">
                            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>health_metrics</span>
                            <span className="font-headline text-xl font-bold text-primary">Clinical Sanctum</span>
                        </div>
                        <h2 className="font-headline text-3xl font-bold text-on-surface mb-2">Create Account</h2>
                        <p className="text-on-surface-variant font-light">Join the professional sanctuary for pharmaceutical precision.</p>
                    </header>

                    {error && (
                        <div className="bg-error-container text-on-error-container p-3 rounded-xl mb-6 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        {/* Username Field */}
                        <div className="flex flex-col gap-1.5">
                            <label className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1" htmlFor="username">
                                Username
                            </label>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg transition-colors group-focus-within:text-primary">person</span>
                                <input 
                                    type="text" 
                                    id="username"
                                    placeholder="e.g. j.smith_pharma" 
                                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/40 transition-all text-sm placeholder:text-outline/50 text-on-surface"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="flex flex-col gap-1.5">
                            <label className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1" htmlFor="password">
                                Password
                            </label>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg transition-colors group-focus-within:text-primary">lock</span>
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder="••••••••••••" 
                                    className="w-full pl-12 pr-12 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/40 transition-all text-sm text-on-surface"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                                <button 
                                    type="button" 
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer focus:outline-none"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div className="flex flex-col gap-1.5">
                            <label className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1" htmlFor="role">
                                Professional Role
                            </label>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg transition-colors group-focus-within:text-primary">clinical_notes</span>
                                <select 
                                    id="role"
                                    className="w-full pl-12 pr-10 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-primary/40 transition-all text-sm appearance-none cursor-pointer text-on-surface"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Select your role...</option>
                                    <option value="admin">Administrator</option>
                                    <option value="cashier">Cashier</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button 
                            type="submit" 
                            className="w-full mt-4 clinical-gradient text-white py-4 rounded-xl font-semibold shadow-lg shadow-primary/10 hover:shadow-primary/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2 group"
                        >
                            Create Account
                            <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
                        </button>
                    </form>

                    <footer className="mt-10 pt-8 border-t border-outline-variant/20 text-center">
                        <p className="text-on-surface-variant text-sm">
                            Already have an account? 
                            <Link to="/login" className="text-primary font-semibold hover:underline decoration-primary/30 underline-offset-4 ml-1">
                                Back to Login
                            </Link>
                        </p>
                    </footer>
                </div>
            </section>

            {/* Floating Security Tag */}
            <div className="fixed bottom-6 right-6 hidden md:flex items-center gap-2 bg-surface-container-low/80 backdrop-blur-md px-4 py-2 rounded-full border border-outline-variant/20 shadow-sm z-50">
                <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1", color: '#007236' }}>shield_with_heart</span>
                <span className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">HIPAA COMPLIANT ENVIRONMENT</span>
            </div>
        </main>
    );
};

export default Signup;
