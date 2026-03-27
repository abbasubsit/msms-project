import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        contact: String,
        address: String,
    },
    { timestamps: true }
);

const Supplier = mongoose.model("Supplier", supplierSchema);
export default Supplier;