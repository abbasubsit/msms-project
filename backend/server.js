import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import medicineRoutes from "./routes/medicines.js";
import supplierRoutes from "./routes/suppliers.js";
import customerRoutes from "./routes/customers.js";
import salesRoutes from "./routes/sales.js";
import purchaseRoutes from "./routes/purchases.js";
import reportRoutes from "./routes/reports.js";

app.use("/api/purchases", purchaseRoutes);
app.use("/api/reports", reportRoutes);


dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


// DB connect
connectDB();

// Test route
app.get("/", (req, res) => {
    res.send("API is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/reports", reportRoutes);



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});