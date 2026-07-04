import Purchase from "../models/Purchase.js";
import Medicine from "../models/Medicine.js";

// GET all purchases
export const getPurchases = async (req, res) => {
    try {
        const purchases = await Purchase.find()
            .populate("supplier")
            .populate("items.medicine");

        res.json(purchases);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// CREATE purchase
export const createPurchase = async (req, res) => {
    try {
        const { supplier, items } = req.body;

        if (!supplier || !items || items.length === 0) {
            return res.status(400).json({ message: "Invalid data" });
        }

        let total = 0;

        // calculate total & update stock/details
        for (let item of items) {
            const medicine = await Medicine.findById(item.medicine);

            if (!medicine) {
                return res.status(404).json({ message: "Medicine not found" });
            }

            total += item.price * item.quantity;

            // Ensure batches array exists
            if (!medicine.batches) {
                medicine.batches = [];
            }

            const incomingBatchNumber = (item.batch_number || medicine.batch_number || 'N/A').trim();
            const incomingExpiryDate = item.expiry_date ? new Date(item.expiry_date) : (medicine.expiry_date || new Date());
            const newSellingPrice = item.selling_price !== undefined && item.selling_price !== null ? Number(item.selling_price) : medicine.price;
            const purchaseCostPrice = Number(item.price);

            // Helper to check if two dates represent the same calendar day
            const isSameDay = (d1, d2) => {
                const date1 = new Date(d1);
                const date2 = new Date(d2);
                return date1.getFullYear() === date2.getFullYear() &&
                       date1.getMonth() === date2.getMonth() &&
                       date1.getDate() === date2.getDate();
            };

            // Find matching batch (case-insensitive batch number AND same calendar day expiry)
            const existingBatch = medicine.batches.find(
                b => b.batch_number.toLowerCase() === incomingBatchNumber.toLowerCase() &&
                     isSameDay(b.expiry_date, incomingExpiryDate)
            );

            if (existingBatch) {
                existingBatch.quantity += Number(item.quantity);
                existingBatch.price = newSellingPrice;
                existingBatch.cost_price = purchaseCostPrice;
                existingBatch.expiry_date = incomingExpiryDate; // Update expiry in case it was corrected
            } else {
                medicine.batches.push({
                    batch_number: incomingBatchNumber,
                    expiry_date: incomingExpiryDate,
                    quantity: Number(item.quantity),
                    price: newSellingPrice,
                    cost_price: purchaseCostPrice
                });
            }

            // Recalculate total quantity
            const totalQty = medicine.batches.reduce((sum, b) => sum + b.quantity, 0);

            // Find oldest active batch (where quantity > 0) to sync top level expiry date and batch number
            const activeBatches = medicine.batches.filter(b => b.quantity > 0);
            let oldestActiveBatch = null;

            if (activeBatches.length > 0) {
                activeBatches.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
                oldestActiveBatch = activeBatches[0];
            } else if (medicine.batches.length > 0) {
                const sortedAll = [...medicine.batches].sort((a, b) => new Date(b.expiry_date) - new Date(a.expiry_date));
                oldestActiveBatch = sortedAll[0];
            }

            // Sync top level fields
            medicine.quantity = totalQty;
            medicine.price = newSellingPrice;
            if (oldestActiveBatch) {
                medicine.expiry_date = oldestActiveBatch.expiry_date;
                medicine.batch_number = oldestActiveBatch.batch_number;
            }
            if (supplier) {
                medicine.supplier = supplier;
            }

            await medicine.save();
        }

        // Create purchase with fields complying with Purchase schema
        const purchase = await Purchase.create({
            supplier,
            items: items.map(item => ({
                medicine: item.medicine,
                quantity: item.quantity,
                price: item.price,
            })),
            total_amount: total,
        });

        // Return fully populated purchase record
        const populatedPurchase = await Purchase.findById(purchase._id)
            .populate("supplier")
            .populate("items.medicine");

        res.status(201).json(populatedPurchase);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};