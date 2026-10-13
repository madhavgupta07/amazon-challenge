import { Router } from "express";
import * as summary from "../controllers/summaryController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { summaryQuery } from "../schemas/api.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

router.get("/", validateQuery(summaryQuery), asyncHandler(summary.get));

export default router;
