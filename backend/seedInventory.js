import mongoose from "mongoose";
import dotenv from "dotenv";
import Medicine from "./models/Medicine.js";
import Supplier from "./models/Supplier.js";

dotenv.config();

const suppliersData = [
    { name: "PharmaCorp Industries", contact: "0300-1112223", address: "Plot 42-A, Industrial Area, Karachi" },
    { name: "BioHealth Distribution", contact: "0311-4445556", address: "5th Avenue, Phase 2, Lahore" },
    { name: "Zenith Medical Supplies", contact: "0322-7778889", address: "Commercial Sector G-9, Islamabad" }
];

const getFutureDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
};

const getPastDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
};

const seedInventory = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/msms");
        console.log("✅ Connected to MongoDB for seeding inventory...");

        // Remove old supplier and medicine data
        await Medicine.deleteMany({});
        await Supplier.deleteMany({});
        console.log("🧹 Cleaned existing Medicines and Suppliers.");

        // Insert Suppliers
        const createdSuppliers = await Supplier.insertMany(suppliersData);
        console.log(`✅ Seeded ${createdSuppliers.length} Suppliers.`);

        const sup1 = createdSuppliers[0]._id;
        const sup2 = createdSuppliers[1]._id;
        const sup3 = createdSuppliers[2]._id;

        // Rich & diverse Medicine list
        const medicinesData = [
            // ── Antibiotics ─────────────────────────────────────────────────────────
            {
                name: "Amoxicillin 500mg",
                category: "Antibiotics",
                batch_number: "AMX-8801",
                expiry_date: getFutureDate(365), // 1 year from now
                price: 12.50,
                quantity: 120,
                supplier: sup1,
                batches: [{ batch_number: "AMX-8801", expiry_date: getFutureDate(365), quantity: 120, price: 12.50, cost_price: 8.00 }]
            },
            {
                name: "Azithromycin 250mg",
                category: "Antibiotics",
                batch_number: "AZI-1204",
                expiry_date: getPastDate(15), // Expired 15 days ago
                price: 18.00,
                quantity: 45,
                supplier: sup1,
                batches: [{ batch_number: "AZI-1204", expiry_date: getPastDate(15), quantity: 45, price: 18.00, cost_price: 12.00 }]
            },
            {
                name: "Ciprofloxacin 500mg",
                category: "Antibiotics",
                batch_number: "CIP-4402",
                expiry_date: getFutureDate(12), // Expiring in 12 days
                price: 15.20,
                quantity: 8, // Low Stock
                supplier: sup2,
                batches: [{ batch_number: "CIP-4402", expiry_date: getFutureDate(12), quantity: 8, price: 15.20, cost_price: 10.00 }]
            },

            // ── Analgesics (Pain Relievers) ──────────────────────────────────────────
            {
                name: "Paracetamol 500mg (Panadol)",
                category: "Analgesics",
                batch_number: "PAR-9090",
                expiry_date: getFutureDate(730), // 2 years from now
                price: 2.50,
                quantity: 500,
                supplier: sup2,
                batches: [{ batch_number: "PAR-9090", expiry_date: getFutureDate(730), quantity: 500, price: 2.50, cost_price: 1.50 }]
            },
            {
                name: "Ibuprofen 400mg",
                category: "Analgesics",
                batch_number: "IBU-3111",
                expiry_date: getFutureDate(450),
                price: 4.80,
                quantity: 0, // Out of Stock
                supplier: sup3,
                batches: []
            },
            {
                name: "Tramadol 50mg",
                category: "Analgesics",
                batch_number: "TRA-6029",
                expiry_date: getFutureDate(20), // Expiring in 20 days
                price: 22.00,
                quantity: 6, // Low Stock & Expiring soon
                supplier: sup1,
                batches: [{ batch_number: "TRA-6029", expiry_date: getFutureDate(20), quantity: 6, price: 22.00, cost_price: 15.00 }]
            },

            // ── Antivirals ───────────────────────────────────────────────────────────
            {
                name: "Acyclovir 400mg",
                category: "Antivirals",
                batch_number: "ACY-7011",
                expiry_date: getFutureDate(280),
                price: 29.99,
                quantity: 80,
                supplier: sup3,
                batches: [{ batch_number: "ACY-7011", expiry_date: getFutureDate(280), quantity: 80, price: 29.99, cost_price: 20.00 }]
            },
            {
                name: "Oseltamivir 75mg (Tamiflu)",
                category: "Antivirals",
                batch_number: "OSE-5091",
                expiry_date: getFutureDate(600),
                price: 45.50,
                quantity: 4, // Low Stock
                supplier: sup2,
                batches: [{ batch_number: "OSE-5091", expiry_date: getFutureDate(600), quantity: 4, price: 45.50, cost_price: 32.00 }]
            },

            // ── Cardiovascular ──────────────────────────────────────────────────────
            {
                name: "Atorvastatin 20mg (Lipitor)",
                category: "Cardiovascular",
                batch_number: "ATO-1122",
                expiry_date: getFutureDate(500),
                price: 34.00,
                quantity: 150,
                supplier: sup1,
                batches: [{ batch_number: "ATO-1122", expiry_date: getFutureDate(500), quantity: 150, price: 34.00, cost_price: 22.00 }]
            },
            {
                name: "Metoprolol 50mg",
                category: "Cardiovascular",
                batch_number: "MET-3388",
                expiry_date: getPastDate(90), // Expired 90 days ago
                price: 19.50,
                quantity: 30,
                supplier: sup3,
                batches: [{ batch_number: "MET-3388", expiry_date: getPastDate(90), quantity: 30, price: 19.50, cost_price: 13.00 }]
            },
            {
                name: "Amlodipine 5mg",
                category: "Cardiovascular",
                batch_number: "AML-9911",
                expiry_date: getFutureDate(18), // Expiring in 18 days
                price: 8.75,
                quantity: 110, // Good stock, but expiring soon
                supplier: sup2,
                batches: [{ batch_number: "AML-9911", expiry_date: getFutureDate(18), quantity: 110, price: 8.75, cost_price: 5.00 }]
            },

            // ── Vitamins & Supplements ────────────────────────────────────────────────
            {
                name: "Vitamin C 1000mg (Cac-1000)",
                category: "Vitamins",
                batch_number: "VIT-8822",
                expiry_date: getFutureDate(360),
                price: 6.50,
                quantity: 250,
                supplier: sup3,
                batches: [{ batch_number: "VIT-8822", expiry_date: getFutureDate(360), quantity: 250, price: 6.50, cost_price: 4.00 }]
            },
            {
                name: "Vitamin D3 200,000 IU",
                category: "Vitamins",
                batch_number: "D3-0091",
                expiry_date: getFutureDate(400),
                price: 14.00,
                quantity: 2, // Low stock
                supplier: sup1,
                batches: [{ batch_number: "D3-0091", expiry_date: getFutureDate(400), quantity: 2, price: 14.00, cost_price: 9.00 }]
            },

            // ── Respiratory ──────────────────────────────────────────────────────────
            {
                name: "Albuterol Inhaler (Ventolin)",
                category: "Respiratory",
                batch_number: "ALB-5566",
                expiry_date: getFutureDate(600),
                price: 25.00,
                quantity: 90,
                supplier: sup2,
                batches: [{ batch_number: "ALB-5566", expiry_date: getFutureDate(600), quantity: 90, price: 25.00, cost_price: 16.00 }]
            },
            {
                name: "Fluticasone Nasal Spray",
                category: "Respiratory",
                batch_number: "FLU-1010",
                expiry_date: getPastDate(5), // Expired 5 days ago
                price: 32.80,
                quantity: 12,
                supplier: sup3,
                batches: [{ batch_number: "FLU-1010", expiry_date: getPastDate(5), quantity: 12, price: 32.80, cost_price: 22.00 }]
            }
        ];

        // Seed Medicines
        const createdMedicines = await Medicine.insertMany(medicinesData);
        console.log(`✅ Seeded ${createdMedicines.length} Medicines with diverse statuses and categories.`);
        console.log("\n🚀 Seeding Inventory completed successfully!");

    } catch (err) {
        console.error("❌ Seeding failed:", err.message);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Disconnected from MongoDB");
        process.exit(0);
    }
};

seedInventory();
