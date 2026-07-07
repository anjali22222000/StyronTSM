import { Router } from "express";
import { body } from "express-validator";
import { handleValidation, asyncHandler } from "../middleware/errorHandler.js";
import { requireAdmin } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import {
  submitContact,
  adminListContacts,
  adminReplyContact,
  adminDeleteContact,
} from "../controllers/contactController.js";

const router = Router();

router.post(
  "/",
  authLimiter, // reuse the moderate limiter to deter contact-form spam
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").trim().isEmail().withMessage("A valid email is required.").normalizeEmail(),
    body("phone").optional().trim(),
    body("message").trim().isLength({ min: 5 }).withMessage("Message is too short."),
  ],
  handleValidation,
  asyncHandler(submitContact)
);

router.get("/admin/list", requireAdmin(), asyncHandler(adminListContacts));
router.post(
  "/admin/:id/reply",
  requireAdmin(),
  [body("reply").trim().notEmpty().withMessage("Reply message is required.")],
  handleValidation,
  asyncHandler(adminReplyContact)
);
router.delete("/admin/:id", requireAdmin(), asyncHandler(adminDeleteContact));

export default router;
