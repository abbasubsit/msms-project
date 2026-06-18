import React, { useContext, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// ─── Role display config ──────────────────────────────────────────────────────
const ROLE_LABELS = {
    super_admin: 'System Administrator',
    pharmacist:  'Pharmacist',
    sales_staff: 'Sales Staff',
};

const ROLE_BADGE_CLS = {
    super_admin: 'bg-purple-100 text-purple-700',
    pharmacist:  'bg-blue-100 text-blue-700',
    sales_staff: 'bg-emerald-100 text-emerald-700',
};

const Layout = () => {
    const { user, logout } = useContext(AuthContext);
    const location  = useLocation();
    const navigate  = useNavigate();
    const [profileOpen, setProfileOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Nav link helper
    const navLink = (to, icon, label, exact = false) => {
        const active = exact ? location.pathname === to : location.pathname.startsWith(to);
        return (
            <Link
                to={to}
                className={`flex items-center px-6 py-3 transition-all duration-200 ${
                    active
                        ? 'border-l-4 border-cyan-800 text-cyan-900 bg-white/50 font-bold'
                        : 'text-slate-600 hover:text-cyan-700 hover:bg-slate-200'
                }`}
            >
                <span className="material-symbols-outlined mr-3 text-[22px]">{icon}</span>
                {label}
            </Link>
        );
    };

    return (
        <div className="bg-surface text-on-surface flex font-body">
            {/* ── Sidebar ── */}
            <aside className="h-screen w-64 fixed left-0 top-0 bg-slate-100 flex flex-col py-6 border-r border-slate-200/20 font-headline text-sm z-50 print:hidden">
                {/* Logo */}
                <div className="px-6 mb-10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                        <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
                    </div>
                    <div>
                        <h1 className="font-extrabold text-cyan-900 leading-tight tracking-tight">Clinical Sanctuary</h1>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">Central Pharmacy</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 overflow-y-auto">
                    {navLink('/', 'dashboard', 'Dashboard', true)}
                    {navLink('/medicines', 'medication', 'Medicine')}
                    {navLink('/suppliers', 'local_shipping', 'Supplier')}
                    {navLink('/customers', 'group', 'Customer')}
                    {navLink('/reports', 'analytics', 'Reports')}

                    {/* User Management — super_admin only */}
                    {user?.role === 'super_admin' && (
                        <>
                            <div className="px-6 pt-4 pb-1">
                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Administration</p>
                            </div>
                            {navLink('/admin/users', 'manage_accounts', 'User Management')}
                        </>
                    )}
                </nav>

                {/* Bottom section */}
                <div className="border-t border-slate-200/20 pt-4 space-y-0.5">
                    {/* Profile link */}
                    <Link to="/profile" className={`flex items-center px-6 py-3 transition-all duration-200 ${
                        location.pathname === '/profile'
                            ? 'border-l-4 border-cyan-800 text-cyan-900 bg-white/50 font-bold'
                            : 'text-slate-600 hover:text-cyan-700 hover:bg-slate-200'
                    }`}>
                        <span className="material-symbols-outlined mr-3 text-[20px]">account_circle</span>
                        My Profile
                    </Link>

                    <a href="#" className="flex items-center px-6 py-3 text-slate-600 hover:text-cyan-700 transition-all duration-200">
                        <span className="material-symbols-outlined mr-3 text-[20px]">help_center</span>
                        Support
                    </a>

                    <button onClick={handleLogout} className="w-full flex items-center px-6 py-3 text-slate-600 hover:text-red-600 transition-all duration-200 text-left">
                        <span className="material-symbols-outlined mr-3 text-[20px]">logout</span>
                        Logout
                    </button>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="ml-64 flex-1 min-h-screen relative print:ml-0">
                {/* Top Bar */}
                <header className="w-full h-16 sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md flex items-center justify-between px-8 border-b border-slate-200/40 font-headline text-sm font-medium print:hidden">
                    <div className="flex items-center flex-1 max-w-md">
                        <div className="relative w-full group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                            <input
                                className="w-full bg-white border border-slate-200/50 shadow-sm rounded-full pl-12 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                                placeholder="Search for patients, records, or inventory..."
                                type="text"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4">
                            <button className="text-slate-500 hover:text-primary hover:bg-slate-200/50 p-2 rounded-full transition-colors relative">
                                <span className="material-symbols-outlined text-[22px]">notifications</span>
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full pointer-events-none shadow-sm ring-2 ring-slate-50"></span>
                            </button>
                            <Link to="/change-password" className="text-slate-500 hover:text-primary hover:bg-slate-200/50 p-2 rounded-full transition-colors" title="Change Password">
                                <span className="material-symbols-outlined text-[22px]">settings</span>
                            </Link>
                        </div>

                        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>

                        {/* User info */}
                        <Link to="/profile" className="flex items-center gap-3 cursor-pointer group">
                            <div className="text-right hidden sm:block">
                                <p className="text-cyan-900 font-bold leading-tight group-hover:text-primary transition-colors">
                                    {user?.fullName || user?.username || 'User'}
                                </p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                    {ROLE_LABELS[user?.role] || user?.role || 'Staff'}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-primary/20 group-hover:border-primary/50 transition-colors bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                            </div>
                        </Link>
                    </div>
                </header>

                {/* isFirstLogin Banner */}
                {user?.isFirstLogin && (
                    <div className="bg-yellow-50 border-b border-yellow-200 px-8 py-2.5 flex items-center gap-3">
                        <span className="material-symbols-outlined text-yellow-600 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                        <p className="text-sm text-yellow-800 font-medium flex-1">
                            You're using a temporary password. Please <Link to="/change-password" className="font-bold underline">change your password</Link> to secure your account.
                        </p>
                    </div>
                )}

                {/* Page Content */}
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
