import User from "../models/User.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// ─── Helper: Safe user object (strip sensitive fields) ───────────────────────
const safeUser = (user) => ({
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    isFirstLogin: user.isFirstLogin,
    lastLogin: user.lastLogin,
    createdBy: user.createdBy,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users — All users (super_admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            role,
            isActive,
            search,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;

        // Build filter object
        const filter = {};

        if (role) filter.role = role;

        if (isActive !== undefined) {
            filter.isActive = isActive === "true";
        }

        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOrder = order === "asc" ? 1 : -1;

        const [users, totalCount] = await Promise.all([
            User.find(filter)
                .select("-password -refreshToken -passwordResetToken -passwordResetExpires")
                .populate("createdBy", "fullName email")
                .sort({ [sortBy]: sortOrder })
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(filter),
        ]);

        res.status(200).json({
            users,
            pagination: {
                totalCount,
                totalPages: Math.ceil(totalCount / parseInt(limit)),
                currentPage: parseInt(page),
                limit: parseInt(limit),
            },
        });
    } catch (error) {
        console.error("Get all users error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/:id — Single user (super_admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select("-password -refreshToken -passwordResetToken -passwordResetExpires")
            .populate("createdBy", "fullName email");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error("Get user by ID error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users — Create user (super_admin only)
// (equivalent to /api/auth/register but secured)
// ─────────────────────────────────────────────────────────────────────────────
export const createUser = async (req, res) => {
    try {
        const { fullName, email, phone, password, role } = req.body;

        // ── Validate required fields ──────────────────────────────────────────
        if (!fullName || !email || !phone || !password || !role) {
            return res.status(400).json({
                message: "fullName, email, phone, password, and role are required",
            });
        }

        // ── Prevent creating another super_admin ──────────────────────────────
        if (role === "super_admin") {
            return res.status(400).json({
                message: "Cannot create another super_admin. Only one is allowed.",
            });
        }

        // ── Validate role ─────────────────────────────────────────────────────
        if (!["pharmacist", "sales_staff"].includes(role)) {
            return res.status(400).json({
                message: "Role must be either pharmacist or sales_staff",
            });
        }

        // ── Validate password length ──────────────────────────────────────────
        if (password.length < 6) {
            return res
                .status(400)
                .json({ message: "Password must be at least 6 characters" });
        }

        // ── Check email uniqueness ─────────────────────────────────────────────
        const emailExists = await User.findOne({ email: email.toLowerCase() });
        if (emailExists) {
            return res
                .status(400)
                .json({ message: "Email already registered" });
        }

        // ── Check phone uniqueness ────────────────────────────────────────────
        const phoneExists = await User.findOne({ phone });
        if (phoneExists) {
            return res
                .status(400)
                .json({ message: "Phone number already registered" });
        }

        // ── Create user ───────────────────────────────────────────────────────
        const user = await User.create({
            fullName: fullName.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            password,      // Hashed by pre-save hook
            role,
            isActive: true,
            isFirstLogin: true, // Force first login password change
            createdBy: req.user._id,
        });

        console.log(`✅ User created: ${user.email} (${user.role}) by ${req.user.email}`);

        res.status(201).json({
            message: "User created successfully",
            user: safeUser(user),
        });
    } catch (error) {
        console.error("Create user error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/users/:id — Update user (super_admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, phone, role } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // ── Prevent changing super_admin's role ───────────────────────────────
        if (user.role === "super_admin" && role && role !== "super_admin") {
            return res.status(400).json({
                message: "Cannot change the role of super_admin",
            });
        }

        // ── Prevent assigning super_admin role ────────────────────────────────
        if (role === "super_admin") {
            return res.status(400).json({
                message: "Cannot assign super_admin role. Only one is allowed.",
            });
        }

        // ── Check phone uniqueness if changing ────────────────────────────────
        if (phone && phone !== user.phone) {
            const phoneExists = await User.findOne({
                phone,
                _id: { $ne: id },
            });
            if (phoneExists) {
                return res
                    .status(400)
                    .json({ message: "Phone number already in use" });
            }
        }

        // ── Apply updates ─────────────────────────────────────────────────────
        const updateData = {};
        if (fullName) updateData.fullName = fullName.trim();
        if (phone) updateData.phone = phone.trim();
        if (role && ["pharmacist", "sales_staff"].includes(role)) {
            updateData.role = role;
        }

        const updatedUser = await User.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        }).select("-password -refreshToken -passwordResetToken -passwordResetExpires");

        console.log(`✏️ User updated: ${updatedUser.email} by ${req.user.email}`);

        res.status(200).json({
            message: "User updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        console.error("Update user error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/:id/status — Toggle active/inactive (super_admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // ── Prevent deactivating super_admin ─────────────────────────────────
        if (user.role === "super_admin") {
            return res.status(400).json({
                message: "Cannot deactivate the super_admin account",
            });
        }

        // ── Prevent deactivating self ─────────────────────────────────────────
        if (user._id.toString() === req.user._id.toString()) {
            return res
                .status(400)
                .json({ message: "Cannot change your own account status" });
        }

        user.isActive = !user.isActive;
        await user.save({ validateBeforeSave: false });

        const status = user.isActive ? "activated" : "deactivated";
        console.log(`🔄 User ${status}: ${user.email} by ${req.user.email}`);

        res.status(200).json({
            message: `User ${status} successfully`,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                isActive: user.isActive,
            },
        });
    } catch (error) {
        console.error("Toggle status error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/users/:id/role — Change user role (super_admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const changeUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!role) {
            return res.status(400).json({ message: "Role is required" });
        }

        // ── Prevent assigning super_admin ─────────────────────────────────────
        if (role === "super_admin") {
            return res.status(400).json({
                message: "Cannot assign super_admin role",
            });
        }

        if (!["pharmacist", "sales_staff"].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role === "super_admin") {
            return res.status(400).json({
                message: "Cannot change the role of super_admin",
            });
        }

        user.role = role;
        await user.save({ validateBeforeSave: false });

        console.log(`🔄 Role changed for ${user.email} to ${role} by ${req.user.email}`);

        res.status(200).json({
            message: "User role updated successfully",
            user: { id: user._id, email: user.email, role: user.role },
        });
    } catch (error) {
        console.error("Change role error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/users/:id/reset-password — Reset user password (super_admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate a random temporary password
        const tempPassword =
            "Temp@" +
            Math.random().toString(36).slice(2, 8).toUpperCase() +
            Math.floor(10 + Math.random() * 90);

        user.password = tempPassword; // Will be hashed by pre-save hook
        user.isFirstLogin = true;     // Force password change on next login
        await user.save();

        console.log(`🔑 Password reset for ${user.email} by ${req.user.email}`);

        // TODO: Send email with tempPassword in production
        res.status(200).json({
            message: "Password reset successfully. User must change password on next login.",
            // Return temp password only in dev — remove in production or send via email
            tempPassword,
        });
    } catch (error) {
        console.error("Reset user password error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/users/:id — Soft delete (super_admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // ── Prevent deleting super_admin ──────────────────────────────────────
        if (user.role === "super_admin") {
            return res.status(400).json({
                message: "Cannot delete the super_admin account",
            });
        }

        // ── Prevent deleting own account ──────────────────────────────────────
        if (user._id.toString() === req.user._id.toString()) {
            return res
                .status(400)
                .json({ message: "Cannot delete your own account" });
        }

        // ── Soft delete: deactivate instead of removing ───────────────────────
        user.isActive = false;
        await user.save({ validateBeforeSave: false });

        console.log(`🗑️ User soft-deleted: ${user.email} by ${req.user.email}`);

        res.status(200).json({
            message: "User deactivated successfully (soft delete)",
        });
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/stats — User statistics (super_admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const getUserStats = async (req, res) => {
    try {
        const [total, active, byRole] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isActive: true }),
            User.aggregate([
                { $group: { _id: "$role", count: { $sum: 1 } } },
            ]),
        ]);

        const roleStats = byRole.reduce((acc, r) => {
            acc[r._id] = r.count;
            return acc;
        }, {});

        res.status(200).json({
            total,
            active,
            inactive: total - active,
            byRole: {
                super_admin: roleStats.super_admin || 0,
                pharmacist: roleStats.pharmacist || 0,
                sales_staff: roleStats.sales_staff || 0,
            },
        });
    } catch (error) {
        console.error("Get stats error:", error);
        res.status(500).json({ message: error.message });
    }
};
