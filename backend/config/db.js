import mongoose from "mongoose";

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    if (!cached.promise) {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI environment variable is missing!");
        }

        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 10000,
        };

        cached.promise = mongoose.connect(process.env.MONGO_URI, opts)
            .then((mongooseInstance) => {
                console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
                return mongooseInstance;
            })
            .catch((err) => {
                cached.promise = null;
                throw err;
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
};

export default connectDB;