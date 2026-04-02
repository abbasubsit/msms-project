import Sale from "../models/Sale.js";
import Medicine from "../models/Medicine.js";

// GET all sales
export const getSales = async (req, res) => {
    try {
        const sales = await Sale.find()
            .populate("customer")
            .populate("items.medicine");

        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET single sale
export const getSaleById = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id)
            .populate("customer")
            .populate("items.medicine");

        if (!sale) {
            return res.status(404).json({ message: "Sale not found" });
        }

        res.json(sale);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// CREATE sale
export const createSale = async (req, res) => {
    try {
        const { customer, items, discount = 0 } = req.body;

        if (!customer || !items || items.length === 0) {
            return res.status(400).json({ message: "Invalid data" });
        }

        let total = 0;

        // Step 1: check stock & calculate total
        for (let item of items) {
            const medicine = await Medicine.findById(item.medicine);

            if (!medicine) {
                return res.status(404).json({ message: "Medicine not found" });
            }

            // stock check
            if (medicine.quantity < item.quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for ${medicine.name}`,
                });
            }

            // calculate price
            item.price = medicine.price;
            total += medicine.price * item.quantity;
        }

        // Step 2: add tax (5%)
        const tax = total * 0.05;

        // Step 3: final amount
        const total_amount = total + tax - discount;

        // Step 4: invoice number generate
        const count = await Sale.countDocuments();
        const invoice_number = `INV-${new Date().getFullYear()}-${count + 1}`;

        // Step 5: save sale
        const sale = await Sale.create({
            customer,
            items,
            total_amount,
            discount,
            tax,
            invoice_number,
        });

        // Step 6: update stock
        for (let item of items) {
            await Medicine.findByIdAndUpdate(item.medicine, {
                $inc: { quantity: -item.quantity },
            });
        }

        res.status(201).json(sale);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};