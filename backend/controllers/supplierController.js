import Supplier from "../models/Supplier.js";

// GET all suppliers
export const getSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.find();
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// CREATE supplier
export const createSupplier = async (req, res) => {
    try {
        const { name, contact, address } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Name is required" });
        }

        const supplier = await Supplier.create({ name, contact, address });
        res.status(201).json(supplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// UPDATE supplier
export const updateSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!supplier) {
            return res.status(404).json({ message: "Supplier not found" });
        }

        res.json(supplier);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE supplier
export const deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndDelete(req.params.id);

        if (!supplier) {
            return res.status(404).json({ message: "Supplier not found" });
        }

        res.json({ message: "Supplier deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};