import { Router } from "express";
import { body, param } from "express-validator";
import rateLimit from "express-rate-limit";
import { handleValidation, asyncHandler } from "../middleware/errorHandler.js";
import { optionalAuth, requireAdmin } from "../middleware/auth.js";
import {
  sendMessage,
  getHistory,
  adminChatAnalytics,
  adminListSessions,
} from "../controllers/chatbotController.js";

const router = Router();

// Each LLM call costs money — limit per-IP message rate independently of the global API limiter.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "You're sending messages too quickly. Please slow down." },
});

router.post(
  "/message",
  chatLimiter,
  optionalAuth,
  [
    body("sessionId").trim().isLength({ min: 8, max: 64 }).withMessage("Invalid session id."),
    body("message").trim().isLength({ min: 1, max: 2000 }).withMessage("Message must be 1-2000 characters."),
  ],
  handleValidation,
  asyncHandler(sendMessage)
);

router.get(
  "/history/:sessionId",
  [param("sessionId").trim().isLength({ min: 8, max: 64 })],
  handleValidation,
  asyncHandler(getHistory)
);

router.get("/admin/analytics", requireAdmin(), asyncHandler(adminChatAnalytics));
router.get("/admin/sessions", requireAdmin(), asyncHandler(adminListSessions));

export default router;
