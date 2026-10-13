import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodTypeAny } from "zod";
import {
  completeTaskInput,
  createDailyPlanInput,
  createNoteInput,
  createTaskInput,
  deleteNoteInput,
  deleteTaskInput,
  getProductivitySummaryInput,
  getTodayTasksInput,
  listNotesInput,
  listTasksInput,
  searchNotesInput,
  updateNoteInput,
  updateTaskInput,
} from "./schemas.js";

export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  schema: ZodTypeAny;
  /** Destructive tools must be confirmed by the user before execution. */
  destructive: boolean;
  /** Whether the tool mutates stored data. */
  mutates: boolean;
}

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "create_task",
    title: "Create task",
    description:
      "Create a new task for the signed-in user. Use for requests like 'add a task to prepare for my interview' or 'remind me to call the dentist tomorrow'. Interpret relative dates such as 'tomorrow' against the current date supplied to you and pass an ISO-8601 dueDate.",
    schema: createTaskInput,
    destructive: false,
    mutates: true,
  },
  {
    name: "list_tasks",
    title: "List tasks",
    description:
      "List the user's tasks with optional filters (status, category, priority, text search, due-before/after). Use this before answering questions about what the user has to do.",
    schema: listTasksInput,
    destructive: false,
    mutates: false,
  },
  {
    name: "get_today_tasks",
    title: "Get today's tasks",
    description:
      "Return tasks due today plus overdue open tasks for the user's time zone. Use this for daily planning and 'what should I do today' questions.",
    schema: getTodayTasksInput,
    destructive: false,
    mutates: false,
  },
  {
    name: "update_task",
    title: "Update task",
    description:
      "Update fields on an existing task (title, description, category, priority, status, dueDate, tags). Use for rescheduling, reprioritising or editing. Provide the taskId and only the fields that change.",
    schema: updateTaskInput,
    destructive: false,
    mutates: true,
  },
  {
    name: "complete_task",
    title: "Complete task",
    description:
      "Mark a task as completed and record when it was finished. Use when the user reports finishing something.",
    schema: completeTaskInput,
    destructive: false,
    mutates: true,
  },
  {
    name: "delete_task",
    title: "Delete task",
    description:
      "Permanently delete a task. This is destructive. Do NOT set confirm yourself — the application intercepts this call and asks the user to confirm before anything is deleted. Call it only when the user clearly asks to remove a specific task.",
    schema: deleteTaskInput,
    destructive: true,
    mutates: true,
  },
  {
    name: "create_note",
    title: "Create note",
    description:
      "Save a personal note for the user. Use for capturing information the user wants to remember.",
    schema: createNoteInput,
    destructive: false,
    mutates: true,
  },
  {
    name: "search_notes",
    title: "Search notes",
    description:
      "Search the user's notes by free-text query and/or tags. Use to recall relevant context the user has written down.",
    schema: searchNotesInput,
    destructive: false,
    mutates: false,
  },
  {
    name: "list_notes",
    title: "List notes",
    description: "List the user's most recent notes, optionally filtered by a single tag.",
    schema: listNotesInput,
    destructive: false,
    mutates: false,
  },
  {
    name: "update_note",
    title: "Update note",
    description: "Update an existing note's title, content, tags or pinned state.",
    schema: updateNoteInput,
    destructive: false,
    mutates: true,
  },
  {
    name: "delete_note",
    title: "Delete note",
    description:
      "Permanently delete a note. This is destructive. Do NOT set confirm yourself — the application intercepts this call and asks the user to confirm before anything is deleted.",
    schema: deleteNoteInput,
    destructive: true,
    mutates: true,
  },
  {
    name: "get_productivity_summary",
    title: "Get productivity summary",
    description:
      "Calculate real completion and overdue statistics for a period (today, week, month, all, or custom with startDate/endDate). All numbers come from stored records. Use before writing any progress report.",
    schema: getProductivitySummaryInput,
    destructive: false,
    mutates: false,
  },
  {
    name: "create_daily_plan",
    title: "Create daily plan",
    description:
      "Build a time-blocked plan for a day from the user's actual tasks (prioritising overdue and high-priority work). Returns a proposed plan. Only persist it when save=true, which should be set after the user approves. Provide availableHours when the user states how much time they have.",
    schema: createDailyPlanInput,
    destructive: false,
    mutates: true,
  },
];

export const toolDefinitionMap: Record<string, ToolDefinition> = Object.fromEntries(
  toolDefinitions.map((def) => [def.name, def]),
);

/** JSON Schema for a tool's arguments, with refs inlined for prompt embedding. */
export function toolJsonSchema(def: ToolDefinition): Record<string, unknown> {
  return zodToJsonSchema(def.schema, {
    $refStrategy: "none",
    target: "jsonSchema7",
  }) as Record<string, unknown>;
}

export function isDestructive(name: string): boolean {
  return toolDefinitionMap[name]?.destructive ?? false;
}
