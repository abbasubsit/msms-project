import Sale from "../models/Sale.js";
import Medicine from "../models/Medicine.js";

// Daily Sales
export const getDailySales = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sales = await Sale.find({
            date: { $gte: today },
        });

        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Monthly Sales
export const getMonthlySales = async (req, res) => {
    try {
        const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const sales = await Sale.find({
            date: { $gte: start },
        });

        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Stock Report
export const getStockReport = async (req, res) => {
    try {
        const medicines = await Medicine.find();
        res.json(medicines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Expiry Report
export const getExpiryReport = async (req, res) => {
    try {
        const today = new Date();
        const next30 = new Date();
        next30.setDate(today.getDate() + 30);

        const medicines = await Medicine.find({
            expiry_date: { $gte: today, $lte: next30 },
        });

        res.json(medicines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};