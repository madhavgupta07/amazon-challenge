export const TASK_CATEGORIES = ["work", "study", "personal", "health", "other"] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const MESSAGE_ROLES = ["user", "assistant", "system", "tool"] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const DEFAULT_TIME_ZONE = "UTC";

export const SUMMARY_PERIODS = ["today", "week", "month", "all", "custom"] as const;
export type SummaryPeriod = (typeof SUMMARY_PERIODS)[number];

/** ObjectId string used by every tool that references an existing document. */
export const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
