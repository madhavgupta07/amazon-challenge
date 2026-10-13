import { z } from "zod";
import {
  createNoteInput,
  createTaskInput,
  OBJECT_ID_REGEX,
  SUMMARY_PERIODS,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@lifepilot/shared";

const objectId = z.string().regex(OBJECT_ID_REGEX, "Must be a valid id");
const isoDate = z
  .string()
  .min(4)
  .max(40)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Must be an ISO-8601 date/time string");
const tags = z.array(z.string().trim().min(1).max(40)).max(20);
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("A valid email is required").max(200),
  name: z.string().trim().min(1, "Name is required").max(120),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("A valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const preferencesSchema = z
  .object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    timeZone: z.string().trim().max(64).optional(),
    workStartHour: z.number().int().min(0).max(23).optional(),
    workEndHour: z.number().int().min(1).max(24).optional(),
    dailyAvailableHours: z.number().min(0.5).max(24).optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "Provide at least one preference to update",
  });

export const createTaskBody = createTaskInput;

export const updateTaskBody = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    category: z.enum(TASK_CATEGORIES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    dueDate: isoDate.nullable().optional(),
    tags: tags.optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "Provide at least one field to update",
  });

export const listTasksQuery = z.object({
  status: z.enum([...TASK_STATUSES, "all", "open"]).optional(),
  category: z.enum([...TASK_CATEGORIES, "all"]).optional(),
  priority: z.enum([...TASK_PRIORITIES, "all"]).optional(),
  search: z.string().trim().max(200).optional(),
  includeCompleted: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const todayQuery = z.object({
  date: dateKey.optional(),
  timeZone: z.string().trim().max(64).optional(),
});

export const createNoteBody = createNoteInput;

export const updateNoteBody = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().max(20000).optional(),
    tags: tags.optional(),
    pinned: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "Provide at least one field to update",
  });

export const searchNotesQuery = z.object({
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const summaryQuery = z.object({
  period: z.enum(SUMMARY_PERIODS).optional(),
  timeZone: z.string().trim().max(64).optional(),
});

export const generatePlanBody = z.object({
  date: dateKey.optional(),
  timeZone: z.string().trim().max(64).optional(),
  availableHours: z.number().min(0.5).max(24).optional(),
  focusCategories: z.array(z.enum(TASK_CATEGORIES)).max(5).optional(),
  save: z.boolean().optional(),
});

export const savePlanBody = z.object({
  summary: z.string().max(2000).optional(),
  blocks: z.array(z.record(z.unknown())).max(100).optional(),
  generatedBy: z.enum(["agent", "user", "mock"]).optional(),
});

export const chatBody = z.object({
  message: z.string().trim().min(1, "Message is required").max(4000),
  conversationId: objectId.nullable().optional(),
});

export const confirmBody = z.object({
  actionId: z.string().min(1),
  decision: z.enum(["confirm", "cancel"]).default("confirm"),
  conversationId: objectId.nullable().optional(),
});

export const idParam = z.object({ id: objectId });
export const dateParam = z.object({ date: dateKey });
