import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },

        category: String,

        batch_number: String,
        
        expiry_date: {
            type: Date,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
        },
        supplier: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Supplier",   // 🔗 reference
        },
    },
    { timestamps: true }
);

const Medicine = mongoose.model("Medicine", medicineSchema);
export default Medicine;