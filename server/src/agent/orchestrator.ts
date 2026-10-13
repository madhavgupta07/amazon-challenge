import {
  ConversationModel,
  UserModel,
  taskCounts,
  toolDefinitionMap,
  type AgentResult,
  type PendingAction,
  type ToolCallTrace,
} from "@lifepilot/shared";
import { env } from "../config/env.js";
import {
  buildContextMessage,
  buildObservation,
  buildSystemPrompt,
  formatConversationHistory,
  mockProvider,
  parseModelOutput,
  selectProvider,
  type ChatMessage,
} from "../ai/index.js";
import { ProviderError } from "../ai/types.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { callToolOnce, createMcpSession } from "../services/mcpClient.js";
import { createPendingAction, takePendingAction } from "./pendingActions.js";

export interface RunAgentInput {
  userId: string;
  message: string;
  conversationId?: string | null;
}

export interface RunAgentResult extends AgentResult {
  conversationId: string;
}

const PROVIDER_FALLBACK_MESSAGE =
  "The AI provider is temporarily unavailable. Please try again in a moment.";

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

async function loadOrCreateConversation(userId: string, conversationId: string | null | undefined, seed: string) {
  if (conversationId) {
    const existing = await ConversationModel.findOne({ _id: conversationId, user: userId });
    if (existing) return existing;
  }
  return ConversationModel.create({
    user: userId,
    title: truncate(seed.trim() || "New conversation", 60),
    messages: [],
  });
}

/**
 * Bounded JSON-ReAct loop. The model proposes one tool call or a final answer
 * per turn; tools run through the MCP server, identity is injected server-side,
 * and destructive calls are intercepted for user confirmation.
 */
export async function runAgent(input: RunAgentInput): Promise<RunAgentResult> {
  const user = await UserModel.findById(input.userId).lean();
  if (!user) throw AppError.notFound("User not found");

  const timeZone = (user.preferences as { timeZone?: string } | undefined)?.timeZone ?? "UTC";
  const conversation = await loadOrCreateConversation(input.userId, input.conversationId, input.message);
  const history = formatConversationHistory(
    conversation.messages as { role: string; content: string }[],
  );
  conversation.messages.push({
    role: "user",
    content: input.message,
    createdAt: new Date(),
  } as never);

  const counts = await taskCounts(input.userId, timeZone);
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    {
      role: "user",
      content: buildContextMessage(
        { now: new Date(), timeZone, userName: user.name, counts, history },
        input.message,
      ),
    },
  ];

  let provider = selectProvider();
  logger.info("agent.run", { userId: input.userId, provider: provider.id });

  const toolsUsed: ToolCallTrace[] = [];
  let pendingAction: PendingAction | undefined;
  let reply = "";
  let iterations = 0;
  const session = await createMcpSession(input.userId);

  try {
    while (iterations < env.ai.maxIterations) {
      iterations += 1;

      let text: string;
      try {
        text = await provider.complete(messages, { temperature: env.ai.temperature });
      } catch (error) {
        if (provider.id !== "mock" && env.ai.allowMockFallback && error instanceof ProviderError) {
          logger.warn("agent.provider_fallback", { from: provider.id, reason: error.code });
          provider = mockProvider;
          text = await provider.complete(messages, { temperature: env.ai.temperature });
        } else {
          logger.error("agent.provider_error", { message: (error as Error).message });
          throw AppError.internal(PROVIDER_FALLBACK_MESSAGE);
        }
      }

      const parsed = parseModelOutput(text);

      if (parsed.type === "final") {
        reply = parsed.text;
        break;
      }

      if (parsed.type === "tool") {
        const definition = toolDefinitionMap[parsed.tool];
        if (!definition) {
          messages.push({ role: "assistant", content: text });
          messages.push({
            role: "user",
            content: buildObservation(parsed.tool, {
              error: { code: "UNKNOWN_TOOL", message: `No tool named ${parsed.tool}` },
            }),
          });
          continue;
        }

        const validated = definition.schema.safeParse(parsed.arguments);
        if (!validated.success) {
          messages.push({ role: "assistant", content: text });
          messages.push({
            role: "user",
            content: buildObservation(parsed.tool, {
              error: {
                code: "VALIDATION",
                message: "Arguments were invalid; fix them and try again",
                details: validated.error.flatten(),
              },
            }),
          });
          continue;
        }

        if (definition.destructive) {
          const summary = `${definition.title} permanently removes data and cannot be undone.`;
          pendingAction = createPendingAction({
            userId: input.userId,
            name: parsed.tool,
            title: definition.title,
            arguments: validated.data as Record<string, unknown>,
            summary,
          });
          toolsUsed.push({
            name: parsed.tool,
            arguments: validated.data as Record<string, unknown>,
            status: "pending_confirmation",
            summary,
            at: new Date(),
          });
          reply = `Just to be safe — that will ${definition.title.toLowerCase()}, and it can't be undone. Confirm and I'll go ahead.`;
          break;
        }

        const result = await session.callTool(parsed.tool, validated.data as Record<string, unknown>);
        toolsUsed.push({
          name: parsed.tool,
          arguments: validated.data as Record<string, unknown>,
          status: result.ok ? "ok" : "error",
          result: result.data ?? null,
          error: result.error?.message,
          summary: result.summary,
          at: new Date(),
        });
        messages.push({ role: "assistant", content: text });
        messages.push({
          role: "user",
          content: buildObservation(
            parsed.tool,
            result.ok ? { summary: result.summary, data: result.data } : { error: result.error },
          ),
        });
        continue;
      }

      messages.push({ role: "assistant", content: text });
      messages.push({
        role: "user",
        content:
          'OBSERVATION system: Your previous reply was not a valid JSON object. Reply with exactly one JSON object and nothing else — either {"tool":"<tool_name>","arguments":{}} or {"final_answer":"<answer>"}.',
      });
    }
  } finally {
    await session.close();
  }

  if (!reply) {
    reply = toolsUsed.some((tool) => tool.status === "ok")
      ? "I've applied the changes. Here's the latest state of your tasks."
      : "I couldn't work out how to help with that. Try asking me to plan your day or manage tasks.";
  }

  conversation.messages.push({
    role: "assistant",
    content: reply,
    provider: provider.label,
    toolCalls: toolsUsed,
    createdAt: new Date(),
  } as never);
  await conversation.save();

  return {
    reply,
    provider: provider.label,
    toolsUsed,
    pendingAction,
    iterations,
    contextUsed: {
      tasksPending: counts.pending,
      tasksOverdue: counts.overdue,
      tasksToday: counts.dueToday,
    },
    conversationId: String(conversation._id),
  };
}

