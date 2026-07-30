import mongoose from "mongoose";

const connectDB = async () => {
    // If already connected (readyState 1 = connected, 2 = connecting)
    if (mongoose.connection.readyState >= 1) {
        return;
    }

    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI environment variable is missing!");
    }

    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of waiting 30s
            bufferCommands: false, // Disable Mongoose buffering to prevent 10000ms hangs
        });
        console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    } catch (error) {
        console.error("Database connection error:", error.message);
        throw error;
    }
};

export default connectDB;