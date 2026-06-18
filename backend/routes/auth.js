import express from "express";
import {
    loginUser,
    registerUser,
    refreshAccessToken,
    logoutUser,
    getProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
} from "../controllers/auth.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// ─── Public Routes ────────────────────────────────────────────────────────────
router.post("/login", loginUser);           // Existing — kept as is
router.post("/register", registerUser);     // Existing — now returns 403 (disabled)
router.post("/refresh", refreshAccessToken); // NEW — refresh access token
router.post("/forgot-password", forgotPassword); // NEW
router.post("/reset-password/:token", resetPassword); // NEW

// ─── Protected Routes (all authenticated users) ───────────────────────────────
router.post("/logout", protect, logoutUser);             // NEW
router.get("/profile", protect, getProfile);             // NEW
router.put("/profile", protect, updateProfile);          // NEW
router.put("/change-password", protect, changePassword); // NEW

export default router;