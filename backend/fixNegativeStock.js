// One-time fix: reset all negative quantities to 0
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Medicine from './models/Medicine.js';

dotenv.config();

async function fixNegativeQuantities() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all medicines with negative quantity
    const negative = await Medicine.find({ quantity: { $lt: 0 } });
    console.log(`\nFound ${negative.length} medicine(s) with negative quantity:`);
    negative.forEach(m => console.log(`  - ${m.name}: quantity = ${m.quantity}`));

    if (negative.length > 0) {
        // Set all negative quantities to 0
        const result = await Medicine.updateMany(
            { quantity: { $lt: 0 } },
            { $set: { quantity: 0 } }
        );
        console.log(`\n✅ Fixed ${result.modifiedCount} medicine(s) — quantity set to 0`);
    } else {
        console.log('\n✅ No negative quantities found. Database is clean.');
    }

    // Also fix negative prices
    const negPrices = await Medicine.find({ price: { $lt: 0 } });
    if (negPrices.length > 0) {
        await Medicine.updateMany({ price: { $lt: 0 } }, { $set: { price: 0 } });
        console.log(`✅ Fixed ${negPrices.length} medicine(s) with negative price`);
    }

    await mongoose.disconnect();
    console.log('\nDone. Disconnected from MongoDB.');
    process.exit(0);
}

fixNegativeQuantities().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
