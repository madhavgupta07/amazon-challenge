import { z } from "zod";
import {
  OBJECT_ID_REGEX,
  SUMMARY_PERIODS,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "../constants.js";

const objectId = z.string().regex(OBJECT_ID_REGEX, "Must be a valid 24-character id");

const isoDate = z
  .string()
  .min(4)
  .max(40)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Must be an ISO-8601 date/time string");

const tags = z.array(z.string().trim().min(1).max(40)).max(20);

export const createTaskInput = z.object({
  title: z.string().trim().min(1, "title is required").max(200),
  description: z.string().max(5000).optional(),
  category: z.enum(TASK_CATEGORIES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: isoDate.nullable().optional(),
  tags: tags.optional(),
});

export const listTasksInput = z.object({
  status: z.enum([...TASK_STATUSES, "all", "open"]).optional(),
  category: z.enum([...TASK_CATEGORIES, "all"]).optional(),
  priority: z.enum([...TASK_PRIORITIES, "all"]).optional(),
  search: z.string().trim().max(200).optional(),
  dueBefore: isoDate.optional(),
  dueAfter: isoDate.optional(),
  includeCompleted: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const getTodayTasksInput = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .optional(),
  timeZone: z.string().max(64).optional(),
  includeOverdue: z.boolean().optional(),
});

export const updateTaskInput = z
  .object({
    taskId: objectId,
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    category: z.enum(TASK_CATEGORIES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    dueDate: isoDate.nullable().optional(),
    tags: tags.optional(),
  })
  .refine(
    (value) =>
      Object.keys(value).some((key) => key !== "taskId") &&
      Object.entries(value).some(([key, v]) => key !== "taskId" && v !== undefined),
    { message: "Provide at least one field to update" },
  );

export const completeTaskInput = z.object({
  taskId: objectId,
  note: z.string().max(1000).optional(),
});

export const deleteTaskInput = z.object({
  taskId: objectId,
  confirm: z.boolean().optional(),
});

export const createNoteInput = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().min(1).max(20000),
  tags: tags.optional(),
});

export const searchNotesInput = z.object({
  query: z.string().trim().max(200).optional(),
  tags: tags.optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export const listNotesInput = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  tag: z.string().trim().max(40).optional(),
});

export const updateNoteInput = z
  .object({
    noteId: objectId,
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().max(20000).optional(),
    tags: tags.optional(),
    pinned: z.boolean().optional(),
  })
  .refine(
    (value) => Object.entries(value).some(([key, v]) => key !== "noteId" && v !== undefined),
    { message: "Provide at least one field to update" },
  );

export const deleteNoteInput = z.object({
  noteId: objectId,
  confirm: z.boolean().optional(),
});

export const getProductivitySummaryInput = z.object({
  period: z.enum(SUMMARY_PERIODS).optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  timeZone: z.string().max(64).optional(),
});

export const createDailyPlanInput = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .optional(),
  timeZone: z.string().max(64).optional(),
  availableHours: z.number().min(0.5).max(24).optional(),
  focusCategories: z.array(z.enum(TASK_CATEGORIES)).max(5).optional(),
  save: z.boolean().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskInput>;
export type ListTasksInput = z.infer<typeof listTasksInput>;
export type GetTodayTasksInput = z.infer<typeof getTodayTasksInput>;
export type UpdateTaskInput = z.infer<typeof updateTaskInput>;
export type CompleteTaskInput = z.infer<typeof completeTaskInput>;
export type DeleteTaskInput = z.infer<typeof deleteTaskInput>;
export type CreateNoteInput = z.infer<typeof createNoteInput>;
export type SearchNotesInput = z.infer<typeof searchNotesInput>;
export type ListNotesInput = z.infer<typeof listNotesInput>;
export type UpdateNoteInput = z.infer<typeof updateNoteInput>;
export type DeleteNoteInput = z.infer<typeof deleteNoteInput>;
export type GetProductivitySummaryInput = z.infer<typeof getProductivitySummaryInput>;
export type CreateDailyPlanInput = z.infer<typeof createDailyPlanInput>;
