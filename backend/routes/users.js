import express from "express";
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    toggleUserStatus,
    changeUserRole,
    resetUserPassword,
    deleteUser,
    getUserStats,
} from "../controllers/userController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// All user routes require authentication
router.use(protect);

// ─── Stats ────────────────────────────────────────────────────────────────────
router.get("/stats", authorize("super_admin"), getUserStats);

// ─── User CRUD (super_admin only) ─────────────────────────────────────────────
router.get("/", authorize("super_admin"), getAllUsers);
router.post("/", authorize("super_admin"), createUser);

router.get("/:id", authorize("super_admin"), getUserById);
router.put("/:id", authorize("super_admin"), updateUser);
router.delete("/:id", authorize("super_admin"), deleteUser);

// ─── Specialized User Actions (super_admin only) ──────────────────────────────
router.patch("/:id/status", authorize("super_admin"), toggleUserStatus);
router.put("/:id/role", authorize("super_admin"), changeUserRole);
router.put("/:id/reset-password", authorize("super_admin"), resetUserPassword);

export default router;
