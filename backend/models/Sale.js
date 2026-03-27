import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
        },
        items: [
            {
                medicine: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Medicine",
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                },
                price: {
                    type: Number,
                    required: true,
                },
            },
        ],
        total_amount: {
            type: Number,
            required: true,
        },
        discount: {
            type: Number,
            default: 0,
        },
        tax: {
            type: Number,
            default: 0,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        invoice_number: {
            type: String,
            required: true,
            unique: true,
        },
    },
    { timestamps: true }
);

const Sale = mongoose.model("Sale", saleSchema);
export default Sale;