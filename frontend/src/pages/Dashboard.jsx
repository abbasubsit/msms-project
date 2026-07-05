import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const [stats, setStats] = useState({ 
        totalSalesToday: 0, 
        lowStock: 0, 
        expiringSoon: 0, 
        totalMedicines: 0 
    });
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch required data in parallel
                const [salesRes, lowStockRes, expiringRes, medsRes] = await Promise.all([
                    api.get('/sales'),
                    api.get('/medicines/low-stock'),
                    api.get('/medicines/expiring'),
                    api.get('/medicines')
                ]);

                // Calculate today sales
                const today = new Date().toISOString().split('T')[0];
                const todaySales = salesRes.data.filter(sale => 
                    sale.date && sale.date.split('T')[0] === today
                ).reduce((acc, sale) => acc + sale.total_amount, 0);

                setStats({
                    totalSalesToday: todaySales,
                    lowStock: lowStockRes.data.length,
                    expiringSoon: expiringRes.data.length,
                    totalMedicines: medsRes.data.length
                });

                // Grab up to 4 recent transactions
                const sortedSales = salesRes.data.sort((a, b) => new Date(b.date) - new Date(a.date));
                setRecentTransactions(sortedSales.slice(0, 4));
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const getInitials = (name) => {
        if (!name) return "WC";
        return name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const todayFormatted = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 font-body text-slate-800">
                <span className="material-symbols-outlined text-4xl text-cyan-600 mb-4 animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                <p className="font-semibold text-xs text-slate-400 uppercase tracking-widest">Synchronizing Dashboard Data</p>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 animate-fade-in relative font-body bg-[#f8fafc] text-slate-800 min-h-screen">
            {/* Header Section */}
            <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight font-headline">Executive Overview</h2>
                    <p className="text-slate-500 mt-1 text-xs font-medium">Real-time pharmacy metrics and store activities.</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 rounded-full bg-white border border-slate-200/60 text-slate-600 text-xs font-semibold flex items-center gap-2 shadow-sm pointer-events-none">
                        <span className="material-symbols-outlined text-xs text-slate-400">calendar_today</span>
                        {todayFormatted}
                    </button>
                    <button className="px-4 py-2 rounded-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-lg shadow-cyan-600/10 flex items-center gap-2 transition-all active:scale-95">
                        <span className="material-symbols-outlined text-[16px]">file_download</span>
                        Export Report
                    </button>
                </div>
            </section>

            {/* Bento Summary Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Sales */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 group cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl border border-cyan-100/50 group-hover:bg-cyan-600 group-hover:text-white transition-colors duration-300">
                            <span className="material-symbols-outlined text-xl block" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Live</span>
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Sales Today</p>
                    <h3 className="text-2xl font-extrabold mt-1.5 font-headline tracking-tight text-slate-800 flex items-baseline">
                        <span className="text-sm font-semibold mr-0.5 text-slate-400">$</span>
                        {stats.totalSalesToday.toFixed(2)}
                    </h3>
                </div>

                {/* Low Stock */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 group cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl border transition-colors duration-300 ${
                            stats.lowStock > 0 
                                ? 'bg-amber-50 text-amber-600 border-amber-100/50 group-hover:bg-amber-600 group-hover:text-white' 
                                : 'bg-slate-50 text-slate-400 border-slate-100/50'
                        }`}>
                            <span className="material-symbols-outlined text-xl block" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                        </div>
                        {stats.lowStock > 0 && (
                            <span className="text-[10px] text-amber-700 font-extrabold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                Reorder
                            </span>
                        )}
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Low Stock Count</p>
                    <h3 className={`text-2xl font-extrabold mt-1.5 font-headline tracking-tight ${stats.lowStock > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                        {stats.lowStock}
                    </h3>
                </div>

                {/* Expiring Soon */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 group cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl border transition-colors duration-300 ${
                            stats.expiringSoon > 0 
                                ? 'bg-purple-50 text-purple-600 border-purple-100/50 group-hover:bg-purple-600 group-hover:text-white' 
                                : 'bg-slate-50 text-slate-400 border-slate-100/50'
                        }`}>
                            <span className="material-symbols-outlined text-xl block" style={{ fontVariationSettings: "'FILL' 1" }}>event_busy</span>
                        </div>
                        {stats.expiringSoon > 0 && (
                            <span className="text-[10px] text-purple-700 font-extrabold bg-purple-50 border border-purple-150 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                30 Days
                            </span>
                        )}
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Expiring Soon</p>
                    <h3 className={`text-2xl font-extrabold mt-1.5 font-headline tracking-tight ${stats.expiringSoon > 0 ? 'text-purple-600' : 'text-slate-800'}`}>
                        {stats.expiringSoon}
                    </h3>
                </div>

                {/* Total Medicines */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 group cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50 group-hover:bg-emerald-650 group-hover:text-white transition-colors duration-300">
                            <span className="material-symbols-outlined text-xl block" style={{ fontVariationSettings: "'FILL' 1" }}>medication</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-extrabold bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Catalog</span>
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Medicines</p>
                    <h3 className="text-2xl font-extrabold mt-1.5 font-headline tracking-tight text-slate-800">
                        {stats.totalMedicines}
                    </h3>
                </div>
            </section>

            {/* Main Layout Grid */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Transactions (Table) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between pb-1">
                        <h3 className="text-lg font-bold font-headline tracking-tight text-slate-800">Recent Transactions</h3>
                        <Link to="/sales" className="text-cyan-600 text-xs font-bold hover:text-cyan-700 cursor-pointer tracking-wider decoration-cyan-600/30 underline underline-offset-4">View All Transactions</Link>
                    </div>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient / ID</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medicine</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {recentTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-xs font-semibold text-slate-400">
                                                No recent transactions found.
                                            </td>
                                        </tr>
                                    ) : (
                                        recentTransactions.map((trx) => (
                                            <tr key={trx._id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                                                <td className="px-6 py-4 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-650 font-bold text-[10px] flex items-center justify-center border border-slate-200/40 shrink-0">
                                                        {getInitials(trx.customer?.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-xs text-slate-800 truncate group-hover:text-cyan-600 transition-colors">
                                                            {trx.customer?.name || "Walk-in Customer"}
                                                        </div>
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                            ID: #{trx.invoice_number}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-medium text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs">
                                                    {trx.items && trx.items.length > 0 
                                                        ? `${trx.items[0].medicine?.name || 'Unknown item'} ${trx.items.length > 1 ? `+${trx.items.length - 1} more` : ''}`
                                                        : 'N/A'
                                                    }
                                                </td>
                                                <td className="px-6 py-4 text-xs font-extrabold text-slate-800">
                                                    ${trx.total_amount.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-extrabold uppercase tracking-wider">
                                                        COMPLETED
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Quick Links & System Health */}
                <div className="space-y-8">
                    {/* Quick Actions Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold font-headline tracking-tight text-slate-800">Quick Links</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <Link to="/medicines" className="bg-white border border-slate-100 shadow-sm p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-gradient-to-br hover:from-cyan-500 hover:to-blue-600 hover:text-white hover:border-transparent group transition-all duration-300">
                                <span className="material-symbols-outlined text-cyan-600 group-hover:text-white transition-colors" style={{ fontVariationSettings: "'wght' 300" }}>add_circle</span>
                                <span className="text-xs font-bold text-slate-650 group-hover:text-white transition-colors">Add Item</span>
                            </Link>
                            <Link to="/sales" className="bg-white border border-slate-100 shadow-sm p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-gradient-to-br hover:from-cyan-500 hover:to-blue-600 hover:text-white hover:border-transparent group transition-all duration-300">
                                <span className="material-symbols-outlined text-cyan-600 group-hover:text-white transition-colors" style={{ fontVariationSettings: "'wght' 300" }}>receipt_long</span>
                                <span className="text-xs font-bold text-slate-650 group-hover:text-white transition-colors">Invoices</span>
                            </Link>
                            <Link to="/reports" className="bg-white border border-slate-100 shadow-sm p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-gradient-to-br hover:from-cyan-500 hover:to-blue-600 hover:text-white hover:border-transparent group transition-all duration-300">
                                <span className="material-symbols-outlined text-cyan-600 group-hover:text-white transition-colors" style={{ fontVariationSettings: "'wght' 300" }}>monitor_heart</span>
                                <span className="text-xs font-bold text-slate-650 group-hover:text-white transition-colors">Stats</span>
                            </Link>
                            <Link to="/profile" className="bg-white border border-slate-100 shadow-sm p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-gradient-to-br hover:from-cyan-500 hover:to-blue-600 hover:text-white hover:border-transparent group transition-all duration-300">
                                <span className="material-symbols-outlined text-cyan-600 group-hover:text-white transition-colors" style={{ fontVariationSettings: "'wght' 300" }}>account_circle</span>
                                <span className="text-xs font-bold text-slate-650 group-hover:text-white transition-colors">Profile</span>
                            </Link>
                        </div>
                    </div>

                    {/* System Insights Card */}
                    <div className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white p-6 rounded-2xl relative overflow-hidden shadow-lg shadow-blue-500/10">
                        <div className="relative z-10">
                            <h4 className="text-base font-bold mb-2 font-headline tracking-tight">Inventory Health</h4>
                            <p className="text-cyan-100 text-xs mb-6 opacity-90 leading-relaxed font-medium">
                                {stats.lowStock > 0 
                                    ? `Alert: You have ${stats.lowStock} items running low. Consider restocking them.` 
                                    : 'Your inventory is currently at optimal efficiency. Keep up the good work!'}
                            </p>
                            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-emerald-300 to-cyan-300 h-full shadow-[0_0_8px_rgba(52,211,153,0.5)]" style={{ width: stats.lowStock > 0 ? '82%' : '100%' }}></div>
                            </div>
                        </div>
                        {/* Abstract Background Decoration */}
                        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute -left-10 -top-10 w-32 h-32 bg-cyan-500/30 rounded-full blur-2xl"></div>
                    </div>

                    {/* Upcoming Schedule */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-400 mb-5 flex items-center gap-2 font-headline uppercase tracking-wider">
                            <span className="material-symbols-outlined text-cyan-600 text-base">assignment</span>
                            Restock Schedule
                        </h4>
                        <div className="relative border-l border-slate-100 pl-4 ml-2 space-y-6">
                            <div className="relative">
                                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-600 ring-4 ring-cyan-50"></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800">PharmaCorp Delivery</p>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Today, 2:00 PM</p>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-350 ring-4 ring-slate-50"></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800">Weekly Audit Check</p>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Tomorrow, 9:00 AM</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contextual Floating Action Button */}
            <Link to="/sales" className="fixed bottom-8 right-8 w-12 h-12 bg-cyan-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-cyan-650/30 hover:bg-cyan-700 hover:scale-105 active:scale-95 transition-all z-50 group">
                <span className="material-symbols-outlined transition-transform group-hover:rotate-90 duration-300" style={{ fontVariationSettings: "'FILL' 0, 'wght' 600" }}>add</span>
            </Link>
        </div>
    );
};

export default Dashboard;
