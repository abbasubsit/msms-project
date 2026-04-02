import express from "express";
import {
    getSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
} from "../controllers/supplierController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, getSuppliers);
router.post("/", protect, createSupplier);
router.put("/:id", protect, updateSupplier);
router.delete("/:id", protect, deleteSupplier);

export default router;