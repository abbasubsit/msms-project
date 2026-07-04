import mongoose from "mongoose";

const batchSchema = new mongoose.Schema({
    batch_number: {
        type: String,
        required: true,
    },
    expiry_date: {
        type: Date,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: [0, 'Quantity cannot be negative'],
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative'],
    },
    cost_price: {
        type: Number,
        required: true,
        min: [0, 'Cost price cannot be negative'],
    }
});

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
        batches: {
            type: [batchSchema],
            default: [],
        },
    },
    { timestamps: true }
);

const Medicine = mongoose.model("Medicine", medicineSchema);
export default Medicine;