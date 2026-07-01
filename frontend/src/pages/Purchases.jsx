import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';

const Purchases = () => {
    const location = useLocation();

    // Tab State: 'restock' or 'ledger'
    const [activeTab, setActiveTab] = useState('restock');
    
    // Core Data States
    const [medicines, setMedicines] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [purchases, setPurchases] = useState([]);
    
    // UI/Loading States
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // Restock Cart & Supplier States
    const [cart, setCart] = useState([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [medSearch, setMedSearch] = useState('');
    
    // Quick Add Medicine Modal States
    const [showMedicineModal, setShowMedicineModal] = useState(false);
    const [newMedicineName, setNewMedicineName] = useState('');
    const [newMedicineCategory, setNewMedicineCategory] = useState('');
    const [newMedicineBatch, setNewMedicineBatch] = useState('');
    const [newMedicineExpiry, setNewMedicineExpiry] = useState('');
    const [newMedicinePrice, setNewMedicinePrice] = useState(''); // Selling price
    
    // Receipt/GRN Modal States
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [isNewPurchaseCheckout, setIsNewPurchaseCheckout] = useState(false);

    // Ledger Search
    const [ledgerSearch, setLedgerSearch] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        // Handle redirect from MedicineInventory
        if (location.state && location.state.restockMed) {
            const med = location.state.restockMed;
            addToCart(med);
            // Clear navigation state to prevent re-adding on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [medRes, supRes, purchaseRes] = await Promise.all([
                api.get('/medicines'),
                api.get('/suppliers'),
                api.get('/purchases')
            ]);
            
            setMedicines(medRes.data);
            setSuppliers(supRes.data);
            
            // Sort purchases newest first
            const sortedPurchases = purchaseRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setPurchases(sortedPurchases);
        } catch (error) {
            console.error("Failed to fetch restocking data", error);
        } finally {
            setLoading(false);
        }
    };

    // Quick Add Medicine handler
    const handleAddMedicineSubmit = async (e) => {
        e.preventDefault();
        if (!newMedicineName.trim() || !newMedicineExpiry || !newMedicinePrice) return;

        setIsSaving(true);
        try {
            const payload = {
                name: newMedicineName.trim(),
                category: newMedicineCategory.trim() || 'General',
                batch_number: newMedicineBatch.trim() || 'N/A',
                expiry_date: newMedicineExpiry,
                price: Number(newMedicinePrice),
                quantity: 0, // start with 0, will be restocked via cart
                supplier: selectedSupplierId || undefined
            };

            const res = await api.post('/medicines', payload);
            
            // Add to local medicines state
            setMedicines(prev => [res.data, ...prev]);
            
            // Automatically add to restock cart
            addToCart(res.data);
            
            // Reset modal & form
            setShowMedicineModal(false);
            setNewMedicineName('');
            setNewMedicineCategory('');
            setNewMedicineBatch('');
            setNewMedicineExpiry('');
            setNewMedicinePrice('');
            alert('Medicine registered successfully and added to restock cart.');
        } catch (err) {
            console.error("Failed to register medicine", err);
            alert(err.response?.data?.message || "Error creating medicine. Please verify your entries.");
        } finally {
            setIsSaving(false);
        }
    };

    // Restock Cart Operations
    const addToCart = (med) => {
        const existingItemIndex = cart.findIndex(item => item.medicine._id === med._id);
        
        // Expiry Date Format helper
        const defaultExpiry = med.expiry_date ? new Date(med.expiry_date).toISOString().split('T')[0] : '';
        
        if (existingItemIndex > -1) {
            // Increment quantity if already in cart
            const updatedCart = [...cart];
            updatedCart[existingItemIndex].quantity += 1;
            setCart(updatedCart);
        } else {
            // Add new cart item with default price (current medicine selling price or 70% of it for cost)
            setCart([...cart, { 
                medicine: med, 
                quantity: 1, 
                price: med.price ? Number((med.price * 0.7).toFixed(2)) : 0, // Cost Price (Est. 70% of retail)
                selling_price: med.price || 0, // Selling Price (updates medicine price)
                expiry_date: defaultExpiry // Expiry date
            }]);
        }
    };

    const updateCartItem = (medId, field, value) => {
        const updatedCart = cart.map(item => {
            if (item.medicine._id === medId) {
                let updatedVal = value;
                if (field === 'quantity') {
                    updatedVal = parseInt(value);
                    if (isNaN(updatedVal) || updatedVal < 1) updatedVal = 1;
                } else if (field === 'price' || field === 'selling_price') {
                    updatedVal = parseFloat(value);
                    if (isNaN(updatedVal) || updatedVal < 0) updatedVal = 0;
                }
                return { ...item, [field]: updatedVal };
            }
            return item;
        });
        setCart(updatedCart);
    };

    const removeFromCart = (medId) => {
        setCart(cart.filter(item => item.medicine._id !== medId));
    };

    const clearCart = () => {
        setCart([]);
        setSelectedSupplierId('');
    };

    // Calculations
    const grandTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Save Restock entry
    const handleSaveRestock = async () => {
        if (!selectedSupplierId) {
            alert("Please select a supplier.");
            return;
        }
        if (cart.length === 0) {
            alert("Your restock cart is empty!");
            return;
        }

        // Validate expiry dates in cart
        const missingExpiry = cart.some(item => !item.expiry_date);
        if (missingExpiry) {
            alert("Please specify expiry date for all restocked items.");
            return;
        }

        setSubmitting(true);
        try {
            const itemsPayload = cart.map(item => ({
                medicine: item.medicine._id,
                quantity: Number(item.quantity),
                price: Number(item.price), // cost price
                selling_price: Number(item.selling_price), // new selling price
                expiry_date: item.expiry_date // batch expiry
            }));

            const payload = {
                supplier: selectedSupplierId,
                items: itemsPayload
            };

            const res = await api.post('/purchases', payload);

            // Update medicines local state with new quantities, prices and expiries
            const updatedMeds = [...medicines];
            cart.forEach(cartItem => {
                const medIndex = updatedMeds.findIndex(m => m._id === cartItem.medicine._id);
                if (medIndex > -1) {
                    updatedMeds[medIndex].quantity = (updatedMeds[medIndex].quantity || 0) + Number(cartItem.quantity);
                    updatedMeds[medIndex].price = Number(cartItem.selling_price);
                    updatedMeds[medIndex].expiry_date = cartItem.expiry_date;
                    updatedMeds[medIndex].supplier = selectedSupplierId;
                }
            });
            setMedicines(updatedMeds);

            // Add the new purchase to ledger list
            setPurchases(prev => [res.data, ...prev]);

            // Open Receipt Modal
            setSelectedPurchase(res.data);
            setIsNewPurchaseCheckout(true);
            setShowReceiptModal(true);

            // Reset cart
            clearCart();
        } catch (err) {
            console.error("Restocking entry failed", err);
            alert(err.response?.data?.message || "Restocking entry failed. Please check entries and try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // Filter Medicines for search
    const filteredMedicines = medicines.filter(m => 
        m.name.toLowerCase().includes(medSearch.toLowerCase()) ||
        m.category?.toLowerCase().includes(medSearch.toLowerCase()) ||
        m.batch_number?.toLowerCase().includes(medSearch.toLowerCase())
    );

    // Filter Purchases Ledger for search
    const filteredPurchases = purchases.filter(p => 
        p._id.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        (p.supplier?.name && p.supplier.name.toLowerCase().includes(ledgerSearch.toLowerCase()))
    );

    const handlePrint = () => {
        window.print();
    };

    const handleCloseReceiptModal = () => {
        setShowReceiptModal(false);
        setSelectedPurchase(null);
        setIsNewPurchaseCheckout(false);
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 font-body text-on-surface">
                <span className="material-symbols-outlined text-4xl text-primary mb-4 animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                <p className="font-semibold text-sm text-on-surface-variant uppercase tracking-widest">Loading Inward Restocking Module</p>
            </div>
        );
    }

    return (
        <div className="p-8 lg:p-10 space-y-8 animate-fade-in font-body bg-surface text-on-surface min-h-screen">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/50 pb-6 print:hidden">
                <div>
                    <h2 className="text-3xl font-extrabold text-primary tracking-tight font-headline">Supplier Purchases & Inward Stock</h2>
                    <p className="text-on-surface-variant mt-1 text-sm font-medium">Record stock deliveries from vendors, update cost/selling prices, batch expiry dates, and audit purchase logs.</p>
                </div>
                
                <div className="flex bg-slate-100 p-1.5 rounded-full border border-slate-200 shadow-sm">
                    <button
                        id="tab-restock"
                        onClick={() => setActiveTab('restock')}
                        className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                            activeTab === 'restock'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-slate-600 hover:text-primary'
                        }`}
                    >
                        Stock Inward Entry
                    </button>
                    <button
                        id="tab-ledger"
                        onClick={() => setActiveTab('ledger')}
                        className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                            activeTab === 'ledger'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-slate-600 hover:text-primary'
                        }`}
                    >
                        Purchase Ledger
                    </button>
                </div>
            </div>

            {/* TAB CONTENT: STOCK INWARD RESTOCK */}
            {activeTab === 'restock' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start print:hidden">
                    {/* Left Column: Medicine Catalog Search (5 Cols) */}
                    <div className="xl:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50 space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold font-headline text-primary">Medicine Catalog</h3>
                            <span className="text-xs font-bold text-on-surface-variant bg-slate-100 px-3 py-1 rounded-full">{filteredMedicines.length} Medicines</span>
                        </div>

                        {/* Search Input */}
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                            <input
                                id="medicine-search-input"
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-on-surface font-medium"
                                placeholder="Search by name, category, batch..."
                                value={medSearch}
                                onChange={(e) => setMedSearch(e.target.value)}
                            />
                        </div>

                        {/* Medicines List Grid */}
                        <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                            {filteredMedicines.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-sm font-medium">
                                    No medicines registered in catalog.
                                </div>
                            ) : (
                                filteredMedicines.map(med => {
                                    const qty = med.quantity || 0;
                                    const isLow = qty <= 10 && qty > 0;
                                    const isOut = qty <= 0;

                                    return (
                                        <div 
                                            key={med._id} 
                                            onClick={() => addToCart(med)}
                                            className="p-4 rounded-xl border border-slate-100 bg-white hover:border-primary hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all flex justify-between items-center"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-slate-900 text-sm tracking-tight truncate">{med.name}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{med.category || 'General'}</span>
                                                    <span className="text-[10px] text-slate-300 font-black">|</span>
                                                    <span className="text-xs text-slate-500 font-medium font-mono">{med.batch_number || 'No Batch'}</span>
                                                </div>
                                                <div className="flex gap-4 mt-2 text-[11px] font-bold">
                                                    <span className={isOut ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded' : isLow ? 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded' : 'text-slate-600 bg-slate-50 px-2 py-0.5 rounded'}>
                                                        Qty: {qty}
                                                    </span>
                                                    <span className="text-slate-600 bg-slate-50 px-2 py-0.5 rounded">
                                                        Retail: ${med.price ? med.price.toFixed(2) : '0.00'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <button 
                                                id={`add-med-${med._id}`}
                                                className="w-8 h-8 rounded-full bg-slate-50 text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-all flex-shrink-0 ml-3"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">add</span>
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Column: Restock Cart & Supplier Selection (7 Cols) */}
                    <div className="xl:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50 space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                            <h3 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">local_shipping</span>
                                Inward Restock Cart
                            </h3>
                            <button 
                                id="clear-cart-btn"
                                onClick={clearCart}
                                className="text-xs text-red-500 font-bold hover:underline hover:text-red-700"
                            >
                                Clear Cart
                            </button>
                        </div>

                        {/* Supplier Selector & Quick Add Medicine */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Supplier / Vendor *</label>
                                <select 
                                    id="supplier-select"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 font-semibold"
                                    value={selectedSupplierId}
                                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>-- Select Supplier --</option>
                                    {suppliers.map(s => (
                                        <option key={s._id} value={s._id}>{s.name} {s.contact ? `(${s.contact})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="flex items-end justify-start md:justify-end pb-0.5">
                                <button 
                                    id="quick-add-medicine-btn"
                                    onClick={() => setShowMedicineModal(true)}
                                    className="w-full bg-slate-100 text-primary border border-slate-200/50 hover:bg-primary hover:text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm font-bold text-sm"
                                    title="Quick Register Medicine"
                                >
                                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                    Register New Medicine
                                </button>
                            </div>
                        </div>

                        {/* Cart Items List */}
                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                            {cart.length === 0 ? (
                                <div className="py-16 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                                    <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">inventory</span>
                                    <p className="text-sm font-bold uppercase tracking-wider">Restock cart is empty</p>
                                    <p className="text-xs text-slate-400 mt-1">Select medicines from the left catalog to start restock entry.</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.medicine._id} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all space-y-3 relative group">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-extrabold text-sm text-slate-900">{item.medicine.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Current Stock: {item.medicine.quantity || 0} units</p>
                                            </div>
                                            <button 
                                                id={`remove-med-${item.medicine._id}`}
                                                onClick={() => removeFromCart(item.medicine._id)}
                                                className="text-slate-300 hover:text-red-650 transition-colors flex items-center justify-center self-start"
                                                title="Remove Item"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">close</span>
                                            </button>
                                        </div>

                                        {/* Input fields row */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                            {/* Quantity Inward */}
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Qty Inward</label>
                                                <input 
                                                    id={`qty-${item.medicine._id}`}
                                                    type="number"
                                                    min="1"
                                                    className="w-full bg-white border border-slate-250 rounded-lg p-2 font-bold focus:outline-none focus:ring-1 focus:ring-primary text-slate-800"
                                                    value={item.quantity}
                                                    onChange={(e) => updateCartItem(item.medicine._id, 'quantity', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            
                                            {/* Cost Price */}
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cost Price ($)</label>
                                                <input 
                                                    id={`cost-${item.medicine._id}`}
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full bg-white border border-slate-250 rounded-lg p-2 font-bold focus:outline-none focus:ring-1 focus:ring-primary text-slate-800"
                                                    value={item.price}
                                                    onChange={(e) => updateCartItem(item.medicine._id, 'price', e.target.value)}
                                                    required
                                                />
                                            </div>

                                            {/* Selling Price */}
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Retail Price ($)</label>
                                                <input 
                                                    id={`retail-${item.medicine._id}`}
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full bg-white border border-slate-250 rounded-lg p-2 font-bold focus:outline-none focus:ring-1 focus:ring-primary text-slate-800"
                                                    value={item.selling_price}
                                                    onChange={(e) => updateCartItem(item.medicine._id, 'selling_price', e.target.value)}
                                                    required
                                                />
                                            </div>

                                            {/* Expiry Date */}
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Batch Expiry</label>
                                                <input 
                                                    id={`expiry-${item.medicine._id}`}
                                                    type="date"
                                                    className="w-full bg-white border border-slate-250 rounded-lg p-2 font-bold focus:outline-none focus:ring-1 focus:ring-primary text-slate-700"
                                                    value={item.expiry_date}
                                                    onChange={(e) => updateCartItem(item.medicine._id, 'expiry_date', e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Cart Summary */}
                        <div className="border-t border-slate-100 pt-4 space-y-3 text-sm font-semibold text-slate-650">
                            <div className="flex justify-between">
                                <span className="text-slate-400 uppercase text-xs font-bold">Total Inward Units</span>
                                <span className="text-slate-800">{cart.reduce((acc, item) => acc + Number(item.quantity), 0)} Units</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 uppercase text-xs font-bold">Medicines Count</span>
                                <span className="text-slate-800">{cart.length} Items</span>
                            </div>
                            <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                                <span className="text-primary uppercase text-sm font-extrabold">Total Outlay Cost</span>
                                <span className="text-2xl font-black text-primary font-headline">${grandTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            id="submit-restock-btn"
                            onClick={handleSaveRestock}
                            disabled={submitting || cart.length === 0}
                            className="w-full bg-primary text-white font-bold py-3.5 px-6 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-primary/20 text-sm tracking-wider uppercase"
                        >
                            {submitting ? (
                                <>
                                    <span className="material-symbols-outlined text-[20px] animate-spin">autorenew</span>
                                    Filing Restock Entry...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                                    File Inward Restock Entry
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: PURCHASE LEDGER */}
            {activeTab === 'ledger' && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50 space-y-6 print:hidden">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <h3 className="text-lg font-bold font-headline text-primary">Inward Purchase Logs</h3>
                        
                        <div className="relative w-full sm:max-w-xs group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                            <input
                                id="ledger-search-input"
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-11 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all text-on-surface"
                                placeholder="Search Supplier or Invoice ID..."
                                value={ledgerSearch}
                                onChange={(e) => setLedgerSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Ledger Table */}
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-150">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Purchase Invoice ID</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acquisition Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Items Received</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total Outlay</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-755">
                                {filteredPurchases.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                                            No restocking logs found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPurchases.map(purchase => {
                                        const dateObj = new Date(purchase.createdAt || purchase.date);
                                        const formattedDate = dateObj.toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'});
                                        const formattedTime = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                                        return (
                                            <tr key={purchase._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 text-primary font-extrabold">
                                                    PUR-{purchase._id.substring(purchase._id.length - 8).toUpperCase()}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-500">
                                                    <div>{formattedDate}</div>
                                                    <div className="text-[10px] mt-0.5">{formattedTime}</div>
                                                </td>
                                                <td className="px-6 py-4 font-extrabold text-slate-900">{purchase.supplier?.name || 'Unknown Supplier'}</td>
                                                <td className="px-6 py-4 text-slate-500 text-xs">
                                                    {purchase.items?.reduce((acc, i) => acc + i.quantity, 0) || 0} Units ({purchase.items?.length || 0} items)
                                                </td>
                                                <td className="px-6 py-4 text-primary font-black text-right">${purchase.total_amount ? purchase.total_amount.toFixed(2) : '0.00'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button 
                                                        id={`view-slip-${purchase._id}`}
                                                        onClick={() => {
                                                            setSelectedPurchase(purchase);
                                                            setIsNewPurchaseCheckout(false);
                                                            setShowReceiptModal(true);
                                                        }}
                                                        className="px-3.5 py-1.5 rounded bg-slate-100 hover:bg-primary hover:text-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 mx-auto transition-all"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                                                        View GRN
                                                    </button>
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

            {/* QUICK REGISTER MEDICINE MODAL */}
            {showMedicineModal && (
                <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in print:hidden">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-slide-in">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                            <h3 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">add_circle</span>
                                Register New Medicine
                            </h3>
                            <button 
                                id="close-med-modal"
                                onClick={() => setShowMedicineModal(false)}
                                className="text-slate-400 hover:text-slate-650 flex items-center"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddMedicineSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block mb-1">Medicine Name *</label>
                                <input
                                    id="new-med-name"
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                                    placeholder="e.g. Panadol 500mg"
                                    value={newMedicineName}
                                    onChange={(e) => setNewMedicineName(e.target.value)}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block mb-1">Category</label>
                                    <input
                                        id="new-med-cat"
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                                        placeholder="e.g. Analgesics"
                                        value={newMedicineCategory}
                                        onChange={(e) => setNewMedicineCategory(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block mb-1">Batch Number</label>
                                    <input
                                        id="new-med-batch"
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                                        placeholder="e.g. B-998"
                                        value={newMedicineBatch}
                                        onChange={(e) => setNewMedicineBatch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block mb-1">Expiry Date *</label>
                                    <input
                                        id="new-med-expiry"
                                        type="date"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-semibold text-slate-700"
                                        value={newMedicineExpiry}
                                        onChange={(e) => setNewMedicineExpiry(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block mb-1">Retail Price ($) *</label>
                                    <input
                                        id="new-med-price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                                        placeholder="0.00"
                                        value={newMedicinePrice}
                                        onChange={(e) => setNewMedicinePrice(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    id="cancel-med-modal"
                                    type="button"
                                    onClick={() => setShowMedicineModal(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    id="submit-new-med-btn"
                                    type="submit"
                                    disabled={isSaving || !newMedicineName.trim() || !newMedicineExpiry || !newMedicinePrice}
                                    className="bg-primary hover:brightness-110 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {isSaving ? 'Registering...' : 'Add & Select'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* GOODS RECEIVED NOTE / PRINT DIALOG MODAL */}
            {showReceiptModal && selectedPurchase && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in print:bg-white print:p-0 print:block print:static">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-slide-in print:shadow-none print:border-none print:w-full print:max-h-full print:rounded-none">
                        
                        {/* Modal Header actions (HIDDEN DURING PRINT) */}
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:hidden no-print">
                            <h3 className="font-bold text-primary font-headline text-sm flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                                Goods Received Note (GRN)
                            </h3>
                            <button 
                                id="close-receipt-modal"
                                onClick={handleCloseReceiptModal}
                                className="text-slate-400 hover:text-slate-600 flex items-center"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Printable Area */}
                        <div id="print-receipt-modal" className="print-receipt-modal p-6 overflow-y-auto print:overflow-visible flex-1 print:p-0 print:m-0 print:absolute print:left-0 print:top-0 print:w-full">
                            {/* Receipt Header */}
                            <div className="text-center space-y-1 mb-6 border-b border-slate-200/50 pb-4">
                                <h2 className="text-xl font-black text-slate-900 uppercase font-headline">Clinical Sanctuary</h2>
                                <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Goods Received Note & Stock Inward Record</p>
                                <p className="text-[10px] text-slate-400">Unit 4A Clinical Center | Central Pharmacy</p>
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-white print:border-none print:p-0">
                                <div>
                                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Acquisition ID</span>
                                    <span className="text-slate-900 font-extrabold">PUR-{selectedPurchase._id.toUpperCase()}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Acquisition Date</span>
                                    <span className="text-slate-900">
                                        {new Date(selectedPurchase.createdAt || selectedPurchase.date).toLocaleString()}
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Supplier / Vendor</span>
                                    <span className="text-slate-900 font-extrabold">{selectedPurchase.supplier?.name || 'Unknown Supplier'}</span>
                                    {selectedPurchase.supplier?.contact && (
                                        <span className="text-[10px] text-slate-500 block font-medium mt-0.5">Contact: {selectedPurchase.supplier.contact}</span>
                                    )}
                                    {selectedPurchase.supplier?.address && (
                                        <span className="text-[10px] text-slate-550 block font-medium">Address: {selectedPurchase.supplier.address}</span>
                                    )}
                                </div>
                            </div>

                            {/* Itemized Table */}
                            <div className="space-y-3 mb-6">
                                <div className="border-b border-slate-200 pb-1.5 text-[10px] font-bold text-slate-400 uppercase flex justify-between">
                                    <span className="w-2/5">Medicine</span>
                                    <span className="w-1/5 text-center">Batch</span>
                                    <span className="w-1/5 text-right font-mono">Qty In</span>
                                    <span className="w-1/5 text-right">Cost</span>
                                    <span className="w-1/5 text-right">Total</span>
                                </div>

                                <div className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                    {selectedPurchase.items?.map((item, idx) => (
                                        <div key={idx} className="py-2.5 flex justify-between items-center gap-1">
                                            <div className="w-2/5 min-w-0 pr-1">
                                                <div className="font-extrabold text-slate-900 truncate">{item.medicine?.name || 'Unknown Medicine'}</div>
                                                <div className="text-[9px] text-slate-400 mt-0.5">Expiry: {item.medicine?.expiry_date ? new Date(item.medicine.expiry_date).toLocaleDateString() : 'N/A'}</div>
                                            </div>
                                            <span className="w-1/5 text-center text-slate-500 font-mono text-[11px] font-medium">{item.medicine?.batch_number || 'N/A'}</span>
                                            <span className="w-1/5 text-right text-slate-900 font-extrabold">{item.quantity} Units</span>
                                            <span className="w-1/5 text-right text-slate-500">${(item.price || 0).toFixed(2)}</span>
                                            <span className="w-1/5 text-right text-slate-900 font-extrabold">${((item.price || 0) * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="border-t border-slate-200 pt-4 space-y-2 text-xs font-semibold text-slate-600 mb-6">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-primary uppercase text-[10px] font-black">Total Acquisition Outlay</span>
                                    <span className="text-xl font-black text-primary font-headline">${selectedPurchase.total_amount ? selectedPurchase.total_amount.toFixed(2) : '0.00'}</span>
                                </div>
                            </div>

                            {/* Footer message */}
                            <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-4 mt-4">
                                <p>Goods received in good condition. Inventory updated automatically.</p>
                                <p className="font-bold mt-1">Central Pharmacy System</p>
                            </div>
                        </div>

                        {/* Modal Footer actions (HIDDEN DURING PRINT) */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 print:hidden no-print">
                            <button
                                id="print-receipt-btn"
                                onClick={handlePrint}
                                className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-[18px]">print</span>
                                Print GRN
                            </button>
                            <button
                                id="close-receipt-btn"
                                onClick={handleCloseReceiptModal}
                                className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Purchases;
