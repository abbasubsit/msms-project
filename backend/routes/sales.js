import express from "express";
import {
    getSales,
    getSaleById,
    createSale,
} from "../controllers/salesController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, getSales);
router.get("/:id", protect, getSaleById);
router.post("/", protect, createSale);

export default router;