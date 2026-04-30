import express from "express";
import {
    getSales,
    getSaleById,
    createSale,
    updateSale,
} from "../controllers/salesController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, getSales);
router.get("/:id", protect, getSaleById);
router.post("/", protect, createSale);
router.put("/:id", protect, updateSale);

export default router;