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

            // stock increase & optional field updates (selling_price, expiry_date, supplier)
            const updateFields = {
                $inc: { quantity: item.quantity },
            };

            const setFields = {};
            if (item.selling_price !== undefined && item.selling_price !== null) {
                setFields.price = Number(item.selling_price);
            }
            if (item.expiry_date) {
                setFields.expiry_date = new Date(item.expiry_date);
            }
            if (supplier) {
                setFields.supplier = supplier;
            }

            if (Object.keys(setFields).length > 0) {
                updateFields.$set = setFields;
            }

            await Medicine.findByIdAndUpdate(item.medicine, updateFields);
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