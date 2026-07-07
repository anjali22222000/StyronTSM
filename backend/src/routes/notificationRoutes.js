import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAdmin, requireUser, requireAnyAuth } from "../middleware/auth.js";
import {
  listAdminNotifications,
  listUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notificationController.js";

const router = Router();

router.get("/admin", requireAdmin(), asyncHandler(listAdminNotifications));
router.get("/mine", requireUser, asyncHandler(listUserNotifications));
router.patch("/:id/read", requireAnyAuth, asyncHandler(markNotificationRead));
router.patch("/read-all", requireAnyAuth, asyncHandler(markAllNotificationsRead));

export default router;
