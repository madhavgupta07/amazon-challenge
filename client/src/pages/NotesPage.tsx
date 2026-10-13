import { Pin, Plus, Search, StickyNote } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { EmptyState, ErrorBanner, Modal, Spinner } from "../components/ui";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { Note } from "../types";

const EMPTY_FORM = { title: "", content: "", tags: "" };

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [editing, setEditing] = useState<Note | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = query ? await api.searchNotes(query) : await api.listNotes();
      setNotes(result.notes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load notes.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditing(note);
    setForm({ title: note.title, content: note.content, tags: note.tags.join(", ") });
    setFormOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
      if (editing) await api.updateNote(editing.id, payload);
      else await api.createNote(payload);
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the note.");
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (note: Note) => {
    try {
      await api.updateNote(note.id, { pinned: !note.pinned });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update the note.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteNote(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete the note.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Notes</h1>
          <p className="text-sm text-slate-500">Quick memory that the assistant can search.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New note
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          className="field pl-8"
          placeholder="Search notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <ErrorBanner message={error} onRetry={() => void load()} />}

      {loading ? (
        <div className="flex h-48 items-center justify-center text-slate-500">
          <Spinner className="h-6 w-6" />
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          message="Capture quick notes and ideas — the assistant can find them later."
          action={
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New note
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <article
              key={note.id}
              className="card group flex cursor-pointer flex-col p-4 transition hover:border-brand-300"
              onClick={() => openEdit(note)}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-800">{note.title}</h3>
                <button
                  className={`shrink-0 rounded p-1 transition ${
                    note.pinned
                      ? "text-brand-600"
                      : "text-slate-300 opacity-0 hover:text-brand-500 group-hover:opacity-100"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void togglePin(note);
                  }}
                  aria-label="Toggle pin"
                >
                  <Pin className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 line-clamp-4 flex-1 whitespace-pre-wrap text-sm text-slate-600">
                {note.content}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {note.tags.map((tag) => (
                  <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                    #{tag}
                  </span>
                ))}
                <span className="ml-auto text-xs text-slate-400">
                  {formatDateTime(note.updatedAt)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit note" : "New note"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={submit} disabled={saving}>
              {saving && <Spinner />} Save
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
            <label className="label">Content *</label>
            <textarea
              className="field min-h-32"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Tags</label>
            <input
              className="field"
              placeholder="interview, project (comma separated)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this note?"
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