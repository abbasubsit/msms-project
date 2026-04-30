import express from "express";
import {
    getCustomers,
    createCustomer,
    updateCustomer,
    getCustomerHistory,
} from "../controllers/customerController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, getCustomers);
router.post("/", protect, createCustomer);
router.put("/:id", protect, updateCustomer);
router.get("/:id/history", protect, getCustomerHistory);

export default router;