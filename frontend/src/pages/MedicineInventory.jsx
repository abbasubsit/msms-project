import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const MedicineInventory = () => {
    const [medicines, setMedicines] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("All Categories");
    
    // Add/Edit Medicine Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null); // null means creating NEW
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        batch_number: '',
        expiry_date: '',
        price: '',
        quantity: '',
        supplier: ''
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    
    // UI States
    const [showFilters, setShowFilters] = useState(false);
    const [sortOrder, setSortOrder] = useState('expiry_asc');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [medRes, supRes] = await Promise.all([
                    api.get('/medicines'),
                    api.get('/suppliers')
                ]);
                setMedicines(medRes.data);
                setSuppliers(supRes.data);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const totalSKU = medicines.length;
    const lowStockCount = medicines.filter(m => m.quantity <= 10).length;
    const expiringSoonCount = medicines.filter(m => {
        if (!m.expiry_date) return false;
        const expDate = new Date(m.expiry_date);
        return expDate > today && expDate <= thirtyDaysFromNow;
    }).length;
    
    const inventoryValue = medicines.reduce((acc, m) => acc + (m.price * m.quantity), 0);

    const formatCompact = (num) => {
        return new Intl.NumberFormat('en-US', { 
            notation: "compact", 
            maximumFractionDigits: 1 
        }).format(num);
    };

    const dynamicCategories = ["All Categories", ...new Set(medicines.map(m => m.category).filter(Boolean))];

    const filteredMedicines = medicines.filter(m => 
        selectedCategory === "All Categories" ? true : m.category === selectedCategory
    );

    const sortedMedicines = [...filteredMedicines].sort((a, b) => {
        const dateA = new Date(a.expiry_date || '9999-12-31');
        const dateB = new Date(b.expiry_date || '9999-12-31');
        
        if (sortOrder === 'expiry_asc') {
            return dateA - dateB;
        } else {
            return dateB - dateA;
        }
    });

    const totalPages = Math.ceil(sortedMedicines.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedMedicines = sortedMedicines.slice(startIndex, startIndex + itemsPerPage);

    const getMedicineStatus = (med) => {
        if (med.quantity <= 10) return "low_stock";
        if (med.expiry_date) {
            const expDate = new Date(med.expiry_date);
            if (expDate <= today) return "expired";
            if (expDate <= thirtyDaysFromNow) return "expiring";
        }
        return "in_stock";
    };

    const handleCreateClick = () => {
        setEditingId(null);
        setFormData({ name: '', category: '', batch_number: '', expiry_date: '', price: '', quantity: '', supplier: '' });
        setShowAddModal(true);
    };

    const handleEditClick = (med) => {
        setEditingId(med._id);
        const [formattedDate] = med.expiry_date ? new Date(med.expiry_date).toISOString().split('T') : [''];
        setFormData({
            name: med.name,
            category: med.category || '',
            batch_number: med.batch_number || '',
            expiry_date: formattedDate,
            price: med.price,
            quantity: med.quantity,
            supplier: med.supplier || ''
        });
        setShowAddModal(true);
    };

    const handleSaveMedicine = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                price: Number(formData.price),
                quantity: Number(formData.quantity)
            };

            if (editingId) {
                // Update Route
                const res = await api.put('/medicines/' + editingId, payload);
                setMedicines(medicines.map(m => m._id === editingId ? res.data : m));
            } else {
                // Create Route
                const res = await api.post('/medicines', payload);
                setMedicines([res.data, ...medicines]);
            }
            
            setShowAddModal(false);
        } catch (error) {
            console.error("Failed to save medicine", error);
            alert("Error processing medicine. Please verify your entries.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportCSV = () => {
        // Generate CSV headers
        const headers = ['Medicine Name', 'Category', 'Batch Number', 'Expiry Date', 'Unit Price ($)', 'Quantity', 'Status'];
        
        // Generate rows from the medicines array
        const csvRows = medicines.map(med => {
            const expDate = med.expiry_date ? new Date(med.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
            
            // Determine status text
            const status = getMedicineStatus(med);
            let statusText = 'In Stock';
            if (status === 'low_stock') statusText = 'Critical Low';
            else if (status === 'expiring') statusText = 'Expiring Soon';
            else if (status === 'expired') statusText = 'Expired';

            // Escape strings with quotes to prevent issues with commas inside the data
            return [
                `"${(med.name || '').replace(/"/g, '""')}"`,
                `"${(med.category || 'N/A').replace(/"/g, '""')}"`,
                `"${(med.batch_number || 'N/A').replace(/"/g, '""')}"`,
                `"${expDate}"`,
                med.price.toFixed(2),
                med.quantity,
                `"${statusText}"`
            ].join(',');
        });

        // Combine into full CSV string
        const csvContent = [headers.join(','), ...csvRows].join('\n');
        
        // Create a blob and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Pharmacy_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 font-body text-on-surface">
                <span className="material-symbols-outlined text-4xl text-primary mb-4 animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                <p className="font-semibold text-sm text-on-surface-variant uppercase tracking-widest">Loading Inventory Space</p>
            </div>
        );
    }

    return (
        <div className="p-10 space-y-8 animate-fade-in relative font-body bg-surface text-on-surface min-h-[calc(100vh-4rem)]">
            <div className="flex justify-between items-end">
                <div>
                    <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
                        <span>Inventory</span>
                        <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                        <span className="text-primary font-bold">Medicine List</span>
                    </nav>
                    <h2 className="text-3xl font-extrabold text-on-surface tracking-tight font-headline">Medicine Inventory</h2>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExportCSV} className="px-5 py-2.5 bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant font-bold text-sm rounded-xl flex items-center gap-2 hover:bg-surface-bright transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-lg">file_download</span>
                        Export CSV
                    </button>
                    <button onClick={handleCreateClick} className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-primary/30 hover:bg-primary-container transition-all active:scale-95">
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'wght' 600" }}>add</span>
                        Add Medicine
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-6">
                <div className="bg-surface-container-highest p-5 rounded-xl border-l-4 border-primary shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total SKU</p>
                    <p className="text-2xl font-extrabold text-primary font-headline tracking-tight">{formatCompact(totalSKU)}</p>
                </div>
                <div className="bg-surface-container-highest p-5 rounded-xl border-l-4 border-tertiary shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Low Stock</p>
                    <p className="text-2xl font-extrabold text-tertiary font-headline tracking-tight">{lowStockCount} Items</p>
                </div>
                <div className="bg-surface-container-highest p-5 rounded-xl border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Expiring Soon</p>
                    <p className="text-2xl font-extrabold text-orange-600 font-headline tracking-tight">{expiringSoonCount} Items</p>
                </div>
                <div className="bg-surface-container-highest p-5 rounded-xl border-l-4 border-secondary shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Inventory Value</p>
                    <div className="text-2xl font-extrabold text-secondary font-headline tracking-tight flex items-baseline">
                        <span className="text-lg mr-0.5">$</span>{formatCompact(inventoryValue)}
                    </div>
                </div>
            </div>

            <div className="flex bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/10">
                <div className="flex flex-wrap items-center gap-3 relative">
                    <button 
                        onClick={() => { setSelectedCategory("All Categories"); setCurrentPage(1); }}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm ${
                            selectedCategory === "All Categories" 
                            ? 'bg-primary text-white shadow-primary/20' 
                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                    >
                        All Categories
                    </button>

                    <div className="relative">
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors text-xs font-bold shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[16px]">filter_list</span>
                            <span className="hidden sm:inline">Category Filter</span>
                            {selectedCategory !== "All Categories" && <span className="ml-1 w-2 h-2 rounded-full bg-primary" />}
                        </button>
                        
                        {showFilters && (
                            <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)}></div>
                            <div className="absolute top-full mt-2 left-0 w-48 bg-surface-lowest shadow-xl rounded-xl border border-outline-variant/20 z-20 py-2 animate-fade-in">
                                {dynamicCategories.filter(c => c !== "All Categories").map(cat => (
                                    <button 
                                        key={cat}
                                        onClick={() => { 
                                            setSelectedCategory(cat); 
                                            setCurrentPage(1);
                                            setShowFilters(false);
                                        }}
                                        className={`w-full text-left px-5 py-2.5 text-xs font-bold hover:bg-surface-container transition-colors ${
                                            selectedCategory === cat ? 'text-primary bg-primary/10' : 'text-on-surface-variant'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                                {dynamicCategories.length <= 1 && (
                                    <div className="px-5 py-2.5 text-xs text-slate-400 italic">No categories yet</div>
                                )}
                            </div>
                            </>
                        )}
                    </div>

                    <button 
                        onClick={() => {
                            setSortOrder(prev => prev === 'expiry_asc' ? 'expiry_desc' : 'expiry_asc');
                            setCurrentPage(1);
                        }}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors text-xs font-bold shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[16px] transition-transform duration-300" style={{ transform: sortOrder === 'expiry_asc' ? 'rotate(0deg)' : 'rotate(180deg)' }}>sort</span>
                        Sort By: Expiry <span className="text-primary/80 hidden sm:inline">{sortOrder === 'expiry_asc' ? '(Sooner)' : '(Later)'}</span>
                    </button>
                </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden ring-1 ring-outline-variant/10">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-surface-container-low border-b border-surface-container">
                            <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest leading-relaxed">Name</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest leading-relaxed">Category</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest leading-relaxed">Batch</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest leading-relaxed">Expiry Date</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest leading-relaxed text-right">Price</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest leading-relaxed text-right">Quantity</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest leading-relaxed text-center">Status</th>
                            <th className="px-4 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest leading-relaxed text-center">Act</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                        {paginatedMedicines.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-8 text-center text-sm font-medium text-on-surface-variant">
                                    No medicines found. Add some inventory to get started!
                                </td>
                            </tr>
                        ) : (
                            paginatedMedicines.map((med) => {
                                const status = getMedicineStatus(med);
                                let rowClass = "hover:bg-surface-bright transition-colors group cursor-pointer";
                                let borderClass = "border-l-2 border-transparent group-hover:border-primary";
                                let badgeJSX = <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-extrabold uppercase tracking-wider">In Stock</span>;

                                if (status === 'low_stock') {
                                    rowClass = "bg-red-50/50 hover:bg-red-50 transition-colors group cursor-pointer";
                                    borderClass = "border-l-2 border-red-500";
                                    badgeJSX = <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm shadow-red-500/10">Critical Low</span>;
                                } else if (status === 'expiring') {
                                    rowClass = "bg-orange-50/50 hover:bg-orange-50 transition-colors group cursor-pointer";
                                    borderClass = "border-l-2 border-orange-500";
                                    badgeJSX = <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] font-extrabold uppercase tracking-wider">Expiring Soon</span>;
                                } else if (status === 'expired') {
                                    rowClass = "bg-surface-container transition-colors group cursor-pointer opacity-70";
                                    borderClass = "border-l-2 border-slate-500";
                                    badgeJSX = <span className="px-3 py-1 bg-slate-300 text-slate-700 rounded-full text-[10px] font-extrabold uppercase tracking-wider">Expired</span>;
                                }

                                return (
                                    <tr key={med._id} className={rowClass}>
                                        <td className={`px-6 py-5 ${borderClass}`}>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-on-surface text-sm group-hover:text-primary transition-colors">{med.name}</span>
                                                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Medicine</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-secondary font-bold">{med.category || 'N/A'}</td>
                                        <td className="px-6 py-5 text-sm font-mono text-slate-500 font-medium">{med.batch_number || 'N/A'}</td>
                                        <td className="px-6 py-5 text-sm text-slate-600 font-medium">
                                            {med.expiry_date ? new Date(med.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                        </td>
                                        <td className="px-6 py-5 text-sm font-bold text-on-surface text-right">${med.price.toFixed(2)}</td>
                                        <td className="px-6 py-5 text-sm font-extrabold text-on-surface text-right tracking-tight">
                                            <span className={status === 'low_stock' ? 'text-red-600' : ''}>{med.quantity} Units</span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            {badgeJSX}
                                        </td>
                                        <td className="px-4 py-5 text-center">
                                            <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditClick(med)} className="w-8 h-8 rounded-full bg-white border border-outline-variant/30 text-slate-400 hover:text-primary hover:bg-primary/5 hover:border-primary/20 flex items-center justify-center transition-all shadow-sm">
                                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>

                <div className="px-6 py-4 bg-surface-container-low flex items-center justify-between border-t border-surface-container">
                    <span className="text-xs text-on-surface-variant font-bold tracking-wide">
                        Showing {sortedMedicines.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, sortedMedicines.length)} of {sortedMedicines.length} medicines
                    </span>
                    <div className="flex items-center gap-1">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 transition-colors disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-lg">chevron_left</span>
                        </button>
                        
                        {[...Array(totalPages)].map((_, i) => (
                            <button 
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                                    currentPage === i + 1 
                                    ? 'bg-primary text-white shadow-sm shadow-primary/30' 
                                    : 'text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        
                        <button 
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 transition-colors disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-lg">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10">
                <div className="col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 flex justify-between items-center relative overflow-hidden shadow-xl">
                    <div className="relative z-10">
                        <h3 className="text-white text-2xl font-extrabold font-headline mb-3 tracking-tight">Automated Inventory Scan</h3>
                        <p className="text-slate-300 text-sm max-w-sm mb-6 font-medium leading-relaxed">AI-driven stock optimization is currently analyzing your usage patterns for next week's restock.</p>
                        <button className="px-6 py-2.5 bg-white text-slate-900 font-extrabold tracking-wider rounded-xl text-sm hover:bg-cyan-50 transition-colors shadow-lg active:scale-95">Run Predictive Analysis</button>
                    </div>
                    <div className="absolute right-0 top-0 h-full w-1/2 md:w-1/3 opacity-20 pointer-events-none mix-blend-screen scale-150 transform translate-x-12">
                        <img alt="medical research background" className="w-full h-full object-cover rounded-full blur-xl" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4aNho2Mq2Nwaf4a46sufNdbSsr9js7HbfC-FgGHc7wCu_Jvbc1J7bc5elEuyOW-9xKcoMMQ8k9xEHIxp1NQJurtZlN5dW0acypL-lCeWninaYv9ltkwJJP-P1wtbyGPBMN-iQS0Hhyzz5vjA9XT3x2hv1tUKkRadywHSFbHtO5WT4yZjHt-7J-XSDitH2RQJXjjd4Mvjrbvz6Qee2dtl77M1uH0YJpNRKXWD04_K000g1TPIDXUwbAPHLY1ufVulcbkqNw5rgXq0"/>
                    </div>
                </div>
                <div className="bg-primary-container/10 p-8 rounded-3xl border border-primary/20 flex flex-col justify-center shadow-lg">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/30">
                            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                        </div>
                        <h4 className="font-extrabold text-primary font-headline tracking-tight text-lg">Compliance Check</h4>
                    </div>
                    <p className="text-on-primary-fixed-variant text-sm leading-relaxed font-semibold">System verified 100% compliant with local pharmacy regulations as of 08:00 AM today.</p>
                </div>
            </div>

            {/* Main Versatile Medicine Modal (Create/Edit) */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-surface-container-lowest w-full max-w-2xl rounded-3xl shadow-2xl border border-outline-variant/20 overflow-hidden flex flex-col max-h-[90vh]">
                        
                        <div className="px-8 py-6 border-b border-surface-container flex justify-between items-center bg-surface-lowest">
                            <div>
                                <h3 className="text-xl font-extrabold text-on-surface font-headline">{editingId ? 'Update Medicine Record' : 'Register New Medicine'}</h3>
                                <p className="text-xs text-on-surface-variant font-medium mt-1 tracking-wide">{editingId ? 'Modify the properties of this existing inventory item' : 'Enter the details to add inventory to the pharmacy database'}</p>
                            </div>
                            <button type="button" onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveMedicine} className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Name */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Medicine Name</label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-surface text-sm border border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-400 font-medium" placeholder="e.g. Amoxicillin 500mg" />
                                </div>
                                {/* Category */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Category</label>
                                    <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-surface text-sm border border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-400 font-medium" placeholder="e.g. Antibiotics" />
                                </div>
                                {/* Batch Number */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Batch Number</label>
                                    <input type="text" value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} className="w-full bg-surface text-sm border border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-400 font-medium" placeholder="e.g. BATCH-001" />
                                </div>
                                {/* Expiry Date */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Expiry Date</label>
                                    <input required type="date" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} className="w-full bg-surface text-sm border border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 outline-none transition-all font-medium text-slate-700" />
                                </div>
                                {/* Price */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Unit Price ($)</label>
                                    <input required type="number" min="0" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-surface text-sm border border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-400 font-bold" placeholder="0.00" />
                                </div>
                                {/* Quantity */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Quantity</label>
                                    <input required type="number" min="0" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full bg-surface text-sm border border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-400 font-bold" placeholder="0" />
                                </div>
                                {/* Supplier */}
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Supplier</label>
                                    <select value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="w-full bg-surface text-sm border border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 outline-none transition-all font-medium text-slate-700">
                                        <option value="">-- Select an active Supplier --</option>
                                        {suppliers.map(s => (
                                            <option key={s._id} value={s._id}>{s.name} - {s.contact_person}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-10 pt-6 border-t border-surface-container flex gap-3 justify-end bg-surface-lowest sticky bottom-0">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-surface-container-high transition-colors">Cancel</button>
                                <button type="submit" disabled={isSaving} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-container shadow-lg shadow-primary/30 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">
                                    {isSaving ? <span className="material-symbols-outlined text-sm animate-spin">autorenew</span> : <span className="material-symbols-outlined text-[18px]">{editingId ? 'save' : 'add_task'}</span>}
                                    {isSaving ? 'Processing...' : (editingId ? 'Save Changes' : 'Add Medicine')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicineInventory;
