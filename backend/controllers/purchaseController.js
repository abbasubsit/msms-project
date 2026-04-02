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

        // calculate total & update stock
        for (let item of items) {
            const medicine = await Medicine.findById(item.medicine);

            if (!medicine) {
                return res.status(404).json({ message: "Medicine not found" });
            }

            total += item.price * item.quantity;

            // stock increase
            await Medicine.findByIdAndUpdate(item.medicine, {
                $inc: { quantity: item.quantity },
            });
        }

        const purchase = await Purchase.create({
            supplier,
            items,
            total_amount: total,
        });

        res.status(201).json(purchase);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};