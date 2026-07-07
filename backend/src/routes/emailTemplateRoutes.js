import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAdmin } from "../middleware/auth.js";
import {
  adminListTemplates,
  adminGetTemplate,
  adminUpdateTemplate,
} from "../controllers/emailTemplateController.js";

const router = Router();

router.get("/admin/list", requireAdmin(), asyncHandler(adminListTemplates));
router.get("/admin/:key", requireAdmin(), asyncHandler(adminGetTemplate));
router.put("/admin/:key", requireAdmin(), asyncHandler(adminUpdateTemplate));

export default router;
