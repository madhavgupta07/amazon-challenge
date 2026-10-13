export function formatDate(value: string | null | undefined, timeZone?: string): string {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone,
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeDue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days <= 7) return `In ${days}d`;
  return formatDate(value);
}

export function todayKey(timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export const CATEGORY_LABELS: Record<string, string> = {
  work: "Work",
  personal: "Personal",
  study: "Study",
  health: "Health",
  other: "Other",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const CATEGORY_STYLES: Record<string, string> = {
  work: "bg-blue-100 text-blue-700",
  personal: "bg-amber-100 text-amber-700",
  study: "bg-violet-100 text-violet-700",
  health: "bg-emerald-100 text-emerald-700",
  other: "bg-slate-100 text-slate-600",
};

export const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-sky-100 text-sky-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-rose-100 text-rose-700",
};

export const TOOL_LABELS: Record<string, string> = {
  create_task: "Created a task",
  list_tasks: "Looked up tasks",
  get_today_tasks: "Read today's tasks",
  update_task: "Updated a task",
  complete_task: "Completed a task",
  delete_task: "Deleted a task",
  create_note: "Saved a note",
  search_notes: "Searched notes",
  list_notes: "Listed notes",
  update_note: "Updated a note",
  delete_note: "Deleted a note",
  get_productivity_summary: "Computed your summary",
  create_daily_plan: "Built a daily plan",
};
