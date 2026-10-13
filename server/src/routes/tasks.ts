import { Router } from "express";
import * as tasks from "../controllers/taskController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import { createTaskBody, idParam, listTasksQuery, todayQuery, updateTaskBody } from "../schemas/api.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

router.get("/today", validateQuery(todayQuery), asyncHandler(tasks.today));
router.get("/", validateQuery(listTasksQuery), asyncHandler(tasks.list));
router.post("/", validateBody(createTaskBody), asyncHandler(tasks.create));
router.get("/:id", validateParams(idParam), asyncHandler(tasks.getOne));
router.patch("/:id", validateParams(idParam), validateBody(updateTaskBody), asyncHandler(tasks.update));
router.post("/:id/complete", validateParams(idParam), asyncHandler(tasks.complete));
router.delete("/:id", validateParams(idParam), asyncHandler(tasks.remove));

export default router;
