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
    '#00478d', // Primary Clinical Blue
    '#005eb8', // Primary Container Blue
    '#007236', // Dark Clinical Green
    '#793100', // Rust Orange
    '#9f4300', // Orange-Brown
    '#75f999', // Light Clinical Green
    '#9c27b0', // Purple
    '#e91e63', // Pink
    '#00bcd4', // Cyan
    '#ff9800', // Orange
];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-white text-xs font-sans">
                <p className="font-bold mb-1 uppercase tracking-wider text-[10px] text-slate-400">{label}</p>
                <p className="font-extrabold text-sm text-[#75f999]">${payload[0].value.toFixed(2)}</p>
            </div>
        );
    }
    return null;
};

const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-white text-xs font-sans">
                <p className="font-extrabold text-sm uppercase tracking-wider text-[10px] text-slate-400 mb-0.5">{data.name}</p>
                <p className="font-extrabold text-sm text-[#75f999]">{data.value} Units</p>
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
                            onClick={() => { setActiveTab('daily'); setSearchQuery(''); }}
                            className={`${activeTab === 'daily' ? 'border-b-[3px] border-primary text-primary' : 'text-on-surface-variant hover:text-primary hover:border-primary/30 border-transparent border-b-[3px]'} font-bold text-sm pb-4 px-1 transition-all`}>
                            Daily Sales
                        </button>
                        <button 
                            onClick={() => { setActiveTab('monthly'); setSearchQuery(''); }}
                            className={`${activeTab === 'monthly' ? 'border-b-[3px] border-primary text-primary' : 'text-on-surface-variant hover:text-primary hover:border-primary/30 border-transparent border-b-[3px]'} font-bold text-sm pb-4 px-1 transition-all`}>
                            Monthly Sales
                        </button>
                        <button 
                            onClick={() => { setActiveTab('stock'); setSearchQuery(''); }}
                            className={`${activeTab === 'stock' ? 'border-b-[3px] border-primary text-primary' : 'text-on-surface-variant hover:text-primary hover:border-b-[3px] hover:border-primary/30 border-transparent border-b-[3px]'} font-bold text-sm pb-4 px-1 transition-all`}>
                            Stock Report
                        </button>
                        <button 
                            onClick={() => { setActiveTab('expiry'); setSearchQuery(''); }}
                            className={`${activeTab === 'expiry' ? 'border-b-[3px] border-primary text-primary' : 'text-on-surface-variant hover:text-primary hover:border-b-[3px] hover:border-primary/30 border-transparent border-b-[3px]'} font-bold text-sm pb-4 px-1 transition-all`}>
                            Expiry Report
                        </button>
                    </nav>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant text-sm font-bold shadow-sm border border-outline-variant/20 hover:bg-surface-container-high transition-colors">
                            <span className="material-symbols-outlined text-[18px]">filter_list</span>
                            Filters
                        </button>
                        {(activeTab === 'daily' || activeTab === 'monthly') && (
                            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white shadow-xl text-sm font-bold hover:bg-black transition-all">
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                Export PDF
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
                            <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/10 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="text-xl font-bold font-headline">{activeTab === 'monthly' ? 'Monthly' : 'Weekly'} Sales Performance</h3>
                                        <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex gap-4">
                                            <span className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded-full bg-primary shadow-sm"></div> Revenue</span>
                                        </div>
                                    </div>
                                    
                                    <div className="h-[280px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#00478d" stopOpacity={0.25}/>
                                                        <stop offset="95%" stopColor="#00478d" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ebeef4" />
                                                <XAxis 
                                                    dataKey="label" 
                                                    tickLine={false} 
                                                    axisLine={false}
                                                    tick={{ fill: '#424752', fontSize: 11, fontWeight: 'bold' }}
                                                />
                                                <YAxis 
                                                    tickLine={false} 
                                                    axisLine={false}
                                                    tick={{ fill: '#424752', fontSize: 11, fontWeight: 'bold' }}
                                                    tickFormatter={(val) => `$${val}`}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="revenue" 
                                                    stroke="#00478d" 
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
                            <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/10 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xl font-bold font-headline mb-6">Stock Share by Category</h3>
                                    {pieData.length === 0 ? (
                                        <div className="h-[220px] flex flex-col items-center justify-center text-slate-400 font-medium text-xs">
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
                                                            innerRadius={52}
                                                            outerRadius={72}
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
                                                    <span className="text-2xl font-black text-on-surface font-headline leading-none">{totalStockQuantity}</span>
                                                    <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Total Units</span>
                                                </div>
                                            </div>
                                            <div className="mt-4 space-y-2 max-h-[100px] overflow-y-auto pr-1">
                                                {pieData.map((entry, index) => {
                                                    const percent = totalStockQuantity > 0 ? ((entry.value / totalStockQuantity) * 100).toFixed(0) : 0;
                                                    return (
                                                        <div key={entry.name} className="flex items-center justify-between text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                                                <span className="font-bold text-on-surface truncate max-w-[120px]">{entry.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-semibold text-on-surface-variant">{entry.value} Units</span>
                                                                <span className="font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded text-[10px]">{percent}%</span>
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
                            <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl overflow-hidden shadow-ambient ring-1 ring-outline-variant/10 flex flex-col">
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
                                <div className="overflow-y-auto max-h-[350px]">
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

                            {/* Key Observations */}
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
                    </>
                )}

                {/* ─── STOCK REPORT VIEW ─── */}
                {activeTab === 'stock' && (
                    <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-ambient ring-1 ring-outline-variant/10 flex flex-col p-6 space-y-6 animate-fade-in">
                        {/* Header controls */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="font-bold font-headline text-lg text-cyan-900">Low Stock & Out of Stock Inventory</h3>
                                <p className="text-xs text-slate-500 mt-1">Showing all medicines with stock quantity below 10 units.</p>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                                <div className="relative flex-1 md:flex-initial">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                    <input
                                        type="text"
                                        placeholder="Search medicine or category..."
                                        className="w-full md:w-64 bg-slate-50 border border-slate-250 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-slate-800"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={handleExportCSV}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white shadow-md text-xs font-bold hover:bg-black transition-all whitespace-nowrap"
                                >
                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        {/* Quick stats cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
                                <p className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Out of Stock Items</p>
                                <p className="text-2xl font-black text-red-700 mt-1">
                                    {stockReportData.filter(m => m.quantity === 0).length}
                                </p>
                            </div>
                            <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
                                <p className="text-[10px] uppercase font-bold text-orange-600 tracking-wider">Low Stock Items</p>
                                <p className="text-2xl font-black text-orange-700 mt-1">
                                    {stockReportData.filter(m => m.quantity > 0 && m.quantity < 10).length}
                                </p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto rounded-xl border border-slate-200/60">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                        <th className="px-6 py-3.5">Medicine Name</th>
                                        <th className="px-6 py-3.5">Category</th>
                                        <th className="px-6 py-3.5">Supplier</th>
                                        <th className="px-6 py-3.5 text-right">Price</th>
                                        <th className="px-6 py-3.5 text-center">Current Stock</th>
                                        <th className="px-6 py-3.5 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                                    {stockReportData.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-semibold">
                                                No low-stock or out-of-stock items found.
                                            </td>
                                        </tr>
                                    ) : (
                                        stockReportData.map(m => (
                                            <tr key={m._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-900">{m.name}</td>
                                                <td className="px-6 py-4 font-medium text-slate-500">{m.category || 'General'}</td>
                                                <td className="px-6 py-4 font-medium text-slate-500">{m.supplier?.name || 'N/A'}</td>
                                                <td className="px-6 py-4 font-bold text-right text-slate-800">${m.price.toFixed(2)}</td>
                                                <td className="px-6 py-4 font-black text-center text-slate-900">{m.quantity}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                                                        m.quantity === 0 ? 'bg-red-100 text-red-800 border border-red-200/55' : 'bg-orange-100 text-orange-900 border border-orange-200/55'
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
                    <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-ambient ring-1 ring-outline-variant/10 flex flex-col p-6 space-y-6 animate-fade-in">
                        {/* Header controls */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="font-bold font-headline text-lg text-cyan-900">Medicine Expiry Audit Report</h3>
                                <p className="text-xs text-slate-500 mt-1">Listing medicines expiring within your selected timeframe.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Timeframe:</label>
                                    <select 
                                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
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
                                        className="bg-slate-50 border border-slate-250 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 w-48 md:w-56"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={handleExportCSV}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white shadow-md text-xs font-bold hover:bg-black transition-all whitespace-nowrap"
                                >
                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        {/* Quick stats cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
                                <p className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Already Expired</p>
                                <p className="text-2xl font-black text-red-700 mt-1">
                                    {expiryReportData.filter(m => {
                                        const expDate = new Date(m.expiry_date);
                                        return expDate <= today;
                                    }).length}
                                </p>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                                <p className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Expiring Within Window</p>
                                <p className="text-2xl font-black text-amber-700 mt-1">
                                    {expiryReportData.filter(m => {
                                        const expDate = new Date(m.expiry_date);
                                        return expDate > today;
                                    }).length}
                                </p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto rounded-xl border border-slate-200/60">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                        <th className="px-6 py-3.5">Medicine Name</th>
                                        <th className="px-6 py-3.5">Category</th>
                                        <th className="px-6 py-3.5 text-center">Batch Number</th>
                                        <th className="px-6 py-3.5 text-center">Expiry Date</th>
                                        <th className="px-6 py-3.5 text-center">Stock Qty</th>
                                        <th className="px-6 py-3.5 text-center">Time Left</th>
                                        <th className="px-6 py-3.5 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                                    {expiryReportData.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-semibold">
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
                                                <tr key={m._id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-900">{m.name}</td>
                                                    <td className="px-6 py-4 font-medium text-slate-500">{m.category || 'General'}</td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-650">{m.batch_number || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-center font-semibold text-slate-800">{expDate.toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-center font-black text-slate-900">{m.quantity}</td>
                                                    <td className="px-6 py-4 text-center font-bold">
                                                        {isExpired ? (
                                                            <span className="text-red-700">Expired</span>
                                                        ) : (
                                                            <span className={diffDays <= 30 ? "text-orange-700" : "text-slate-600"}>
                                                                {diffDays} days
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                                                            isExpired ? 'bg-red-100 text-red-800 border border-red-200/55' : 'bg-amber-100 text-amber-900 border border-amber-200/55'
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
