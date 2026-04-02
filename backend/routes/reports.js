import express from "express";
import {
    getDailySales,
    getMonthlySales,
    getStockReport,
    getExpiryReport,
} from "../controllers/reportController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/daily-sales", protect, getDailySales);
router.get("/monthly-sales", protect, getMonthlySales);
router.get("/stock", protect, getStockReport);
router.get("/expiry", protect, getExpiryReport);

export default router;