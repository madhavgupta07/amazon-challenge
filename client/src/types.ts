export type TaskCategory = "work" | "personal" | "study" | "health" | "other";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface UserPreferences {
  theme: string;
  timeZone: string;
  workStartHour: number;
  workEndHour: number;
  dailyAvailableHours: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  preferences: UserPreferences;
  createdAt: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  tags: string[];
  source: string;
  overdue: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PlanBlock {
  startTime: string;
  endTime: string;
  title: string;
  taskId: string | null;
  category: string;
  priority: TaskPriority | null;
  rationale: string;
  status: string;
}

export interface GeneratedPlan {
  date: string;
  timeZone: string;
  availableHours: number;
  totalFocusMinutes: number;
  persisted: boolean;
  planId: string | null;
  blocks: PlanBlock[];
  unscheduled: Task[];
  summary: string;
}

export interface SavedPlan {
  id: string;
  date: string;
  summary: string;
  blocks: PlanBlock[];
  generatedBy: string;
  saved: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProductivitySummary {
  period: string;
  periodLabel: string;
  tasksCreatedInPeriod: number;
  tasksCompletedInPeriod: number;
  tasksCompletedOnTime: number;
  completionRatePct: number;
  openTasksNow: number;
  overdueTasksNow: number;
  dueToday: number;
  completedByCategory: Record<string, number>;
  completedByPriority: Record<string, number>;
  recentlyCompleted: Task[];
  upcoming: Task[];
}

export interface ToolCallTrace {
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  status: "ok" | "error" | "pending_confirmation" | "confirmed" | "cancelled";
  error?: string;
  summary?: string;
  at: string;
}

export interface PendingAction {
  id: string;
  name: string;
  title: string;
  arguments: Record<string, unknown>;
  summary: string;
  createdAt: number;
}

export interface AgentResult {
  reply: string;
  provider: string;
  toolsUsed: ToolCallTrace[];
  pendingAction?: PendingAction;
  iterations: number;
  contextUsed: Record<string, number>;
  conversationId: string;
}

export interface StoredMessage {
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ToolCallTrace[];
  provider?: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  messages: StoredMessage[];
  updatedAt: string;
}
