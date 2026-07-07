import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAdmin } from "../middleware/auth.js";
import {
  listSteelPrices,
  adminListSteelPrices,
  adminCreateSteelPrice,
  adminUpdateSteelPrice,
  adminDeleteSteelPrice,
} from "../controllers/steelPriceController.js";

const router = Router();

router.get("/", asyncHandler(listSteelPrices));
router.get("/admin/list", requireAdmin(), asyncHandler(adminListSteelPrices));
router.post("/admin", requireAdmin(), asyncHandler(adminCreateSteelPrice));
router.put("/admin/:id", requireAdmin(), asyncHandler(adminUpdateSteelPrice));
router.delete("/admin/:id", requireAdmin(), asyncHandler(adminDeleteSteelPrice));

export default router;
