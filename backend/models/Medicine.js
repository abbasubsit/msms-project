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
            min: [0, 'Price cannot be negative'],
        },
        quantity: {
            type: Number,
            required: true,
            min: [0, 'Quantity cannot be negative — stock cannot go below zero'],
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