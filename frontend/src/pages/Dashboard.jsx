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

    const todayFormatted = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 font-body text-on-surface">
                <span className="material-symbols-outlined text-4xl text-primary mb-4 animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                <p className="font-semibold text-sm text-on-surface-variant uppercase tracking-widest">Synchronizing Workspace</p>
            </div>
        );
    }

    return (
        <div className="p-10 space-y-10 animate-fade-in relative font-body bg-surface text-on-surface min-h-screen">
            {/* Header Section */}
            <section className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-extrabold text-on-surface tracking-tight font-headline">Executive Overview</h2>
                    <p className="text-on-surface-variant mt-1 text-sm font-medium">Real-time metrics for Clinical Sanctuary unit 4A.</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-5 py-2.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant text-sm font-semibold flex items-center gap-2 shadow-sm pointer-events-none">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        {todayFormatted}
                    </button>
                    <button className="px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold shadow-xl shadow-primary/10 flex items-center gap-2 hover:opacity-90 transition-all active:scale-95">
                        <span className="material-symbols-outlined text-[18px]">file_download</span>
                        Export Report
                    </button>
                </div>
            </section>

            {/* Bento Summary Cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Sales */}
                <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-primary transition-transform hover:-translate-y-1 shadow-ambient hover:shadow-lg cursor-pointer">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2.5 bg-secondary-container rounded-lg">
                            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                        </div>
                    </div>
                    <p className="text-on-surface-variant text-sm font-semibold">Total Sales Today</p>
                    <h3 className="text-2xl font-extrabold mt-1 font-headline tracking-tight text-on-surface flex items-baseline">
                        <span className="text-lg mr-0.5 text-on-surface-variant">$</span>
                        {stats.totalSalesToday.toFixed(2)}
                    </h3>
                </div>

                {/* Low Stock */}
                <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-tertiary transition-transform hover:-translate-y-1 shadow-ambient hover:shadow-lg cursor-pointer">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2.5 bg-error-container rounded-lg">
                            <span className="material-symbols-outlined text-tertiary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                        </div>
                        {stats.lowStock > 0 && <span className="text-tertiary text-xs font-bold bg-tertiary/10 px-2 py-1 rounded-full">Urgent</span>}
                    </div>
                    <p className="text-on-surface-variant text-sm font-semibold">Low Stock Count</p>
                    <h3 className="text-2xl font-extrabold mt-1 font-headline tracking-tight text-on-surface">{stats.lowStock}</h3>
                </div>

                {/* Expiring Soon */}
                <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-secondary transition-transform hover:-translate-y-1 shadow-ambient hover:shadow-lg cursor-pointer">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2.5 bg-secondary-container rounded-lg">
                            <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>event_busy</span>
                        </div>
                        {stats.expiringSoon > 0 && <span className="text-on-secondary-container text-xs font-bold bg-secondary-container/50 px-2 py-1 rounded-full">30 Days</span>}
                    </div>
                    <p className="text-on-surface-variant text-sm font-semibold">Expiring Soon</p>
                    <h3 className="text-2xl font-extrabold mt-1 font-headline tracking-tight text-on-surface">{stats.expiringSoon}</h3>
                </div>

                {/* Total Medicines */}
                <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-primary transition-transform hover:-translate-y-1 shadow-ambient hover:shadow-lg cursor-pointer">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-2.5 bg-primary-container/20 rounded-lg">
                            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>medication</span>
                        </div>
                        <span className="text-primary text-xs font-bold bg-primary/10 px-2 py-1 rounded-full">In Sync</span>
                    </div>
                    <p className="text-on-surface-variant text-sm font-semibold">Total Medicines</p>
                    <h3 className="text-2xl font-extrabold mt-1 font-headline tracking-tight text-on-surface">{stats.totalMedicines}</h3>
                </div>
            </section>

            {/* Main Layout Grid */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Transactions (Table) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between pb-1">
                        <h3 className="text-xl font-bold font-headline tracking-tight text-on-surface">Recent Transactions</h3>
                        <Link to="/sales" className="text-primary text-sm font-bold hover:underline cursor-pointer tracking-wider decoration-primary/30 underline-offset-4">View All</Link>
                    </div>
                    <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-ambient border border-outline-variant/10">
                        <table className="w-full text-left">
                            <thead className="bg-surface-container-low border-b border-surface-container">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Patient / ID</th>
                                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Medicine</th>
                                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-container">
                                {recentTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-sm font-medium text-on-surface-variant">
                                            No recent transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    recentTransactions.map((trx) => (
                                        <tr key={trx._id} className="hover:bg-surface-bright transition-colors cursor-pointer group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-on-surface group-hover:text-primary transition-colors">
                                                    {trx.customer?.name || "Walk-in Customer"}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                                                    ID: #{trx.invoice_number}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-on-surface-variant whitespace-nowrap overflow-hidden text-ellipsis max-w-xs">
                                                {trx.items && trx.items.length > 0 
                                                    ? `${trx.items[0].medicine?.name || 'Unknown item'} ${trx.items.length > 1 ? `+${trx.items.length - 1} more` : ''}`
                                                    : 'N/A'
                                                }
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-on-surface">
                                                ${trx.total_amount.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold uppercase tracking-wider">
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

                {/* Quick Links & System Health */}
                <div className="space-y-8">
                    {/* Quick Actions Section */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold font-headline tracking-tight text-on-surface pb-1">Quick Links</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <Link to="/medicines" className="bg-surface-container-lowest border border-outline-variant/10 shadow-sm p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-primary hover:border-transparent hover:text-white group transition-all">
                                <span className="material-symbols-outlined text-primary group-hover:text-white transition-colors" style={{ fontVariationSettings: "'wght' 300" }}>add_circle</span>
                                <span className="text-xs font-bold text-on-surface-variant group-hover:text-white transition-colors">Add Item</span>
                            </Link>
                            <Link to="/sales" className="bg-surface-container-lowest border border-outline-variant/10 shadow-sm p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-primary hover:border-transparent hover:text-white group transition-all">
                                <span className="material-symbols-outlined text-primary group-hover:text-white transition-colors" style={{ fontVariationSettings: "'wght' 300" }}>receipt_long</span>
                                <span className="text-xs font-bold text-on-surface-variant group-hover:text-white transition-colors">Invoices</span>
                            </Link>
                            <Link to="/reports" className="bg-surface-container-lowest border border-outline-variant/10 shadow-sm p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-primary hover:border-transparent hover:text-white group transition-all">
                                <span className="material-symbols-outlined text-primary group-hover:text-white transition-colors" style={{ fontVariationSettings: "'wght' 300" }}>monitor_heart</span>
                                <span className="text-xs font-bold text-on-surface-variant group-hover:text-white transition-colors">Stats</span>
                            </Link>
                            <button className="bg-surface-container-lowest border border-outline-variant/10 shadow-sm p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-primary hover:border-transparent hover:text-white group transition-all">
                                <span className="material-symbols-outlined text-primary group-hover:text-white transition-colors" style={{ fontVariationSettings: "'wght' 300" }}>contact_support</span>
                                <span className="text-xs font-bold text-on-surface-variant group-hover:text-white transition-colors">Support</span>
                            </button>
                        </div>
                    </div>

                    {/* System Insights Card */}
                    <div className="bg-primary text-white p-6 rounded-xl relative overflow-hidden shadow-xl shadow-primary/20">
                        <div className="relative z-10">
                            <h4 className="text-lg font-bold mb-2 font-headline tracking-tight">Inventory Health</h4>
                            <p className="text-primary-fixed text-xs mb-6 opacity-90 leading-relaxed font-medium">
                                {stats.lowStock > 0 
                                    ? `Alert: You have ${stats.lowStock} items running low. Consider restocking them.` 
                                    : 'Your inventory is currently at optimal efficiency. Keep up the good work!'}
                            </p>
                            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                                <div className="bg-white h-full" style={{ width: stats.lowStock > 0 ? '82%' : '100%' }}></div>
                            </div>
                        </div>
                        {/* Abstract Background Decoration */}
                        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute -left-10 -top-10 w-32 h-32 bg-primary-container/30 rounded-full blur-2xl"></div>
                    </div>

                    {/* Upcoming Schedule */}
                    <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 shadow-ambient">
                        <h4 className="text-sm font-bold text-on-surface-variant mb-5 flex items-center gap-2 font-headline uppercase tracking-wider">
                            <span className="material-symbols-outlined text-primary text-lg">assignment</span>
                            Restock Schedule
                        </h4>
                        <div className="space-y-5">
                            <div className="flex items-start gap-4">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1 shadow-sm shadow-primary/50"></div>
                                <div>
                                    <p className="text-sm font-bold text-on-surface">PharmaCorp Delivery</p>
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">Today, 2:00 PM</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-300 mt-1"></div>
                                <div>
                                    <p className="text-sm font-bold text-on-surface">Weekly Audit Check</p>
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">Tomorrow, 9:00 AM</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contextual Floating Action Button */}
            <Link to="/sales" className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-xl shadow-primary/40 hover:bg-primary-container hover:scale-105 active:scale-95 transition-all z-50 group">
                <span className="material-symbols-outlined transition-transform group-hover:rotate-90 duration-300" style={{ fontVariationSettings: "'FILL' 0, 'wght' 600" }}>add</span>
            </Link>
        </div>
    );
};

export default Dashboard;
