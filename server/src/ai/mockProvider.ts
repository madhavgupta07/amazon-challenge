import type { AIProvider, ChatMessage } from "./types.js";

/**
 * Local, deterministic provider used for tests and offline demos.
 *
 * It is NOT a language model. It implements the same JSON protocol the model is
 * asked to follow, choosing tools with keyword heuristics so that multi-step
 * workflows (retrieve → decide → act) still run for real against the database.
 * Every response is clearly labelled "Local demo" in the API/UI.
 */
export class MockProvider implements AIProvider {
  readonly id = "mock";
  readonly label = "Local demo";

  async complete(messages: ChatMessage[]): Promise<string> {
    const state = buildState(messages);
    const decision = decide(state);
    return JSON.stringify(decision);
  }
}

interface ToolCall {
  tool: string;
  arguments: Record<string, unknown>;
}

interface Observation {
  tool: string;
  payload: any;
}

interface State {
  text: string;
  called: ToolCall[];
  calledNames: string[];
  observations: Observation[];
  lastObservation: Observation | null;
  now: Date;
  timeZone: string;
}

function extractJson(text: string): any | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function buildState(messages: ChatMessage[]): State {
  const userMessages = messages.filter((m) => m.role === "user");
  const first = userMessages[0]?.content ?? "";
  const userMessage = first.includes("User message:")
    ? first.slice(first.indexOf("User message:") + "User message:".length).trim()
    : first;

  const dateMatch = first.match(/CURRENT DATE\/TIME:\s*([^\s]+)\s*\(time zone:\s*([^)]+)\)/);
  const now = dateMatch ? new Date(dateMatch[1]) : new Date();
  const timeZone = dateMatch ? dateMatch[2].trim() : "UTC";

  const called: ToolCall[] = [];
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const parsed = extractJson(message.content);
    if (parsed && typeof parsed.tool === "string") {
      called.push({
        tool: parsed.tool,
        arguments: parsed.arguments && typeof parsed.arguments === "object" ? parsed.arguments : {},
      });
    }
  }

  const observations: Observation[] = [];
  for (const message of messages) {
    if (message.role !== "user" || !message.content.startsWith("OBSERVATION ")) continue;
    const rest = message.content.slice("OBSERVATION ".length);
    const colon = rest.indexOf(":");
    const tool = rest.slice(0, colon).trim();
    const payload = extractJson(rest.slice(colon + 1));
    observations.push({ tool, payload });
  }

  return {
    text: userMessage,
    called,
    calledNames: called.map((call) => call.tool),
    observations,
    lastObservation: observations.at(-1) ?? null,
    now,
    timeZone,
  };
}

function observationFor(state: State, tool: string): any | null {
  const match = [...state.observations].reverse().find((entry) => entry.tool === tool);
  return match?.payload?.data ?? null;
}

const STOPWORDS = new Set([
  "the", "a", "an", "my", "for", "to", "of", "with", "and", "on", "in", "about",
  "i", "im", "i'm", "me", "please", "task", "note", "interview",
]);

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

function parseDueDate(text: string, now: Date): string | undefined {
  const lower = text.toLowerCase();
  const explicit = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const at = (date: Date) => {
    const d = new Date(date);
    d.setHours(17, 0, 0, 0);
    return d.toISOString();
  };
  if (explicit) return `${explicit[1]}T17:00:00.000Z`;
  if (/\btomorrow\b/.test(lower)) return at(new Date(now.getTime() + 86_400_000));
  if (/\btoday\b/.test(lower)) return at(now);
  if (/\bnext week\b/.test(lower)) return at(new Date(now.getTime() + 7 * 86_400_000));
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < weekdays.length; i += 1) {
    if (new RegExp(`\\b${weekdays[i]}\\b`).test(lower)) {
      const delta = (i - now.getDay() + 7) % 7 || 7;
      return at(new Date(now.getTime() + delta * 86_400_000));
    }
  }
  return undefined;
}

