import { CalendarClock, Check, Pencil, Trash2, AlertCircle } from "lucide-react";
import { Spinner } from "./ui";
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  PRIORITY_STYLES,
  relativeDue,
} from "../lib/format";
import type { Task } from "../types";

export function PriorityBadge({ priority }: { priority: string }) {
  const dotColor =
    priority === "urgent"
      ? "bg-rose-500"
      : priority === "high"
      ? "bg-amber-500"
      : priority === "medium"
      ? "bg-blue-500"
      : "bg-slate-400";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
        PRIORITY_STYLES[priority] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {priority}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold capitalize ${
        CATEGORY_STYLES[category] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {CATEGORY_LABELS[category] ?? category}
    </span>
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
    <div
      className={`group relative flex items-start gap-3.5 rounded-2xl border p-4 transition duration-200 ${
        done
          ? "border-slate-100 bg-slate-50/70 opacity-75"
          : task.overdue
          ? "border-rose-200 bg-rose-50/20 hover:border-rose-300 hover:shadow-sm"
          : "border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-sm"
      }`}
    >
      {/* Checkbox */}
      <button
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border text-white transition ${
          done
            ? "border-emerald-500 bg-emerald-500 shadow-sm"
            : "border-slate-300 bg-white hover:border-brand-500 hover:bg-brand-50"
        }`}
        onClick={() => onToggle?.(task)}
        disabled={busy || !onToggle}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
      >
        {busy ? (
          <Spinner className="h-3 w-3 text-slate-500" />
        ) : (
          done && <Check className="h-3.5 w-3.5 stroke-[3]" />
        )}
      </button>

      {/* Main Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={`font-semibold text-sm transition ${
              done ? "text-slate-400 line-through" : "text-slate-900"
            }`}
          >
            {task.title}
          </p>
          {task.overdue && !done && (
            <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold uppercase text-rose-700">
              <AlertCircle className="h-3 w-3" /> Overdue
            </span>
          )}
        </div>

        {task.description && (
          <p className="mt-1 line-clamp-1 text-xs text-slate-500">
            {task.description}
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
          <CategoryBadge category={task.category} />
          <PriorityBadge priority={task.priority} />

          {task.dueDate && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ${
                task.overdue && !done
                  ? "bg-rose-50 text-rose-700 font-semibold"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {relativeDue(task.dueDate)}
            </span>
          )}

          {task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-80 group-hover:opacity-100 transition">
        {onEdit && (
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            onClick={() => onEdit(task)}
            aria-label="Edit task"
            title="Edit task"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        {onDelete && (
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
            onClick={() => onDelete(task)}
            aria-label="Delete task"
            title="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
