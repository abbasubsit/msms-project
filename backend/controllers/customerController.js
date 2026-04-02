import Customer from "../models/Customer.js";
import Sale from "../models/Sale.js";

// GET all customers
export const getCustomers = async (req, res) => {
    try {
        const customers = await Customer.find();
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// CREATE customer
export const createCustomer = async (req, res) => {
    try {
        const { name, contact } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Name is required" });
        }

        const customer = await Customer.create({ name, contact });
        res.status(201).json(customer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET customer purchase history
export const getCustomerHistory = async (req, res) => {
    try {
        const sales = await Sale.find({ customer: req.params.id })
            .populate("items.medicine")
            .populate("customer");

        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};