function parsePriority(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/\b(urgent|asap|critical|emergency)\b/.test(lower)) return "urgent";
  if (/\b(high priority|important|top priority)\b/.test(lower)) return "high";
  if (/\b(low priority|whenever|someday)\b/.test(lower)) return "low";
  return undefined;
}

function parseCategory(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/\b(interview|study|exam|learn|course|revision|homework|read)\b/.test(lower)) return "study";
  if (/\b(work|meeting|report|email|client|project|deadline|presentation)\b/.test(lower)) return "work";
  if (/\b(gym|workout|run|doctor|health|exercise|yoga|dentist)\b/.test(lower)) return "health";
  if (/\b(personal|home|family|grocer|clean|buy|shopping)\b/.test(lower)) return "personal";
  return undefined;
}

function cleanTaskTitle(text: string): string {
  let title = text
    .replace(/^(please\s+)?(can you\s+|could you\s+)?/i, "")
    .replace(/^(add|create|make|new|set)\s+(a\s+)?(new\s+)?(task|reminder|to-?do)\s*/i, "")
    .replace(/^(remind me to|i need to|i have to|remember to|i must|to)\s+/i, "")
    .replace(/\b(today|tomorrow|next week|on (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (title.endsWith(".")) title = title.slice(0, -1).trim();
  return title || "New task";
}

type Intent =
  | "plan" | "save_plan" | "plan_feedback" | "create_task" | "complete" | "reschedule" | "summary"
  | "delete_task" | "create_note" | "edit_note" | "search_notes" | "list_notes" | "list_tasks"
  | "greeting" | "help";

function detectIntent(text: string): Intent {
  const lower = text.toLowerCase();

  // Notes take precedence: the word "note" is a strong signal, and phrase-level
  // checks stop "save it" (below) from hijacking "write a note … and save it".
  if (/\bnotes?\b|\bmemo\b|\b(jot down|write down|remember that)\b/.test(lower)) {
    if (/\b(search|find|look up|show me|what do my)\b/.test(lower)) return "search_notes";
    if (/\b(edit|update|change|modify|rewrite|append|expand|improve|fill in|add content)\b/.test(lower)) return "edit_note";
    if (/\b(create|write|add|make|new|save|jot|draft|remember|take)\b/.test(lower)) return "create_note";
    return "list_notes";
  }
  // Follow-up edits that refer back to the note just created ("add more", "in it").
  if (
    /\b(in it|into it|to it)\b/.test(lower) ||
    /\badd\b.*\bcontent\b/.test(lower) ||
    /\badd more\b/.test(lower) ||
    /\bappend\b/.test(lower)
  ) {
    return "edit_note";
  }

  if (/\b(save it|save the plan|save my plan|approve|looks good|accept the plan|yes,? save)\b/.test(lower)) return "save_plan";
  if (/\b(plan my day|plan (the|my) day|schedule my day|what should i (do|prioritize|prioritise)|organi[sz]e my day|daily plan)\b/.test(lower)) return "plan";
  if (/\b(completed|finished|done with|i did|mark .* (as )?(done|complete)|i'?ve done)\b/.test(lower)) return "complete";
  if (/\b(reschedule|move|postpone|push|defer|roll over)\b/.test(lower)) return "reschedule";
  if (/\b(summary|summarize|summarise|progress|how (am|did) i do|stats|statistics|report)\b/.test(lower)) return "summary";
  if (/\b(swap|change|replace|reorder|reorgani[sz]e)\b/.test(lower) && /\b(plan|schedule|my day)\b/.test(lower)) return "plan_feedback";
  if (/\b(delete|remove|get rid of|drop)\b/.test(lower)) return "delete_task";
  if (/\b(add|create|new|remind me|i need to|remember to)\b.*\b(task|to-?do|reminder)\b/.test(lower)) return "create_task";
  if (/\b(task|to-?do)\b/.test(lower) && /\b(add|create|new|remind)\b/.test(lower)) return "create_task";
  if (/\b(list|show|what).*(task|to-?do)\b/.test(lower)) return "list_tasks";
  if (/^(hi|hello|hey|yo)\b/.test(lower)) return "greeting";
  return "help";
}

function toolCall(tool: string, args: Record<string, unknown>, thought: string) {
  return { thought, tool, arguments: args };
}

function final(text: string) {
  return { final_answer: text };
}

function decide(state: State): Record<string, unknown> {
  const intent = detectIntent(state.text);
  const called = state.calledNames;
  const has = (name: string) => called.includes(name);
  const now = state.now;

  switch (intent) {
    case "greeting":
      return final(
        "Hi! I'm LifePilot. I can plan your day, manage tasks and notes, and summarise your progress. Try: \"Plan my day\" or \"Add a task to prepare for my interview tomorrow\".",
      );

    case "help":
      return final(
        "I can help you organise your day. Try:\n• \"Plan my day\"\n• \"Add a task to prepare for my interview tomorrow\"\n• \"What should I prioritise today?\"\n• \"I completed my React interview preparation\"\n• \"Reschedule my unfinished tasks for tomorrow\"\n• \"Summarise my study progress this week\"",
      );

    case "plan": {
      if (!has("get_today_tasks") && !has("create_daily_plan")) {
        return toolCall("get_today_tasks", { timeZone: state.timeZone, includeOverdue: true }, "Reading today's and overdue tasks before planning.");
      }
      if (has("get_today_tasks") && !has("create_daily_plan")) {
        return toolCall("create_daily_plan", { timeZone: state.timeZone, save: false }, "Building a time-blocked proposal from the real tasks.");
      }
      return final(renderPlan(observationFor(state, "create_daily_plan")));
    }

    case "save_plan": {
      const plan = observationFor(state, "create_daily_plan");
      if (plan) {
        return final(
          plan.persisted
            ? `Saved your plan for ${plan.date} — ${plan.blocks?.length ?? 0} block(s), ~${((plan.totalFocusMinutes ?? 0) / 60).toFixed(1)}h of focus.`
            : renderPlan(plan),
        );
      }
      return toolCall("create_daily_plan", { timeZone: state.timeZone, save: true }, "Building and saving the plan.");
    }

    case "plan_feedback": {
      const saved = observationFor(state, "create_daily_plan")?.persisted;
      if (saved) {
        return final(
          "That plan is already saved. I can rebuild a fresh one for you — say \"plan my day\" — or remove a specific task with \"delete <task>\".",
        );
      }
      return final(
        "That plan is still just a proposal and isn't saved, so there's nothing to edit yet. Say \"plan my day\" and I'll rebuild it, or tell me \"delete <task>\" to remove a task it's based on.",
      );
    }

    case "create_task": {
      if (!has("create_task")) {
        const args: Record<string, unknown> = { title: cleanTaskTitle(state.text) };
        const dueDate = parseDueDate(state.text, now);
        const priority = parsePriority(state.text);
        const category = parseCategory(state.text);
        if (dueDate) args.dueDate = dueDate;
        if (priority) args.priority = priority;
        if (category) args.category = category;
        return toolCall("create_task", args, "Creating the task the user asked for.");
      }
      const created = observationFor(state, "create_task");
      return final(
        created?.task
          ? `Done — I added "${created.task.title}"${created.task.dueDate ? ` due ${created.task.dueDate.slice(0, 10)}` : ""}${created.task.priority ? ` (${created.task.priority} priority)` : ""}.`
          : "I couldn't create that task. Please try rephrasing it.",
      );
    }

    case "complete": {
      if (!has("list_tasks")) {
        return toolCall("list_tasks", { status: "open", limit: 50 }, "Finding the task the user says they finished.");
      }
      if (!has("complete_task")) {
        const list = observationFor(state, "list_tasks");
        const match = pickTask(list?.tasks, state.text);
        if (!match) {
          return final("I couldn't find a matching open task. Could you tell me its exact title?");
        }
        return toolCall("complete_task", { taskId: match.id }, `Marking "${match.title}" complete.`);
      }
      const done = observationFor(state, "complete_task");
      return final(done?.task ? `Nice work — I marked "${done.task.title}" as completed.` : "Task updated.");
    }

    case "reschedule": {
      if (!has("list_tasks")) {
        return toolCall("list_tasks", { status: "open", limit: 50 }, "Listing open tasks to reschedule.");
      }
      const list = observationFor(state, "list_tasks");
      const tasks = list?.tasks ?? [];
      const updatedCount = called.filter((name) => name === "update_task").length;
      const target = tasks[updatedCount];
      if (!target) {
        return final(
          updatedCount > 0
            ? `Rescheduled ${updatedCount} unfinished task${updatedCount === 1 ? "" : "s"} for tomorrow.`
            : "You have no unfinished tasks to reschedule.",
        );
      }
      const tomorrow = new Date(now.getTime() + 86_400_000);
      tomorrow.setHours(17, 0, 0, 0);
      return toolCall("update_task", { taskId: target.id, dueDate: tomorrow.toISOString() }, `Moving "${target.title}" to tomorrow.`);
    }

    case "summary": {
      if (!has("get_productivity_summary")) {
        const lower = state.text.toLowerCase();
        const period = /\btoday\b/.test(lower)
          ? "today"
          : /\bmonth\b/.test(lower)
            ? "month"
            : /\ball\b|\bever\b/.test(lower)
              ? "all"
              : "week";
        return toolCall("get_productivity_summary", { period, timeZone: state.timeZone }, "Calculating real completion statistics.");
      }
      return final(renderSummary(observationFor(state, "get_productivity_summary")));
    }

    case "delete_task": {
      if (!has("list_tasks")) {
        return toolCall("list_tasks", { status: "all", limit: 50 }, "Locating the task to delete.");
      }
      if (!has("delete_task")) {
        const list = observationFor(state, "list_tasks");
        const match = pickTask(list?.tasks, state.text);
        if (!match) return final("I couldn't find that task to delete.");
        return toolCall("delete_task", { taskId: match.id }, `Proposing deletion of "${match.title}".`);
      }
      return final("That task was deleted.");
    }

    case "search_notes": {
      if (!has("search_notes")) {
        const words = keywords(state.text).sort((a, b) => b.length - a.length);
        return toolCall("search_notes", { query: words[0] ?? undefined, limit: 5 }, "Searching the user's notes.");
      }
      const notes = observationFor(state, "search_notes")?.notes ?? [];
      if (notes.length === 0) return final("I couldn't find any notes matching that.");
      return final(
        `I found ${notes.length} note${notes.length === 1 ? "" : "s"}:\n` +
          notes.map((n: any) => `• ${n.title}: ${String(n.content).slice(0, 120)}`).join("\n"),
      );
    }

    case "create_note": {
      if (!has("create_note")) {
        const topic = noteTopic(state.text);
        const title = topic ? topic.replace(/\b\w/g, (c) => c.toUpperCase()) : "Quick note";
        const content = generateNoteContent(topic || state.text);
        return toolCall("create_note", { title, content }, "Saving the note.");
      }
      const note = observationFor(state, "create_note")?.note;
      return final(note ? `Saved your note "${note.title}".` : "Note saved.");
    }

    case "edit_note": {
      if (!has("list_notes")) {
        return toolCall("list_notes", { limit: 10 }, "Finding the note to update.");
      }
      const notes = observationFor(state, "list_notes")?.notes ?? [];
      if (notes.length === 0) {
        return final('I couldn\'t find a note to edit. Create one first — say "write a note on JavaScript".');
      }
      const match = pickNote(notes, state.text) ?? notes[0];
      if (!has("update_note")) {
        const addition = generateNoteContent(topicFromText(state.text) ?? String(match.title));
        const existing = String(match.content ?? "").trim();
        const content = existing.includes(addition) ? existing || addition : existing ? `${existing}\n\n${addition}` : addition;
        return toolCall("update_note", { noteId: match.id, content }, `Adding content to "${match.title}".`);
      }
      const updated = observationFor(state, "update_note")?.note;
      return final(updated ? `Updated your note "${updated.title}".` : "Note updated.");
    }

    case "list_notes": {
      if (!has("list_notes")) {
        return toolCall("list_notes", { limit: 20 }, "Listing the user's notes.");
      }
      const notes = observationFor(state, "list_notes")?.notes ?? [];
      if (notes.length === 0) return final("You don't have any notes yet.");
      return final(
        `You have ${notes.length} note${notes.length === 1 ? "" : "s"}:\n` +
          notes.map((n: any) => `• ${n.title}`).join("\n"),
      );
    }

    case "list_tasks": {
      if (!has("list_tasks")) {
        return toolCall("list_tasks", { status: "open", limit: 20 }, "Listing the user's tasks.");
      }
      const list = observationFor(state, "list_tasks");
      const tasks = list?.tasks ?? [];
      if (tasks.length === 0) return final("You have no open tasks right now.");
      return final(
        `You have ${tasks.length} open task${tasks.length === 1 ? "" : "s"}:\n` +
          tasks.map((t: any) => `• ${t.title}${t.dueDate ? ` — due ${t.dueDate.slice(0, 10)}` : ""}${t.overdue ? " (overdue)" : ""}`).join("\n"),
      );
    }

    default:
      return final("I'm not sure how to help with that yet. Ask me to plan your day, manage tasks or notes, or summarise your progress.");
  }
}

function pickTask(tasks: any[] | undefined, text: string): any | null {
  if (!tasks || tasks.length === 0) return null;
  const words = keywords(text);
  let best: { task: any; score: number } | null = null;
  for (const task of tasks) {
    const title = String(task.title).toLowerCase();
    let score = 0;
    for (const word of words) if (title.includes(word)) score += 1;
    if (score > 0 && (!best || score > best.score)) best = { task, score };
  }
  return best ? best.task : null;
}

function pickNote(notes: any[] | undefined, text: string): any | null {
  if (!notes || notes.length === 0) return null;
  const words = keywords(text);
  let best: { note: any; score: number } | null = null;
  for (const note of notes) {
    const title = String(note.title).toLowerCase();
    const content = String(note.content ?? "").toLowerCase();
    let score = 0;
    for (const word of words) {
      if (title.includes(word)) score += 2;
      else if (content.includes(word)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { note, score };
  }
  return best ? best.note : null;
}

/** Extract the subject of a "write a note on X" style request. */
function noteTopic(text: string): string {
  return text
    .trim()
    .replace(/^(please\s+)?(can you\s+|could you\s+)?/i, "")
    .replace(/\b(write|create|make|add|save|jot down|draft|take|remember)\b\s+(a\s+)?(new\s+)?(note|memo)\b/i, "")
    .replace(/\b(note|memo)\b/gi, "")
    .replace(/\b(on|about|for|regarding|re)\b/i, "")
    .replace(/\b(and\s+)?(save|store)\s+(it|this|that)\b/gi, "")
    .replace(/[.?!,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Identify a study topic mentioned in the text, if any. */
function topicFromText(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/\bjavascript\b|\bjs\b/.test(lower)) return "javascript";
  if (/\btypescript\b|\bts\b/.test(lower)) return "typescript";
  if (/\breact\b/.test(lower)) return "react";
  if (/\bnode(\.?js)?\b/.test(lower)) return "node.js";
  return undefined;
}

/** Produce genuinely useful note content for well-known topics. */
function generateNoteContent(topic: string): string {
  const t = topic.toLowerCase();
  if (/\bjavascript\b|\bjs\b/.test(t)) {
    return [
      "JavaScript — interview cheat sheet",
      "• var/let/const: scope & hoisting; prefer const, then let.",
      "• Equality: === (no coercion) vs == (coerces); know the falsy values.",
      "• Closures: functions retain lexical scope; used for data privacy.",
      "• this: bound by the call site; arrow functions inherit it lexically.",
      "• Async: event loop, promises, async/await; microtasks before macrotasks.",
      "• Collections: destructuring, spread/rest, optional chaining (?.), nullish (??).",
      "• Prototypes & classes: the prototype chain, inheritance via extends.",
      '• Gotchas: typeof null === "object", NaN !== NaN, 0.1 + 0.2 !== 0.3.',
    ].join("\n");
  }
  if (/\btypescript\b|\bts\b/.test(t)) {
    return [
      "TypeScript — interview cheat sheet",
      "• Types vs interfaces; structural typing; when to use each.",
      "• Generics, unions/intersections, literal & mapped types.",
      "• Narrowing: typeof/instanceof guards, discriminated unions.",
      "• Utility types: Partial, Pick, Omit, Record, ReturnType.",
      "• tsconfig: strict mode, any vs unknown vs never.",
    ].join("\n");
  }
  if (/\breact\b/.test(t)) {
    return [
      "React — interview cheat sheet",
      "• Components, props, state; functional components + hooks.",
      "• Hooks: useState, useEffect (deps), useMemo/useCallback, useRef, custom hooks.",
      "• Rendering: reconciliation, keys, the virtual DOM, controlled vs uncontrolled.",
      "• State management: lifting state, context, reducers.",
      "• Performance: memo, code-splitting, avoiding needless re-renders.",
    ].join("\n");
  }
  if (/\bnode(\.?js)?\b/.test(t)) {
    return [
      "Node.js — interview cheat sheet",
      "• Event loop phases; non-blocking I/O; libuv thread pool.",
      "• CommonJS vs ESM; require vs import.",
      "• Streams & buffers; backpressure.",
      "• Error handling, async patterns, clustering vs worker threads.",
    ].join("\n");
  }
  return `Notes on ${topic}:\n• Key idea — \n• Details — \n• Questions to review — `;
}

function renderPlan(plan: any): string {
  if (!plan) return "I couldn't build a plan right now.";
  if (!plan.blocks || plan.blocks.length === 0) {
    return `You have nothing scheduled for ${plan.date} — no open tasks matched. Add a few tasks and ask me again.`;
  }
  const lines = plan.blocks.map(
    (block: any) =>
      `${block.startTime}–${block.endTime}  ${block.title}${block.rationale ? ` — ${block.rationale}` : ""}`,
  );
  const unscheduled = plan.unscheduled?.length
    ? `\n\nI couldn't fit ${plan.unscheduled.length} task(s) into ${plan.availableHours}h; they stay on your list.`
    : "";
  return `Here's a proposed plan for ${plan.date} (~${(plan.totalFocusMinutes / 60).toFixed(1)}h of focused work):\n${lines.join("\n")}${unscheduled}\n\nThis is a proposal — say "save it" and I'll store it.`;
}

function renderSummary(data: any): string {
  if (!data) return "I couldn't calculate your summary right now.";
  const cats = Object.entries(data.completedByCategory ?? {})
    .map(([category, count]) => `${category}: ${count}`)
    .join(", ");
  return [
    `Here's your ${data.periodLabel} summary:`,
    `• Completed: ${data.tasksCompletedInPeriod} (${data.tasksCompletedOnTime} on time)`,
    `• Created: ${data.tasksCreatedInPeriod}`,
    `• Completion rate: ${data.completionRatePct}%`,
    `• Open now: ${data.openTasksNow} • Overdue now: ${data.overdueTasksNow}`,
    cats ? `• Completed by category — ${cats}` : "",
    data.upcoming?.length
      ? `Next up: ${data.upcoming.map((t: any) => t.title).slice(0, 3).join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
