import { Router } from "express";
import { body } from "express-validator";
import { handleValidation, asyncHandler } from "../middleware/errorHandler.js";
import { optionalAuth, requireAnyAuth, requireAdmin } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import {
  createQuotation,
  downloadQuotationPdf,
  emailQuotationPdf,
  generateAndEmail,
  adminListQuotations,
  adminGetQuotation,
  adminRegenerateQuotation,
  adminExportQuotationsExcel,
} from "../controllers/quotationController.js";

const router = Router();

const itemsValidation = [
  body("customerName").trim().notEmpty().withMessage("Customer name is required."),
  body("customerEmail").trim().isEmail().withMessage("A valid email is required.").normalizeEmail(),
  body("items").isArray({ min: 1 }).withMessage("At least one item is required."),
  body("items.*.name").notEmpty().withMessage("Product name is required."),
  body("items.*.qty").isNumeric().withMessage("Quantity must be a number."),
  body("items.*.rate").isNumeric().withMessage("Rate must be a number."),
];

// Create only
router.post(
  "/",
  authLimiter,
  optionalAuth,
  itemsValidation,
  handleValidation,
  asyncHandler(createQuotation)
);

// Create + auto-email in one shot (used by the "Generate Quotation" button)
router.post(
  "/generate",
  authLimiter,
  optionalAuth,
  itemsValidation,
  handleValidation,
  asyncHandler(generateAndEmail)
);

// Admin: list/search/filter, export, regenerate (must come before "/:id/pdf")
router.get("/admin/list", requireAdmin(), asyncHandler(adminListQuotations));
router.get("/admin/export", requireAdmin(), asyncHandler(adminExportQuotationsExcel));
router.get("/admin/:id", requireAdmin(), asyncHandler(adminGetQuotation));
router.post("/admin/:id/regenerate", requireAdmin(), asyncHandler(adminRegenerateQuotation));

// Download PDF — guest access via ?token=quotationNumber, or user/admin auth
router.get("/:id/pdf", optionalAuth, asyncHandler(downloadQuotationPdf));

// Email quotation to customer — requires some auth (user who owns it, or admin)
router.post("/:id/email", requireAnyAuth, asyncHandler(emailQuotationPdf));

export default router;