async function appendAssistantMessage(
  userId: string,
  conversationId: string | null,
  content: string,
  toolCall: ToolCallTrace,
): Promise<string | null> {
  const conversation = conversationId
    ? await ConversationModel.findOne({ _id: conversationId, user: userId })
    : await ConversationModel.findOne({ user: userId }).sort({ updatedAt: -1 });
  if (!conversation) return null;
  conversation.messages.push({
    role: "assistant",
    content,
    provider: "confirmation",
    toolCalls: [toolCall],
    createdAt: new Date(),
  } as never);
  await conversation.save();
  return String(conversation._id);
}

export async function confirmPendingAction(
  userId: string,
  actionId: string,
  conversationId?: string | null,
): Promise<{ reply: string; toolCall: ToolCallTrace; conversationId: string | null }> {
  const action = takePendingAction(userId, actionId);
  if (!action) {
    throw AppError.notFound("This confirmation has expired or was already used.");
  }

  const args = { ...action.arguments, confirm: true };
  const result = await callToolOnce(userId, action.name, args);
  const toolCall: ToolCallTrace = {
    name: action.name,
    arguments: args,
    status: result.ok ? "confirmed" : "error",
    result: result.data ?? null,
    error: result.error?.message,
    summary: result.summary,
    at: new Date(),
  };
  const reply = result.ok
    ? result.summary ?? "Done."
    : `I couldn't complete that: ${result.error?.message ?? "unknown error"}.`;
  const resolvedConversationId = await appendAssistantMessage(
    userId,
    conversationId ?? null,
    reply,
    toolCall,
  );
  return { reply, toolCall, conversationId: resolvedConversationId };
}

export async function cancelPendingAction(
  userId: string,
  actionId: string,
  conversationId?: string | null,
): Promise<{ reply: string; toolCall: ToolCallTrace; conversationId: string | null }> {
  const action = takePendingAction(userId, actionId);
  if (!action) {
    throw AppError.notFound("This confirmation has expired or was already used.");
  }
  const toolCall: ToolCallTrace = {
    name: action.name,
    arguments: action.arguments,
    status: "cancelled",
    summary: "Cancelled by user",
    at: new Date(),
  };
  const reply = "No problem — I haven't changed anything.";
  const resolvedConversationId = await appendAssistantMessage(
    userId,
    conversationId ?? null,
    reply,
    toolCall,
  );
  return { reply, toolCall, conversationId: resolvedConversationId };
}
