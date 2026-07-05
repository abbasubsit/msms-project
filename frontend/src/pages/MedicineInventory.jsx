import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const MedicineInventory = () => {
    const navigate = useNavigate();
    const [medicines, setMedicines] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("All Categories");
    
    // Add/Edit Medicine Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null); // null means creating NEW
    const [originalQuantity, setOriginalQuantity] = useState(0);
    const [qtyError, setQtyError] = useState('');
    const [showReasonDropdown, setShowReasonDropdown] = useState(false);
    const [adjustmentReason, setAdjustmentReason] = useState('');
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
    const lowStockCount = medicines.filter(m => m.quantity <= 10 && m.quantity > 0).length;
    const outOfStockCount = medicines.filter(m => m.quantity <= 0).length;
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
        const qty = Math.max(0, med.quantity ?? 0); // Guard: never treat as negative
        if (qty === 0) return 'out_of_stock';
        if (qty <= 10) return 'low_stock';
        if (med.expiry_date) {
            const expDate = new Date(med.expiry_date);
            if (expDate <= today) return 'expired';
            if (expDate <= thirtyDaysFromNow) return 'expiring';
        }
        return 'in_stock';
    };

    const handleCreateClick = () => {
        setEditingId(null);
        setOriginalQuantity(0);
        setQtyError('');
        setShowReasonDropdown(false);
        setAdjustmentReason('');
        setFormData({ name: '', category: '', batch_number: '', expiry_date: '', price: '', quantity: '0', supplier: '' });
        setShowAddModal(true);
    };

    const handleEditClick = (med) => {
        setEditingId(med._id);
        setOriginalQuantity(med.quantity);
        setQtyError('');
        setShowReasonDropdown(false);
        setAdjustmentReason('');
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

    const handleQtyChange = (val) => {
        const numVal = Number(val);
        setFormData({ ...formData, quantity: val });
        
        if (editingId) {
            if (numVal > originalQuantity) {
                setQtyError("Stock additions must be done through the Purchases / Restocking screen.");
                setShowReasonDropdown(false);
            } else if (numVal < originalQuantity) {
                setQtyError("");
                setShowReasonDropdown(true);
            } else {
                setQtyError("");
                setShowReasonDropdown(false);
            }
        } else {
            // Registering new medicine
            if (numVal > 0) {
                setQtyError("New medicines must be registered with 0 quantity. Add stock later via Purchases.");
            } else {
                setQtyError("");
            }
        }
    };

    const handleRestockRedirect = (med) => {
        navigate('/purchases', { state: { restockMed: med } });
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
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 font-body text-slate-800">
                <span className="material-symbols-outlined text-4xl text-cyan-600 mb-4 animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                <p className="font-semibold text-xs text-slate-400 uppercase tracking-widest">Loading Inventory Space</p>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 animate-fade-in relative font-body bg-[#f8fafc] text-slate-800 min-h-screen">
            {/* Header Section */}
            <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
                <div>
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                        <span>Inventory</span>
                        <span className="material-symbols-outlined text-[10px] text-slate-350">chevron_right</span>
                        <span className="text-cyan-600 font-bold">Medicine List</span>
                    </nav>
                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight font-headline">Medicine Inventory</h2>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExportCSV} className="px-4 py-2 bg-white border border-slate-200/60 text-slate-650 font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-base">file_download</span>
                        Export CSV
                    </button>
                    <button onClick={handleCreateClick} className="px-4 py-2 bg-cyan-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-600/10 hover:bg-cyan-700 transition-all active:scale-95">
                        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'wght' 600" }}>add</span>
                        Add Medicine
                    </button>
                </div>
            </section>

            {/* Bento Stats Summary */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total SKU */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-305 group cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl border border-cyan-100/50 group-hover:bg-cyan-600 group-hover:text-white transition-colors duration-300">
                            <span className="material-symbols-outlined text-lg block" style={{ fontVariationSettings: "'FILL' 1" }}>inventory</span>
                        </div>
                    </div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total SKUs</p>
                    <h3 className="text-xl font-extrabold mt-1 font-headline tracking-tight text-slate-850">
                        {formatCompact(totalSKU)} Items
                    </h3>
                </div>

                {/* Low Stock */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-305 group cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                        <div className={`p-2.5 rounded-xl border transition-colors duration-300 ${
                            lowStockCount > 0 
                                ? 'bg-amber-50 text-amber-600 border-amber-100/50 group-hover:bg-amber-650 group-hover:text-white' 
                                : 'bg-slate-50 text-slate-400 border-slate-100/50'
                        }`}>
                            <span className="material-symbols-outlined text-lg block" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                        </div>
                        {lowStockCount > 0 && (
                            <span className="text-[8px] text-amber-700 font-extrabold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                Reorder
                            </span>
                        )}
                    </div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Low Stock</p>
                    <h3 className={`text-xl font-extrabold mt-1 font-headline tracking-tight ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-805'}`}>
                        {lowStockCount} Items
                    </h3>
                </div>

                {/* Out of Stock */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-305 group cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                        <div className={`p-2.5 rounded-xl border transition-colors duration-300 ${
                            outOfStockCount > 0 
                                ? 'bg-red-50 text-red-600 border-red-100/50 group-hover:bg-red-650 group-hover:text-white' 
                                : 'bg-slate-50 text-slate-400 border-slate-100/50'
                        }`}>
                            <span className="material-symbols-outlined text-lg block" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                        </div>
                        {outOfStockCount > 0 && (
                            <span className="text-[8px] text-red-750 font-extrabold bg-red-50 border border-red-150 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Urgent
                            </span>
                        )}
                    </div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Out of Stock</p>
                    <h3 className={`text-xl font-extrabold mt-1 font-headline tracking-tight ${outOfStockCount > 0 ? 'text-red-600' : 'text-slate-805'}`}>
                        {outOfStockCount} Items
                    </h3>
                </div>

                {/* Expiring Soon */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-305 group cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                        <div className={`p-2.5 rounded-xl border transition-colors duration-300 ${
                            expiringSoonCount > 0 
                                ? 'bg-purple-50 text-purple-600 border-purple-100/50 group-hover:bg-purple-650 group-hover:text-white' 
                                : 'bg-slate-50 text-slate-400 border-slate-100/50'
                        }`}>
                            <span className="material-symbols-outlined text-lg block" style={{ fontVariationSettings: "'FILL' 1" }}>event_busy</span>
                        </div>
                        {expiringSoonCount > 0 && (
                            <span className="text-[8px] text-purple-755 font-extrabold bg-purple-50 border border-purple-150 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                30 Days
                            </span>
                        )}
                    </div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Expiring Soon</p>
                    <h3 className={`text-xl font-extrabold mt-1 font-headline tracking-tight ${expiringSoonCount > 0 ? 'text-purple-650' : 'text-slate-805'}`}>
                        {expiringSoonCount} Items
                    </h3>
                </div>
            </section>

            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-wrap items-center gap-2 relative">
                    <button 
                        onClick={() => { setSelectedCategory("All Categories"); setCurrentPage(1); }}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 shadow-sm ${
                            selectedCategory === "All Categories" 
                            ? 'bg-cyan-600 text-white shadow-cyan-600/10' 
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-655 border border-slate-200/50'
                        }`}
                    >
                        All Categories
                    </button>

                    <div className="relative">
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200/50 text-slate-655 hover:bg-slate-100 transition-colors text-xs font-bold shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[16px] text-slate-450">filter_list</span>
                            <span>Category Filter</span>
                            {selectedCategory !== "All Categories" && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-cyan-500" />}
                        </button>
                        
                        {showFilters && (
                            <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)}></div>
                            <div className="absolute top-full mt-2 left-0 w-48 bg-white shadow-xl rounded-xl border border-slate-100 z-20 py-1.5 animate-fade-in">
                                {dynamicCategories.filter(c => c !== "All Categories").map(cat => (
                                    <button 
                                        key={cat}
                                        onClick={() => { 
                                            setSelectedCategory(cat); 
                                            setCurrentPage(1);
                                            setShowFilters(false);
                                        }}
                                        className={`w-full text-left px-5 py-2 text-xs font-bold hover:bg-slate-50 transition-colors ${
                                            selectedCategory === cat ? 'text-cyan-600 bg-cyan-50/40' : 'text-slate-600'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                                {dynamicCategories.length <= 1 && (
                                    <div className="px-5 py-2 text-xs text-slate-400 italic">No categories yet</div>
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
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200/50 text-slate-655 hover:bg-slate-100 transition-colors text-xs font-bold shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[16px] text-slate-450 transition-transform duration-300" style={{ transform: sortOrder === 'expiry_asc' ? 'rotate(0deg)' : 'rotate(180deg)' }}>sort</span>
                        <span>Sort: Expiry {sortOrder === 'expiry_asc' ? '(Sooner)' : '(Later)'}</span>
                    </button>
                </div>
            </div>

            {/* Medicine Catalog Table */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batch</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expiry Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Price</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Quantity</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Act</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedMedicines.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-8 text-center text-xs font-semibold text-slate-400">
                                        No medicines found. Add some inventory to get started!
                                    </td>
                                </tr>
                            ) : (
                                paginatedMedicines.map((med) => {
                                    const status = getMedicineStatus(med);
                                    let borderClass = "border-l-4 border-transparent group-hover:border-cyan-500";
                                    let badgeJSX = <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-[9px] font-extrabold uppercase tracking-wider">In Stock</span>;

                                    if (status === 'out_of_stock') {
                                        borderClass = "border-l-4 border-red-500";
                                        badgeJSX = <span className="px-2.5 py-1 bg-red-550/10 text-red-650 border border-red-500/20 rounded-full text-[9px] font-extrabold uppercase tracking-wider">Out of Stock</span>;
                                    } else if (status === 'low_stock') {
                                        borderClass = "border-l-4 border-amber-500";
                                        badgeJSX = <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-sm shadow-amber-500/5">Critical Low</span>;
                                    } else if (status === 'expiring') {
                                        borderClass = "border-l-4 border-purple-400";
                                        badgeJSX = <span className="px-2.5 py-1 bg-purple-500/10 text-purple-600 border border-purple-500/20 rounded-full text-[9px] font-extrabold uppercase tracking-wider">Expiring Soon</span>;
                                    } else if (status === 'expired') {
                                        borderClass = "border-l-4 border-slate-400";
                                        badgeJSX = <span className="px-2.5 py-1 bg-slate-500/10 text-slate-600 border border-slate-500/20 rounded-full text-[9px] font-extrabold uppercase tracking-wider">Expired</span>;
                                    }

                                    return (
                                        <tr key={med._id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                                            <td className={`px-6 py-4.5 flex items-center gap-3 ${borderClass} transition-all`}>
                                                <div className="w-8 h-8 rounded-full bg-slate-105 text-cyan-600 font-bold text-xs flex items-center justify-center border border-slate-200/40 shrink-0">
                                                    <span className="material-symbols-outlined text-[18px]">medication</span>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-slate-805 text-xs truncate group-hover:text-cyan-600 transition-colors">{med.name}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Medicine</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4.5 text-xs text-slate-600 font-bold">{med.category || 'N/A'}</td>
                                            <td className="px-6 py-4.5 text-xs font-mono text-slate-500 font-medium">{med.batch_number || 'N/A'}</td>
                                            <td className="px-6 py-4.5 text-xs text-slate-655 font-medium">
                                                {med.expiry_date ? new Date(med.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4.5 text-xs font-extrabold text-slate-800 text-right">${med.price.toFixed(2)}</td>
                                            <td className="px-6 py-4.5 text-xs font-extrabold text-slate-800 text-right tracking-tight">
                                                <span className={status === 'out_of_stock' ? 'text-red-650' : status === 'low_stock' ? 'text-amber-600' : ''}>
                                                    {Math.max(0, med.quantity)} Units
                                                </span>
                                            </td>
                                            <td className="px-6 py-4.5 text-center">
                                                {badgeJSX}
                                            </td>
                                            <td className="px-4 py-4.5 text-center">
                                                <div className="flex justify-center items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => handleRestockRedirect(med)} 
                                                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-cyan-600 hover:border-cyan-500/30 flex items-center justify-center transition-all shadow-sm"
                                                        title="Restock / Purchase"
                                                    >
                                                        <span className="material-symbols-outlined text-[15px]">local_shipping</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleEditClick(med)} 
                                                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-cyan-600 hover:border-cyan-500/30 flex items-center justify-center transition-all shadow-sm"
                                                        title="Edit Record"
                                                    >
                                                        <span className="material-symbols-outlined text-[15px]">edit</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-t border-slate-100">
                    <span className="text-xs text-slate-400 font-bold tracking-wide">
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
                                    ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30' 
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

            {/* Bottom info section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10">
                <div className="col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 flex justify-between items-center relative overflow-hidden shadow-xl shadow-slate-900/10">
                    <div className="relative z-10">
                        <h3 className="text-white text-xl font-extrabold font-headline mb-3 tracking-tight">Automated Inventory Scan</h3>
                        <p className="text-slate-350 text-xs max-w-sm mb-6 font-medium leading-relaxed">AI-driven stock optimization is currently analyzing your usage patterns for next week's restock.</p>
                        <button className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-905 font-bold tracking-wider rounded-xl text-xs transition-colors shadow-lg active:scale-95">Run Predictive Analysis</button>
                    </div>
                    <div className="absolute right-0 top-0 h-full w-1/2 md:w-1/3 opacity-20 pointer-events-none mix-blend-screen scale-150 transform translate-x-12">
                        <img alt="medical research background" className="w-full h-full object-cover rounded-full blur-xl" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4aNho2Mq2Nwaf4a46sufNdbSsr9js7HbfC-FgGHc7wCu_Jvbc1J7bc5elEuyOW-9xKcoMMQ8k9xEHIxp1NQJurtZlN5dW0acypL-lCeWninaYv9ltkwJJP-P1wtbyGPBMN-iQS0Hhyzz5vjA9XT3x2hv1tUKkRadywHSFbHtO5WT4yZjHt-7J-XSDitH2RQJXjjd4Mvjrbvz6Qee2dtl77M1uH0YJpNRKXWD04_K000g1TPIDXUwbAPHLY1ufVulcbkqNw5rgXq0"/>
                    </div>
                </div>
                <div className="bg-cyan-500/5 p-8 rounded-3xl border border-cyan-500/10 flex flex-col justify-center shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-11 h-11 rounded-2xl bg-cyan-600 flex items-center justify-center text-white shadow-md shadow-cyan-600/15">
                            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                        </div>
                        <h4 className="font-extrabold text-cyan-700 font-headline tracking-tight text-base">Compliance Check</h4>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed font-semibold">System verified 100% compliant with local pharmacy regulations as of 08:00 AM today.</p>
                </div>
            </div>

            {/* Main Versatile Medicine Modal (Create/Edit) */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
                        
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-805 font-headline">{editingId ? 'Update Medicine Record' : 'Register New Medicine'}</h3>
                                <p className="text-xs text-slate-400 font-medium mt-1 tracking-wide">{editingId ? 'Modify the properties of this existing inventory item' : 'Enter the details to add inventory to the pharmacy database'}</p>
                            </div>
                            <button type="button" onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveMedicine} className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Name */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Medicine Name</label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 text-slate-700 text-xs border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-400 font-medium" placeholder="e.g. Amoxicillin 500mg" />
                                </div>
                                {/* Category */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Category</label>
                                    <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 text-slate-700 text-xs border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-400 font-medium" placeholder="e.g. Antibiotics" />
                                </div>
                                {/* Batch Number */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Batch Number</label>
                                    <input type="text" value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} className="w-full bg-slate-50 text-slate-700 text-xs border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-400 font-medium" placeholder="e.g. BATCH-001" />
                                </div>
                                {/* Expiry Date */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Expiry Date</label>
                                    <input required type="date" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} className="w-full bg-slate-50 text-slate-700 text-xs border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl px-4 py-3 outline-none transition-all font-medium text-slate-600" />
                                </div>
                                {/* Price */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Unit Price ($)</label>
                                    <input required type="number" min="0" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-slate-50 text-slate-750 text-xs border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-400 font-bold" placeholder="0.00" />
                                </div>
                                {/* Quantity */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Quantity</label>
                                    <input 
                                        required 
                                        type="number" 
                                        min="0" 
                                        value={formData.quantity} 
                                        onChange={e => handleQtyChange(e.target.value)} 
                                        className={`w-full bg-slate-50 text-slate-750 text-xs border rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-400 font-bold ${
                                            qtyError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10'
                                        }`} 
                                        placeholder="0" 
                                    />
                                    {qtyError && (
                                        <p className="text-red-500 text-[10px] mt-1 font-semibold">{qtyError}</p>
                                    )}
                                </div>

                                {/* Stock Correction Reason */}
                                {showReasonDropdown && (
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <label className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Correction Reason *</label>
                                        <select 
                                            required 
                                            value={adjustmentReason} 
                                            onChange={e => setAdjustmentReason(e.target.value)} 
                                            className="w-full bg-slate-50 text-slate-700 text-xs border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl px-4 py-3 outline-none transition-all font-medium text-slate-600"
                                        >
                                            <option value="">-- Select correction reason --</option>
                                            <option value="damaged">Damaged / Broken Stocks</option>
                                            <option value="expired">Expired Stock Disposal</option>
                                            <option value="theft">Theft / Discrepancy</option>
                                            <option value="audit">Audit Correction (Counting error)</option>
                                        </select>
                                    </div>
                                )}
                                {/* Supplier */}
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Supplier</label>
                                    <select value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="w-full bg-slate-50 text-slate-700 text-xs border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl px-4 py-3 outline-none transition-all font-medium text-slate-650">
                                        <option value="">-- Select an active Supplier --</option>
                                        {suppliers.map(s => (
                                            <option key={s._id} value={s._id}>{s.name} - {s.contact_person}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-10 pt-6 border-t border-slate-100 flex gap-3 justify-end bg-white sticky bottom-0">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={isSaving || !!qtyError || (showReasonDropdown && !adjustmentReason)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 shadow-md shadow-cyan-600/15 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">
                                    {isSaving ? <span className="material-symbols-outlined text-sm animate-spin">autorenew</span> : <span className="material-symbols-outlined text-[16px]">{editingId ? 'save' : 'add_task'}</span>}
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
