import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    Tooltip, 
    CartesianGrid, 
    PieChart, 
    Pie, 
    Cell 
} from 'recharts';

const COLORS = [
    '#0891b2', // Primary Cyan
    '#0284c7', // Sky Blue
    '#059669', // Emerald
    '#b45309', // Amber
    '#d97706', // Orange
    '#10b981', // Emerald-Light
    '#7c3aed', // Purple
    '#db2777', // Pink
    '#0d9488', // Teal
    '#ea580c', // Orange-Red
];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-2xl text-white text-xs font-sans">
                <p className="font-extrabold mb-1 uppercase tracking-wider text-[9px] text-slate-400">{label}</p>
                <p className="font-black text-sm text-cyan-400">${payload[0].value.toFixed(2)}</p>
            </div>
        );
    }
    return null;
};

const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-2xl text-white text-xs font-sans">
                <p className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 mb-1">{data.name}</p>
                <p className="font-black text-sm text-cyan-400">{data.value} Units</p>
            </div>
        );
    }
    return null;
};

const ReportsOverview = () => {
    const [sales, setSales] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('daily');
    const [searchQuery, setSearchQuery] = useState('');
    const [expiryFilterDays, setExpiryFilterDays] = useState(30);

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

    // Stock Report Data
    const stockReportData = medicines.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase()));
        const isLowOrOut = m.quantity < 10;
        return matchesSearch && isLowOrOut;
    });

    // Expiry Report Data
    const expiryReportData = medicines.filter(m => {
        if (!m.expiry_date) return false;
        
        const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const expDate = new Date(m.expiry_date);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return matchesSearch && diffDays <= expiryFilterDays;
    });

    // CSV Export Helpers
    const exportToCSV = (headers, rows, filename) => {
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportCSV = () => {
        if (activeTab === 'stock') {
            const headers = ['Medicine Name', 'Category', 'Quantity', 'Price', 'Supplier', 'Status'];
            const rows = stockReportData.map(m => [
                m.name,
                m.category || 'General',
                m.quantity,
                `$${m.price.toFixed(2)}`,
                m.supplier?.name || 'N/A',
                m.quantity === 0 ? 'Out of Stock' : 'Low Stock'
            ]);
            exportToCSV(headers, rows, 'Stock_Report.csv');
        } else if (activeTab === 'expiry') {
            const headers = ['Medicine Name', 'Category', 'Batch Number', 'Expiry Date', 'Remaining Days', 'Quantity', 'Status'];
            const rows = expiryReportData.map(m => {
                const expDate = new Date(m.expiry_date);
                const diffTime = expDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const status = diffDays <= 0 ? 'Expired' : 'Expiring Soon';
                return [
                    m.name,
                    m.category || 'General',
                    m.batch_number || 'N/A',
                    expDate.toLocaleDateString(),
                    diffDays <= 0 ? 'Expired' : `${diffDays} days`,
                    m.quantity,
                    status
                ];
            });
            exportToCSV(headers, rows, `Expiry_Report_${expiryFilterDays}_Days.csv`);
        }
    };
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

    // Compute category-wise stock share
    const categoryStock = {};
    medicines.forEach(m => {
        const cat = m.category ? m.category.trim() : 'General';
        categoryStock[cat] = (categoryStock[cat] || 0) + m.quantity;
    });

    const pieData = Object.keys(categoryStock)
        .map(cat => ({
            name: cat,
            value: categoryStock[cat]
        }))
        .filter(item => item.value > 0);

    const totalStockQuantity = pieData.reduce((acc, curr) => acc + curr.value, 0);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 font-body">
                <span className="material-symbols-outlined text-4xl text-cyan-600 mb-4 animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                <p className="font-bold text-xs text-slate-400 uppercase tracking-widest">Compiling Analytics Data...</p>
            </div>
        );
    }

    return (
        <div className="p-8 lg:p-12 space-y-10 animate-fade-in font-body bg-slate-50 text-slate-800 min-h-screen print:bg-white print:text-black">
            {/* Page Header & Summary Bento Grid */}
            <section className="space-y-6">
                <div className="border-b border-slate-100 pb-8">
                    <h2 className="text-3xl font-black text-slate-805 tracking-tight font-headline">Reports & Analytics</h2>
                    <p className="text-slate-405 mt-1 text-xs font-semibold tracking-wide uppercase">Real-time performance metrics and pharmaceutical data audit</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Daily Sales Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-b-4 border-b-cyan-600">
                        <div className="flex items-center justify-between mb-4 text-slate-400">
                            <span className="text-[10px] uppercase font-bold tracking-wider">Today's Revenue</span>
                            <span className="material-symbols-outlined text-cyan-600 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                        </div>
                        <div className="text-3xl font-black text-slate-800 font-headline">${todaysRevenue.toFixed(2)}</div>
                        <div className={`flex items-center gap-1 mt-2.5 font-bold text-xs ${revenueTrend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            <span className="material-symbols-outlined text-[15px]">{revenueTrend >= 0 ? 'trending_up' : 'trending_down'}</span>
                            {revenueTrend > 0 ? '+' : ''}{revenueTrend.toFixed(1)}% vs yesterday
                        </div>
                    </div>
                    
                    {/* Stock Health */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-b-4 border-b-emerald-600">
                        <div className="flex items-center justify-between mb-4 text-slate-400">
                            <span className="text-[10px] uppercase font-bold tracking-wider">Inventory Health</span>
                            <span className="material-symbols-outlined text-emerald-600 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                        </div>
                        <div className="text-3xl font-black text-slate-800 font-headline">{inventoryHealth.toFixed(1)}%</div>
                        <div className="mt-4 flex items-center gap-2">
                            <div className="h-1.5 flex-1 bg-slate-105 rounded-full overflow-hidden">
                                <div className={`h-full ${inventoryHealth < 50 ? 'bg-red-500' : inventoryHealth < 80 ? 'bg-amber-500' : 'bg-emerald-600'}`} style={{ width: `${inventoryHealth}%` }}></div>
                            </div>
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                                {inventoryHealth < 50 ? 'Critical' : inventoryHealth < 80 ? 'Warning' : 'Optimal'}
                            </span>
                        </div>
                    </div>
                    
                    {/* Expiry Warning */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-b-4 border-b-rose-605">
                        <div className="flex items-center justify-between mb-4 text-slate-400">
                            <span className="text-[10px] uppercase font-bold tracking-wider">Expiring (30d)</span>
                            <span className="material-symbols-outlined text-rose-600 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                        </div>
                        <div className={`text-3xl font-black text-slate-808 font-headline ${expiringItems > 0 ? 'text-rose-600' : ''}`}>{expiringItems} Items</div>
                        <div className={`flex items-center gap-1 mt-2.5 font-bold text-xs ${expiringItems > 0 ? 'text-rose-605' : 'text-slate-400'}`}>
                            <span className="material-symbols-outlined text-[15px]">{expiringItems > 0 ? 'warning' : 'check_circle'}</span>
                            {expiringItems > 0 ? 'Action required' : 'All clear'}
                        </div>
                    </div>
                    
                    {/* Patient Loyalty */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-b-4 border-b-purple-600">
                        <div className="flex items-center justify-between mb-4 text-slate-400">
                            <span className="text-[10px] uppercase font-bold tracking-wider">Monthly Orders</span>
                            <span className="material-symbols-outlined text-purple-600 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
                        </div>
                        <div className="text-3xl font-black text-slate-800 font-headline">{thisMonthSales.length}</div>
                        <div className="flex items-center gap-1.5 mt-2.5 text-slate-400 text-xs font-bold">
                            <span className="material-symbols-outlined text-[15px]">history</span>
                            Across {uniquePatientsThisMonth} patients
                        </div>
                    </div>
                </div>
            </section>
            
            {/* Report Tabs Section */}
            <section className="bg-white rounded-3xl p-8 space-y-8 shadow-xl shadow-slate-100/50 border border-slate-100">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
                    <nav className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50 shadow-inner">
                        <button 
                            onClick={() => { setActiveTab('daily'); setSearchQuery(''); }}
                            className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all duration-300 ${activeTab === 'daily' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/15' : 'text-slate-500 hover:text-slate-805 hover:bg-slate-50'}`}>
                            Daily Sales
                        </button>
                        <button 
                            onClick={() => { setActiveTab('monthly'); setSearchQuery(''); }}
                            className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all duration-300 ${activeTab === 'monthly' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/15' : 'text-slate-500 hover:text-slate-805 hover:bg-slate-50'}`}>
                            Monthly Sales
                        </button>
                        <button 
                            onClick={() => { setActiveTab('stock'); setSearchQuery(''); }}
                            className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all duration-300 ${activeTab === 'stock' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/15' : 'text-slate-500 hover:text-slate-805 hover:bg-slate-50'}`}>
                            Stock Report
                        </button>
                        <button 
                            onClick={() => { setActiveTab('expiry'); setSearchQuery(''); }}
                            className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all duration-300 ${activeTab === 'expiry' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/15' : 'text-slate-500 hover:text-slate-805 hover:bg-slate-50'}`}>
                            Expiry Report
                        </button>
                    </nav>
                    <div className="flex gap-3">
                        {(activeTab === 'daily' || activeTab === 'monthly') && (
                            <button 
                                onClick={() => window.print()} 
                                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-605/15 text-xs font-bold transition-all active:scale-95 uppercase tracking-wider"
                            >
                                <span className="material-symbols-outlined text-[16px]">print</span>
                                Print Ledger
                            </button>
                        )}
                    </div>
                </div>
                
                {/* ─── SALES PERFORMANCE VIEW (DAILY/MONTHLY) ─── */}
                {(activeTab === 'daily' || activeTab === 'monthly') && (
                    <>
                        {/* Visualizations Module */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                            {/* Sales Performance Area Chart */}
                            <div className="lg:col-span-2 bg-slate-50/50 rounded-2xl p-6 border border-slate-100 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center mb-8">
                                        <div>
                                            <h3 className="text-sm font-extrabold text-slate-800 font-headline">{activeTab === 'monthly' ? 'Monthly' : 'Weekly'} Sales Performance</h3>
                                            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">Revenue chart visualization</p>
                                        </div>
                                    </div>
                                    
                                    <div className="h-[280px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#0891b2" stopOpacity={0.2}/>
                                                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis 
                                                    dataKey="label" 
                                                    tickLine={false} 
                                                    axisLine={false}
                                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                                />
                                                <YAxis 
                                                    tickLine={false} 
                                                    axisLine={false}
                                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                                    tickFormatter={(val) => `$${val}`}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="revenue" 
                                                    stroke="#0891b2" 
                                                    strokeWidth={3} 
                                                    fillOpacity={1} 
                                                    fill="url(#colorRevenue)" 
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Stock Share Doughnut Pie Chart */}
                            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-sm font-extrabold text-slate-800 font-headline">Stock Share by Category</h3>
                                    <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5 mb-6">Units division across stock types</p>
                                    {pieData.length === 0 ? (
                                        <div className="h-[220px] flex flex-col items-center justify-center text-slate-400 font-bold text-xs">
                                            <span className="material-symbols-outlined text-3xl mb-2">inventory_2</span>
                                            No stock data available
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative flex items-center justify-center h-44">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={pieData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={55}
                                                            outerRadius={75}
                                                            paddingAngle={3}
                                                            dataKey="value"
                                                        >
                                                            {pieData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip content={<PieTooltip />} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                                                    <span className="text-xl font-black text-slate-800 font-headline leading-none">{totalStockQuantity}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Units</span>
                                                </div>
                                            </div>
                                            <div className="mt-6 space-y-2 max-h-[100px] overflow-y-auto pr-1">
                                                {pieData.map((entry, index) => {
                                                    const percent = totalStockQuantity > 0 ? ((entry.value / totalStockQuantity) * 100).toFixed(0) : 0;
                                                    return (
                                                        <div key={entry.name} className="flex items-center justify-between text-xs font-semibold">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                                                <span className="text-slate-700 truncate max-w-[120px]">{entry.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-slate-500 font-mono font-medium">{entry.value} Units</span>
                                                                <span className="text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded text-[10px] font-extrabold">{percent}%</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Ledger & Observations Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                            {/* Detailed Ledger Table */}
                            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-105 shadow-sm overflow-hidden flex flex-col">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-sm font-headline">Today's Transactions Ledger</h3>
                                        <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">Logs of complete sales for today</p>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl text-slate-600 shadow-sm">
                                        {todaysTransactions.length} Sales Entries
                                    </span>
                                </div>
                                
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                                <th className="px-6 py-4.5 text-[10px] font-bold uppercase tracking-wider text-slate-405">Order ID</th>
                                                <th className="px-6 py-4.5 text-[10px] font-bold uppercase tracking-wider text-slate-405">Patient Name</th>
                                                <th className="px-6 py-4.5 text-[10px] font-bold uppercase tracking-wider text-slate-405">Top Item</th>
                                                <th className="px-6 py-4.5 text-[10px] font-bold uppercase tracking-wider text-slate-405">Date</th>
                                                <th className="px-6 py-4.5 text-[10px] font-bold uppercase tracking-wider text-slate-405">Status</th>
                                                <th className="px-6 py-4.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-405">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                                            {todaysTransactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium">
                                                        No transactions recorded today.
                                                    </td>
                                                </tr>
                                            ) : (
                                                todaysTransactions.map(s => (
                                                    <tr key={s._id} className="hover:bg-slate-50/30 transition-colors border-l-2 border-l-transparent hover:border-l-cyan-500">
                                                        <td className="px-6 py-4 text-cyan-600 font-extrabold">{s.invoice_number}</td>
                                                        <td className="px-6 py-4 font-bold text-slate-800">{s.customer?.name || 'Unknown'}</td>
                                                        <td className="px-6 py-4 text-slate-500 font-medium truncate max-w-[140px]">{s.items[0]?.medicine?.name || 'Various'}</td>
                                                        <td className="px-6 py-4 font-bold text-slate-400">{new Date(s.date).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100/50 px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">Completed</span>
                                                        </td>
                                                        <td className="px-6 py-4 font-black text-right text-slate-805">${s.total_amount.toFixed(2)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-end gap-x-10 gap-y-4 text-xs font-bold text-slate-500">
                                    <div className="flex items-center gap-3">
                                        <span className="uppercase text-[9px] tracking-wider text-slate-400">Subtotal</span>
                                        <span className="text-slate-700 font-bold">${subtotalCalc.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="uppercase text-[9px] tracking-wider text-slate-400">Tax</span>
                                        <span className="text-slate-700 font-bold">${taxCalc.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center gap-4 pl-8 border-l border-slate-200">
                                        <span className="uppercase text-xs font-extrabold tracking-wider text-slate-808">Grand Total</span>
                                        <span className="text-2xl font-black text-cyan-600 font-headline">${grandCalc.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Key Observations */}
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
                                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Key Observations</h3>
                                <ul className="space-y-6 text-xs font-semibold text-slate-650">
                                    <li className="flex gap-4">
                                        <div className={`w-10 h-10 rounded-xl ${revenueTrend >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 'bg-rose-50 text-rose-600 border border-rose-100/50'} flex items-center justify-center shrink-0`}>
                                            <span className="material-symbols-outlined text-[20px]">{revenueTrend >= 0 ? 'trending_up' : 'trending_down'}</span>
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-slate-800">Revenue Growth</p>
                                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">Sales {revenueTrend >= 0 ? 'increased' : 'decreased'} by {Math.abs(revenueTrend).toFixed(1)}% compared to yesterday.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <div className={`w-10 h-10 rounded-xl ${expiringItems > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100/50' : 'bg-cyan-50 text-cyan-600 border border-cyan-100/50'} flex items-center justify-center shrink-0`}>
                                            <span className="material-symbols-outlined text-[20px]">{expiringItems > 0 ? 'production_quantity_limits' : 'verified'}</span>
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-slate-800">Stock Alerts</p>
                                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">{expiringItems > 0 ? `${expiringItems} items require expiry audit soon.` : 'All pharmaceutical stock is fresh and optimal.'}</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-650 border border-purple-100/50 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[20px]">group</span>
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-slate-800">Patient Reach</p>
                                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">{uniquePatientsThisMonth} distinct patients generated {thisMonthSales.length} orders this month.</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </>
                )}

                {/* ─── STOCK REPORT VIEW ─── */}
                {activeTab === 'stock' && (
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6 animate-fade-in">
                        {/* Header controls */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-sm font-headline">Low Stock & Out of Stock Inventory</h3>
                                <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">Medicines with stock quantity below 10 units</p>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                    <input
                                        type="text"
                                        placeholder="Search medicine or category..."
                                        className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/10 focus:border-cyan-500 text-slate-707 font-medium"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={handleExportCSV}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white shadow-md text-xs font-bold hover:bg-black transition-all whitespace-nowrap active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        {/* Quick stats cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-rose-50 border border-rose-100/50 p-4 rounded-2xl">
                                <p className="text-[9px] uppercase font-bold text-rose-500 tracking-wider">Out of Stock Items</p>
                                <p className="text-2xl font-black text-rose-700 mt-1">
                                    {stockReportData.filter(m => m.quantity === 0).length}
                                </p>
                            </div>
                            <div className="bg-amber-50 border border-amber-100/50 p-4 rounded-2xl">
                                <p className="text-[9px] uppercase font-bold text-amber-600 tracking-wider">Low Stock Items</p>
                                <p className="text-2xl font-black text-amber-700 mt-1">
                                    {stockReportData.filter(m => m.quantity > 0 && m.quantity < 10).length}
                                </p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-100">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-405">
                                        <th className="px-6 py-3.5">Medicine Name</th>
                                        <th className="px-6 py-3.5">Category</th>
                                        <th className="px-6 py-3.5">Supplier</th>
                                        <th className="px-6 py-3.5 text-right">Price</th>
                                        <th className="px-6 py-3.5 text-center">Current Stock</th>
                                        <th className="px-6 py-3.5 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
                                    {stockReportData.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                                No low-stock or out-of-stock items found.
                                            </td>
                                        </tr>
                                    ) : (
                                        stockReportData.map(m => (
                                            <tr key={m._id} className="hover:bg-slate-50/30 transition-colors border-l-2 border-l-transparent hover:border-l-cyan-500">
                                                <td className="px-6 py-4 font-bold text-slate-800">{m.name}</td>
                                                <td className="px-6 py-4 text-slate-500 font-medium">{m.category || 'General'}</td>
                                                <td className="px-6 py-4 text-slate-500 font-medium">{m.supplier?.name || 'N/A'}</td>
                                                <td className="px-6 py-4 font-bold text-right text-slate-805">${m.price.toFixed(2)}</td>
                                                <td className="px-6 py-4 font-black text-center text-slate-900">{m.quantity}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                                        m.quantity === 0 ? 'bg-rose-50 text-rose-700 border border-rose-100/50' : 'bg-amber-50 text-amber-700 border border-amber-100/50'
                                                    }`}>
                                                        {m.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ─── EXPIRY REPORT VIEW ─── */}
                {activeTab === 'expiry' && (
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6 animate-fade-in">
                        {/* Header controls */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="font-extrabold text-slate-805 text-sm font-headline">Medicine Expiry Audit Report</h3>
                                <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">Listing medicines expiring within your selected timeframe</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                                <div className="flex items-center gap-2">
                                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Timeframe:</label>
                                    <select 
                                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/10 transition-all cursor-pointer"
                                        value={expiryFilterDays}
                                        onChange={(e) => setExpiryFilterDays(Number(e.target.value))}
                                    >
                                        <option value={30}>Next 30 Days</option>
                                        <option value={60}>Next 60 Days</option>
                                        <option value={90}>Next 90 Days</option>
                                    </select>
                                </div>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                    <input
                                        type="text"
                                        placeholder="Search medicine or category..."
                                        className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/10 focus:border-cyan-500 text-slate-707 font-medium w-48 md:w-56"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={handleExportCSV}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white shadow-md text-xs font-bold hover:bg-black transition-all whitespace-nowrap active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        {/* Quick stats cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-rose-50 border border-rose-100/50 p-4 rounded-2xl">
                                <p className="text-[9px] uppercase font-bold text-rose-500 tracking-wider">Already Expired</p>
                                <p className="text-2xl font-black text-rose-700 mt-1">
                                    {expiryReportData.filter(m => {
                                        const expDate = new Date(m.expiry_date);
                                        return expDate <= today;
                                    }).length}
                                </p>
                            </div>
                            <div className="bg-amber-50 border border-amber-100/50 p-4 rounded-2xl">
                                <p className="text-[9px] uppercase font-bold text-amber-600 tracking-wider">Expiring Within Window</p>
                                <p className="text-2xl font-black text-amber-700 mt-1">
                                    {expiryReportData.filter(m => {
                                        const expDate = new Date(m.expiry_date);
                                        return expDate > today;
                                    }).length}
                                </p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-100">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-405">
                                        <th className="px-6 py-3.5">Medicine Name</th>
                                        <th className="px-6 py-3.5">Category</th>
                                        <th className="px-6 py-3.5 text-center">Batch Number</th>
                                        <th className="px-6 py-3.5 text-center">Expiry Date</th>
                                        <th className="px-6 py-3.5 text-center">Stock Qty</th>
                                        <th className="px-6 py-3.5 text-center">Time Left</th>
                                        <th className="px-6 py-3.5 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-707 text-xs font-semibold">
                                    {expiryReportData.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                                                No expiring or expired items found in the selected timeframe.
                                            </td>
                                        </tr>
                                    ) : (
                                        expiryReportData.map(m => {
                                            const expDate = new Date(m.expiry_date);
                                            const diffTime = expDate.getTime() - today.getTime();
                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                            const isExpired = diffDays <= 0;
                                            return (
                                                <tr key={m._id} className="hover:bg-slate-50/30 transition-colors border-l-2 border-l-transparent hover:border-l-cyan-500">
                                                    <td className="px-6 py-4 font-bold text-slate-800">{m.name}</td>
                                                    <td className="px-6 py-4 text-slate-500 font-medium">{m.category || 'General'}</td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-500 font-mono">{m.batch_number || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-650">{expDate.toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-center font-black text-slate-900">{m.quantity}</td>
                                                    <td className="px-6 py-4 text-center font-extrabold">
                                                        {isExpired ? (
                                                            <span className="text-rose-600">Expired</span>
                                                        ) : (
                                                            <span className={diffDays <= 30 ? "text-amber-600" : "text-slate-600"}>
                                                                {diffDays} days
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                                            isExpired ? 'bg-rose-50 text-rose-700 border border-rose-100/50' : 'bg-amber-50 text-amber-705 border border-amber-100/50'
                                                        }`}>
                                                            {isExpired ? 'Expired' : 'Expiring Soon'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};

export default ReportsOverview;
