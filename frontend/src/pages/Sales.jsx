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
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 font-body text-on-surface">
                <span className="material-symbols-outlined text-4xl text-primary mb-4 animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                <p className="font-semibold text-sm text-on-surface-variant uppercase tracking-widest">Loading POS Module</p>
            </div>
        );
    }

    return (
        <div className="p-8 lg:p-10 space-y-8 animate-fade-in font-body bg-surface text-on-surface min-h-screen">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/50 pb-6 print:hidden">
                <div>
                    <h2 className="text-3xl font-extrabold text-cyan-900 tracking-tight font-headline">POS Billing & Sales Ledger</h2>
                    <p className="text-slate-500 mt-1 text-sm font-medium">Create invoices, manage transactions, and view checkout logs.</p>
                </div>
                
                <div className="flex bg-slate-100 p-1.5 rounded-full border border-slate-200 shadow-sm">
                    <button
                        onClick={() => setActiveTab('pos')}
                        className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                            activeTab === 'pos'
                                ? 'bg-cyan-800 text-white shadow-md'
                                : 'text-slate-600 hover:text-cyan-800'
                        }`}
                    >
                        POS Checkout
                    </button>
                    <button
                        onClick={() => setActiveTab('ledger')}
                        className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                            activeTab === 'ledger'
                                ? 'bg-cyan-800 text-white shadow-md'
                                : 'text-slate-600 hover:text-cyan-800'
                        }`}
                    >
                        Invoice Ledger
                    </button>
                </div>
            </div>

            {/* TAB CONTENT: POS CHECKOUT */}
            {activeTab === 'pos' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start print:hidden">
                    {/* Left Column: Medicine Search & Selector (7 Cols) */}
                    <div className="xl:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50 space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold font-headline text-cyan-900">Add Medicines to Cart</h3>
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{filteredMedicines.length} Items Available</span>
                        </div>

                        {/* Search Input */}
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-800 transition-colors">search</span>
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-800/20 transition-all text-on-surface"
                                placeholder="Search medicine name, category, or batch number..."
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
                                    const isExpiringSoon = expDate && !isExpired && expDate <= new Date(todayDate.setDate(todayDate.getDate() + 30));

                                    return (
                                        <div 
                                            key={med._id} 
                                            onClick={() => !isOut && !isExpired && addToCart(med)}
                                            className={`p-4 rounded-xl border transition-all flex flex-col justify-between h-40 cursor-pointer ${
                                                isOut || isExpired
                                                    ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                                    : 'bg-white border-slate-200/80 hover:border-cyan-600 hover:shadow-md hover:-translate-y-0.5'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex justify-between items-start gap-1">
                                                    <h4 className="font-bold text-slate-900 text-sm tracking-tight line-clamp-1">{med.name}</h4>
                                                    {isOut && <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-extrabold text-[9px] uppercase tracking-wider shrink-0">OUT</span>}
                                                    {isExpired && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-extrabold text-[9px] uppercase tracking-wider shrink-0">EXPIRED</span>}
                                                    {!isOut && !isExpired && isLow && <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-extrabold text-[9px] uppercase tracking-wider shrink-0">LOW</span>}
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{med.category || 'General'}</p>
                                                
                                                <div className="mt-2 flex gap-4 text-xs font-semibold text-slate-600">
                                                    <div>
                                                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Stock</span>
                                                        <span className={isOut ? 'text-red-600 font-bold' : isLow ? 'text-orange-600 font-bold' : 'text-slate-700'}>{med.quantity} units</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Expiry</span>
                                                        <span className={isExpired ? 'text-amber-800 font-bold' : isExpiringSoon ? 'text-orange-500 font-bold' : 'text-slate-700'}>
                                                            {med.expiry_date ? new Date(med.expiry_date).toLocaleDateString(undefined, {month:'short', year:'numeric'}) : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center border-t border-slate-100 pt-2.5 mt-2">
                                                <span className="text-base font-black text-cyan-900">${med.price.toFixed(2)}</span>
                                                <button 
                                                    disabled={isOut || isExpired}
                                                    className="w-7 h-7 rounded-full bg-cyan-50 hover:bg-cyan-800 hover:text-white flex items-center justify-center transition-all text-cyan-800"
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
                    <div className="xl:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50 space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                            <h3 className="text-lg font-bold font-headline text-cyan-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-cyan-800">shopping_cart</span>
                                Billing Cart
                            </h3>
                            <button 
                                onClick={clearCart}
                                className="text-xs text-red-500 font-bold hover:underline hover:text-red-700"
                            >
                                Clear All
                            </button>
                        </div>

                        {/* Customer Selector & Add Quick Customer Button */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Customer</label>
                            <div className="flex gap-2">
                                <select 
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-800 text-slate-800 font-semibold"
                                    value={selectedCustomerId}
                                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                                >
                                    <option value="" disabled>Select Customer</option>
                                    {customers.map(c => (
                                        <option key={c._id} value={c._id}>{c.name} {c.contact !== 'N/A' ? `(${c.contact})` : ''}</option>
                                    ))}
                                </select>
                                <button 
                                    onClick={() => setShowCustomerModal(true)}
                                    className="bg-cyan-50 text-cyan-800 hover:bg-cyan-800 hover:text-white border border-cyan-100 p-2.5 rounded-lg flex items-center justify-center transition-all shadow-sm"
                                    title="Add New Customer"
                                >
                                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                                </button>
                            </div>
                        </div>

                        {/* Cart Items List */}
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {cart.length === 0 ? (
                                <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                                    <span className="material-symbols-outlined text-3xl mb-2 text-slate-300">shopping_cart_checkout</span>
                                    <p className="text-xs font-semibold uppercase tracking-wider">No medicines in cart</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.medicine._id} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-100 group">
                                        <div className="flex-1 min-w-0 pr-3">
                                            <h4 className="font-bold text-sm text-slate-900 truncate">{item.medicine.name}</h4>
                                            <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Price: ${item.price.toFixed(2)} | Stock: {item.medicine.quantity}</p>
                                        </div>
                                        
                                        {/* Qty adjustment */}
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => updateCartQty(item.medicine._id, item.quantity - 1)}
                                                className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center text-xs font-black shadow-sm"
                                            >
                                                -
                                            </button>
                                            <input 
                                                type="number"
                                                className="w-10 bg-white border border-slate-200 rounded text-center text-xs p-1 font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                value={item.quantity}
                                                onChange={(e) => updateCartQty(item.medicine._id, e.target.value)}
                                            />
                                            <button 
                                                onClick={() => updateCartQty(item.medicine._id, item.quantity + 1)}
                                                className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center text-xs font-black shadow-sm"
                                            >
                                                +
                                            </button>
                                        </div>

                                        <div className="text-right w-16 pl-2">
                                            <span className="text-sm font-black text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>

                                        <button 
                                            onClick={() => removeFromCart(item.medicine._id)}
                                            className="text-slate-300 hover:text-red-600 pl-2 transition-colors flex items-center justify-center"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Financial Summaries */}
                        <div className="border-t border-slate-100 pt-4 space-y-3 text-sm font-semibold text-slate-600">
                            <div className="flex justify-between">
                                <span className="text-slate-400 uppercase text-xs font-bold">Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 uppercase text-xs font-bold">Tax (5%)</span>
                                <span>${tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 uppercase text-xs font-bold">Discount ($)</span>
                                <input 
                                    type="number" 
                                    min="0"
                                    max={subtotal + tax}
                                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-right font-bold text-xs focus:ring-1 focus:ring-cyan-800 text-slate-800"
                                    value={discount === 0 ? '' : discount}
                                    placeholder="0"
                                    onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                                />
                            </div>
                            <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                                <span className="text-cyan-950 uppercase text-sm font-extrabold">Grand Total</span>
                                <span className="text-2xl font-black text-cyan-850 font-headline">${grandTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Checkout Trigger */}
                        <button
                            onClick={handleCheckout}
                            disabled={submitting || cart.length === 0}
                            className="w-full bg-cyan-800 text-white font-bold py-3.5 px-6 rounded-xl hover:bg-cyan-900 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/10 text-sm tracking-wider uppercase"
                        >
                            {submitting ? (
                                <>
                                    <span className="material-symbols-outlined text-[20px] animate-spin">autorenew</span>
                                    Processing Order...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[20px]">shopping_cart_checkout</span>
                                    Generate Invoice
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: INVOICE LEDGER */}
            {activeTab === 'ledger' && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/50 space-y-6 print:hidden">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <h3 className="text-lg font-bold font-headline text-cyan-900">Transaction History</h3>
                        
                        <div className="relative w-full sm:max-w-xs group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-800 transition-colors">search</span>
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-11 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-850 transition-all text-on-surface"
                                placeholder="Search Invoice # or Customer..."
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
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Number</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Items Count</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
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
                                            <tr key={sale._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 text-cyan-800 font-extrabold">{sale.invoice_number}</td>
                                                <td className="px-6 py-4 text-xs text-slate-500">
                                                    <div>{formattedDate}</div>
                                                    <div className="text-[10px] mt-0.5">{formattedTime}</div>
                                                </td>
                                                <td className="px-6 py-4 font-extrabold text-slate-900">{sale.customer?.name || 'Walk-in Customer'}</td>
                                                <td className="px-6 py-4 text-slate-500 text-xs">{sale.items?.length || 0} medicines</td>
                                                <td className="px-6 py-4 text-cyan-950 font-black">${sale.total_amount.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedSale(sale);
                                                            setIsNewSaleCheckout(false);
                                                            setShowReceiptModal(true);
                                                        }}
                                                        className="px-3.5 py-1.5 rounded bg-slate-100 hover:bg-cyan-800 hover:text-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 mx-auto transition-all"
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
                <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in print:hidden">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-slide-in">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                            <h3 className="text-lg font-bold font-headline text-cyan-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-cyan-800">person_add</span>
                                Quick Add Customer
                            </h3>
                            <button 
                                onClick={() => setShowCustomerModal(false)}
                                className="text-slate-400 hover:text-slate-600 flex items-center"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-800 font-semibold"
                                    placeholder="Enter full name"
                                    value={newCustomerName}
                                    onChange={(e) => setNewCustomerName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Contact Phone</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-800 font-semibold"
                                    placeholder="e.g. 0300-1234567 (optional)"
                                    value={newCustomerContact}
                                    onChange={(e) => setNewCustomerContact(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCustomerModal(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving || !newCustomerName.trim()}
                                    className="bg-cyan-800 hover:bg-cyan-900 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in print:bg-white print:p-0 print:block print:static">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-slide-in print:shadow-none print:border-none print:w-full print:max-h-full print:rounded-none">
                        
                        {/* Modal Header actions (HIDDEN DURING PRINT) */}
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:hidden no-print">
                            <h3 className="font-bold text-cyan-900 font-headline text-sm flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[20px]">print</span>
                                Invoice Receipt Slip
                            </h3>
                            <button 
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
                                <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Central Pharmacy & Dispensary</p>
                                <p className="text-[10px] text-slate-500">Unit 4A Clinical Center | Tel: 0300-0000000</p>
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 mb-6 bg-slate-50 p-3.5 rounded-xl border border-slate-100 print:bg-white print:border-none print:p-0">
                                <div>
                                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Invoice ID</span>
                                    <span className="text-slate-900 font-extrabold">{selectedSale.invoice_number}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Date & Time</span>
                                    <span className="text-slate-900">
                                        {new Date(selectedSale.date).toLocaleDateString()} {new Date(selectedSale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Customer</span>
                                    <span className="text-slate-900 font-extrabold">{selectedSale.customer?.name || 'Walk-in Customer'}</span>
                                    {selectedSale.customer?.contact && selectedSale.customer?.contact !== 'N/A' && (
                                        <span className="text-[10px] text-slate-500 block font-medium mt-0.5">Phone: {selectedSale.customer.contact}</span>
                                    )}
                                </div>
                            </div>

                            {/* Itemized Table */}
                            <div className="space-y-3 mb-6">
                                <div className="border-b border-slate-200 pb-1.5 text-[10px] font-bold text-slate-400 uppercase flex justify-between">
                                    <span className="w-1/2">Medicine</span>
                                    <span className="w-1/6 text-center">Qty</span>
                                    <span className="w-1/6 text-right">Price</span>
                                    <span className="w-1/6 text-right">Total</span>
                                </div>

                                <div className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                    {selectedSale.items?.map((item, idx) => (
                                        <div key={idx} className="py-2.5 flex justify-between items-start gap-1">
                                            <div className="w-1/2 min-w-0 pr-1">
                                                <div className="font-extrabold text-slate-900 truncate">{item.medicine?.name || 'Unknown Item'}</div>
                                                <div className="text-[9px] text-slate-400 mt-0.5">Batch: {item.medicine?.batch_number || 'N/A'}</div>
                                            </div>
                                            <span className="w-1/6 text-center text-slate-500 font-bold">{item.quantity}</span>
                                            <span className="w-1/6 text-right text-slate-500">${(item.price || item.medicine?.price || 0).toFixed(2)}</span>
                                            <span className="w-1/6 text-right text-slate-900 font-bold">${((item.price || item.medicine?.price || 0) * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="border-t border-slate-200 pt-3 space-y-2 text-xs font-semibold text-slate-600 mb-6">
                                <div className="flex justify-between">
                                    <span className="text-slate-400 font-bold uppercase text-[10px]">Subtotal</span>
                                    <span className="text-slate-800">${(selectedSale.total_amount - selectedSale.tax + selectedSale.discount).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400 font-bold uppercase text-[10px]">Tax (5%)</span>
                                    <span className="text-slate-800">${selectedSale.tax.toFixed(2)}</span>
                                </div>
                                {selectedSale.discount > 0 && (
                                    <div className="flex justify-between text-red-650">
                                        <span className="font-bold uppercase text-[10px]">Discount Granted</span>
                                        <span>-${selectedSale.discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline font-black">
                                    <span className="text-slate-900 uppercase text-xs">Grand Total</span>
                                    <span className="text-lg font-black text-cyan-900">${selectedSale.total_amount.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="text-center space-y-1 pt-4 border-t border-dashed border-slate-200">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Thank you for your visit!</p>
                                <p className="text-[9px] text-slate-450 font-medium">Please keep this slip for your medical logs.</p>
                            </div>
                        </div>

                        {/* Modal Footer Controls (HIDDEN DURING PRINT) */}
                        <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50 print:hidden no-print">
                            {isNewSaleCheckout ? (
                                <>
                                    <button
                                        onClick={handleCloseReceiptModal}
                                        className="flex-1 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 font-bold py-2.5 rounded-xl text-xs transition-colors"
                                    >
                                        Done / Reset POS
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        className="flex-1 bg-cyan-800 text-white hover:bg-cyan-900 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-900/10"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">print</span>
                                        Print Invoice
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleCloseReceiptModal}
                                        className="flex-1 bg-slate-150 text-slate-700 hover:bg-slate-200 font-bold py-2.5 rounded-xl text-xs transition-colors"
                                    >
                                        Close Details
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        className="flex-1 bg-cyan-800 text-white hover:bg-cyan-900 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-900/10"
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
