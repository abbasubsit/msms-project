import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const CustomersList = () => {
    const [customers, setCustomers] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Patient Add Form State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newPatient, setNewPatient] = useState({ name: '', contact: '' });
    const [isSavingPatient, setIsSavingPatient] = useState(false);
    const [editingCustomerId, setEditingCustomerId] = useState(null);

    // Invoice Form State
    const [invoiceCustomer, setInvoiceCustomer] = useState(null);
    const [invoiceItems, setInvoiceItems] = useState([{ medicineId: '', name: '', quantity: 1, maxQty: 0, price: 0, searchQuery: '', showDropdown: false }]);
    const [discount, setDiscount] = useState(0);
    const [isSavingInvoice, setIsSavingInvoice] = useState(false);
    const [editingSaleId, setEditingSaleId] = useState(null);

    // Print Receipt State
    const [printSaleData, setPrintSaleData] = useState(null);

    // History State
    const [historyCustomer, setHistoryCustomer] = useState(null);
    const [customerHistorySales, setCustomerHistorySales] = useState(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [custRes, medRes] = await Promise.all([
                api.get('/customers'),
                api.get('/medicines')
            ]);
            setCustomers(custRes.data);
            setMedicines(medRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Patient logic
    const handleRegisterPatient = async (e) => {
        e.preventDefault();
        setIsSavingPatient(true);
        try {
            if (editingCustomerId) {
                const res = await api.put(`/customers/${editingCustomerId}`, newPatient);
                setCustomers(customers.map(c => c._id === editingCustomerId ? res.data : c));
            } else {
                const res = await api.post('/customers', newPatient);
                setCustomers([res.data, ...customers]);
            }
            setShowAddModal(false);
            setNewPatient({ name: '', contact: '' });
            setEditingCustomerId(null);
        } catch (error) {
            alert('Failed to save patient');
        } finally {
            setIsSavingPatient(false);
        }
    };

    // View History logic
    const handleViewHistory = async (cust) => {
        setHistoryCustomer(cust);
        setIsLoadingHistory(true);
        try {
            const res = await api.get(`/customers/${cust._id}/history`);
            setCustomerHistorySales(res.data);
        } catch(err) {
            alert("Failed to load history");
            setHistoryCustomer(null);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // Invoice logic
    const handleAddRow = () => setInvoiceItems([...invoiceItems, { medicineId: '', name: '', quantity: 1, maxQty: 0, price: 0, searchQuery: '', showDropdown: false }]);
    const handleRemoveRow = (idx) => setInvoiceItems(invoiceItems.filter((_, i) => i !== idx));

    const handleMedicineSelect = (idx, medicineId, name) => {
        const med = medicines.find(m => m._id === medicineId);
        const updated = [...invoiceItems];
        updated[idx] = { 
            ...updated[idx],
            medicineId, 
            name,
            searchQuery: name,
            quantity: 1, 
            price: med ? med.price : 0, 
            maxQty: med ? med.quantity : 0,
            showDropdown: false
        };
        setInvoiceItems(updated);
    };

    const handleSearchQueryChange = (idx, query) => {
        const updated = [...invoiceItems];
        updated[idx].searchQuery = query;
        updated[idx].showDropdown = true;
        if (query !== updated[idx].name) {
             updated[idx].medicineId = '';
        }
        setInvoiceItems(updated);
    };

    const handleDropdownToggle = (idx, show) => {
        const updated = [...invoiceItems];
        updated[idx].showDropdown = show;
        setInvoiceItems(updated);
    };

    const handleQuantityChange = (idx, qty) => {
        const updated = [...invoiceItems];
        updated[idx].quantity = parseInt(qty) || 1;
        setInvoiceItems(updated);
    };

    const invoiceSubtotal = invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const invoiceTax = invoiceSubtotal * 0.05;
    const invoiceTotal = invoiceSubtotal + invoiceTax - Number(discount || 0);

    const handleGenerateInvoice = async (e) => {
        e.preventDefault();
        if (invoiceItems.some(i => !i.medicineId || i.quantity <= 0)) {
            return alert('Please fill out medicine items correctly.');
        }

        setIsSavingInvoice(true);
        try {
            const payload = {
                customer: invoiceCustomer._id,
                items: invoiceItems.map(i => ({ medicine: i.medicineId, quantity: i.quantity })),
                discount: Number(discount || 0)
            };

            let res;
            if (editingSaleId) {
                res = await api.put(`/sales/${editingSaleId}`, payload);
            } else {
                res = await api.post('/sales', payload);
            }
            
            // Build rich print data for UI without another backend call
            const populatedItems = payload.items.map(pItem => {
                const med = medicines.find(m => m._id === pItem.medicine);
                return { medicine: med, quantity: pItem.quantity, price: med.price };
            });
            const enrichedSale = { ...res.data, customer: invoiceCustomer, items: populatedItems };

            // Reset UI and show Print Receipt Modal
            setInvoiceCustomer(null);
            setInvoiceItems([{ medicineId: '', name: '', quantity: 1, maxQty: 0, price: 0, searchQuery: '', showDropdown: false }]);
            setDiscount(0);
            setEditingSaleId(null);
            
            // Refresh inventory state
            fetchData(); 

            setPrintSaleData(enrichedSale);
        } catch (error) {
            console.error(error);
            const errMsg = error.response?.data?.message || error.message || 'Error generating invoice';
            alert('Failed to process: ' + errMsg);
        } finally {
            setIsSavingInvoice(false);
        }
    };


    const handleEditSale = (sale) => {
        setEditingSaleId(sale._id);
        setInvoiceCustomer(historyCustomer);
        setDiscount(sale.discount || 0);

        const mappedItems = sale.items.map(item => ({
            medicineId: item.medicine?._id || '',
            name: item.medicine?.name || 'Unknown',
            searchQuery: item.medicine?.name || 'Unknown',
            quantity: item.quantity,
            price: item.price,
            maxQty: (item.medicine?.quantity || 0) + item.quantity,
            showDropdown: false
        }));

        setInvoiceItems(mappedItems.length > 0 ? mappedItems : [{ medicineId: '', name: '', quantity: 1, maxQty: 0, price: 0, searchQuery: '', showDropdown: false }]);
        
        setHistoryCustomer(null);
        setCustomerHistorySales(null);
    };

    // Computations filtering
    const totalCustomers = customers.length;
    const newThisMonth = customers.filter(c => {
        const date = new Date(c.createdAt || new Date());
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    const filteredCustomers = customers.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.contact && c.contact.includes(searchTerm))
    );

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 font-body">
                <span className="material-symbols-outlined text-4xl text-cyan-600 mb-4 animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                <p className="font-bold text-xs text-slate-400 uppercase tracking-widest">Loading Patient Registry...</p>
            </div>
        );
    }

    return (
        <>
            {/* MAIN APP CONTAINER */}
            <div className={`p-8 lg:p-12 space-y-10 relative font-body bg-slate-50 text-slate-800 min-h-screen print:hidden ${showAddModal || invoiceCustomer || printSaleData ? 'animate-none' : 'animate-fade-in'}`}>
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8">
                    <div>
                        <h2 className="text-3xl font-black text-slate-805 tracking-tight font-headline">Patient Registry</h2>
                        <p className="text-slate-405 mt-1 text-xs font-semibold tracking-wide uppercase">Manage patient files, treatment history, and ledger accounts</p>
                    </div>
                    <button 
                        onClick={() => { setShowAddModal(true); setNewPatient({name: '', contact: ''}); setEditingCustomerId(null); }} 
                        className="px-5 py-3.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-cyan-600/15 transition-all active:scale-95 text-xs uppercase tracking-wider"
                    >
                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                        New Patient File
                    </button>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Patients</p>
                        <p className="text-3xl font-black text-slate-800 font-headline tracking-tight">{totalCustomers}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">New Registrations (Month)</p>
                        <p className="text-3xl font-black text-emerald-600 font-headline tracking-tight">+{newThisMonth}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Registry Status</p>
                            <span className="text-xs font-bold text-slate-500">Fully Encrypted</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>health_and_safety</span>
                        </div>
                    </div>
                </div>

                {/* Filter */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-wrap gap-4 shadow-sm items-center justify-between">
                    <div className="relative w-full max-w-md">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input 
                            type="text" 
                            placeholder="Search patients by name or contact..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 text-slate-707 text-xs border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-505/10 rounded-2xl outline-none transition-all placeholder:text-slate-405 font-medium"
                        />
                    </div>
                </div>

                {/* Patient Table */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-8 py-4.5 text-[10px] font-bold text-slate-405 uppercase tracking-wider">Patient Details</th>
                                <th className="px-8 py-4.5 text-[10px] font-bold text-slate-405 uppercase tracking-wider">Contact Information</th>
                                <th className="px-8 py-4.5 text-center text-[10px] font-bold text-slate-405 uppercase tracking-wider">File Status</th>
                                <th className="px-8 py-4.5 text-right text-[10px] font-bold text-slate-405 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                            {filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-8 py-16 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">person_off</span>
                                            <p className="text-sm font-semibold">No patients found in directory.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map((cust) => (
                                    <tr key={cust._id} className="hover:bg-slate-50/30 transition-colors border-l-2 border-l-transparent hover:border-l-cyan-500 group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-650 flex items-center justify-center font-bold text-sm shrink-0">
                                                    {cust.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-extrabold text-slate-800 truncate max-w-[180px] leading-tight">{cust.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 font-mono">FILE: {cust._id.substring(cust._id.length - 6).toUpperCase()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2 text-slate-500 font-medium">
                                                <span className="material-symbols-outlined text-[16px] text-slate-400">call</span>
                                                {cust.contact || "N/A"}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100/50 text-[9px] font-bold uppercase tracking-wider">
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                {/* EDIT Patient */}
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingCustomerId(cust._id);
                                                        setNewPatient({ name: cust.name, contact: cust.contact });
                                                        setShowAddModal(true);
                                                    }} 
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                                                    title="Edit Patient Data"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                {/* VIEW HISTORY */}
                                                <button 
                                                    onClick={() => handleViewHistory(cust)} 
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-cyan-650 hover:bg-cyan-50 transition-colors"
                                                    title="View Medical Ledger"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">history</span>
                                                </button>
                                                {/* GENERATE INVOICE */}
                                                <button 
                                                    onClick={() => setInvoiceCustomer(cust)} 
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                    title="Complete POS Sale"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* REGISTER PATIENT MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in print:hidden">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-extrabold text-slate-800 text-base font-headline">{editingCustomerId ? 'Edit Patient File' : 'Create Patient File'}</h3>
                            <button onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-655 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <form className="p-8 space-y-5" onSubmit={handleRegisterPatient}>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider ml-1">Patient Full Name *</label>
                                <input value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} required type="text" className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-505/10 rounded-xl px-4 py-3.5 outline-none text-xs font-bold text-slate-700 transition-all placeholder:text-slate-405" placeholder="E.g. John Doe" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider ml-1">Contact Number *</label>
                                <input value={newPatient.contact} onChange={e => setNewPatient({...newPatient, contact: e.target.value})} required type="text" className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-550/10 rounded-xl px-4 py-3.5 outline-none text-xs font-bold text-slate-700 transition-all placeholder:text-slate-405" placeholder="E.g. +92 300 1234567" />
                            </div>
                            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                                <button type="submit" disabled={isSavingPatient} className="flex-1 py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-xs shadow-md shadow-cyan-600/10 transition-all disabled:opacity-50 flex justify-center items-center gap-1.5 uppercase tracking-wider active:scale-95">
                                    {isSavingPatient ? <span className="material-symbols-outlined animate-spin text-[18px]">sync</span> : (editingCustomerId ? 'Update File' : 'Create File')}
                                </button>
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-3 border border-slate-200 text-slate-505 font-bold rounded-xl hover:bg-slate-50 transition-colors text-xs">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* INVOICE GENERATION MODAL */}
            {invoiceCustomer && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in print:hidden">
                    <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-base font-headline">{editingSaleId ? 'Edit Historical Invoice' : 'Generate POS Invoice'}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Patient: {invoiceCustomer.name}</p>
                            </div>
                            <button onClick={() => { setInvoiceCustomer(null); setEditingSaleId(null); }} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        
                        <form onSubmit={handleGenerateInvoice} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-8 overflow-y-auto space-y-6">
                                <div className="flex justify-between items-center border-b border-slate-105 pb-3">
                                    <h4 className="text-[10px] font-bold text-slate-405 uppercase tracking-wider">Cart Items</h4>
                                </div>
                                
                                <div className="space-y-4">
                                    {invoiceItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-4 items-center bg-slate-50/80 rounded-2xl p-4 border border-slate-100 relative">
                                            {/* Medicine Search input */}
                                            <div className="flex-1 relative">
                                                <input 
                                                    required={!item.medicineId}
                                                    type="text"
                                                    placeholder="Type to search medicine..."
                                                    value={item.searchQuery || ''}
                                                    onChange={e => handleSearchQueryChange(idx, e.target.value)}
                                                    onFocus={() => handleDropdownToggle(idx, true)}
                                                    onBlur={() => setTimeout(() => handleDropdownToggle(idx, false), 200)}
                                                    className="w-full bg-white border border-slate-205 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-550/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-707 outline-none transition-all placeholder:text-slate-400"
                                                />
                                                {item.showDropdown && (
                                                    <div className="absolute z-[100] left-0 top-full mt-1.5 w-full max-h-48 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200/60 py-1">
                                                        {medicines.filter(m => m.name.toLowerCase().includes((item.searchQuery || '').toLowerCase())).length > 0 ? (
                                                            medicines.filter(m => m.name.toLowerCase().includes((item.searchQuery || '').toLowerCase())).map(m => (
                                                                <div 
                                                                    key={m._id} 
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        handleMedicineSelect(idx, m._id, m.name);
                                                                    }}
                                                                    className={`px-4 py-3 text-xs cursor-pointer hover:bg-slate-50 transition-colors border-b last:border-0 border-slate-100 ${m.quantity <= 0 ? 'opacity-50 pointer-events-none' : ''}`}
                                                                >
                                                                    <div className="font-extrabold flex justify-between text-slate-805">
                                                                        <span>{m.name}</span>
                                                                        <span className="text-cyan-600">${m.price.toFixed(2)}</span>
                                                                    </div>
                                                                    <div className={`text-[9px] font-bold uppercase mt-1 tracking-wider ${m.quantity <= 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                                        {m.quantity <= 0 ? 'Out of Stock' : `${m.quantity} units in stock`}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="px-4 py-3.5 text-xs text-slate-400 italic font-medium">No medicines found.</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Quantity */}
                                            <div className="w-24">
                                                <input 
                                                    required
                                                    type="number" 
                                                    min="1"
                                                    max={item.maxQty > 0 ? item.maxQty : 1}
                                                    value={item.quantity}
                                                    onChange={e => handleQuantityChange(idx, e.target.value)}
                                                    className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-center text-xs font-bold text-slate-707 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-550/10 transition-all"
                                                    disabled={!item.medicineId}
                                                />
                                            </div>
                                            
                                            {/* Line total */}
                                            <div className="w-24 text-right font-black text-xs text-slate-805">
                                                ${(item.price * item.quantity).toFixed(2)}
                                            </div>
 
                                            {/* Remove row */}
                                            <button type="button" onClick={() => handleRemoveRow(idx)} disabled={invoiceItems.length === 1} className="w-8 h-8 flex justify-center items-center text-slate-355 hover:text-red-500 disabled:opacity-30 transition-colors">
                                                <span className="material-symbols-outlined text-[18px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                
                                <button type="button" onClick={handleAddRow} className="px-4 py-2.5 text-xs font-bold text-cyan-600 bg-cyan-50 hover:bg-cyan-650 hover:text-white border border-cyan-100/50 rounded-xl transition-all flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">add</span> Add Item Row
                                </button>
                                
                                <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col items-end gap-3 text-xs font-bold text-slate-500">
                                    <div className="flex justify-between w-64 text-slate-400">
                                        <span className="uppercase text-[9px] tracking-wider">Subtotal</span>
                                        <span className="text-slate-750 font-bold">${invoiceSubtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between w-64 text-slate-400">
                                        <span className="uppercase text-[9px] tracking-wider">Tax (5%)</span>
                                        <span className="text-slate-750 font-bold">${invoiceTax.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between w-64 items-center">
                                        <span className="uppercase text-[9px] tracking-wider text-slate-400">Discount ($)</span>
                                        <input type="number" min="0" max={invoiceSubtotal + invoiceTax} step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} className="w-24 text-right bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none font-bold text-slate-707 focus:border-cyan-550 focus:ring-1 focus:ring-cyan-500/10 text-xs transition-all" />
                                    </div>
                                    <div className="flex justify-between w-64 mt-2 pt-4 border-t border-slate-100 font-black text-sm text-slate-800 font-body">
                                        <span className="uppercase text-xs font-extrabold tracking-wider text-slate-808">Total Due</span>
                                        <span className="text-xl font-extrabold text-cyan-600 font-headline">${invoiceTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 sticky bottom-0">
                                <button type="submit" disabled={isSavingInvoice} className="flex-1 py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-xs shadow-md shadow-cyan-600/10 transition-all flex justify-center items-center gap-2 uppercase tracking-wider active:scale-95 disabled:opacity-50">
                                    {isSavingInvoice ? <span className="material-symbols-outlined w-5 h-5 animate-spin">refresh</span> : <span className="material-symbols-outlined w-5 h-5 text-[18px]">point_of_sale</span>}
                                    {editingSaleId ? 'Update & Print Invoice' : 'Complete POS checkout'}
                                </button>
                                <button type="button" onClick={() => { setInvoiceCustomer(null); setEditingSaleId(null); }} className="px-5 py-3 border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-colors text-xs">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PRINT RECEIPT MODAL */}
            {printSaleData && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 print:static print:bg-white print:p-0 print:block">
                    <div className="bg-white w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl border border-slate-100 print:shadow-none print:rounded-none print:border-none">
                        
                        <div className="bg-slate-50 p-4.5 flex justify-between items-center border-b border-slate-100 print:hidden">
                            <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-emerald-600 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                Checkout Successful
                            </span>
                            <div className="flex gap-2">
                                <button onClick={() => setPrintSaleData(null)} className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Close</button>
                                <button onClick={() => window.print()} className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-md shadow-cyan-600/15 transition-all flex items-center gap-1 active:scale-95">
                                    <span className="material-symbols-outlined text-[16px]">print</span> Print
                                </button>
                            </div>
                        </div>

                        {/* PRINTABLE RECEIPT CONTENT */}
                        <div className="p-8 text-black font-mono text-xs bg-white print:p-0 print:m-0 print:absolute print:left-0 print:top-0 print:w-full">
                            <div className="text-center mb-6">
                                <h1 className="text-lg font-black mb-1 leading-none tracking-tight uppercase">Clinical Sanctuary</h1>
                                <p className="text-[9px] text-slate-405 uppercase tracking-widest font-bold">Central Pharmacy Receipt</p>
                                <div className="text-[10px] mt-1.5 text-slate-500">Unit 4A Clinical Center<br/>Contact: +92 300 1234567</div>
                            </div>
                            
                            <div className="border-t border-b border-dashed border-slate-300 py-3 my-3 text-[10px] flex flex-col gap-1 text-slate-650">
                                <div className="flex justify-between"><span>Date:</span> <span className="font-bold text-slate-800">{new Date(printSaleData.date).toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Invoice:</span> <span className="font-bold text-slate-800">{printSaleData.invoice_number}</span></div>
                                <div className="flex justify-between"><span>Patient:</span> <span className="font-bold text-slate-800">{printSaleData.customer?.name}</span></div>
                            </div>

                            <div className="border-b border-dashed border-slate-300 pb-2 mb-3">
                                <table className="w-full text-left text-[11px]">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-slate-400 font-bold">
                                            <th className="py-1">Qty</th>
                                            <th className="py-1">Item</th>
                                            <th className="py-1 text-right">Amt</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {printSaleData.items.map((item, idx) => (
                                            <tr key={idx} className="align-top">
                                                <td className="py-2.5 font-bold">{item.quantity}x</td>
                                                <td className="py-2.5 pr-2 break-all font-semibold">
                                                    {item.medicine?.name}
                                                    <span className="text-[9px] text-slate-400 block font-normal mt-0.5">@${item.price.toFixed(2)}</span>
                                                </td>
                                                <td className="py-2.5 text-right font-black">${(item.quantity * item.price).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col gap-1 text-[10px] text-slate-500">
                                <div className="flex justify-between"><span>Subtotal</span> <span className="text-slate-800 font-bold">${(printSaleData.total_amount - printSaleData.tax + printSaleData.discount).toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>Tax (5%)</span> <span className="text-slate-800 font-bold">+${printSaleData.tax.toFixed(2)}</span></div>
                                {printSaleData.discount > 0 && (
                                    <div className="flex justify-between text-rose-600 font-bold"><span>Discount</span> <span>-${printSaleData.discount.toFixed(2)}</span></div>
                                )}
                                <div className="flex justify-between text-xs font-black border-t-2 border-black pt-2 mt-2 text-slate-900">
                                    <span>TOTAL</span>
                                    <span>${printSaleData.total_amount.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="mt-8 text-center bg-slate-50 p-3.5 rounded-2xl border border-slate-100 print:bg-transparent print:border-t print:border-black print:rounded-none">
                                <p className="font-bold text-[9px] uppercase tracking-wider text-slate-500">Thank you for visiting</p>
                                <p className="text-[8px] opacity-60 mt-1">Please retain receipt for medical claims</p>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* HISTORY MODAL */}
            {historyCustomer && (
                <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in print:hidden">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-base font-headline">Clinical History & Receipts</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Patient: {historyCustomer.name}</p>
                            </div>
                            <button onClick={() => {setHistoryCustomer(null); setCustomerHistorySales(null);}} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-55 space-y-6">
                            {isLoadingHistory ? (
                                <div className="flex justify-center flex-col items-center p-10 opacity-50 text-slate-400">
                                    <span className="material-symbols-outlined animate-spin text-4xl mb-3">autorenew</span>
                                    Loading History...
                                </div>
                            ) : customerHistorySales && customerHistorySales.length === 0 ? (
                                <div className="text-center p-12 text-slate-400 font-bold">
                                    No transaction history found for this patient.
                                </div>
                            ) : customerHistorySales && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {customerHistorySales.map((sale, i) => (
                                        <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-slate-700 font-mono text-xs">
                                            <div className="bg-slate-50/50 px-4 py-3 flex justify-between border-b border-slate-100 items-center">
                                                <span className="font-bold flex items-center gap-1 text-slate-800">
                                                    <span className="material-symbols-outlined text-[16px] text-cyan-600">receipt_long</span> {sale.invoice_number}
                                                </span>
                                                <div className="flex gap-1.5">
                                                    <button onClick={() => handleEditSale(sale)} className="text-amber-600 hover:text-amber-800 underline font-bold px-2 py-0.5 rounded hover:bg-amber-50">Edit</button>
                                                    <button onClick={() => setPrintSaleData(sale)} className="text-cyan-650 hover:text-cyan-800 underline font-bold px-2 py-0.5 rounded hover:bg-cyan-50">Print</button>
                                                </div>
                                            </div>
                                            <div className="p-4.5 flex flex-col gap-2">
                                                <div className="text-[9px] text-slate-400 font-sans font-bold">{new Date(sale.date).toLocaleString()}</div>
                                                <div className="border-b border-dashed border-slate-200 pb-2 mb-1 min-h-[60px]">
                                                    <table className="w-full text-left text-[11px]">
                                                        <tbody>
                                                            {sale.items.map((item, idx) => (
                                                                <tr key={idx} className="align-top">
                                                                    <td className="py-1 font-bold">{item.quantity}x</td>
                                                                    <td className="py-1 max-w-[120px] truncate">{item.medicine?.name || 'Unknown'}</td>
                                                                    <td className="py-1 text-right font-black">${(item.quantity * item.price).toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="flex justify-between font-black text-xs pt-1 text-slate-900 font-sans uppercase">
                                                    <span>Total</span>
                                                    <span>${sale.total_amount.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CustomersList;
