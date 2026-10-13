import { CalendarClock, Check, Save, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { EmptyState, ErrorBanner, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { CATEGORY_LABELS, todayKey } from "../lib/format";
import type { GeneratedPlan, SavedPlan } from "../types";

const FOCUS_CATEGORIES = ["work", "personal", "study", "health"];

export default function PlannerPage() {
  const { user } = useAuth();
  const timeZone = user?.preferences.timeZone ?? "UTC";

  const [date, setDate] = useState(() => todayKey(timeZone));
  const [hours, setHours] = useState(6);
  const [focus, setFocus] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedPlan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSaved = useCallback(async () => {
    try {
      const { plans } = await api.listPlans();
      setSavedPlans(plans);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load saved plans.");
    }
  }, []);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    setGenerating(true);
    setError(null);
    try {
      const { plan: generated } = await api.generatePlan({
        date,
        timeZone,
        availableHours: hours,
        focusCategories: focus.length ? focus : undefined,
        save: false,
      });
      setPlan(generated);
      await loadSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate a plan.");
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!plan) return;
    setSavingPlan(true);
    setError(null);
    try {
      await api.savePlan(plan.date, {
        blocks: plan.blocks,
        summary: plan.summary,
        generatedBy: "user",
      });
      setPlan({ ...plan, persisted: true });
      await loadSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the plan.");
    } finally {
      setSavingPlan(false);
    }
  };

  const toggleFocus = (category: string) => {
    setFocus((current) =>
      current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category],
    );
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deletePlan(deleteTarget.date);
      setDeleteTarget(null);
      await loadSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete the plan.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Daily planner</h1>
        <p className="text-sm text-slate-500">
          Generate a time-blocked plan from your real tasks, weighted by due date and priority.
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      <form className="card flex flex-wrap items-end gap-4 p-4" onSubmit={generate}>
        <div>
          <label className="label">Date</label>
          <input type="date" className="field w-44" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Available hours</label>
          <input
            type="number"
            min={0.5}
            max={24}
            step={0.5}
            className="field w-28"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label">Focus on</label>
          <div className="flex flex-wrap gap-2">
            {FOCUS_CATEGORIES.map((category) => (
              <button
                type="button"
                key={category}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  focus.includes(category)
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-300 text-slate-500 hover:border-slate-400"
                }`}
                onClick={() => toggleFocus(category)}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" className="btn-primary" disabled={generating}>
          {generating ? <Spinner /> : <Sparkles className="h-4 w-4" />}
          Generate plan
        </button>
      </form>

      {plan && (
        <section className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-slate-800">
                <CalendarClock className="h-5 w-5 text-brand-600" />
                {plan.date}
              </h2>
              <p className="text-sm text-slate-500">
                ~{(plan.totalFocusMinutes / 60).toFixed(1)}h of focused work · {plan.blocks.filter((b) => b.category !== "break").length} focus blocks
              </p>
            </div>
            <div className="flex items-center gap-2">
              {plan.persisted && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <Check className="h-3.5 w-3.5" /> Saved
                </span>
              )}
              {!plan.persisted && (
                <button className="btn-primary" onClick={() => void save()} disabled={savingPlan}>
                  {savingPlan && <Spinner />}
                  <Save className="h-4 w-4" /> Save plan
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            {plan.blocks.map((block, index) => {
              const isBreak = block.category === "break";
              return (
                <div
                  key={`${block.startTime}-${index}`}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    isBreak
                      ? "border border-dashed border-slate-200 bg-slate-50 text-slate-400"
                      : "border-l-4 border-brand-500 bg-brand-50/50 text-slate-700"
                  }`}
                >
                  <span className="w-24 shrink-0 font-mono text-xs text-slate-500">
                    {block.startTime} – {block.endTime}
                  </span>
                  <span className="flex-1 truncate">
                    {block.title}
                    {block.rationale && !isBreak && (
                      <span className="ml-2 text-xs text-slate-400">{block.rationale}</span>
                    )}
                  </span>
                  {block.priority && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium capitalize text-slate-500">
                      {block.priority}
                    </span>
                  )}
                </div>
              );
            })}
            {plan.blocks.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                Nothing to schedule — {plan.summary}
              </p>
            )}
          </div>

          {plan.unscheduled.length > 0 && (
            <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <p className="font-medium">Couldn't fit {plan.unscheduled.length} task(s):</p>
              <ul className="mt-1 list-inside list-disc text-amber-700">
                {plan.unscheduled.map((task) => (
                  <li key={task.id}>{task.title}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 font-semibold text-slate-800">Saved plans</h2>
        {savedPlans.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No saved plans"
            message="Generate a plan above and save it to keep it here."
          />
        ) : (
          <div className="space-y-2">
            {savedPlans.map((saved) => (
              <div
                key={saved.id}
                className="card flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-800">{saved.date}</p>
                  <p className="text-sm text-slate-500">
                    {saved.blocks.filter((b) => b.category !== "break").length} blocks
                  </p>
                </div>
                <button
                  className="btn-ghost p-1.5 text-rose-500 hover:bg-rose-50"
                  onClick={() => setDeleteTarget(saved)}
                  aria-label="Delete plan"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this plan?"
        message={`The plan for ${deleteTarget?.date} will be removed.`}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}