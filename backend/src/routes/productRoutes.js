import { Router } from "express";
import { body } from "express-validator";
import { handleValidation, asyncHandler } from "../middleware/errorHandler.js";
import { requireAdmin } from "../middleware/auth.js";
import { upload } from "../utils/cloudinary.js";
import {
  listProducts,
  getProductBySlug,
  listCategories,
  adminListProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
  createCategory,
  adminExportProductsExcel,
  adminExportProductsPdf,
} from "../controllers/productController.js";

const router = Router();

// Public
router.get("/", asyncHandler(listProducts));
router.get("/categories", asyncHandler(listCategories));
router.get("/:slug", asyncHandler(getProductBySlug));

// Admin
router.get("/admin/list", requireAdmin(), asyncHandler(adminListProducts));
router.get("/admin/export/excel", requireAdmin(), asyncHandler(adminExportProductsExcel));
router.get("/admin/export/pdf", requireAdmin(), asyncHandler(adminExportProductsPdf));

router.post(
  "/admin",
  requireAdmin(),
  upload.array("images", 6),
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("price").isFloat({ min: 0 }).withMessage("Price must be a non-negative number."),
    body("stock_quantity").optional().isInt({ min: 0 }),
  ],
  handleValidation,
  asyncHandler(createProduct)
);

router.put("/admin/:id", requireAdmin(), upload.array("images", 6), asyncHandler(updateProduct));
router.delete("/admin/:id", requireAdmin(), asyncHandler(deleteProduct));
router.delete("/admin/images/:imageId", requireAdmin(), asyncHandler(deleteProductImage));

router.post(
  "/admin/categories",
  requireAdmin(),
  [body("name").trim().notEmpty().withMessage("Category name is required.")],
  handleValidation,
  asyncHandler(createCategory)
);

export default router;
