import { Router } from "express";
import * as notes from "../controllers/noteController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import { createNoteBody, idParam, searchNotesQuery, updateNoteBody } from "../schemas/api.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

router.get("/search", validateQuery(searchNotesQuery), asyncHandler(notes.search));
router.get("/", asyncHandler(notes.list));
router.post("/", validateBody(createNoteBody), asyncHandler(notes.create));
router.get("/:id", validateParams(idParam), asyncHandler(notes.getOne));
router.patch("/:id", validateParams(idParam), validateBody(updateNoteBody), asyncHandler(notes.update));
router.delete("/:id", validateParams(idParam), asyncHandler(notes.remove));

export default router;
