import React, { useContext, useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

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
    
    // Alerts and Notifications Panel States
    const [alerts, setAlerts] = useState([]);
    const [loadingAlerts, setLoadingAlerts] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);

    useEffect(() => {
        if (user) {
            fetchAlerts();
        }
    }, [user]);

    const fetchAlerts = async () => {
        setLoadingAlerts(true);
        try {
            const [lowStockRes, expiringRes] = await Promise.all([
                api.get('/medicines/low-stock'),
                api.get('/medicines/expiring')
            ]);
            
            const combinedAlerts = [];
            const today = new Date();
            
            // Format low stock
            lowStockRes.data.forEach(med => {
                const qty = med.quantity || 0;
                combinedAlerts.push({
                    id: 'low-stock-' + med._id,
                    medicine: med,
                    type: qty === 0 ? 'out_of_stock' : 'low_stock',
                    message: qty === 0 
                        ? `${med.name} is completely Out of Stock!` 
                        : `${med.name} is running critically low (${qty} units left).`,
                    icon: qty === 0 ? 'cancel' : 'warning',
                    color: qty === 0 ? 'text-red-750 bg-red-50 border-red-200' : 'text-orange-755 bg-orange-50 border-orange-200',
                    badge: qty === 0 ? 'Out of Stock' : 'Low Stock',
                    badgeColor: qty === 0 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-900',
                    link: '/purchases',
                    linkState: { restockMed: med }
                });
            });
            
            // Format expiring
            expiringRes.data.forEach(med => {
                const expDate = new Date(med.expiry_date);
                const isExpired = expDate <= today;
                
                combinedAlerts.push({
                    id: 'expiring-' + med._id,
                    medicine: med,
                    type: isExpired ? 'expired' : 'expiring',
                    message: isExpired 
                        ? `${med.name} has EXPIRED! (Batch: ${med.batch_number || 'N/A'})` 
                        : `${med.name} is expiring soon (Expiry: ${expDate.toLocaleDateString()}).`,
                    icon: isExpired ? 'dangerous' : 'schedule',
                    color: isExpired ? 'text-red-750 bg-red-50 border-red-200' : 'text-amber-850 bg-amber-50 border-amber-200',
                    badge: isExpired ? 'Expired' : 'Expiring',
                    badgeColor: isExpired ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900',
                    link: '/medicines',
                    linkState: null
                });
            });
            
            setAlerts(combinedAlerts);
        } catch (error) {
            console.error("Failed to fetch notification alerts", error);
        } finally {
            setLoadingAlerts(false);
        }
    };

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
                    {navLink('/sales', 'receipt_long', 'POS / Sales')}
                    {(user?.role === 'super_admin' || user?.role === 'pharmacist') && navLink('/purchases', 'inventory_2', 'Purchases / Restock')}
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
                            {/* Notification Drawer */}
                            <div className="relative">
                                <button 
                                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                                    className="text-slate-500 hover:text-primary hover:bg-slate-200/50 p-2 rounded-full transition-colors relative flex items-center justify-center"
                                    id="notifications-toggle"
                                >
                                    <span className="material-symbols-outlined text-[22px]">notifications</span>
                                    {alerts.length > 0 && (
                                        <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-600 text-white font-black text-[9px] rounded-full flex items-center justify-center px-1 shadow-sm ring-2 ring-slate-50 animate-pulse">
                                            {alerts.length}
                                        </span>
                                    )}
                                </button>
                                
                                {notificationsOpen && (
                                    <>
                                        {/* Click outside overlay */}
                                        <div className="fixed inset-0 z-30" onClick={() => setNotificationsOpen(false)}></div>
                                        
                                        {/* Dropdown Card */}
                                        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-outline-variant/30 z-40 py-2 animate-fade-in max-h-[480px] flex flex-col overflow-hidden">
                                            <div className="px-5 py-3 border-b border-surface-container flex justify-between items-center bg-slate-50/50">
                                                <h4 className="font-extrabold text-cyan-900 text-sm font-headline">Active Alerts ({alerts.length})</h4>
                                                <button 
                                                    onClick={fetchAlerts}
                                                    className="text-slate-400 hover:text-primary text-[16px] flex items-center transition-colors"
                                                    title="Refresh Alerts"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                                                </button>
                                            </div>
                                            
                                            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[360px]">
                                                {loadingAlerts ? (
                                                    <div className="py-8 text-center text-slate-400 text-xs font-semibold flex flex-col items-center justify-center gap-2">
                                                        <span className="material-symbols-outlined animate-spin text-primary text-xl">autorenew</span>
                                                        <span>Syncing alerts...</span>
                                                    </div>
                                                ) : alerts.length === 0 ? (
                                                    <div className="py-12 text-center text-slate-400 text-xs font-semibold flex flex-col items-center justify-center gap-3">
                                                        <span className="material-symbols-outlined text-emerald-500 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                                        <div>
                                                            <p className="text-slate-700 font-bold">No active alerts</p>
                                                            <p className="text-[10px] text-slate-450 mt-0.5">Inventory compliance is 100% stable.</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    alerts.map(alertItem => (
                                                        <div 
                                                            key={alertItem.id} 
                                                            className={`p-4 flex gap-3 transition-colors border-l-4 text-left ${
                                                                alertItem.type === 'out_of_stock' || alertItem.type === 'expired'
                                                                    ? 'border-red-500 bg-red-50/20 hover:bg-red-50/50'
                                                                    : 'border-orange-500 bg-orange-50/10 hover:bg-orange-50/30'
                                                            }`}
                                                        >
                                                            <span className={`material-symbols-outlined shrink-0 text-xl ${
                                                                alertItem.type === 'out_of_stock' || alertItem.type === 'expired'
                                                                    ? 'text-red-600'
                                                                    : 'text-orange-600'
                                                            }`}>{alertItem.icon}</span>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-baseline gap-1">
                                                                    <span className="text-xs font-bold text-slate-900 truncate">{alertItem.medicine.name}</span>
                                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide shrink-0 ${alertItem.badgeColor}`}>
                                                                        {alertItem.badge}
                                                                    </span>
                                                                </div>
                                                                <p className="text-slate-650 text-[11px] font-medium leading-relaxed mt-1">{alertItem.message}</p>
                                                                
                                                                <div className="mt-2.5 flex justify-end">
                                                                    <Link 
                                                                        to={alertItem.link} 
                                                                        state={alertItem.linkState}
                                                                        onClick={() => setNotificationsOpen(false)}
                                                                        className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                                                                            alertItem.type === 'out_of_stock' || alertItem.type === 'expired'
                                                                                ? 'text-red-700 hover:text-red-900'
                                                                                : 'text-orange-700 hover:text-orange-900'
                                                                        }`}
                                                                    >
                                                                        {alertItem.type === 'out_of_stock' || alertItem.type === 'low_stock' ? 'Restock Item' : 'Inspect Inventory'}
                                                                        <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            
                                            <div className="px-5 py-2.5 bg-slate-50 border-t border-surface-container text-center">
                                                <Link 
                                                    to="/reports" 
                                                    onClick={() => setNotificationsOpen(false)}
                                                    className="text-xs text-primary font-bold hover:underline"
                                                >
                                                    View Detailed Analytics
                                                </Link>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
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
