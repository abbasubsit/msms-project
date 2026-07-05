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
            const data = res.data.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
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
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 font-body">
                <span className="material-symbols-outlined text-4xl text-cyan-600 mb-4 animate-spin" style={{ animationDuration: '2s' }}>autorenew</span>
                <p className="font-bold text-xs text-slate-400 uppercase tracking-widest">Loading Supplier Network...</p>
            </div>
        );
    }

    return (
        <div className="p-8 lg:p-12 space-y-10 animate-fade-in font-body bg-slate-50 text-slate-800 min-h-screen relative">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8 relative z-10">
                <div>
                    <h2 className="text-3xl font-black text-slate-805 tracking-tight font-headline">Vendor Directory</h2>
                    <p className="text-slate-405 mt-1 text-xs font-semibold tracking-wide uppercase">Manage supply chain entities, contact details, and logistical addresses</p>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative group min-w-[280px]">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-600 transition-colors text-[20px]">search</span>
                        <input
                            type="text"
                            placeholder="Find by vendor name or contact..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="w-full bg-white border border-slate-200 shadow-sm rounded-2xl pl-11 pr-4 py-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                        />
                    </div>
                    <button
                        onClick={openAddModal}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-3.5 rounded-2xl text-xs font-bold shadow-lg shadow-cyan-600/15 transition-all active:scale-[0.98] flex items-center gap-2 flex-shrink-0 uppercase tracking-wider"
                    >
                        <span className="material-symbols-outlined text-[18px]">add_business</span>
                        Add Vendor
                    </button>
                </div>
            </div>

            {/* Main Ledger Area */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-slate-100/50 border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-8 py-4.5 text-[10px] font-bold uppercase tracking-wider text-slate-405 w-[15%]">Vendor ID</th>
                                <th className="px-8 py-4.5 text-[10px] font-bold uppercase tracking-wider text-slate-405 w-[25%]">Supplier Name</th>
                                <th className="px-8 py-4.5 text-[10px] font-bold uppercase tracking-wider text-slate-405 w-[20%]">Contact Information</th>
                                <th className="px-8 py-4.5 text-[10px] font-bold uppercase tracking-wider text-slate-405 w-[25%]">Address</th>
                                <th className="px-8 py-4.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-405 w-[15%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                            {filteredSuppliers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-16 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">inventory_2</span>
                                            <p className="text-sm font-semibold">No suppliers found in the network.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredSuppliers.map((supp) => (
                                    <tr key={supp._id} className="hover:bg-slate-50/30 transition-colors border-l-2 border-l-transparent hover:border-l-cyan-500 group">
                                        <td className="px-8 py-5">
                                            <span className="text-xs font-bold font-mono text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-100/50">
                                                SUP-{supp._id.substring(supp._id.length - 4).toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                    {supp.name.charAt(0).toUpperCase()}
                                                </div>
                                                <p className="text-xs font-extrabold text-slate-800 truncate max-w-[180px]">{supp.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-xs font-medium text-slate-500 truncate max-w-[160px]">{supp.contact || 'N/A'}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-xs font-medium text-slate-505 truncate max-w-[180px]">{supp.address || 'N/A'}</p>
                                            <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">Registered Entity</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <button
                                                    onClick={() => openEditModal(supp)}
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                                                    title="Edit Supplier"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(supp._id)}
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
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
                <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-8 text-xs font-bold text-slate-505">
                    <span className="uppercase text-[9px] tracking-wider text-slate-400">
                        Total Network Strength
                    </span>
                    <span className="bg-white px-3 py-1.5 rounded-xl text-slate-700 shadow-sm border border-slate-200">
                        {filteredSuppliers.length} Entities
                    </span>
                </div>
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-in border border-slate-100 flex flex-col">
                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-extrabold text-slate-800 text-base font-headline">
                                {editingSupplier ? 'Edit Vendor Profile' : 'Register New Vendor'}
                            </h3>
                            <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-655 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider ml-1">Entity Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition-all text-slate-800 font-medium placeholder:text-slate-400"
                                    required
                                    placeholder="e.g. Pfizer Pharmaceuticals"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider ml-1">Contact Details *</label>
                                <input
                                    type="text"
                                    name="contact"
                                    value={formData.contact}
                                    onChange={handleInputChange}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition-all text-slate-800 font-medium placeholder:text-slate-400"
                                    required
                                    placeholder="Email or Phone Number"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider ml-1">Registered Address *</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    rows="3"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition-all text-slate-800 font-medium resize-none placeholder:text-slate-400"
                                    required
                                    placeholder="Full street address..."
                                ></textarea>
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-slate-100">
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-xs shadow-md shadow-cyan-600/10 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 uppercase tracking-wider active:scale-95"
                                >
                                    {formLoading ? (
                                        <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[18px]">save</span>
                                    )}
                                    {editingSupplier ? 'Save Updates' : 'Add Vendor'}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-5 py-3 border border-slate-200 text-slate-505 font-bold rounded-xl hover:bg-slate-50 transition-colors text-xs"
                                >
                                    Cancel
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
