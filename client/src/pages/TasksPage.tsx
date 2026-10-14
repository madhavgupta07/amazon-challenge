import {
  Filter,
  ListTodo,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import TaskRow from "../components/TaskRow";
import { EmptyState, ErrorBanner, Modal, Spinner } from "../components/ui";
import { api } from "../lib/api";
import type { Task } from "../types";

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "work",
  priority: "medium",
  dueDate: "",
  tags: "",
};

interface FormState {
  title: string;
  description: string;
  category: string;
  priority: string;
  dueDate: string;
  tags: string;
}

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
  { value: "study", label: "Study" },
  { value: "health", label: "Health" },
  { value: "other", label: "Other" },
];

const PRIORITIES = [
  { value: "", label: "All Priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<Task | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const query: Record<string, string> = {};
      if (status) query.status = status;
      if (category) query.category = category;
      if (priority) query.priority = priority;
      if (search) query.search = search;
      const result = await api.listTasks(query);
      setTasks(result.tasks);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [status, category, priority, search]);

  useEffect(() => {
    void load();
  }, [load]);

  // Derived metrics from current tasks list
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const overdue = tasks.filter((t) => t.overdue && t.status !== "completed").length;
    return { total, completed, pending, overdue };
  }, [tasks]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      tags: task.tags.join(", "),
    });
    setFormOpen(true);
  };

  const setPresetDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setForm((f) => ({ ...f, dueDate: d.toISOString().slice(0, 10) }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        priority: form.priority,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
      if (form.dueDate) payload.dueDate = `${form.dueDate}T17:00:00.000Z`;
      if (editing) await api.updateTask(editing.id, payload);
      else await api.createTask(payload);
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the task.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (task: Task) => {
    setBusyId(task.id);
    try {
      if (task.status === "completed") await api.updateTask(task.id, { status: "pending" });
      else await api.completeTask(task.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update the task.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteTask(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete the task.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Quick Add */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Task Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">
            Organize, prioritize, and track all tasks synchronized with your AI assistant.
          </p>
        </div>
        <button
          className="btn-primary inline-flex items-center gap-2 shadow-sm"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Tasks
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-slate-900">{metrics.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Pending Focus
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-brand-600">{metrics.pending}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Completed
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-emerald-600">{metrics.completed}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Overdue
          </p>
          <p
            className={`mt-1.5 text-2xl font-extrabold ${
              metrics.overdue > 0 ? "text-rose-600" : "text-slate-900"
            }`}
          >
            {metrics.overdue}
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className="field pl-9 pr-8"
              placeholder="Search by title, description, or tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Pills */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/80 p-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  status === s.value
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown Filters: Category & Priority */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>

          <select
            className="field w-auto py-1 text-xs"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            className="field w-auto py-1 text-xs"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          {(status || category || priority || search) && (
            <button
              onClick={() => {
                setStatus("");
                setCategory("");
                setPriority("");
                setSearch("");
              }}
              className="text-xs font-semibold text-brand-600 hover:text-brand-800 ml-auto"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => void load()} />}

      {/* Task List */}
      {loading ? (
        <div className="flex h-56 items-center justify-center text-slate-500">
          <Spinner className="h-8 w-8 text-brand-600" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks match your criteria"
          message="Create a new task, clear your filters, or ask your assistant to schedule items."
          action={
            <button className="btn-primary inline-flex items-center gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              <span>Create Task</span>
            </button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={toggle}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              busy={busyId === task.id}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Task Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Task" : "Create New Task"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary inline-flex items-center gap-2" onClick={submit} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4 text-white" /> : <Sparkles className="h-4 w-4" />}
              <span>{editing ? "Save Changes" : "Create Task"}</span>
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="label">Title *</label>
            <input
              className="field"
              placeholder="e.g., Finalize Q3 architecture review"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="field min-h-24"
              placeholder="Optional context, links, or success criteria…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Category</label>
              <select
                className="field"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="work">Work</option>
                <option value="personal">Personal</option>
                <option value="study">Study</option>
                <option value="health">Health</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="label">Priority</label>
              <select
                className="field"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Due Date</label>
              <div className="flex items-center gap-1.5 text-xs text-brand-600">
                <button
                  type="button"
                  onClick={() => setPresetDate(0)}
                  className="hover:underline"
                >
                  Today
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setPresetDate(1)}
                  className="hover:underline"
                >
                  Tomorrow
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setPresetDate(7)}
                  className="hover:underline"
                >
                  Next Week
                </button>
              </div>
            </div>
            <input
              type="date"
              className="field"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Tags</label>
            <input
              className="field"
              placeholder="comma-separated, e.g.: architecture, review, sprint"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Task?"
        message={`Are you sure you want to permanently delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete Task"
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}