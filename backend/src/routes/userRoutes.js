import { Router } from "express";
import { body } from "express-validator";
import { handleValidation, asyncHandler } from "../middleware/errorHandler.js";
import { requireAdmin } from "../middleware/auth.js";
import {
  adminListUsers,
  adminGetUser,
  adminUpdateUser,
  adminUpdateUserStatus,
  adminDeleteUser,
  adminExportUsersExcel,
} from "../controllers/userController.js";

const router = Router();

router.get("/admin/list", requireAdmin(), asyncHandler(adminListUsers));
router.get("/admin/export/excel", requireAdmin(), asyncHandler(adminExportUsersExcel));
router.get("/admin/:id", requireAdmin(), asyncHandler(adminGetUser));
router.put("/admin/:id", requireAdmin(), asyncHandler(adminUpdateUser));
router.patch(
  "/admin/:id/status",
  requireAdmin(),
  [body("status").isIn(["active", "suspended"])],
  handleValidation,
  asyncHandler(adminUpdateUserStatus)
);
router.delete("/admin/:id", requireAdmin("super_admin"), asyncHandler(adminDeleteUser));

export default router;
