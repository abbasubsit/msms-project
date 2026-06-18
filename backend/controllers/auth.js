import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// ─── Helper: Generate Access Token ───────────────────────────────────────────
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            isFirstLogin: user.isFirstLogin,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || "24h" }
    );
};

// ─── Helper: Generate Refresh Token ──────────────────────────────────────────
const generateRefreshToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING ENDPOINT — KEPT AS IS (supports both username & email login)
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
export const loginUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Support login via email (new) OR username (legacy backward compat)
        const loginIdentifier = email || username;
        if (!loginIdentifier || !password) {
            return res
                .status(400)
                .json({ message: "Email/username and password are required" });
        }

        // Find user by email OR username (legacy)
        const user = await User.findOne({
            $or: [
                { email: loginIdentifier.toLowerCase() },
                { username: loginIdentifier },
            ],
        });

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(403).json({
                message: "Account deactivated. Contact your administrator.",
            });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Update lastLogin
        user.lastLogin = new Date();

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user._id);

        // Store refresh token in DB
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            message: "Login successful",
            token: accessToken,
            refreshToken,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isFirstLogin: user.isFirstLogin,
                // Legacy field
                username: user.username,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING ENDPOINT — KEPT AS IS (legacy register — now restricted)
// POST /api/auth/register
// Note: This is now secured — see /api/users POST for admin user creation
// ─────────────────────────────────────────────────────────────────────────────
export const registerUser = async (req, res) => {
    return res.status(403).json({
        message:
            "Public registration is disabled. Contact your administrator to create an account.",
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Refresh Token
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────────────────────
export const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token required" });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        } catch {
            return res
                .status(401)
                .json({ message: "Invalid or expired refresh token" });
        }

        // Check if user exists and token matches
        const user = await User.findById(decoded.id);
        if (!user || user.refreshToken !== refreshToken) {
            return res
                .status(401)
                .json({ message: "Invalid refresh token" });
        }

        if (!user.isActive) {
            return res
                .status(403)
                .json({ message: "Account deactivated." });
        }

        // Issue new access token
        const newAccessToken = generateAccessToken(user);

        res.status(200).json({ token: newAccessToken });
    } catch (error) {
        console.error("Refresh token error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Logout — clear refresh token
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
export const logoutUser = async (req, res) => {
    try {
        // Clear refresh token in DB
        await User.findByIdAndUpdate(req.user._id, {
            $unset: { refreshToken: 1 },
        });

        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Get own profile
// GET /api/auth/profile
// ─────────────────────────────────────────────────────────────────────────────
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select("-password -refreshToken -passwordResetToken -passwordResetExpires")
            .populate("createdBy", "fullName email");

        res.status(200).json({ user });
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Update own profile (fullName, phone only)
// PUT /api/auth/profile
// ─────────────────────────────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
    try {
        const { fullName, phone } = req.body;

        // Validate
        if (!fullName && !phone) {
            return res
                .status(400)
                .json({ message: "Please provide at least one field to update" });
        }

        const updateData = {};
        if (fullName) updateData.fullName = fullName.trim();
        if (phone) {
            // Check if phone already in use by another user
            const phoneInUse = await User.findOne({
                phone,
                _id: { $ne: req.user._id },
            });
            if (phoneInUse) {
                return res
                    .status(400)
                    .json({ message: "Phone number already in use" });
            }
            updateData.phone = phone.trim();
        }

        const user = await User.findByIdAndUpdate(req.user._id, updateData, {
            new: true,
            runValidators: true,
        }).select("-password -refreshToken -passwordResetToken -passwordResetExpires");

        res.status(200).json({ message: "Profile updated successfully", user });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Change password (by logged-in user)
// PUT /api/auth/change-password
// ─────────────────────────────────────────────────────────────────────────────
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res
                .status(400)
                .json({ message: "All password fields are required" });
        }

        if (newPassword !== confirmPassword) {
            return res
                .status(400)
                .json({ message: "New password and confirm password do not match" });
        }

        if (newPassword.length < 6) {
            return res
                .status(400)
                .json({ message: "New password must be at least 6 characters" });
        }

        // Get user with password field
        const user = await User.findById(req.user._id);

        // Verify current password
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res
                .status(401)
                .json({ message: "Current password is incorrect" });
        }

        // Check new password is different
        const isSame = await user.matchPassword(newPassword);
        if (isSame) {
            return res
                .status(400)
                .json({ message: "New password must be different from current password" });
        }

        // Update password and clear isFirstLogin flag
        user.password = newPassword;
        user.isFirstLogin = false;
        await user.save();

        // Generate new access token with updated isFirstLogin = false
        const accessToken = generateAccessToken(user);

        res.status(200).json({
            message: "Password changed successfully",
            token: accessToken, // Send new token so frontend updates state
        });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Forgot password — generate reset token
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        // Always return 200 (security: don't reveal if email exists)
        if (!user) {
            return res.status(200).json({
                message:
                    "If this email is registered, you will receive reset instructions.",
            });
        }

        // Generate reset token
        const resetToken = user.generatePasswordResetToken();
        await user.save({ validateBeforeSave: false });

        // TODO: Send email with reset link
        // For now, return token in response (replace with email service in production)
        const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${resetToken}`;

        console.log(`🔑 Password Reset URL (dev only): ${resetUrl}`);

        res.status(200).json({
            message:
                "If this email is registered, you will receive reset instructions.",
            // Remove in production — only for development:
            resetToken,
            resetUrl,
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW: Reset password via token
// POST /api/auth/reset-password/:token
// ─────────────────────────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword, confirmPassword } = req.body;

        if (!newPassword || !confirmPassword) {
            return res
                .status(400)
                .json({ message: "All fields are required" });
        }

        if (newPassword !== confirmPassword) {
            return res
                .status(400)
                .json({ message: "Passwords do not match" });
        }

        if (newPassword.length < 6) {
            return res
                .status(400)
                .json({ message: "Password must be at least 6 characters" });
        }

        // Hash the incoming token and compare with stored hash
        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res
                .status(400)
                .json({ message: "Invalid or expired reset token" });
        }

        // Set new password
        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.isFirstLogin = false;
        await user.save();

        res.status(200).json({ message: "Password reset successfully. You can now log in." });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: error.message });
    }
};