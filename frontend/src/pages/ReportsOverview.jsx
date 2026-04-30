import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const ReportsOverview = () => {
    const [sales, setSales] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('daily');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [salesRes, medRes] = await Promise.all([
                api.get('/sales'),
                api.get('/medicines')
            ]);
            // Ensure sales are sorted newest first
            const dataSales = salesRes.data.sort((a, b) => new Date(b.date) - new Date(a.date));
            setSales(dataSales);
            setMedicines(medRes.data);
        } catch (error) {
            console.error("Failed to fetch report data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Today's Revenue and Trend
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todaysSales = sales.filter(s => new Date(s.date) >= today);
    const yesterdaysSales = sales.filter(s => new Date(s.date) >= yesterday && new Date(s.date) < today);

    const todaysRevenue = todaysSales.reduce((acc, s) => acc + s.total_amount, 0);
    const yesterdaysRevenue = yesterdaysSales.reduce((acc, s) => acc + s.total_amount, 0);
    
    let revenueTrend = 0;
    if (yesterdaysRevenue > 0) {
        revenueTrend = ((todaysRevenue - yesterdaysRevenue) / yesterdaysRevenue) * 100;
    } else if (todaysRevenue > 0) {
        revenueTrend = 100;
    }

    // Inventory Health (Items in stock > 0 vs total)
    const inStockItems = medicines.filter(m => m.quantity > 0).length;
    const inventoryHealth = medicines.length > 0 ? (inStockItems / medicines.length) * 100 : 0;

    // Expiry Warning (Items expiring within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    const expiringItems = medicines.filter(m => {
        if (!m.expiry_date) return false;
        const exp = new Date(m.expiry_date);
        return exp >= today && exp <= thirtyDaysFromNow;
    }).length;

    // Monthly Orders (Total this month and Unique Patients)
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthSales = sales.filter(s => new Date(s.date) >= firstDayOfMonth);
    const uniquePatientsThisMonth = new Set(thisMonthSales.map(s => s.customer?._id).filter(id => id)).size;

    // Table computations (All transactions for TODAY)
    const todaysTransactions = sales.filter(s => {
        const d = new Date(s.date);
        d.setHours(0,0,0,0);
        return d.getTime() === today.getTime();
    });
    
    const subtotalCalc = todaysTransactions.reduce((acc, s) => acc + (s.total_amount - s.tax + s.discount), 0);
    const taxCalc = todaysTransactions.reduce((acc, s) => acc + s.tax, 0);
    const grandCalc = todaysTransactions.reduce((acc, s) => acc + s.total_amount, 0);

    // Dynamic Bar Chart (Last 6 months)
    const getLast6Months = () => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push({
                label: d.toLocaleString('default', { month: 'short' }),
                month: d.getMonth(),
                year: d.getFullYear(),
                revenue: 0
            });
        }
        return months;
    };

    const monthlyData = getLast6Months();
    sales.forEach(s => {
        const d = new Date(s.date);
        const md = monthlyData.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
        if (md) md.revenue += s.total_amount;
    });

    const maxRevenueMonth = Math.max(...monthlyData.map(m => m.revenue), 1);

    // Dynamic Bar Chart (Last 7 days)
    const getLast7Days = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            days.push({
                label: d.toLocaleDateString('default', { weekday: 'short' }),
                dateString: d.toDateString(),
                revenue: 0
            });
        }
        return days;
    };

    const dailyData = getLast7Days();
    sales.forEach(s => {
        const d = new Date(s.date).toDateString();
        const dd = dailyData.find(x => x.dateString === d);
        if (dd) dd.revenue += s.total_amount;
    });

    const maxRevenueDay = Math.max(...dailyData.map(d => d.revenue), 1);

    const chartData = activeTab === 'monthly' ? monthlyData : dailyData;
    const maxChartRevenue = activeTab === 'monthly' ? maxRevenueMonth : maxRevenueDay;

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 font-body text-on-surface print:hidden">
                <span className="material-symbols-outlined text-4xl text-primary mb-4 animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                <p className="font-semibold text-sm text-on-surface-variant uppercase tracking-widest">Compiling Analytics Data</p>
            </div>
        );
    }

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10 animate-fade-in print:bg-white print:text-black font-body">
            {/* Page Header & Summary Bento Grid */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Analytics & Insights</h2>
                    <p className="text-on-surface-variant font-body mt-1">Real-time performance metrics and pharmaceutical data audit.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Daily Sales Card */}
                    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-4 border-primary">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-on-surface-variant font-label text-xs uppercase tracking-wider font-bold">Today's Revenue</span>
                            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                        </div>
                        <div className="text-3xl font-bold font-headline">${todaysRevenue.toFixed(2)}</div>
                        <div className={`flex items-center gap-1 mt-2 font-medium text-sm ${revenueTrend >= 0 ? 'text-secondary' : 'text-error'}`}>
                            <span className="material-symbols-outlined text-[16px]">{revenueTrend >= 0 ? 'trending_up' : 'trending_down'}</span>
                            {revenueTrend > 0 ? '+' : ''}{revenueTrend.toFixed(1)}% vs yesterday
                        </div>
                    </div>
                    
                    {/* Stock Health */}
                    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-4 border-secondary">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-on-surface-variant font-label text-xs uppercase tracking-wider font-bold">Inventory Health</span>
                            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                        </div>
                        <div className="text-3xl font-bold font-headline">{inventoryHealth.toFixed(1)}%</div>
                        <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 bg-surface-container rounded-full overflow-hidden">
                                <div className={`h-full ${inventoryHealth < 50 ? 'bg-error' : inventoryHealth < 80 ? 'bg-orange-500' : 'bg-secondary'}`} style={{ width: `${inventoryHealth}%` }}></div>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                                {inventoryHealth < 50 ? 'Critical' : inventoryHealth < 80 ? 'Warning' : 'Optimal'}
                            </span>
                        </div>
                    </div>
                    
                    {/* Expiry Warning */}
                    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-4 border-tertiary">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-on-surface-variant font-label text-xs uppercase tracking-wider font-bold">Expiring (30d)</span>
                            <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                        </div>
                        <div className={`text-3xl font-bold font-headline ${expiringItems > 0 ? 'text-tertiary' : ''}`}>{expiringItems} Items</div>
                        <div className={`flex items-center gap-1 mt-2 font-medium text-sm ${expiringItems > 0 ? 'text-tertiary' : 'text-slate-400'}`}>
                            <span className="material-symbols-outlined text-[16px]">{expiringItems > 0 ? 'warning' : 'check_circle'}</span>
                            {expiringItems > 0 ? 'Action required' : 'All clear'}
                        </div>
                    </div>
                    
                    {/* Patient Loyalty */}
                    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-4 border-primary-container">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-on-surface-variant font-label text-xs uppercase tracking-wider font-bold">Monthly Orders</span>
                            <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
                        </div>
                        <div className="text-3xl font-bold font-headline">{thisMonthSales.length}</div>
                        <div className="flex items-center gap-1 mt-2 text-on-surface-variant text-sm font-medium">
                            <span className="material-symbols-outlined text-[16px]">history</span>
                            Across {uniquePatientsThisMonth} patients
                        </div>
                    </div>
                </div>
            </section>
            
            {/* Report Tabs Section */}
            <section className="bg-surface-container-low rounded-2xl p-8 space-y-8 shadow-ambient">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-outline-variant/20 pb-6">
                    <nav className="flex gap-10">
                        <button 
                            onClick={() => setActiveTab('daily')}
                            className={`${activeTab === 'daily' ? 'border-b-[3px] border-primary text-primary' : 'text-on-surface-variant hover:text-primary hover:border-primary/30 border-transparent border-b-[3px]'} font-bold text-sm pb-4 px-1 transition-all`}>
                            Daily Sales
                        </button>
                        <button 
                            onClick={() => setActiveTab('monthly')}
                            className={`${activeTab === 'monthly' ? 'border-b-[3px] border-primary text-primary' : 'text-on-surface-variant hover:text-primary hover:border-primary/30 border-transparent border-b-[3px]'} font-bold text-sm pb-4 px-1 transition-all`}>
                            Monthly Sales
                        </button>
                        <button className="text-on-surface-variant font-bold text-sm pb-4 px-1 hover:text-primary hover:border-b-[3px] hover:border-primary/30 transition-all border-b-[3px] border-transparent">Stock Report</button>
                        <button className="text-on-surface-variant font-bold text-sm pb-4 px-1 hover:text-primary hover:border-b-[3px] hover:border-primary/30 transition-all border-b-[3px] border-transparent">Expiry Report</button>
                    </nav>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant text-sm font-bold shadow-sm border border-outline-variant/20 hover:bg-surface-container-high transition-colors">
                            <span className="material-symbols-outlined text-[18px]">filter_list</span>
                            Filters
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white shadow-xl text-sm font-bold hover:bg-black transition-all">
                            <span className="material-symbols-outlined text-[18px]">download</span>
                            Export PDF
                        </button>
                    </div>
                </div>
                
                {/* Visualizations Module */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/10">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold font-headline">{activeTab === 'monthly' ? 'Monthly' : 'Weekly'} Sales Performance</h3>
                            <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex gap-4">
                                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-primary rounded-sm shadow-sm"></div> Revenue</span>
                            </div>
                        </div>
                        {/* Dynamic Height CSS Bar Chart */}
                        <div className="h-64 flex items-end justify-between gap-2 px-4 border-b border-outline-variant/30 relative">
                            {/* Horizontal Grid Lines */}
                            <div className="absolute inset-x-0 top-0 h-px bg-slate-200"></div>
                            <div className="absolute inset-x-0 top-1/4 h-px bg-slate-200"></div>
                            <div className="absolute inset-x-0 top-2/4 h-px bg-slate-200"></div>
                            <div className="absolute inset-x-0 top-3/4 h-px bg-slate-200"></div>
                            
                            {chartData.map((mData, idx) => {
                                const revPercent = Math.max((mData.revenue / maxChartRevenue) * 100, 2); // default 2% min height
                                
                                return (
                                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative z-10 h-full justify-end">
                                        <div className="w-full bg-primary/20 rounded-t-lg flex flex-col justify-end" style={{ height: '80%' }}>
                                            <div className="w-full bg-primary rounded-t-lg shadow-sm transition-all duration-500 flex flex-col justify-end" style={{ height: `${revPercent}%` }}>
                                            </div>
                                        </div>
                                        <div className="absolute opacity-0 group-hover:opacity-100 -top-8 bg-slate-900 border text-white text-[10px] py-1 px-2 rounded-md shadow-lg pointer-events-none transition-opacity font-bold z-50 whitespace-nowrap">
                                            Rev: ${mData.revenue.toFixed(0)}
                                        </div>
                                        <span className={`text-[11px] font-bold uppercase tracking-wider ${idx === chartData.length - 1 ? 'text-primary bg-primary/10 px-2 py-0.5 rounded-full tracking-widest' : 'text-on-surface-variant'}`}>{mData.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Report Context Module */}
                    <div className="bg-[#f0f3fa] rounded-2xl p-8 border border-outline-variant/10">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-6">Key Observations</h3>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className={`w-10 h-10 rounded-xl ${revenueTrend >= 0 ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-orange-500/10 text-orange-600 border-orange-500/20'} flex items-center justify-center flex-shrink-0 border`}>
                                    <span className="material-symbols-outlined text-[20px]">{revenueTrend >= 0 ? 'trending_up' : 'trending_down'}</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-on-surface">Revenue Growth</p>
                                    <p className="text-xs font-medium text-slate-500 mt-1">Sales {revenueTrend >= 0 ? 'increased' : 'decreased'} by {Math.abs(revenueTrend).toFixed(1)}% compared to yesterday.</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className={`w-10 h-10 rounded-xl ${expiringItems > 0 ? 'bg-error/10 text-error border-error/20' : 'bg-primary/10 text-primary border-primary/20'} flex items-center justify-center flex-shrink-0 border`}>
                                    <span className="material-symbols-outlined text-[20px]">{expiringItems > 0 ? 'production_quantity_limits' : 'verified'}</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-on-surface">Stock Alerts</p>
                                    <p className="text-xs font-medium text-slate-500 mt-1">{expiringItems > 0 ? `${expiringItems} items require expiry audit soon.` : 'All pharmaceutical stock is fresh and optimal.'}</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary border border-primary/20">
                                    <span className="material-symbols-outlined text-[20px]">group</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-on-surface">Patient Reach</p>
                                    <p className="text-xs font-medium text-slate-500 mt-1">{uniquePatientsThisMonth} distinct patients generated {thisMonthSales.length} orders this month.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Detailed Ledger Table */}
                <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-ambient ring-1 ring-outline-variant/10 flex flex-col">
                    <div className="p-6 border-b border-surface-container flex justify-between items-center">
                        <h3 className="font-bold font-headline text-lg">Today's Transactions Ledger</h3>
                        <span className="text-[11px] font-bold uppercase tracking-widest bg-surface-container-high px-3 py-1.5 rounded-full text-slate-500 shadow-inner">
                            {todaysTransactions.length} Transactions Today
                        </span>
                    </div>
                    {/* Header Table */}
                    <div className="overflow-x-auto w-full">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-surface-container-low text-left border-b border-surface-container w-full">
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant w-[15%]">Order ID</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant w-[20%]">Patient Name</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant w-[25%]">Top Item</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant w-[15%]">Date</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant w-[10%]">Status</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant text-right w-[15%]">Amount</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                    {/* Scrollable Body Container */}
                    <div className="overflow-y-auto max-h-[400px]">
                        <table className="w-full border-collapse">
                            <tbody className="divide-y divide-surface-container">
                                {todaysTransactions.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-sm font-medium">No transactions recorded today.</td></tr>
                                ) : (
                                    todaysTransactions.map(s => (
                                        <tr key={s._id} className="hover:bg-surface-bright transition-colors group">
                                            <td className="px-6 py-4 text-sm font-bold text-primary w-[15%]">{s.invoice_number}</td>
                                            <td className="px-6 py-4 text-sm font-bold w-[20%]">{s.customer?.name || 'Unknown'}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-500 w-[25%]">{s.items[0]?.medicine?.name || 'Various'}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-500 w-[15%]">{new Date(s.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-xs w-[10%]">
                                                <span className="bg-secondary/10 border border-secondary/20 text-secondary px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[10px]">Completed</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-right text-slate-600 w-[15%]">${s.total_amount.toFixed(2)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-6 bg-[#f0f3fa] border-t border-surface-container flex flex-col md:flex-row justify-end gap-10">
                        <div className="text-right flex items-center gap-4">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Subtotal</span>
                            <span className="text-lg font-bold text-slate-600">${subtotalCalc.toFixed(2)}</span>
                        </div>
                        <div className="text-right flex items-center gap-4">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Tax</span>
                            <span className="text-lg font-bold text-slate-600">${taxCalc.toFixed(2)}</span>
                        </div>
                        <div className="text-right flex items-center gap-4 pr-4 border-l border-slate-300 pl-8">
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary">Grand Total</span>
                            <span className="text-2xl font-black text-primary font-headline">${grandCalc.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ReportsOverview;
