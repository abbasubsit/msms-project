import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const Sales = () => {
    // Tab State: 'pos' or 'ledger'
    const [activeTab, setActiveTab] = useState('pos');
    
    // Core Data States
    const [medicines, setMedicines] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [sales, setSales] = useState([]);
    
    // UI/Loading States
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // POS Cart & Checkout States
    const [cart, setCart] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [discount, setDiscount] = useState(0);
    const [medSearch, setMedSearch] = useState('');
    
    // Quick Customer Modal
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerContact, setNewCustomerContact] = useState('');
    
    // Receipt Modal States
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    const [isNewSaleCheckout, setIsNewSaleCheckout] = useState(false);

    // Ledger Search
    const [ledgerSearch, setLedgerSearch] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [medRes, custRes, salesRes] = await Promise.all([
                api.get('/medicines'),
                api.get('/customers'),
                api.get('/sales')
            ]);
            
            setMedicines(medRes.data);
            setCustomers(custRes.data);
            
            // Sort sales newest first
            const sortedSales = salesRes.data.sort((a, b) => new Date(b.date) - new Date(a.date));
            setSales(sortedSales);

            // Handle Walk-in Customer Auto-check/creation
            await handleWalkinCustomer(custRes.data);
        } catch (error) {
            console.error("Failed to fetch billing data", error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-create or select Walk-in Customer
    const handleWalkinCustomer = async (currentCustomers) => {
        const walkIn = currentCustomers.find(c => c.name.toLowerCase() === 'walk-in customer' || c.name.toLowerCase() === 'walk-in');
        if (walkIn) {
            setSelectedCustomerId(walkIn._id);
        } else {
            // Create walk-in customer
            try {
                const res = await api.post('/customers', {
                    name: 'Walk-in Customer',
                    contact: 'N/A'
                });
                setCustomers(prev => [...prev, res.data]);
                setSelectedCustomerId(res.data._id);
            } catch (err) {
                console.error("Could not automatically create walk-in customer", err);
            }
        }
    };

    // Quick Add Customer handler
    const handleAddCustomerSubmit = async (e) => {
        e.preventDefault();
        if (!newCustomerName.trim()) return;

        setIsSaving(true);
        try {
            const res = await api.post('/customers', {
                name: newCustomerName,
                contact: newCustomerContact || 'N/A'
            });
            setCustomers(prev => [...prev, res.data]);
            setSelectedCustomerId(res.data._id);
            setShowCustomerModal(false);
            setNewCustomerName('');
            setNewCustomerContact('');
        } catch (err) {
            console.error("Failed to add customer", err);
            alert("Error creating customer. Please check console.");
        } finally {
            setIsSaving(false);
        }
    };

    // POS Cart Operations
    const addToCart = (med) => {
        const today = new Date();
        const isExpired = med.expiry_date && new Date(med.expiry_date) <= today;
        
        if (isExpired) {
            alert("Cannot add expired medicines to cart!");
            return;
        }
        
        if (med.quantity <= 0) {
            alert("This medicine is currently Out of Stock!");
            return;
        }

        const existingItemIndex = cart.findIndex(item => item.medicine._id === med._id);
        if (existingItemIndex > -1) {
            const existingItem = cart[existingItemIndex];
            if (existingItem.quantity >= med.quantity) {
                alert(`Cannot add more. Only ${med.quantity} units are available in stock.`);
                return;
            }
            const updatedCart = [...cart];
            updatedCart[existingItemIndex].quantity += 1;
            setCart(updatedCart);
        } else {
            setCart([...cart, { medicine: med, quantity: 1, price: med.price }]);
        }
    };

    const updateCartQty = (medId, newQty) => {
        const item = cart.find(i => i.medicine._id === medId);
        if (!item) return;

        const maxQty = item.medicine.quantity;
        
        let qty = parseInt(newQty);
        if (isNaN(qty) || qty < 1) qty = 1;
        if (qty > maxQty) {
            alert(`Only ${maxQty} units available in stock!`);
            qty = maxQty;
        }

        const updatedCart = cart.map(i => 
            i.medicine._id === medId ? { ...i, quantity: qty } : i
        );
        setCart(updatedCart);
    };

    const removeFromCart = (medId) => {
        setCart(cart.filter(item => item.medicine._id !== medId));
    };

    const clearCart = () => {
        setCart([]);
        setDiscount(0);
        // Reset to Walk-in if possible
        const walkIn = customers.find(c => c.name.toLowerCase() === 'walk-in customer' || c.name.toLowerCase() === 'walk-in');
        if (walkIn) setSelectedCustomerId(walkIn._id);
    };

    // Calculations
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05; // 5% matching salesController
    const grandTotal = Math.max(0, subtotal + tax - Number(discount));

    // Checkout Submit
    const handleCheckout = async () => {
        if (!selectedCustomerId) {
            alert("Please select a customer.");
            return;
        }
        if (cart.length === 0) {
            alert("Your POS cart is empty!");
            return;
        }

        setSubmitting(true);
        try {
            const formattedItems = cart.map(item => ({
                medicine: item.medicine._id,
                quantity: item.quantity
            }));

            const salePayload = {
                customer: selectedCustomerId,
                items: formattedItems,
                discount: Number(discount)
            };

            const res = await api.post('/sales', salePayload);

            // Sale successful, update medicines stock locally in state
            const updatedMeds = [...medicines];
            cart.forEach(cartItem => {
                const medIndex = updatedMeds.findIndex(m => m._id === cartItem.medicine._id);
                if (medIndex > -1) {
                    updatedMeds[medIndex].quantity = Math.max(0, updatedMeds[medIndex].quantity - cartItem.quantity);
                }
            });
            setMedicines(updatedMeds);

            // Add the new sale to ledger list
            setSales(prev => [res.data, ...prev]);

            // Open Receipt Modal
            setSelectedSale(res.data);
            setIsNewSaleCheckout(true);
            setShowReceiptModal(true);

            // Reset cart
            clearCart();
        } catch (err) {
            console.error("Checkout failed", err);
            alert(err.response?.data?.message || "Checkout failed. Please check stock and retry.");
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

    // Filter Sales Ledger for search
    const filteredSales = sales.filter(s => 
        s.invoice_number.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        (s.customer?.name && s.customer.name.toLowerCase().includes(ledgerSearch.toLowerCase()))
    );

    const handlePrint = () => {
        window.print();
    };

    const handleCloseReceiptModal = () => {
        setShowReceiptModal(false);
        setSelectedSale(null);
        setIsNewSaleCheckout(false);
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 font-body">
                <span className="material-symbols-outlined text-4xl text-cyan-600 mb-4 animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                <p className="font-bold text-xs text-slate-400 uppercase tracking-widest">Loading Terminal...</p>
            </div>
        );
    }

    return (
        <div className="p-8 lg:p-12 space-y-10 animate-fade-in font-body bg-slate-50 text-slate-800 min-h-screen">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8 print:hidden">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight font-headline">Billing Terminal</h2>
                    <p className="text-slate-400 mt-1 text-xs font-semibold tracking-wide uppercase">Point of Sale (POS) & Invoice Ledger</p>
                </div>
                
                <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50 shadow-inner">
                    <button
                        onClick={() => setActiveTab('pos')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-300 flex items-center gap-2 ${
                            activeTab === 'pos'
                                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/15'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                        POS Checkout
                    </button>
                    <button
                        onClick={() => setActiveTab('ledger')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-300 flex items-center gap-2 ${
                            activeTab === 'ledger'
                                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/15'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                        Invoice Ledger
                    </button>
                </div>
            </div>

            {/* TAB CONTENT: POS CHECKOUT */}
            {activeTab === 'pos' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start print:hidden">
                    {/* Left Column: Medicine Search & Selector (7 Cols) */}
                    <div className="xl:col-span-7 bg-white rounded-3xl p-8 shadow-xl shadow-slate-100/50 border border-slate-100 space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-extrabold text-slate-800 font-headline">Available Medicines</h3>
                                <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">Select items to populate the bill</p>
                            </div>
                            <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-3.5 py-1.5 rounded-xl">{filteredMedicines.length} In Stock</span>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input
                                type="text"
                                className="w-full bg-slate-50 text-slate-700 text-xs border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-2xl pl-12 pr-4 py-4 outline-none transition-all placeholder:text-slate-400 font-medium"
                                placeholder="Search medicine by name, category, or batch number..."
                                value={medSearch}
                                onChange={(e) => setMedSearch(e.target.value)}
                            />
                        </div>

                        {/* Medicines List Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto pr-1">
                            {filteredMedicines.length === 0 ? (
                                <div className="col-span-2 py-12 text-center text-slate-400 text-sm font-medium">
                                    No medicines found matching the query.
                                </div>
                            ) : (
                                filteredMedicines.map(med => {
                                    const isLow = med.quantity <= 10 && med.quantity > 0;
                                    const isOut = med.quantity <= 0;
                                    const todayDate = new Date();
                                    const expDate = med.expiry_date ? new Date(med.expiry_date) : null;
                                    const isExpired = expDate && expDate <= todayDate;
                                    const expiringSoonLimit = new Date();
                                    expiringSoonLimit.setDate(expiringSoonLimit.getDate() + 30);
                                    const isExpiringSoon = expDate && !isExpired && expDate <= expiringSoonLimit;

                                    return (
                                        <div 
                                            key={med._id} 
                                            onClick={() => !isOut && !isExpired && addToCart(med)}
                                            className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between h-44 cursor-pointer relative overflow-hidden group ${
                                                isOut || isExpired
                                                    ? 'bg-slate-50/70 border-slate-200 opacity-60 cursor-not-allowed'
                                                    : 'bg-white border-slate-200 hover:border-cyan-500 hover:shadow-xl hover:shadow-slate-150/10 hover:-translate-y-0.5'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex justify-between items-start gap-2">
                                                    <h4 className="font-extrabold text-slate-800 text-sm tracking-tight line-clamp-2 leading-snug">{med.name}</h4>
                                                    <div className="shrink-0 flex gap-1">
                                                        {isOut && <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-100 font-extrabold text-[8px] uppercase tracking-wider">OUT</span>}
                                                        {isExpired && <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-100 font-extrabold text-[8px] uppercase tracking-wider">EXPIRED</span>}
                                                        {!isOut && !isExpired && isLow && <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-100 font-extrabold text-[8px] uppercase tracking-wider">LOW</span>}
                                                        {!isOut && !isExpired && isExpiringSoon && <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 font-extrabold text-[8px] uppercase tracking-wider">EXPIRY SOON</span>}
                                                    </div>
                                                </div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{med.category || 'General'}</p>
                                                
                                                <div className="mt-4 flex gap-5 text-xs font-medium text-slate-500">
                                                    <div>
                                                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Stock</span>
                                                        <span className={`font-bold ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-slate-700'}`}>{med.quantity} units</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Expiry</span>
                                                        <span className={`font-semibold ${isExpired ? 'text-rose-500' : isExpiringSoon ? 'text-purple-500' : 'text-slate-700'}`}>
                                                            {med.expiry_date ? new Date(med.expiry_date).toLocaleDateString(undefined, {month:'short', year:'numeric'}) : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center border-t border-slate-100/80 pt-3 mt-3">
                                                <span className="text-base font-extrabold text-slate-800 font-headline">${med.price.toFixed(2)}</span>
                                                <button 
                                                    disabled={isOut || isExpired}
                                                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                                        isOut || isExpired 
                                                            ? 'bg-slate-100 text-slate-350' 
                                                            : 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-cyan-600/10'
                                                    }`}
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Column: POS Cart & Checkout (5 Cols) */}
                    <div className="xl:col-span-5 bg-white rounded-3xl p-8 shadow-xl shadow-slate-100/50 border border-slate-100 space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-5">
                            <div>
                                <h3 className="text-base font-extrabold text-slate-800 font-headline flex items-center gap-2">
                                    <span className="material-symbols-outlined text-cyan-600" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
                                    Receipt Cart
                                </h3>
                                <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">Checkout itemized list</p>
                            </div>
                            {cart.length > 0 && (
                                <button 
                                    onClick={clearCart}
                                    className="text-xs text-red-500 font-bold hover:underline hover:text-red-700 transition-colors"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>

                        {/* Customer Selector & Add Quick Customer Button */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-405 uppercase tracking-wider block">Select Customer</label>
                            <div className="flex gap-2.5">
                                <select 
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 text-slate-700 font-bold transition-all"
                                    value={selectedCustomerId}
                                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                                >
                                    <option value="" disabled>Select Customer</option>
                                    {customers.map(c => (
                                        <option key={c._id} value={c._id}>{c.name} {c.contact !== 'N/A' ? `(${c.contact})` : ''}</option>
                                    ))}
                                </select>
                                <button 
                                    type="button"
                                    onClick={() => setShowCustomerModal(true)}
                                    className="bg-cyan-50 text-cyan-600 hover:bg-cyan-600 hover:text-white border border-cyan-100/50 w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0 active:scale-95"
                                    title="Add New Customer"
                                >
                                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                                </button>
                            </div>
                        </div>

                        {/* Cart Items List */}
                        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                            {cart.length === 0 ? (
                                <div className="py-12 border-2 border-dashed border-slate-200/60 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                                    <span className="material-symbols-outlined text-3xl mb-3 text-slate-300">shopping_cart_checkout</span>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cart is empty</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.medicine._id} className="flex justify-between items-center p-4 bg-slate-50/70 rounded-2xl border border-slate-100 group transition-all hover:bg-slate-50">
                                        <div className="flex-1 min-w-0 pr-3">
                                            <h4 className="font-extrabold text-xs text-slate-800 truncate">{item.medicine.name}</h4>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Price: ${item.price.toFixed(2)} | Stock: {item.medicine.quantity}</p>
                                        </div>
                                        
                                        {/* Qty adjustment */}
                                        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
                                            <button 
                                                onClick={() => updateCartQty(item.medicine._id, item.quantity - 1)}
                                                className="w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center text-xs font-black transition-colors"
                                            >
                                                -
                                            </button>
                                            <input 
                                                type="number"
                                                className="w-10 bg-transparent text-center text-xs font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-slate-700"
                                                value={item.quantity}
                                                onChange={(e) => updateCartQty(item.medicine._id, e.target.value)}
                                            />
                                            <button 
                                                onClick={() => updateCartQty(item.medicine._id, item.quantity + 1)}
                                                className="w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center text-xs font-black transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>

                                        <div className="text-right w-16 pl-3 shrink-0">
                                            <span className="text-xs font-extrabold text-slate-800">${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>

                                        <button 
                                            onClick={() => removeFromCart(item.medicine._id)}
                                            className="text-slate-350 hover:text-red-500 pl-3 transition-colors flex items-center justify-center"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Financial Summaries */}
                        <div className="border-t border-slate-100 pt-5 space-y-4 text-xs font-bold text-slate-500">
                            <div className="flex justify-between">
                                <span className="text-slate-400 uppercase text-[9px] tracking-wider">Subtotal</span>
                                <span className="text-slate-700">${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 uppercase text-[9px] tracking-wider">Tax (5%)</span>
                                <span className="text-slate-700">${tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 uppercase text-[9px] tracking-wider">Discount ($)</span>
                                <input 
                                    type="number" 
                                    min="0"
                                    max={subtotal + tax}
                                    className="w-20 bg-slate-50 text-slate-700 text-xs border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl px-3 py-2 text-right font-extrabold outline-none transition-all placeholder:text-slate-400"
                                    value={discount === 0 ? '' : discount}
                                    placeholder="0"
                                    onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                                />
                            </div>
                            <div className="border-t border-slate-100 pt-4 flex justify-between items-baseline">
                                <span className="text-slate-805 uppercase text-xs font-extrabold tracking-wider">Grand Total</span>
                                <span className="text-2xl font-black text-slate-900 font-headline">${grandTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Checkout Trigger */}
                        <button
                            onClick={handleCheckout}
                            disabled={submitting || cart.length === 0}
                            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-6 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/15 text-xs tracking-wider uppercase"
                        >
                            {submitting ? (
                                <>
                                    <span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span>
                                    Processing Checkout...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                                    Generate Invoice
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: INVOICE LEDGER */}
            {activeTab === 'ledger' && (
                <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-100/50 border border-slate-100 space-y-6 print:hidden">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div>
                            <h3 className="text-base font-extrabold text-slate-800 font-headline">Transaction History</h3>
                            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">Logs of all checkout invoices</p>
                        </div>
                        
                        <div className="relative w-full sm:max-w-xs">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input
                                type="text"
                                className="w-full bg-slate-50 text-slate-700 text-xs border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-2xl pl-11 pr-4 py-3.5 outline-none transition-all placeholder:text-slate-400 font-medium"
                                placeholder="Search Invoice # or Customer..."
                                value={ledgerSearch}
                                onChange={(e) => setLedgerSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Ledger Table */}
                    <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100">
                                    <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice Number</th>
                                    <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date & Time</th>
                                    <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Items Count</th>
                                    <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-605">
                                {filteredSales.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-xs font-medium">
                                            No sales transactions found in ledger logs.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSales.map(sale => {
                                        const dateObj = new Date(sale.date);
                                        const formattedDate = dateObj.toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'});
                                        const formattedTime = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                                        return (
                                            <tr key={sale._id} className="hover:bg-slate-50/30 transition-colors border-l-2 border-l-transparent hover:border-l-cyan-500">
                                                <td className="px-6 py-4 text-cyan-600 font-extrabold">{sale.invoice_number}</td>
                                                <td className="px-6 py-4 text-slate-400 font-medium">
                                                    <div className="text-slate-600">{formattedDate}</div>
                                                    <div className="text-[9px] mt-0.5">{formattedTime}</div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-800">{sale.customer?.name || 'Walk-in Customer'}</td>
                                                <td className="px-6 py-4 text-slate-400 font-bold">{sale.items?.length || 0} items</td>
                                                <td className="px-6 py-4 text-slate-900 font-extrabold">${sale.total_amount.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedSale(sale);
                                                            setIsNewSaleCheckout(false);
                                                            setShowReceiptModal(true);
                                                        }}
                                                        className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-cyan-600 hover:text-white border border-slate-200/60 text-slate-605 text-xs font-extrabold flex items-center gap-1.5 mx-auto transition-all duration-300"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                                                        View Slip
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

            {/* QUICK ADD CUSTOMER MODAL */}
            {showCustomerModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in print:hidden">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-slide-in">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-5 mb-6">
                            <div>
                                <h3 className="text-base font-extrabold text-slate-805 font-headline flex items-center gap-2">
                                    <span className="material-symbols-outlined text-cyan-600" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
                                    Quick Add Customer
                                </h3>
                                <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">Register a new client profile</p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setShowCustomerModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddCustomerSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 text-slate-700 text-xs border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-400 font-medium"
                                    placeholder="Enter full name"
                                    value={newCustomerName}
                                    onChange={(e) => setNewCustomerName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Contact Phone</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 text-slate-700 text-xs border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-400 font-medium"
                                    placeholder="e.g. 0300-1234567 (optional)"
                                    value={newCustomerContact}
                                    onChange={(e) => setNewCustomerContact(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCustomerModal(false)}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving || !newCustomerName.trim()}
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-cyan-600/15"
                                >
                                    {isSaving ? 'Saving...' : 'Add & Select'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* RECEIPT / PRINT DIALOG MODAL */}
            {showReceiptModal && selectedSale && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in print:bg-white print:p-0 print:block print:static">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-slide-in print:shadow-none print:border-none print:w-full print:max-h-full print:rounded-none">
                        
                        {/* Modal Header actions (HIDDEN DURING PRINT) */}
                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 print:hidden no-print">
                            <div>
                                <h3 className="font-extrabold text-slate-800 font-headline text-sm flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[20px] text-cyan-600">print</span>
                                    Invoice Receipt
                                </h3>
                            </div>
                            <button 
                                onClick={handleCloseReceiptModal}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Printable Area */}
                        <div id="print-receipt-modal" className="print-receipt-modal p-8 overflow-y-auto print:overflow-visible flex-1 print:p-0 print:m-0 print:absolute print:left-0 print:top-0 print:w-full">
                            {/* Receipt Header */}
                            <div className="text-center space-y-1 mb-6 border-b border-slate-100 pb-5">
                                <h2 className="text-xl font-black text-slate-800 uppercase font-headline tracking-wide">Clinical Sanctuary</h2>
                                <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Central Pharmacy & Dispensary</p>
                                <p className="text-[10px] text-slate-500 font-medium">Unit 4A Clinical Center | Tel: 0300-0000000</p>
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-605 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-105 print:bg-white print:border-none print:p-0">
                                <div>
                                    <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider mb-0.5">Invoice ID</span>
                                    <span className="text-slate-850 font-extrabold">{selectedSale.invoice_number}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider mb-0.5">Date & Time</span>
                                    <span className="text-slate-850 font-bold">
                                        {new Date(selectedSale.date).toLocaleDateString()} {new Date(selectedSale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider mb-0.5">Customer</span>
                                    <span className="text-slate-850 font-extrabold">{selectedSale.customer?.name || 'Walk-in Customer'}</span>
                                    {selectedSale.customer?.contact && selectedSale.customer?.contact !== 'N/A' && (
                                        <span className="text-[10px] text-slate-500 block font-semibold mt-0.5">Phone: {selectedSale.customer.contact}</span>
                                    )}
                                </div>
                            </div>

                            {/* Itemized Table */}
                            <div className="space-y-3 mb-6">
                                <div className="border-b border-slate-200 pb-2 text-[9px] font-bold text-slate-400 uppercase flex justify-between tracking-wider">
                                    <span className="w-1/2">Medicine</span>
                                    <span className="w-1/6 text-center">Qty</span>
                                    <span className="w-1/6 text-right">Price</span>
                                    <span className="w-1/6 text-right">Total</span>
                                </div>

                                <div className="divide-y divide-slate-100 text-xs font-bold text-slate-650">
                                    {selectedSale.items?.map((item, idx) => (
                                        <div key={idx} className="py-3 flex justify-between items-start gap-1">
                                            <div className="w-1/2 min-w-0 pr-1">
                                                <div className="font-extrabold text-slate-800 truncate">{item.medicine?.name || 'Unknown Item'}</div>
                                                <div className="text-[9px] text-slate-400 font-bold mt-0.5">Batch: {item.medicine?.batch_number || 'N/A'}</div>
                                            </div>
                                            <span className="w-1/6 text-center text-slate-500 font-bold">{item.quantity}</span>
                                            <span className="w-1/6 text-right text-slate-500">${(item.price || item.medicine?.price || 0).toFixed(2)}</span>
                                            <span className="w-1/6 text-right text-slate-805 font-extrabold">${((item.price || item.medicine?.price || 0) * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="border-t border-slate-205 pt-4 space-y-2.5 text-xs font-bold text-slate-500 mb-6 font-medium">
                                <div className="flex justify-between">
                                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Subtotal</span>
                                    <span className="text-slate-800 font-bold">${(selectedSale.total_amount - selectedSale.tax + selectedSale.discount).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Tax (5%)</span>
                                    <span className="text-slate-800 font-bold">${selectedSale.tax.toFixed(2)}</span>
                                </div>
                                {selectedSale.discount > 0 && (
                                    <div className="flex justify-between text-red-500 font-bold">
                                        <span className="uppercase text-[9px] tracking-wider">Discount</span>
                                        <span>-${selectedSale.discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline font-black">
                                    <span className="text-slate-800 uppercase text-xs font-extrabold tracking-wider">Grand Total</span>
                                    <span className="text-xl font-extrabold text-slate-900 font-headline">${selectedSale.total_amount.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="text-center space-y-1 pt-5 border-t border-dashed border-slate-200">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Thank you for your visit!</p>
                                <p className="text-[9px] text-slate-450 font-medium">Please keep this slip for your medical logs.</p>
                            </div>
                        </div>

                        {/* Modal Footer Controls (HIDDEN DURING PRINT) */}
                        <div className="p-5 border-t border-slate-100 flex gap-3 bg-slate-50 print:hidden no-print">
                            {isNewSaleCheckout ? (
                                <>
                                    <button
                                        onClick={handleCloseReceiptModal}
                                        className="flex-1 bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold py-3 rounded-xl text-xs transition-colors active:scale-95"
                                    >
                                        Done / Reset
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        className="flex-1 bg-cyan-600 text-white hover:bg-cyan-700 font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/15 active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">print</span>
                                        Print Invoice
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleCloseReceiptModal}
                                        className="flex-1 bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 font-bold py-3 rounded-xl text-xs transition-colors active:scale-95"
                                    >
                                        Close Details
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        className="flex-1 bg-cyan-600 text-white hover:bg-cyan-700 font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/15 active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">print</span>
                                        Print Slip
                                    </button>
                                </>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default Sales;
