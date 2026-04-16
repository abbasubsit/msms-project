import React, { useContext } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Layout = () => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();

    return (
        <div className="bg-surface text-on-surface flex font-body">
            {/* Sidebar Navigation Shell */}
            <aside className="h-screen w-64 fixed left-0 top-0 bg-slate-100 flex flex-col py-6 border-r border-slate-200/20 font-headline text-sm z-50 print:hidden">
                <div className="px-6 mb-10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                        <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
                    </div>
                    <div>
                        <h1 className="font-extrabold text-cyan-900 leading-tight tracking-tight">Clinical Sanctuary</h1>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">Central Pharmacy</p>
                    </div>
                </div>
                
                <nav className="flex-1 space-y-1">
                    <Link to="/" className={`flex items-center px-6 py-3 transition-all duration-200 ${location.pathname === '/' ? 'border-l-4 border-cyan-800 text-cyan-900 bg-white/50 font-bold' : 'text-slate-600 hover:text-cyan-700 hover:bg-slate-200'}`}>
                        <span className="material-symbols-outlined mr-3 text-[22px]">dashboard</span>
                        Dashboard
                    </Link>
                    <Link to="/medicines" className={`flex items-center px-6 py-3 transition-all duration-200 ${location.pathname === '/medicines' ? 'border-l-4 border-cyan-800 text-cyan-900 bg-white/50 font-bold' : 'text-slate-600 hover:text-cyan-700 hover:bg-slate-200'}`}>
                        <span className="material-symbols-outlined mr-3 text-[22px]">medication</span>
                        Medicine
                    </Link>
                    <Link to="/suppliers" className={`flex items-center px-6 py-3 transition-all duration-200 ${location.pathname === '/suppliers' ? 'border-l-4 border-cyan-800 text-cyan-900 bg-white/50 font-bold' : 'text-slate-600 hover:text-cyan-700 hover:bg-slate-200'}`}>
                        <span className="material-symbols-outlined mr-3 text-[22px]">local_shipping</span>
                        Supplier
                    </Link>
                    <Link to="/customers" className={`flex items-center px-6 py-3 transition-all duration-200 ${location.pathname === '/customers' ? 'border-l-4 border-cyan-800 text-cyan-900 bg-white/50 font-bold' : 'text-slate-600 hover:text-cyan-700 hover:bg-slate-200'}`}>
                        <span className="material-symbols-outlined mr-3 text-[22px]">group</span>
                        Customer
                    </Link>
 
                    <Link to="/reports" className={`flex items-center px-6 py-3 transition-all duration-200 ${location.pathname === '/reports' ? 'border-l-4 border-cyan-800 text-cyan-900 bg-white/50 font-bold' : 'text-slate-600 hover:text-cyan-700 hover:bg-slate-200'}`}>
                        <span className="material-symbols-outlined mr-3 text-[22px]">analytics</span>
                        Reports
                    </Link>
                </nav>
                
 
                
                <div className="border-t border-slate-200/20 pt-4">
                    <a href="#" className="flex items-center px-6 py-3 text-slate-600 hover:text-cyan-700 transition-all duration-200">
                        <span className="material-symbols-outlined mr-3 text-[20px]">help_center</span>
                        Support
                    </a>
                    <button onClick={logout} className="w-full flex items-center px-6 py-3 text-slate-600 hover:text-tertiary transition-all duration-200 text-left">
                        <span className="material-symbols-outlined mr-3 text-[20px]">logout</span>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="ml-64 flex-1 min-h-screen relative print:ml-0">
                {/* Top Bar */}
                <header className="w-full h-16 sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md flex items-center justify-between px-8 border-b border-slate-200/40 font-headline text-sm font-medium print:hidden">
                    <div className="flex items-center flex-1 max-w-md">
                        <div className="relative w-full group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                            <input className="w-full bg-white border border-slate-200/50 shadow-sm rounded-full pl-12 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-on-surface" placeholder="Search for patients, records, or inventory..." type="text"/>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4">
                            <button className="text-slate-500 hover:text-primary hover:bg-slate-200/50 p-2 rounded-full transition-colors relative">
                                <span className="material-symbols-outlined text-[22px]">notifications</span>
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full pointer-events-none shadow-sm ring-2 ring-slate-50"></span>
                            </button>
                            <button className="text-slate-500 hover:text-primary hover:bg-slate-200/50 p-2 rounded-full transition-colors">
                                <span className="material-symbols-outlined text-[22px]">settings</span>
                            </button>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                        <div className="flex items-center gap-3 cursor-pointer group">
                            <div className="text-right hidden sm:block">
                                <p className="text-cyan-900 font-bold leading-tight group-hover:text-primary transition-colors">{user?.username || 'Aris Thorne'}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{user?.role === 'admin' ? 'Chief Pharmacist' : 'Cashier'}</p>
                            </div>
                            <img alt="Profile" className="w-10 h-10 rounded-full border-2 border-primary/20 object-cover group-hover:border-primary/50 transition-colors" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfeMO43i5qnww8ZY2Hi05GHpFjtUztKZQKoqQST_lT1iShdjq3cdJRem3PgX-LWa2W_AoIanx1ppEz5ITgk4ZtrPpeWd_L8yImQEkzv3ABGy_dd0Rc-AUvM7Wyz6qraGtTFISrSig6OuACxLbLov94oxmj-GxhtSESK2u04gDNxJIZZe5BkAZLEp_qSl4EUKW8_BbxdOYWKJiET-DJSc3G-Q2eCYinQ4IaApsSAqHv6QBh_miwtmkwrImM5LG_DoK50O6Vup2QtWM"/>
                        </div>
                    </div>
                </header>

                {/* Dashboard Stage / Outlet */}
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
