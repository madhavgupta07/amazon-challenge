import type { Types } from "mongoose";
import type { MessageRole, TaskCategory, TaskPriority, TaskStatus } from "./constants.js";

export interface TaskRecord {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date | null;
  completedAt: Date | null;
  source: "manual" | "agent";
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteRecord {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanBlock {
  startTime: string;
  endTime: string;
  title: string;
  taskId: Types.ObjectId | null;
  category: TaskCategory | "break";
  priority: TaskPriority | null;
  rationale: string;
  status: "planned" | "done";
}

export interface DailyPlanRecord {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  date: string;
  summary: string;
  blocks: PlanBlock[];
  generatedBy: "agent" | "user" | "mock";
  saved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationRecord {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  title: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  role: MessageRole;
  content: string;
  toolCalls?: ToolCallTrace[];
  provider?: string;
  createdAt: Date;
}

export interface ToolCallTrace {
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  status: "ok" | "error" | "pending_confirmation" | "confirmed" | "cancelled";
  error?: string;
  summary?: string;
  at: Date;
}

/** Context passed to every MCP tool handler. userId is injected by the API server. */
export interface ToolContext {
  userId: string;
}

export interface AgentToolCall {
  name: string;
  arguments: Record<string, unknown>;
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
}
