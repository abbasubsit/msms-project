import express from "express";
import {
    getCustomers,
    createCustomer,
    getCustomerHistory,
} from "../controllers/customerController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, getCustomers);
router.post("/", protect, createCustomer);
router.get("/:id/history", protect, getCustomerHistory);

export default router;