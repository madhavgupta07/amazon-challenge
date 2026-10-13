import type { Request, Response } from "express";
import { ConversationModel } from "@lifepilot/shared";
import {
  cancelPendingAction,
  confirmPendingAction,
  runAgent,
} from "../agent/orchestrator.js";
import { currentUser } from "../middleware/auth.js";
import { AppError } from "../utils/AppError.js";

export async function chat(req: Request, res: Response) {
  const { message, conversationId } = req.body;
  const result = await runAgent({
    userId: currentUser(req).id,
    message,
    conversationId: conversationId ?? null,
  });
  res.json(result);
}

export async function confirm(req: Request, res: Response) {
  const userId = currentUser(req).id;
  const { actionId, decision, conversationId } = req.body;
  const result =
    decision === "cancel"
      ? await cancelPendingAction(userId, actionId, conversationId ?? null)
      : await confirmPendingAction(userId, actionId, conversationId ?? null);
  res.json(result);
}

export async function listConversations(req: Request, res: Response) {
  const conversations = await ConversationModel.find({ user: currentUser(req).id })
    .sort({ updatedAt: -1 })
    .limit(30)
    .lean();
  res.json({
    conversations: conversations.map((conversation) => ({
      id: String(conversation._id),
      title: conversation.title,
      messageCount: conversation.messages.length,
      updatedAt: conversation.updatedAt,
    })),
  });
}

export async function getConversation(req: Request, res: Response) {
  const conversation = await ConversationModel.findOne({
    _id: req.params.id,
    user: currentUser(req).id,
  }).lean();
  if (!conversation) throw AppError.notFound("Conversation not found");
  res.json({
    conversation: {
      id: String(conversation._id),
      title: conversation.title,
      messages: conversation.messages,
      updatedAt: conversation.updatedAt,
    },
  });
}

export async function removeConversation(req: Request, res: Response) {
  const conversation = await ConversationModel.findOneAndDelete({
    _id: req.params.id,
    user: currentUser(req).id,
  }).lean();
  if (!conversation) throw AppError.notFound("Conversation not found");
  res.json({ deleted: true });
}
