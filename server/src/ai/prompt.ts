import { toolDefinitions, toolJsonSchema } from "@lifepilot/shared";
import type { TaskCounts } from "@lifepilot/shared";

export interface AgentContext {
  now: Date;
  timeZone: string;
  userName: string;
  counts: TaskCounts;
  /** Recent turns rendered as text so the model has conversational memory. */
  history?: string;
}

const PROTOCOL = `You must reply with exactly ONE JSON object and NOTHING else. The very first character of your reply must be "{" and the very last must be "}". Do not add markdown, code fences, labels, or any text before or after the object.

Reply with EITHER a tool call OR a final answer.

To call a tool (at most one tool per reply):
{"thought": "<short reasoning>", "tool": "<tool_name>", "arguments": { }}
To give the user your final answer:
{"final_answer": "<concise, friendly answer>"}

Example tool call:
{"thought": "I need today's tasks first", "tool": "get_today_tasks", "arguments": {}}
Example final answer:
{"final_answer": "You have 2 tasks due today: Prepare for React interview (urgent) and Reply to recruiter email."}

Rules:
0. Output the JSON object on its own — no sentences around it. Only use the tool list below; never invent tool names.
1. Never invent tasks, notes, counts, dates or completions. Every fact must come from a tool result.
2. Base every numeric summary only on the data returned by tools (use get_productivity_summary for statistics).
3. When the user asks you to plan a day, first read their real tasks, then build the plan. Do not claim a plan was saved until create_daily_plan reports persisted=true.
4. Only set create_daily_plan's "save" to true after the user has approved the plan.
5. delete_task and delete_note are destructive; call them when the user clearly asks, and DO NOT set "confirm" — the application will ask the user to confirm.
6. Resolve relative dates ("tomorrow", "Friday") against the CURRENT DATE given below and pass ISO-8601 strings.
7. Prefer doing the work with tools over asking the user for data you can look up.
8. Keep final answers concise, friendly and specific. Reference the actual items and numbers.
9. If the request is unclear, still reply as JSON: {"final_answer": "<a brief clarifying question>"}. Never reply with plain prose.`;

export function buildSystemPrompt(): string {
  const tools = toolDefinitions
    .map((def) => {
      const schema = JSON.stringify(toolJsonSchema(def));
      const flags = [def.mutates ? "mutates-data" : "read-only", def.destructive ? "DESTRUCTIVE" : ""]
        .filter(Boolean)
        .join(", ");
      return `- ${def.name} (${flags}): ${def.description}\n    arguments JSON Schema: ${schema}`;
    })
    .join("\n");

  return `You are LifePilot, a personal productivity agent. You help a single signed-in user organise tasks, notes and their day through tool calls.

${PROTOCOL}

AVAILABLE TOOLS:
${tools}`;
}

export function buildContextMessage(ctx: AgentContext, userMessage: string): string {
  const lines = [
    `CURRENT DATE/TIME: ${ctx.now.toISOString()} (time zone: ${ctx.timeZone}).`,
    `USER: ${ctx.userName}.`,
    `LIVE SNAPSHOT (from the database): ${ctx.counts.pending} pending, ${ctx.counts.inProgress} in progress, ${ctx.counts.completed} completed, ${ctx.counts.dueToday} due today, ${ctx.counts.overdue} overdue.`,
    "Use tools to retrieve the actual details before acting.",
  ];
  if (ctx.history) {
    lines.push("", "RECENT CONVERSATION (oldest first):", ctx.history);
  }
  lines.push("", `User message: ${userMessage}`);
  return lines.join("\n");
}

/** Render recent conversation turns as compact text for the model's context. */
export function formatConversationHistory(
  messages: { role: string; content: string }[],
  maxTurns = 8,
): string {
  const recent = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .filter((message) => message.content && message.content.trim())
    .slice(-maxTurns);
  if (recent.length === 0) return "";
  return recent
    .map((message) => {
      const content = message.content.length > 400 ? `${message.content.slice(0, 400)}…` : message.content;
      return `${message.role === "user" ? "user" : "assistant"}: ${content}`;
    })
    .join("\n");
}

export function buildObservation(tool: string, payload: unknown): string {
  const json = JSON.stringify(payload);
  const truncated = json.length > 16_000 ? `${json.slice(0, 16_000)}…(truncated)` : json;
  return `OBSERVATION ${tool}: ${truncated}`;
}
