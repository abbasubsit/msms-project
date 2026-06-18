import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
    {
        // ─── New Fields ───────────────────────────────────────────────────────────
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        // ─── Role ─────────────────────────────────────────────────────────────────
        role: {
            type: String,
            enum: ["super_admin", "pharmacist", "sales_staff"],
            required: true,
            default: "sales_staff",
        },

        // ─── Security & Status ────────────────────────────────────────────────────
        password: {
            type: String,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isFirstLogin: {
            type: Boolean,
            default: true, // Force password change on first login
        },

        // ─── Audit ────────────────────────────────────────────────────────────────
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        lastLogin: {
            type: Date,
        },

        // ─── Password Reset ───────────────────────────────────────────────────────
        passwordResetToken: {
            type: String,
        },
        passwordResetExpires: {
            type: Date,
        },

        // ─── Refresh Token ────────────────────────────────────────────────────────
        refreshToken: {
            type: String,
        },

        // ─── Legacy field kept for backward compatibility ─────────────────────────
        username: {
            type: String,
            sparse: true, // allows multiple null values (unique but optional)
        },
    },
    { timestamps: true }
);

// ─── Hash password before save ────────────────────────────────────────────────
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

/** Compare plain password with stored hash */
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

/** Generate a password reset token (stored hashed, returned plain) */
userSchema.methods.generatePasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash and store in DB
    this.passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    // Token expires in 15 minutes
    this.passwordResetExpires = Date.now() + 15 * 60 * 1000;

    return resetToken; // Return plain token (sent via email)
};

const User = mongoose.model("User", userSchema);
export default User;