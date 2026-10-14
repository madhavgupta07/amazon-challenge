import {
  Clock,
  Pencil,
  Pin,
  Plus,
  Search,
  Sparkles,
  StickyNote,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { EmptyState, ErrorBanner, Modal, Spinner } from "../components/ui";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { Note } from "../types";

const EMPTY_FORM = { title: "", content: "", tags: "", pinned: false };

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");

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

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [notes]);

  // Filter by tag if selected
  const displayedNotes = useMemo(() => {
    let list = notes;
    if (selectedTag) {
      list = list.filter((n) => n.tags.includes(selectedTag));
    }
    // Sort pinned to top, then by updatedAt desc
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    });
  }, [notes, selectedTag]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditing(note);
    setForm({
      title: note.title,
      content: note.content,
      tags: note.tags.join(", "),
      pinned: note.pinned,
    });
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
        pinned: form.pinned,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Knowledge Base & Notes
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              <Sparkles className="h-3 w-3" /> AI Indexed
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Semantic memory and context automatically retrieved by your AI assistant during daily planning.
          </p>
        </div>

        <button
          className="btn-primary inline-flex items-center gap-2 shadow-sm"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Toolbar: Search & Tag Filter Pills */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-lg">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className="field pl-9 pr-8"
              placeholder="Search knowledge base across title & body…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              <strong>{notes.length}</strong> total notes
            </span>
            <span>•</span>
            <span className="text-amber-600 font-semibold">
              {notes.filter((n) => n.pinned).length} pinned
            </span>
          </div>
        </div>

        {/* Tag Pills */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Tags:
            </span>
            <button
              onClick={() => setSelectedTag("")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                selectedTag === ""
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  selectedTag === tag
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={() => void load()} />}

      {/* Notes Grid */}
      {loading ? (
        <div className="flex h-56 items-center justify-center text-slate-500">
          <Spinner className="h-8 w-8 text-brand-600" />
        </div>
      ) : displayedNotes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No notes found"
          message="Create a note or project memo — your assistant can search and synthesize them anytime."
          action={
            <button className="btn-primary inline-flex items-center gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              <span>New Note</span>
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedNotes.map((note) => (
            <article
              key={note.id}
              className={`group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 cursor-pointer ${
                note.pinned
                  ? "border-amber-200/80 bg-gradient-to-br from-amber-50/30 to-white shadow-sm hover:border-amber-300"
                  : "border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-md"
              }`}
              onClick={() => openEdit(note)}
            >
              <div>
                {/* Header with Title & Pin Action */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-brand-600 transition truncate">
                      {note.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      className={`rounded-lg p-1.5 transition ${
                        note.pinned
                          ? "bg-amber-100/80 text-amber-700 hover:bg-amber-200"
                          : "text-slate-300 opacity-60 hover:opacity-100 hover:text-amber-600 hover:bg-amber-50"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        void togglePin(note);
                      }}
                      title={note.pinned ? "Unpin note" : "Pin note to top"}
                      aria-label="Toggle pin"
                    >
                      <Pin className={`h-4 w-4 ${note.pinned ? "fill-amber-600" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Content preview */}
                <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-xs text-slate-600 leading-relaxed font-normal">
                  {note.content}
                </p>
              </div>

              {/* Footer with tags and date */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(note.updatedAt)}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(note);
                      }}
                      title="Edit note"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(note);
                      }}
                      title="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Create / Edit Note Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Note" : "Create New Note"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary inline-flex items-center gap-2" onClick={submit} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4 text-white" /> : <Sparkles className="h-4 w-4" />}
              <span>{editing ? "Save Changes" : "Create Note"}</span>
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="label">Title *</label>
            <input
              className="field"
              placeholder="e.g. Q4 Project OKRs & Milestones"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Content *</label>
            <textarea
              className="field min-h-40 leading-relaxed font-sans text-sm"
              placeholder="Write detailed notes, context, or guidelines for the AI assistant…"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Tags</label>
            <input
              className="field"
              placeholder="comma-separated, e.g.: architecture, team, goals"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="pinned"
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={form.pinned}
              onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
            />
            <label htmlFor="pinned" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Pin this note to the top of your knowledge base
            </label>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Note?"
        message={`"${deleteTarget?.title}" will be permanently removed from your knowledge base.`}
        confirmLabel="Delete Note"
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}