import { Router } from "express";
import { body } from "express-validator";
import { handleValidation, asyncHandler } from "../middleware/errorHandler.js";
import { authLimiter, otpRequestLimiter } from "../middleware/rateLimiters.js";
import { requestOtp, verifyOtp, resendOtp, refresh, logout } from "../controllers/authController.js";

const router = Router();

router.post(
  "/request-otp",
  otpRequestLimiter,
  [body("email").trim().isEmail().withMessage("A valid email is required.")],
  handleValidation,
  asyncHandler(requestOtp)
);

router.post(
  "/verify-otp",
  authLimiter,
  [
    body("email").trim().isEmail(),
    body("otp").trim().isLength({ min: 4, max: 8 }).withMessage("Invalid code."),
  ],
  handleValidation,
  asyncHandler(verifyOtp)
);

router.post(
  "/resend-otp",
  otpRequestLimiter,
  [body("email").trim().isEmail()],
  handleValidation,
  asyncHandler(resendOtp)
);

router.post("/refresh", asyncHandler(refresh));
router.post("/logout", asyncHandler(logout));

export default router;
