import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAdmin } from "../middleware/auth.js";
import { adminDashboardAnalytics } from "../controllers/analyticsController.js";

const router = Router();

router.get("/admin/dashboard", requireAdmin(), asyncHandler(adminDashboardAnalytics));

export default router;
