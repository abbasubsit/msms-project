import mongoose from "mongoose";

let isConnected = false;

const connectDB = async () => {
    if (isConnected || mongoose.connection.readyState >= 1) {
        isConnected = true;
        return;
    }

    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI environment variable is missing!");
        }
        const conn = await mongoose.connect(process.env.MONGO_URI);
        isConnected = conn.connections[0].readyState;
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("Database connection error:", error.message);
        // Do not call process.exit(1) as it crashes serverless function workers on Vercel
    }
};

export default connectDB;