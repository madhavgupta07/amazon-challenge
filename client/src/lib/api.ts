import type {
  AgentResult,
  ConversationDetail,
  ConversationSummary,
  GeneratedPlan,
  Note,
  ProductivitySummary,
  SavedPlan,
  Task,
  ToolCallTrace,
  User,
} from "../types";

const TOKEN_KEY = "lifepilot.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body) headers["content-type"] = "application/json";
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`/api${path}`, { ...init, headers });
  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const error = data?.error ?? {};
    throw new ApiError(
      response.status,
      error.code ?? "REQUEST_FAILED",
      error.message ?? "Something went wrong",
      error.details,
    );
  }
  return data as T;
}

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  register: (input: { email: string; name: string; password: string }) =>
    request<{ user: User; token: string }>("/auth/register", json(input)),
  login: (input: { email: string; password: string }) =>
    request<{ user: User; token: string }>("/auth/login", json(input)),
  me: () => request<{ user: User }>("/auth/me"),
  updatePreferences: (input: Partial<User["preferences"]>) =>
    request<{ user: User }>("/auth/preferences", { method: "PATCH", body: JSON.stringify(input) }),

  listTasks: (query: Record<string, string> = {}) =>
    request<{ tasks: Task[] }>(`/tasks?${new URLSearchParams(query)}`),
  todayTasks: (timeZone?: string) =>
    request<{ date: string; timeZone: string; dueTodayCount: number; overdueCount: number; tasks: Task[] }>(
      `/tasks/today${timeZone ? `?timeZone=${encodeURIComponent(timeZone)}` : ""}`,
    ),
  createTask: (input: Record<string, unknown>) => request<{ task: Task }>("/tasks", json(input)),
  updateTask: (id: string, input: Record<string, unknown>) =>
    request<{ task: Task; changes: string[] }>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  completeTask: (id: string) => request<{ task: Task }>(`/tasks/${id}/complete`, { method: "POST" }),
  deleteTask: (id: string) => request<{ task: Task; deleted: true }>(`/tasks/${id}`, { method: "DELETE" }),

  listNotes: (query: Record<string, string> = {}) =>
    request<{ notes: Note[] }>(`/notes?${new URLSearchParams(query)}`),
  searchNotes: (q: string, limit = 20) =>
    request<{ notes: Note[] }>(`/notes/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  createNote: (input: Record<string, unknown>) => request<{ note: Note }>("/notes", json(input)),
  updateNote: (id: string, input: Record<string, unknown>) =>
    request<{ note: Note }>(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteNote: (id: string) => request<{ note: Note; deleted: true }>(`/notes/${id}`, { method: "DELETE" }),

  getSummary: (period = "week") =>
    request<{ summary: ProductivitySummary }>(`/summary?period=${period}`),

  listPlans: () => request<{ plans: SavedPlan[] }>("/plans"),
  getPlan: (date: string) => request<{ plan: SavedPlan }>(`/plans/${date}`),
  generatePlan: (input: Record<string, unknown>) =>
    request<{ plan: GeneratedPlan }>("/plans/generate", json(input)),
  savePlan: (date: string, input: Record<string, unknown>) =>
    request<{ plan: SavedPlan }>(`/plans/${date}`, { method: "PUT", body: JSON.stringify(input) }),
  deletePlan: (date: string) => request<{ deleted: true }>(`/plans/${date}`, { method: "DELETE" }),

  chat: (input: { message: string; conversationId?: string | null }) =>
    request<AgentResult>("/chat", json(input)),
  confirm: (input: { actionId: string; decision: "confirm" | "cancel"; conversationId?: string | null }) =>
    request<{ reply: string; toolCall: ToolCallTrace; conversationId: string | null }>(
      "/chat/confirm",
      json(input),
    ),
  listConversations: () => request<{ conversations: ConversationSummary[] }>("/chat/conversations"),
  getConversation: (id: string) =>
    request<{ conversation: ConversationDetail }>(`/chat/conversations/${id}`),
  deleteConversation: (id: string) =>
    request<{ deleted: true }>(`/chat/conversations/${id}`, { method: "DELETE" }),
};
