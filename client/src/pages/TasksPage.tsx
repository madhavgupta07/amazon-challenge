import { ListTodo, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import TaskRow from "../components/TaskRow";
import { EmptyState, ErrorBanner, Modal, Spinner } from "../components/ui";
import { api } from "../lib/api";
import type { Task } from "../types";

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "other",
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tasks</h1>
          <p className="text-sm text-slate-500">
            {loading ? "Loading…" : `${tasks.length} matching task${tasks.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New task
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="field pl-8"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="field w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
        <select
          className="field w-auto"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          <option value="work">Work</option>
          <option value="personal">Personal</option>
          <option value="study">Study</option>
          <option value="health">Health</option>
          <option value="other">Other</option>
        </select>
        <select
          className="field w-auto"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => void load()} />}

      {loading ? (
        <div className="flex h-48 items-center justify-center text-slate-500">
          <Spinner className="h-6 w-6" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks here"
          message="Add a task, or tell the assistant to add one for you."
          action={
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New task
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
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

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit task" : "New task"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={submit} disabled={saving}>
              {saving && <Spinner />}
              Save
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="label">Title *</label>
            <input
              className="field"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="field min-h-20"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
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
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="label">Due date</label>
              <input
                type="date"
                className="field"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Tags</label>
            <input
              className="field"
              placeholder="interview, react (comma separated)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this task?"
        message={`"${deleteTarget?.title}" will be permanently removed.`}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}