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

        if (Number(quantity) < 0) {
            return res.status(400).json({ message: "Quantity cannot be negative" });
        }

        if (Number(price) < 0) {
            return res.status(400).json({ message: "Price cannot be negative" });
        }

        const batches = [];
        if (Number(quantity) > 0) {
            batches.push({
                batch_number: (batch_number || "N/A").trim(),
                expiry_date: new Date(expiry_date),
                quantity: Number(quantity),
                price: Number(price),
                cost_price: Number((Number(price) * 0.7).toFixed(2)) // estimate cost price as 70% of retail price
            });
        }

        const medicine = await Medicine.create({
            name,
            category,
            batch_number: (batch_number || "N/A").trim(),
            expiry_date,
            price,
            quantity,
            supplier,
            batches
        });

        res.status(201).json(medicine);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// UPDATE medicine
export const updateMedicine = async (req, res) => {
    try {
        const { quantity, price, expiry_date, batch_number, name, category, supplier } = req.body;

        // Prevent negative quantity or price in updates
        if (quantity !== undefined && Number(quantity) < 0) {
            return res.status(400).json({ message: "Quantity cannot be negative" });
        }
        if (price !== undefined && Number(price) < 0) {
            return res.status(400).json({ message: "Price cannot be negative" });
        }

        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) {
            return res.status(404).json({ message: "Medicine not found" });
        }

        // Update basic fields
        if (name !== undefined) medicine.name = name;
        if (category !== undefined) medicine.category = category;
        if (supplier !== undefined) medicine.supplier = supplier;

        // Ensure batches array exists
        if (!medicine.batches) {
            medicine.batches = [];
        }

        // Handle price update
        if (price !== undefined) {
            const newPrice = Number(price);
            medicine.price = newPrice;
            // Update price across all batches
            medicine.batches.forEach(b => {
                b.price = newPrice;
            });
        }

        // Handle quantity update (manual stock adjustment)
        if (quantity !== undefined) {
            const newQty = Number(quantity);
            const diff = newQty - medicine.quantity;

            if (diff < 0) {
                // Shrinkage: Deduct from batches using FIFO
                let remainingToDeduct = Math.abs(diff);
                const activeBatches = medicine.batches.filter(b => b.quantity > 0);
                activeBatches.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

                for (let batch of activeBatches) {
                    if (remainingToDeduct <= 0) break;
                    const dbBatch = medicine.batches.id(batch._id);
                    if (dbBatch) {
                        if (dbBatch.quantity >= remainingToDeduct) {
                            dbBatch.quantity -= remainingToDeduct;
                            remainingToDeduct = 0;
                        } else {
                            remainingToDeduct -= dbBatch.quantity;
                            dbBatch.quantity = 0;
                        }
                    }
                }
            } else if (diff > 0) {
                // Addition: Add to matching batch or oldest batch
                let targetBatch = medicine.batches.find(b => b.batch_number === medicine.batch_number);
                if (!targetBatch && medicine.batches.length > 0) {
                    targetBatch = medicine.batches[0];
                }

                if (targetBatch) {
                    targetBatch.quantity += diff;
                } else {
                    medicine.batches.push({
                        batch_number: batch_number !== undefined ? batch_number.trim() : (medicine.batch_number || "LEGACY"),
                        expiry_date: expiry_date ? new Date(expiry_date) : (medicine.expiry_date || new Date()),
                        quantity: diff,
                        price: price !== undefined ? Number(price) : medicine.price,
                        cost_price: Number(((price !== undefined ? Number(price) : medicine.price) * 0.7).toFixed(2))
                    });
                }
            }
        }

        // Handle batch_number or expiry_date update
        if (batch_number !== undefined || expiry_date !== undefined) {
            let targetBatch = medicine.batches.find(b => b.batch_number === medicine.batch_number);
            if (!targetBatch && medicine.batches.length > 0) {
                targetBatch = medicine.batches[0];
            }

            if (targetBatch) {
                if (batch_number !== undefined) targetBatch.batch_number = batch_number.trim();
                if (expiry_date !== undefined) targetBatch.expiry_date = new Date(expiry_date);
            } else {
                medicine.batches.push({
                    batch_number: batch_number !== undefined ? batch_number.trim() : (medicine.batch_number || "LEGACY"),
                    expiry_date: expiry_date !== undefined ? new Date(expiry_date) : (medicine.expiry_date || new Date()),
                    quantity: quantity !== undefined ? Number(quantity) : medicine.quantity,
                    price: price !== undefined ? Number(price) : medicine.price,
                    cost_price: Number(((price !== undefined ? Number(price) : medicine.price) * 0.7).toFixed(2))
                });
            }
        }

        // Recalculate top-level fields
        const totalQty = medicine.batches.reduce((sum, b) => sum + b.quantity, 0);
        const remainingActive = medicine.batches.filter(b => b.quantity > 0);
        let oldestActiveBatch = null;

        if (remainingActive.length > 0) {
            remainingActive.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
            oldestActiveBatch = remainingActive[0];
        } else if (medicine.batches.length > 0) {
            const sortedAll = [...medicine.batches].sort((a, b) => new Date(b.expiry_date) - new Date(a.expiry_date));
            oldestActiveBatch = sortedAll[0];
        }

        medicine.quantity = totalQty;
        if (oldestActiveBatch) {
            medicine.expiry_date = oldestActiveBatch.expiry_date;
            medicine.batch_number = oldestActiveBatch.batch_number;
        }

        await medicine.save();
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