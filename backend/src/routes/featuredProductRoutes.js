import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAdmin } from "../middleware/auth.js";
import {
  listFeaturedProducts,
  adminListFeaturedProducts,
  adminSetFeaturedProducts,
  adminUpdateFeatured,
  adminRemoveFeatured,
  adminAddFeatured,
} from "../controllers/featuredProductController.js";

const router = Router();

router.get("/", asyncHandler(listFeaturedProducts));
router.get("/admin/list", requireAdmin(), asyncHandler(adminListFeaturedProducts));
router.post("/admin/set", requireAdmin(), asyncHandler(adminSetFeaturedProducts));
router.post("/admin/add", requireAdmin(), asyncHandler(adminAddFeatured));
router.patch("/admin/:id", requireAdmin(), asyncHandler(adminUpdateFeatured));
router.delete("/admin/:id", requireAdmin(), asyncHandler(adminRemoveFeatured));

export default router;
