import Medicine from "../models/Medicine.js";

// GET all medicines
export const getMedicines = async (req, res) => {
    try {
        const medicines = await Medicine.find().populate("supplier");

        // low stock flag add
        const updated = medicines.map((med) => ({
            ...med._doc,
            lowStock: med.quantity < 10,
        }));

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET single medicine
export const getMedicineById = async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id).populate("supplier");

        if (!medicine) {
            return res.status(404).json({ message: "Medicine not found" });
        }

        res.json(medicine);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// CREATE medicine
export const createMedicine = async (req, res) => {
    try {
        const { name, category, batch_number, expiry_date, price, quantity, supplier } = req.body;

        // validation
        if (!name || !expiry_date || !price || !quantity) {
            return res.status(400).json({
                message: "Name, expiry_date, price, and quantity are required",
            });
        }

        const medicine = await Medicine.create({
            name,
            category,
            batch_number,
            expiry_date,
            price,
            quantity,
            supplier,
        });

        res.status(201).json(medicine);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// UPDATE medicine
export const updateMedicine = async (req, res) => {
    try {
        const medicine = await Medicine.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!medicine) {
            return res.status(404).json({ message: "Medicine not found" });
        }

        res.json(medicine);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE medicine
export const deleteMedicine = async (req, res) => {
    try {
        const medicine = await Medicine.findByIdAndDelete(req.params.id);

        if (!medicine) {
            return res.status(404).json({ message: "Medicine not found" });
        }

        res.json({ message: "Medicine deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// LOW STOCK (quantity < 10)
export const getLowStockMedicines = async (req, res) => {
    try {
        const medicines = await Medicine.find({ quantity: { $lt: 10 } });

        const updated = medicines.map((med) => ({
            ...med._doc,
            lowStock: true,
        }));

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// EXPIRING (next 30 days)
export const getExpiringMedicines = async (req, res) => {
    try {
        const today = new Date();
        const next30Days = new Date();
        next30Days.setDate(today.getDate() + 30);

        const medicines = await Medicine.find({
            expiry_date: { $gte: today, $lte: next30Days },
        });

        res.json(medicines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};