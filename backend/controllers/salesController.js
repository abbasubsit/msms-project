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

        // Step 6: update stock (atomic-like FIFO batch deduction)
        for (let item of items) {
            const medicine = await Medicine.findById(item.medicine);
            if (!medicine || medicine.quantity < item.quantity) {
                // Rollback: delete the created sale document
                await Sale.findByIdAndDelete(sale._id);
                return res.status(400).json({
                    message: `Stock ran out during transaction. Please retry.`,
                });
            }

            if (!medicine.batches) {
                medicine.batches = [];
            }

            let remainingToDeduct = item.quantity;
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

            // Recalculate top level fields
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
        }

        res.status(201).json(sale);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// UPDATE sale
export const updateSale = async (req, res) => {
    try {
        const { items, discount = 0 } = req.body;
        const oldSale = await Sale.findById(req.params.id);

        if (!oldSale) {
            return res.status(404).json({ message: "Sale not found" });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Invalid data" });
        }

        // Step 1: Temporarily restock the old items conceptually
        const stockMap = new Map();

        for (let oldItem of oldSale.items) {
            const med = await Medicine.findById(oldItem.medicine);
            if (med) {
                stockMap.set(oldItem.medicine.toString(), med.quantity + oldItem.quantity);
            }
        }

        // Step 2: Validate new items against the virtual restocked inventory
        let total = 0;
        const newItemsToSave = [];

        for (let item of items) {
            const medicineIdStr = item.medicine.toString();
            
            const medDoc = await Medicine.findById(item.medicine);
            if (!medDoc) {
                 return res.status(404).json({ message: "Medicine not found" });
            }

            let availableStock = stockMap.has(medicineIdStr) ? 
                stockMap.get(medicineIdStr) : 
                medDoc.quantity;

            if (availableStock < item.quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for ${medDoc.name}`,
                });
            }

            stockMap.set(medicineIdStr, availableStock - item.quantity);

            const itemPrice = medDoc.price;
            total += itemPrice * item.quantity;
            newItemsToSave.push({
                 medicine: item.medicine,
                 quantity: item.quantity,
                 price: itemPrice
            });
        }

        // Step 3: All validations passed, actually perform the DB updates
        
        // 3a. Revert old stock in DB by adding it back to the medicine's batches
        for (let oldItem of oldSale.items) {
            const medicine = await Medicine.findById(oldItem.medicine);
            if (medicine) {
                if (!medicine.batches) {
                    medicine.batches = [];
                }

                let targetBatch = medicine.batches.find(b => b.batch_number === medicine.batch_number);
                if (!targetBatch && medicine.batches.length > 0) {
                    targetBatch = medicine.batches[0];
                }

                if (targetBatch) {
                    targetBatch.quantity += oldItem.quantity;
                } else {
                    medicine.batches.push({
                        batch_number: medicine.batch_number || "LEGACY",
                        expiry_date: medicine.expiry_date || new Date(),
                        quantity: oldItem.quantity,
                        price: medicine.price,
                        cost_price: Number((medicine.price * 0.7).toFixed(2))
                    });
                }

                medicine.quantity = medicine.batches.reduce((sum, b) => sum + b.quantity, 0);

                const active = medicine.batches.filter(b => b.quantity > 0);
                if (active.length > 0) {
                    active.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
                    medicine.expiry_date = active[0].expiry_date;
                    medicine.batch_number = active[0].batch_number;
                }

                await medicine.save();
            }
        }

        // 3b. Deduct new stock in DB (FIFO batch deduction)
        for (let newItem of newItemsToSave) {
            const medicine = await Medicine.findById(newItem.medicine);
            if (!medicine || medicine.quantity < newItem.quantity) {
                return res.status(400).json({
                    message: `Insufficient stock during update. Changes not applied.`,
                });
            }

            if (!medicine.batches) {
                medicine.batches = [];
            }

            let remainingToDeduct = newItem.quantity;
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
        }

        // 3c. Calculate financials
        const tax = total * 0.05;
        const total_amount = total + tax - Number(discount);

        // 3d. Update the Sale document
        oldSale.items = newItemsToSave;
        oldSale.total_amount = total_amount;
        oldSale.tax = tax;
        oldSale.discount = Number(discount);
        await oldSale.save();

        res.json(oldSale);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};