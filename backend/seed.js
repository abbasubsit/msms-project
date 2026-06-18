/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SUPER ADMIN SEEDER
 * ─────────────────────────────────────────────────────────────────────────────
 * Run this ONCE to create the initial super_admin account.
 *
 * Usage:
 *   node seed.js
 *
 * This script:
 *   1. Connects to MongoDB
 *   2. Checks if a super_admin already exists
 *   3. If NOT → creates one with the credentials below
 *   4. If YES → skips (safe to run multiple times)
 *   5. Migrates existing users (adds new fields with safe defaults)
 *
 * ⚠️  Change the password IMMEDIATELY after first login!
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

// ─── Super Admin Credentials ──────────────────────────────────────────────────
const SUPER_ADMIN = {
    fullName: "System Administrator",
    email: "admin@pharmacy.com",
    phone: "0300-0000000",
    password: "Admin@123",   // Temporary — MUST change on first login
    role: "super_admin",
    isActive: true,
    isFirstLogin: true,
    username: "admin",       // Legacy backward-compat field
};

// ─── Migration: add new fields to existing users with safe defaults ────────────
const migrateExistingUsers = async () => {
    console.log("🔄 Migrating existing users...");

    // Add isActive if missing
    const activeResult = await User.updateMany(
        { isActive: { $exists: false } },
        { $set: { isActive: true } }
    );

    // Add isFirstLogin if missing (false for existing users — they know their password)
    const firstLoginResult = await User.updateMany(
        { isFirstLogin: { $exists: false } },
        { $set: { isFirstLogin: false } }
    );

    // Add createdBy if missing
    await User.updateMany(
        { createdBy: { $exists: false } },
        { $set: { createdBy: null } }
    );

    console.log(`   ✅ Added isActive to ${activeResult.modifiedCount} users`);
    console.log(`   ✅ Added isFirstLogin to ${firstLoginResult.modifiedCount} users`);
};

// ─── Main Seeder Function ─────────────────────────────────────────────────────
const seedSuperAdmin = async () => {
    try {
        // Connect to DB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // ── Step 1: Migrate existing users ──────────────────────────────────────
        await migrateExistingUsers();

        // ── Step 2: Check if super_admin already exists ──────────────────────────
        const existingAdmin = await User.findOne({ role: "super_admin" });

        if (existingAdmin) {
            console.log("\n⚠️  Super Admin already exists:");
            console.log(`   Name  : ${existingAdmin.fullName}`);
            console.log(`   Email : ${existingAdmin.email}`);
            console.log(`   Role  : ${existingAdmin.role}`);
            console.log("\n✅ Seeder skipped — no changes made.");
        } else {
            // ── Step 3: Create super_admin ─────────────────────────────────────────
            console.log("\n🚀 No super_admin found. Creating...");

            const admin = await User.create(SUPER_ADMIN);

            console.log("\n✅ Super Admin created successfully!");
            console.log("─────────────────────────────────────────");
            console.log(`   Full Name : ${admin.fullName}`);
            console.log(`   Email     : ${admin.email}`);
            console.log(`   Phone     : ${admin.phone}`);
            console.log(`   Password  : Admin@123 (TEMPORARY)`);
            console.log(`   Role      : ${admin.role}`);
            console.log("─────────────────────────────────────────");
            console.log("⚠️  IMPORTANT: Change this password immediately after first login!");
        }

        // ── Step 4: Print MongoDB direct insert command ──────────────────────────
        console.log("\n📋 Alternatively, for MongoDB Compass / Shell insert:");
        console.log("   (Password hash below is for 'Admin@123' with bcrypt salt 10)");
        console.log(`
db.users.insertOne({
  fullName: "System Administrator",
  email: "admin@pharmacy.com",
  phone: "0300-0000000",
  password: "<run: node -e \\"const b=require('bcryptjs');b.hash('Admin@123',10).then(h=>console.log(h))\\" >",
  role: "super_admin",
  username: "admin",
  isActive: true,
  isFirstLogin: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
`);

    } catch (error) {
        console.error("❌ Seeder failed:", error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Disconnected from MongoDB");
        process.exit(0);
    }
};

// Run seeder
seedSuperAdmin();
