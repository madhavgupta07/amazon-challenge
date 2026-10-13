import { Router } from "express";
import * as auth from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { loginSchema, preferencesSchema, registerSchema } from "../schemas/api.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/register", validateBody(registerSchema), asyncHandler(auth.register));
router.post("/login", validateBody(loginSchema), asyncHandler(auth.login));
router.get("/me", requireAuth, asyncHandler(auth.me));
router.patch(
  "/preferences",
  requireAuth,
  validateBody(preferencesSchema),
  asyncHandler(auth.patchPreferences),
);

export default router;
