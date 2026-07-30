import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import migrateBatches from "./utils/migrateBatches.js";

// ─── Routes ───────────────────────────────────────────────────────────────────
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import medicineRoutes from "./routes/medicines.js";
import supplierRoutes from "./routes/suppliers.js";
import customerRoutes from "./routes/customers.js";
import salesRoutes from "./routes/sales.js";
import purchaseRoutes from "./routes/purchases.js";
import reportRoutes from "./routes/reports.js";

dotenv.config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Ensure DB Connection & Migration on Requests ────────────────────────────
let isMigrated = false;

app.use(async (req, res, next) => {
    try {
        await connectDB();
        if (!isMigrated) {
            await migrateBatches();
            isMigrated = true;
        }
    } catch (err) {
        console.error("Database initialization middleware error:", err);
    }
    next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
    res.send("API is running...");
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/reports", reportRoutes);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
    });
}

export default app;