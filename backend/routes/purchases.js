import express from "express";
import {
    getPurchases,
    createPurchase,
} from "../controllers/purchaseController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, getPurchases);
router.post("/", protect, createPurchase);

export default router;