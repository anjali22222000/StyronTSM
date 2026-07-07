import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAdmin } from "../middleware/auth.js";
import {
  adminListPayments,
  adminGetPayment,
  adminCreatePayment,
  adminUpdatePaymentStatus,
  adminExportPaymentsExcel,
  adminExportPaymentsPdf,
} from "../controllers/paymentController.js";

const router = Router();

router.get("/admin/list", requireAdmin(), asyncHandler(adminListPayments));
router.get("/admin/export/excel", requireAdmin(), asyncHandler(adminExportPaymentsExcel));
router.get("/admin/export/pdf", requireAdmin(), asyncHandler(adminExportPaymentsPdf));
router.get("/admin/:id", requireAdmin(), asyncHandler(adminGetPayment));
router.post("/admin", requireAdmin(), asyncHandler(adminCreatePayment));
router.patch("/admin/:id/status", requireAdmin(), asyncHandler(adminUpdatePaymentStatus));

export default router;
