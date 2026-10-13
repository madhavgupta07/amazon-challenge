import { Router } from "express";
import * as chat from "../controllers/chatController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { chatBody, confirmBody, idParam } from "../schemas/api.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

router.post("/", validateBody(chatBody), asyncHandler(chat.chat));
router.post("/confirm", validateBody(confirmBody), asyncHandler(chat.confirm));
router.get("/conversations", asyncHandler(chat.listConversations));
router.get("/conversations/:id", validateParams(idParam), asyncHandler(chat.getConversation));
router.delete("/conversations/:id", validateParams(idParam), asyncHandler(chat.removeConversation));

export default router;
