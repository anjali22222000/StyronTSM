import { Router } from "express";
import { body, query } from "express-validator";
import { handleValidation, asyncHandler } from "../middleware/errorHandler.js";
import { requireUser, requireAdmin, optionalAuth, requireAnyAuth } from "../middleware/auth.js";
import {
  createOrder,
  trackOrder,
  listMyOrders,
  adminListOrders,
  adminGetOrder,
  adminUpdateOrderStatus,
  downloadInvoice,
} from "../controllers/orderController.js";

const router = Router();

router.post(
  "/",
  optionalAuth,
  [
    body("items").isArray({ min: 1 }).withMessage("At least one item is required."),
    body("items.*.productId").isInt(),
    body("items.*.quantity").isInt({ min: 1 }),
    body("shippingAddress").trim().notEmpty().withMessage("Shipping address is required."),
  ],
  handleValidation,
  asyncHandler(createOrder)
);

router.get(
  "/track",
  [query("orderNumber").notEmpty(), query("contact").notEmpty()],
  handleValidation,
  asyncHandler(trackOrder)
);

router.get("/mine", requireUser, asyncHandler(listMyOrders));
router.get("/:id/invoice", requireAnyAuth, asyncHandler(downloadInvoice));

// Admin
router.get("/admin/list", requireAdmin(), asyncHandler(adminListOrders));
router.get("/admin/:id", requireAdmin(), asyncHandler(adminGetOrder));
router.patch(
  "/admin/:id/status",
  requireAdmin(),
  [body("status").notEmpty()],
  handleValidation,
  asyncHandler(adminUpdateOrderStatus)
);

export default router;
