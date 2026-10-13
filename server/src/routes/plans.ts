import { Router } from "express";
import * as plans from "../controllers/planController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { dateParam, generatePlanBody, savePlanBody } from "../schemas/api.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(plans.list));
router.post("/generate", validateBody(generatePlanBody), asyncHandler(plans.generate));
router.get("/:date", validateParams(dateParam), asyncHandler(plans.getByDate));
router.put(
  "/:date",
  validateParams(dateParam),
  validateBody(savePlanBody),
  asyncHandler(plans.save),
);
router.delete("/:date", validateParams(dateParam), asyncHandler(plans.remove));

export default router;
