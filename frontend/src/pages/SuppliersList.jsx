import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const SuppliersList = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [formData, setFormData] = useState({ name: '', contact: '', address: '' });
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const res = await api.get('/suppliers');
            // Sort to show newest first generally
            const data = res.data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
            setSuppliers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchQuery(e.target.value.toLowerCase());
    };

    const filteredSuppliers = suppliers.filter(sup => 
        sup.name.toLowerCase().includes(searchQuery) || 
        sup.contact.toLowerCase().includes(searchQuery)
    );

    // Modal Handlers
    const openAddModal = () => {
        setEditingSupplier(null);
        setFormData({ name: '', contact: '', address: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (supplier) => {
        setEditingSupplier(supplier);
        setFormData({ name: supplier.name || '', contact: supplier.contact || '', address: supplier.address || '' });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSupplier(null);
        setFormData({ name: '', contact: '', address: '' });
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            if (editingSupplier) {
                await api.put(`/suppliers/${editingSupplier._id}`, formData);
                alert('Supplier updated successfully!');
            } else {
                await api.post('/suppliers', formData);
                alert('Supplier added successfully!');
            }
            fetchSuppliers();
            closeModal();
        } catch (error) {
            console.error("Error saving supplier:", error);
            alert(error.response?.data?.message || 'Failed to save supplier.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to completely remove this supplier from the network?")) return;
        
        try {
            await api.delete(`/suppliers/${id}`);
            alert('Supplier deleted successfully!');
            fetchSuppliers();
        } catch (error) {
            console.error("Error deleting supplier:", error);
            alert(error.response?.data?.message || 'Failed to delete supplier.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 font-body text-on-surface">
                <span className="material-symbols-outlined text-4xl text-primary mb-4 animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                <p className="font-semibold text-sm text-on-surface-variant uppercase tracking-widest">Loading Supplier Network</p>
            </div>
        );
    }

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10 animate-fade-in font-body relative">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                <div>
                    <h2 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Vendor Network</h2>
                    <p className="text-on-surface-variant text-sm mt-2 font-medium max-w-2xl">
                        Manage supply chain entities, contact details, and logistical addresses for inventory acquisition.
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="relative group min-w-[280px]">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[20px]">search</span>
                        <input 
                            type="text"
                            placeholder="Find by vendor name or contact..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="w-full bg-white border border-outline-variant/50 shadow-sm rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700" 
                        />
                    </div>
                    <button 
                        onClick={openAddModal}
                        className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold shadow-ambient hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 flex-shrink-0"
                    >
                        <span className="material-symbols-outlined text-[18px]">add_business</span>
                        Add Vendor
                    </button>
                </div>
            </div>

            {/* Main Ledger Area */}
            <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-ambient ring-1 ring-outline-variant/10">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-surface-container-low border-b border-surface-container">
                                <th className="px-8 py-5 text-left text-[11px] font-bold uppercase tracking-widest text-on-surface-variant w-[10%]">Vendor ID</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold uppercase tracking-widest text-on-surface-variant w-[25%]">Supplier Name</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold uppercase tracking-widest text-on-surface-variant w-[20%]">Contact Information</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold uppercase tracking-widest text-on-surface-variant w-[30%]">Address</th>
                                <th className="px-8 py-5 text-right text-[11px] font-bold uppercase tracking-widest text-on-surface-variant w-[15%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container">
                            {filteredSuppliers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-16 text-center text-on-surface-variant">
                                        <div className="flex flex-col items-center justify-center">
                                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">inventory_2</span>
                                            <p className="text-sm font-semibold">No suppliers found in the network.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredSuppliers.map((supp) => (
                                    <tr key={supp._id} className="hover:bg-surface-bright transition-colors group">
                                        <td className="px-8 py-5">
                                            <span className="text-xs font-bold font-mono text-primary bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                                                SUP-{supp._id.substring(supp._id.length - 4).toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary font-bold text-sm">
                                                    {supp.name.charAt(0).toUpperCase()}
                                                </div>
                                                <p className="text-sm font-bold text-on-surface">{supp.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-sm font-medium text-slate-600">{supp.contact || 'N/A'}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-sm font-medium text-slate-600 truncate max-w-xs">{supp.address || 'N/A'}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">Registered Entity</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => openEditModal(supp)}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                                    title="Edit Supplier"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(supp._id)}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-error hover:bg-error/10 transition-colors"
                                                    title="Delete Supplier"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-[#f0f3fa] border-t border-surface-container flex justify-between items-center px-8">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                        Total Network Strength
                    </span>
                    <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-700 shadow-sm border border-slate-200">
                        {filteredSuppliers.length} Entities
                    </span>
                </div>
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal}></div>
                    
                    <div className="bg-white rounded-3xl w-full max-w-md relative z-10 shadow-2xl overflow-hidden animate-fade-in">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold font-headline text-slate-800">
                                {editingSupplier ? 'Edit Vendor Profile' : 'Register New Vendor'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Entity Name</label>
                                <input 
                                    type="text" 
                                    name="name"
                                    value={formData.name} 
                                    onChange={handleInputChange} 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-slate-800 font-medium" 
                                    required 
                                    placeholder="e.g. Pfizer Pharmaceuticals"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Contact Details</label>
                                <input 
                                    type="text" 
                                    name="contact"
                                    value={formData.contact} 
                                    onChange={handleInputChange} 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-slate-800 font-medium" 
                                    required 
                                    placeholder="Email or Phone Number"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Registered Address</label>
                                <textarea 
                                    name="address"
                                    value={formData.address} 
                                    onChange={handleInputChange} 
                                    rows="3"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-slate-800 font-medium resize-none in-border" 
                                    required
                                    placeholder="Full street address..."
                                ></textarea>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={closeModal}
                                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={formLoading}
                                    className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-bold text-sm shadow-sm hover:brightness-110 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {formLoading ? (
                                        <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[18px]">save</span>
                                    )}
                                    {editingSupplier ? 'Save Updates' : 'Add Vendor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuppliersList;
