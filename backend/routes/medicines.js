import express from "express";
import {
    getMedicines,
    getMedicineById,
    createMedicine,
    updateMedicine,
    deleteMedicine,
    getLowStockMedicines,
    getExpiringMedicines,
} from "../controllers/medicineController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

// GET all
router.get("/", protect, getMedicines);

// LOW STOCK
router.get("/low-stock", protect, getLowStockMedicines);

// EXPIRING
router.get("/expiring", protect, getExpiringMedicines);

// GET by ID
router.get("/:id", protect, getMedicineById);

// CREATE
router.post("/", protect, createMedicine);

// UPDATE
router.put("/:id", protect, updateMedicine);

// DELETE
router.delete("/:id", protect, deleteMedicine);

export default router;