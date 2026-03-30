import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import medicineRoutes from "./routes/medicines.js";

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



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});