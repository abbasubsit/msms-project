import Medicine from "../models/Medicine.js";

/**
 * Migrates existing legacy medicines to the new batches format.
 * Runs on startup, finds medicines with no batches, and initializes their batch array.
 */
const migrateBatches = async () => {
    try {
        console.log("🔍 Checking for legacy medicines to migrate...");
        const legacyMedicines = await Medicine.find({
            $or: [
                { batches: { $exists: false } },
                { batches: { $size: 0 }, quantity: { $gt: 0 } }
            ]
        });

        if (legacyMedicines.length === 0) {
            console.log("✅ No legacy medicines found. Database is up to date.");
            return;
        }

        console.log(`⚙️ Migrating ${legacyMedicines.length} medicines to batch system...`);

        for (let med of legacyMedicines) {
            const batchNum = med.batch_number || "LEGACY";
            const expDate = med.expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default to 1 year from now
            const qty = med.quantity || 0;
            const price = med.price || 0;
            const costPrice = Number((price * 0.7).toFixed(2)); // Estimate cost price as 70% of retail price

            med.batches = [
                {
                    batch_number: batchNum,
                    expiry_date: expDate,
                    quantity: qty,
                    price: price,
                    cost_price: costPrice
                }
            ];

            // Re-sync top level fields to ensure consistency
            med.quantity = qty;
            med.price = price;
            med.expiry_date = expDate;
            med.batch_number = batchNum;

            await med.save();
            console.log(`   Migrated medicine: "${med.name}" (Qty: ${qty}, Batch: ${batchNum})`);
        }

        console.log("✅ Database migration completed successfully!");
    } catch (error) {
        console.error("❌ Error during legacy medicines migration:", error);
    }
};

export default migrateBatches;
