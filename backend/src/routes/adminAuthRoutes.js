import { Router } from "express";
import { body } from "express-validator";
import { handleValidation, asyncHandler } from "../middleware/errorHandler.js";
import { authLimiter, otpRequestLimiter } from "../middleware/rateLimiters.js";
import {
  adminLoginStep1,
  adminLoginStep2,
  adminResendOtp,
  adminRefresh,
  adminLogout,
} from "../controllers/adminAuthController.js";

const router = Router();

router.post(
  "/login",
  authLimiter,
  [body("email").trim().isEmail().normalizeEmail(), body("password").notEmpty()],
  handleValidation,
  asyncHandler(adminLoginStep1)
);

router.post(
  "/verify-otp",
  authLimiter,
  [body("adminId").isInt(), body("otp").trim().isLength({ min: 4, max: 8 })],
  handleValidation,
  asyncHandler(adminLoginStep2)
);

router.post(
  "/resend-otp",
  otpRequestLimiter,
  [body("adminId").isInt()],
  handleValidation,
  asyncHandler(adminResendOtp)
);

router.post("/refresh", asyncHandler(adminRefresh));
router.post("/logout", asyncHandler(adminLogout));

export default router;
