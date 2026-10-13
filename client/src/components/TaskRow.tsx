import { CalendarClock, Check, Pencil, Trash2 } from "lucide-react";
import { Badge, Spinner } from "./ui";
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  PRIORITY_STYLES,
  relativeDue,
} from "../lib/format";
import type { Task } from "../types";

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge className={PRIORITY_STYLES[priority] ?? "bg-slate-100 text-slate-600"}>
      {priority}
    </Badge>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <Badge className={CATEGORY_STYLES[category] ?? "bg-slate-100 text-slate-600"}>
      {CATEGORY_LABELS[category] ?? category}
    </Badge>
  );
}

export default function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
  busy = false,
}: {
  task: Task;
  onToggle?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  busy?: boolean;
}) {
  const done = task.status === "completed";
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300">
      <button
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
          done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-brand-500"
        }`}
        onClick={() => onToggle?.(task)}
        disabled={busy || !onToggle}
        aria-label={done ? "Completed" : "Mark complete"}
      >
        {busy ? <Spinner className="h-3 w-3 text-white" /> : done && <Check className="h-3 w-3" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${done ? "text-slate-400 line-through" : "text-slate-800"}`}>
          {task.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <CategoryBadge category={task.category} />
          <PriorityBadge priority={task.priority} />
          {task.dueDate && (
            <span className={`inline-flex items-center gap-1 ${task.overdue ? "text-rose-600" : ""}`}>
              <CalendarClock className="h-3 w-3" />
              {relativeDue(task.dueDate)}
            </span>
          )}
          {task.tags.map((tag) => (
            <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {onEdit && (
          <button className="btn-ghost p-1.5" onClick={() => onEdit(task)} aria-label="Edit task">
            <Pencil className="h-4 w-4" />
          </button>
        )}
        {onDelete && (
          <button
            className="btn-ghost p-1.5 text-rose-500 hover:bg-rose-50"
            onClick={() => onDelete(task)}
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
