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
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 font-body text-on-surface print:hidden">
                <span className="material-symbols-outlined text-4xl text-primary mb-4 animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                <p className="font-semibold text-sm text-on-surface-variant uppercase tracking-widest">Loading Patient Registry</p>
            </div>
        );
    }

    return (
        <>
            {/* MAIN APP CONTAINER */}
            <div className={`p-10 space-y-8 relative font-body bg-surface text-on-surface min-h-[calc(100vh-4rem)] print:hidden ${showAddModal || invoiceCustomer || printSaleData ? 'animate-none' : 'animate-fade-in'}`}>
                {/* Header */}
                <div className="flex justify-between items-end">
                    <div>
                        <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
                            <span>Directory</span>
                            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                            <span className="text-primary font-bold">Patient Registry</span>
                        </nav>
                        <h2 className="text-3xl font-extrabold text-on-surface tracking-tight font-headline">Patient Hub</h2>
                        <p className="text-sm text-on-surface-variant mt-2 font-medium">Manage patient records and clinical history</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => { setShowAddModal(true); setNewPatient({name: '', contact: ''}); setEditingCustomerId(null); }} className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-primary/30 hover:bg-primary-container transition-all active:scale-95">
                            <span className="material-symbols-outlined text-lg">person_add</span>
                            New Patient
                        </button>
                    </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-surface-container-highest p-5 rounded-xl border-l-4 border-primary shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Registered Patients</p>
                        <p className="text-3xl font-extrabold text-primary font-headline tracking-tight">{totalCustomers}</p>
                    </div>
                    <div className="bg-surface-container-highest p-5 rounded-xl border-l-4 border-tertiary shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">New (This Month)</p>
                        <p className="text-3xl font-extrabold text-tertiary font-headline tracking-tight">+{newThisMonth}</p>
                    </div>
                    <div className="bg-surface-container-highest p-5 rounded-xl border-l-4 border-secondary shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Registry Status</p>
                        <div className="flex items-center gap-2 text-secondary">
                            <span className="material-symbols-outlined">health_and_safety</span>
                            <span className="font-extrabold font-headline tracking-tight text-lg">Active & Secure</span>
                        </div>
                    </div>
                </div>

                {/* Filter */}
                <div className="flex bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/10 justify-between items-center">
                    <div className="relative w-full max-w-md">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input 
                            type="text" 
                            placeholder="Search patients by name or contact..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-container text-sm font-medium border-none focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-400 text-on-surface"
                        />
                    </div>
                </div>

                {/* Patient Table */}
                <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden ring-1 ring-outline-variant/10">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-container-low border-b border-surface-container">
                                <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest leading-relaxed">Patient Identifiers</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest leading-relaxed">Contact Information</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest leading-relaxed text-center">Edit Customer</th>
                                <th className="px-4 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest leading-relaxed text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container">
                            {filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <span className="material-symbols-outlined text-4xl mb-3 opacity-50">person_off</span>
                                            <p className="text-sm font-medium text-on-surface-variant">No patients found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map((cust) => (
                                    <tr key={cust._id} className="hover:bg-surface-bright transition-colors group cursor-pointer border-l-2 border-transparent hover:border-primary">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold font-headline select-none">
                                                    {cust.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-on-surface text-sm group-hover:text-primary transition-colors">{cust.name}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">ID: {cust._id.substring(cust._id.length - 6).toUpperCase()}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                                <span className="material-symbols-outlined text-[16px] text-slate-400">call</span>
                                                {cust.contact || "N/A"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <button onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingCustomerId(cust._id);
                                                setNewPatient({ name: cust.name, contact: cust.contact });
                                                setShowAddModal(true);
                                            }} className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-slate-500 font-bold hover:bg-slate-200 flex items-center gap-1.5 transition-all shadow-sm mx-auto hover:text-primary" title="Edit Patient Data">
                                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                                <span className="text-xs">Edit</span>
                                            </button>
                                        </td>
                                        <td className="px-4 py-5 text-center flex-nowrap">
                                            <div className="flex justify-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                                                {/* VIEW DETAILS ICON */}
                                                <button onClick={() => handleViewHistory(cust)} className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-slate-500 font-bold hover:bg-slate-200 flex items-center gap-1.5 transition-all shadow-sm group-hover:opacity-100" title="View History">
                                                    <span className="material-symbols-outlined text-[16px]">history</span>
                                                    <span className="text-xs">History</span>
                                                </button>
                                                {/* INVOICE ICON/BUTTON */}
                                                <button onClick={() => setInvoiceCustomer(cust)} className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-primary font-bold hover:bg-primary-container flex items-center gap-1.5 transition-all shadow-sm group-hover:opacity-100" title="Create Invoice">
                                                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                                                    <span className="text-xs">Invoice</span>
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
                    <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl shadow-2xl border border-outline-variant/20 overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-surface-container flex justify-between items-center bg-surface-lowest">
                            <div>
                                <h3 className="text-xl font-extrabold text-on-surface font-headline">{editingCustomerId ? 'Edit Patient Data' : 'Register Patient'}</h3>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <form className="p-8 space-y-5" onSubmit={handleRegisterPatient}>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Patient Full Name</label>
                                <input value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} required type="text" className="w-full bg-surface border border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 outline-none text-sm font-medium" placeholder="E.g. John Doe" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Contact Number</label>
                                <input value={newPatient.contact} onChange={e => setNewPatient({...newPatient, contact: e.target.value})} required type="text" className="w-full bg-surface border border-outline-variant/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 outline-none text-sm font-medium" placeholder="E.g. +1 234 567 8900" />
                            </div>
                            <div className="mt-8 pt-6 border-t flex justify-end gap-3">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-surface-container-high transition-colors">Cancel</button>
                                <button type="submit" disabled={isSavingPatient} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-container shadow-lg shadow-primary/30 active:scale-95 disabled:opacity-50 flex items-center gap-2">
                                    {isSavingPatient ? <span className="material-symbols-outlined animate-spin">sync</span> : (editingCustomerId ? 'Update Data' : 'Register Patient')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* INVOICE GENERATION MODAL */}
            {invoiceCustomer && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in print:hidden">
                    <div className="bg-surface-lowest w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="px-8 py-6 border-b border-surface-container flex justify-between items-center text-white bg-slate-900">
                            <div>
                                <h3 className="text-xl font-extrabold font-headline">{editingSaleId ? 'Edit Historical Invoice' : 'Generate POS Invoice'}</h3>
                                <p className="text-sm font-medium opacity-80 mt-1">Patient: {invoiceCustomer.name}</p>
                            </div>
                            <button onClick={() => { setInvoiceCustomer(null); setEditingSaleId(null); }} className="opacity-70 hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>
                        </div>
                        
                        <form onSubmit={handleGenerateInvoice} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-8 overflow-y-auto bg-surface-container-lowest">
                                <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-4">Cart Items</h4>
                                
                                <div className="space-y-4">
                                    {invoiceItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-4 items-center bg-surface-container rounded-xl p-3 border border-outline-variant/10">
                                            <div className="flex-1 relative">
                                                <input 
                                                    required={!item.medicineId}
                                                    type="text"
                                                    placeholder="Type to search medicine..."
                                                    value={item.searchQuery || ''}
                                                    onChange={e => handleSearchQueryChange(idx, e.target.value)}
                                                    onFocus={() => handleDropdownToggle(idx, true)}
                                                    onBlur={() => setTimeout(() => handleDropdownToggle(idx, false), 200)}
                                                    className="w-full bg-surface-container-highest outline-none text-sm font-bold text-on-surface px-3 py-2 rounded-lg border-b-2 border-primary/20 focus:border-primary"
                                                />
                                                {item.showDropdown && (
                                                    <div className="absolute z-[100] left-0 top-full mt-1 w-[320px] max-h-48 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 py-1">
                                                        {medicines.filter(m => m.name.toLowerCase().includes((item.searchQuery || '').toLowerCase())).length > 0 ? (
                                                            medicines.filter(m => m.name.toLowerCase().includes((item.searchQuery || '').toLowerCase())).map(m => (
                                                                <div 
                                                                    key={m._id} 
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        handleMedicineSelect(idx, m._id, m.name);
                                                                    }}
                                                                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-slate-50 transition-colors border-b last:border-0 border-slate-100 ${m.quantity <= 0 ? 'opacity-50 pointer-events-none' : ''}`}
                                                                >
                                                                    <div className="font-bold flex justify-between text-slate-800">
                                                                        <span>{m.name}</span>
                                                                        <span className="text-primary">${m.price}</span>
                                                                    </div>
                                                                    <div className={`text-[10px] font-extrabold uppercase mt-0.5 tracking-wider ${m.quantity <= 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                                        {m.quantity <= 0 ? 'Out of Stock' : `${m.quantity} in stock`}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="px-4 py-3 text-xs text-slate-500 italic">No exact medicine found.</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="w-24">
                                                <input 
                                                    required
                                                    type="number" 
                                                    min="1"
                                                    max={item.maxQty > 0 ? item.maxQty : 1}
                                                    value={item.quantity}
                                                    onChange={e => handleQuantityChange(idx, e.target.value)}
                                                    className="w-full bg-surface-container-high rounded-md px-3 py-1.5 text-center text-sm font-bold outline-none border-b-2 border-primary/20 focus:border-primary"
                                                    disabled={!item.medicineId}
                                                />
                                            </div>
                                            
                                            <div className="w-24 text-right font-bold text-sm text-secondary">
                                                ${(item.price * item.quantity).toFixed(2)}
                                            </div>

                                            <button type="button" onClick={() => handleRemoveRow(idx)} disabled={invoiceItems.length === 1} className="w-8 h-8 flex justify-center items-center text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors">
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={handleAddRow} className="mt-4 px-4 py-2 text-xs font-bold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">add</span> Add Row
                                </button>
                                
                                <div className="mt-8 pt-4 border-t border-surface-container flex flex-col items-end gap-2 text-sm">
                                    <div className="flex justify-between w-64 text-on-surface-variant font-semibold">
                                        <span>Subtotal:</span>
                                        <span>${invoiceSubtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between w-64 text-on-surface-variant font-semibold">
                                        <span>Tax (5%):</span>
                                        <span>${invoiceTax.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between w-64 items-center">
                                        <span className="font-bold text-on-surface text-xs tracking-widest uppercase">Discount ($):</span>
                                        <input type="number" min="0" max={invoiceSubtotal + invoiceTax} step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} className="w-24 text-right bg-surface-container-high rounded border-b border-primary/40 px-2 py-1 outline-none font-bold" />
                                    </div>
                                    <div className="flex justify-between w-64 mt-2 pt-2 border-t border-surface-container font-extrabold text-xl text-on-surface font-headline">
                                        <span>Total:</span>
                                        <span>${invoiceTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="px-8 py-5 border-t border-surface-container bg-surface flex justify-end gap-3 sticky bottom-0">
                                <button type="button" onClick={() => { setInvoiceCustomer(null); setEditingSaleId(null); }} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-surface-container-high">Cancel</button>
                                <button type="submit" disabled={isSavingInvoice} className="px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-900 shadow-xl hover:bg-secondary-container active:scale-95 disabled:opacity-50 transition-all flex justify-center items-center gap-2">
                                    {isSavingInvoice ? <span className="material-symbols-outlined w-5 h-5 animate-spin">refresh</span> : <span className="material-symbols-outlined w-5 h-5 text-[20px]">point_of_sale</span>}
                                    {editingSaleId ? 'Update & Print Invoice' : 'Complete Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PRINT RECEIPT MODAL (Visible physically when active, overrides entire screen when printing) */}
            {printSaleData && (
                <div className="fixed inset-0 z-[100] bg-slate-800/80 flex items-center justify-center p-4 backdrop-blur-sm print:static print:bg-white print:p-0 print:block">
                    {/* The physical receipt element */}
                    <div className="bg-white w-full max-w-sm rounded-[24px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] print:shadow-none print:rounded-none">
                        
                        {/* Receipt Header that doesn't print */}
                        <div className="bg-slate-100 p-4 flex justify-between items-center border-b print:hidden">
                            <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-600">check_circle</span>
                                Sale Successful
                            </span>
                            <div className="flex gap-2">
                                <button onClick={() => setPrintSaleData(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-md transition-colors">Close</button>
                                <button onClick={() => window.print()} className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-md transition-all flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">print</span> Print
                                </button>
                            </div>
                        </div>

                        {/* ACTUAL PRINTABLE RECEIPT CONTENT */}
                        <div className="p-8 text-black font-mono text-sm bg-white print:p-4 print:text-xs">
                            <div className="text-center mb-6">
                                <h1 className="text-2xl font-black mb-1 leading-none tracking-tighter uppercase">Clinical Sanctum</h1>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Pharmacy & Diagnostics</p>
                                <div className="text-xs mt-2 opacity-70">123 Health Ave, Medical District<br/>Contact: +1 800-PHARMA</div>
                            </div>
                            
                            <div className="border-t-2 border-dashed border-slate-300 py-3 my-3 text-xs flex flex-col gap-1">
                                <div className="flex justify-between"><span>Date:</span> <span className="font-bold">{new Date(printSaleData.date).toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Invoice:</span> <span className="font-bold">{printSaleData.invoice_number}</span></div>
                                <div className="flex justify-between"><span>Patient:</span> <span className="font-bold">{printSaleData.customer?.name}</span></div>
                            </div>

                            <div className="border-b-2 border-dashed border-slate-300 pb-2 mb-3">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="py-1 font-bold">Qty</th>
                                            <th className="py-1 font-bold">Item</th>
                                            <th className="py-1 text-right font-bold">Amt</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {printSaleData.items.map((item, idx) => (
                                            <tr key={idx} className="align-top">
                                                <td className="py-1">{item.quantity}x</td>
                                                <td className="py-1 pr-2 break-all">{item.medicine?.name} <span className="text-[10px] opacity-60 block">@${item.price}</span></td>
                                                <td className="py-1 text-right font-bold">${(item.quantity * item.price).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col gap-1 text-xs">
                                <div className="flex justify-between"><span>Subtotal</span> <span>${(printSaleData.total_amount - printSaleData.tax + printSaleData.discount).toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>Tax (5%)</span> <span>+${printSaleData.tax.toFixed(2)}</span></div>
                                {printSaleData.discount > 0 && (
                                    <div className="flex justify-between"><span>Discount</span> <span>-${printSaleData.discount.toFixed(2)}</span></div>
                                )}
                                <div className="flex justify-between text-base font-black border-t-2 border-black pt-1 mt-1">
                                    <span>TOTAL</span>
                                    <span>${printSaleData.total_amount.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="mt-8 text-center bg-slate-100 p-3 rounded-lg print:bg-transparent print:border-t print:border-black print:rounded-none">
                                <p className="font-bold text-xs uppercase tracking-widest">Thank you for visiting</p>
                                <p className="text-[10px] lowercase opacity-60 mt-1">please retain receipt for returns</p>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* HISTORY MODAL */}
            {historyCustomer && (
                <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in print:hidden">
                    <div className="bg-surface-lowest w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-surface-container flex justify-between items-center text-white bg-slate-900">
                            <div>
                                <h3 className="text-xl font-extrabold font-headline">Clinical History & Receipts</h3>
                                <p className="text-sm font-medium opacity-80 mt-1">Patient: {historyCustomer.name}</p>
                            </div>
                            <button onClick={() => {setHistoryCustomer(null); setCustomerHistorySales(null);}} className="opacity-70 hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50 space-y-6">
                            {isLoadingHistory ? (
                                <div className="flex justify-center flex-col items-center p-10 opacity-50">
                                    <span className="material-symbols-outlined animate-spin text-4xl mb-3">autorenew</span>
                                    Loading History...
                                </div>
                            ) : customerHistorySales && customerHistorySales.length === 0 ? (
                                <div className="text-center p-10 text-slate-500 font-bold">
                                    No purchase history found for this patient.
                                </div>
                            ) : customerHistorySales && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {customerHistorySales.map((sale, i) => (
                                        <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-black font-mono text-xs">
                                            <div className="bg-slate-100 p-2 flex justify-between border-b items-center">
                                                <span className="font-bold flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">receipt_long</span> {sale.invoice_number}
                                                </span>
                                                <div>
                                                    <button onClick={() => handleEditSale(sale)} className="text-orange-600 hover:text-orange-800 underline font-bold px-2 py-0.5 rounded hover:bg-orange-50 mr-2">Edit</button>
                                                    <button onClick={() => setPrintSaleData(sale)} className="text-blue-600 hover:text-blue-800 underline font-bold px-2 py-0.5 rounded hover:bg-blue-50">Print</button>
                                                </div>
                                            </div>
                                            <div className="p-4 flex flex-col gap-2">
                                                <div className="text-[10px] text-slate-500">{new Date(sale.date).toLocaleString()}</div>
                                                <div className="border-b border-dashed border-slate-300 pb-2 mb-1 min-h-[60px]">
                                                    <table className="w-full text-left">
                                                        <tbody>
                                                            {sale.items.map((item, idx) => (
                                                                <tr key={idx} className="align-top">
                                                                    <td className="py-0.5">{item.quantity}x</td>
                                                                    <td className="py-0.5 max-w-[120px] truncate">{item.medicine?.name || 'Unknown'}</td>
                                                                    <td className="py-0.5 text-right font-bold">${(item.quantity * item.price).toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="flex justify-between font-black text-sm pt-1">
                                                    <span>TOTAL</span>
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
