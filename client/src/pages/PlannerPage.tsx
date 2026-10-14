import {
  CalendarClock,
  Check,
  CheckCircle2,
  Coffee,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { ErrorBanner, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { CATEGORY_LABELS, todayKey } from "../lib/format";
import type { GeneratedPlan, SavedPlan, Task } from "../types";

function getBlockMinutes(block: { startTime: string; endTime: string }): number {
  const [sh = 0, sm = 0] = block.startTime.split(":").map(Number);
  const [eh = 0, em = 0] = block.endTime.split(":").map(Number);
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
}

const FOCUS_CATEGORIES = ["work", "personal", "study", "health"];

const START_TIMES = [
  { value: 8, label: "08:00 AM" },
  { value: 9, label: "09:00 AM" },
  { value: 10, label: "10:00 AM" },
  { value: 11, label: "11:00 AM" },
  { value: 12, label: "12:00 PM" },
  { value: 13, label: "01:00 PM" },
];

export default function PlannerPage() {
  const { user } = useAuth();
  const timeZone = user?.preferences.timeZone ?? "UTC";

  const [date, setDate] = useState(() => todayKey(timeZone));
  const [hours, setHours] = useState(6);
  const [startHour, setStartHour] = useState(9);
  const [focus, setFocus] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [openTasks, setOpenTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedPlan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSaved = useCallback(async () => {
    try {
      const [plansRes, tasksRes] = await Promise.all([
        api.listPlans(),
        api.listTasks({ status: "pending", limit: "20" }),
      ]);
      setSavedPlans(plansRes.plans);
      setOpenTasks(tasksRes.tasks);

      // Check if today has a saved plan already
      const todaySaved = plansRes.plans.find((p) => p.date === date);
      if (todaySaved && !plan) {
        setPlan({
          date: todaySaved.date,
          timeZone,
          availableHours: hours,
          planId: todaySaved.id,
          unscheduled: [],
          blocks: todaySaved.blocks,
          summary: todaySaved.summary,
          totalFocusMinutes: todaySaved.blocks.reduce(
            (acc, b) => acc + (b.category !== "break" ? getBlockMinutes(b) : 0),
            0,
          ),
          persisted: true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load saved plans.");
    }
  }, [date, plan, timeZone, hours]);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  const generate = async (event?: FormEvent) => {
    if (event) event.preventDefault();
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
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category],
    );
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deletePlan(deleteTarget.date);
      if (plan?.date === deleteTarget.date) {
        setPlan(null);
      }
      setDeleteTarget(null);
      await loadSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete the plan.");
    } finally {
      setDeleting(false);
    }
  };

  // Find tasks scheduled in the plan
  const scheduledTaskIds = new Set(plan?.blocks.map((b) => b.taskId).filter(Boolean));
  const unscheduledTasks = openTasks.filter((t) => !scheduledTaskIds.has(t.id));

  return (
    <div className="space-y-6">
      {/* Page Title & Planner Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Daily Planner</h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Algorithmic time-blocking based on task priority (90m, 60m, 45m) and available hours.
          </p>
        </div>

        {plan && (
          <div className="flex items-center gap-2">
            {plan.persisted ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                <Check className="h-4 w-4" /> Plan Saved to Database
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void save()}
                disabled={savingPlan}
                className="btn-primary text-xs py-2 px-4 shadow-sm"
              >
                {savingPlan ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                Save Plan
              </button>
            )}
          </div>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Interactive Top Control Bar matching desktop-daily-planner.jpg */}
      <div className="card p-5">
        <form onSubmit={generate} className="grid gap-5 md:grid-cols-4 items-center">
          {/* 1. Date Picker */}
          <div>
            <label className="label">Target Date</label>
            <input
              type="date"
              className="field font-semibold text-slate-800"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* 2. Available Hours Range Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Available Budget</label>
              <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                {hours} hrs
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={16}
              step={0.5}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
            />
          </div>

          {/* 3. Start Time Dropdown */}
          <div>
            <label className="label">Start Time</label>
            <select
              className="field font-semibold text-slate-800"
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
            >
              {START_TIMES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Generate Button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={generating}
              className="btn-primary w-full py-2.5 text-xs font-bold shadow-md"
            >
              {generating ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              Generate Daily Plan
            </button>
          </div>
        </form>

        {/* Focus Filter Pills */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400">Prioritize Categories:</span>
          {FOCUS_CATEGORIES.map((category) => (
            <button
              type="button"
              key={category}
              onClick={() => toggleFocus(category)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                focus.includes(category)
                  ? "bg-brand-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {CATEGORY_LABELS[category]}
            </button>
          ))}
          {focus.length > 0 && (
            <button
              type="button"
              onClick={() => setFocus([])}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 underline ml-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Split: Timeline vs Unscheduled Drawer */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Left Column: Visual Hourly Timeline */}
        <div className="space-y-4">
          {plan ? (
            <div className="card p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <CalendarClock className="h-4.5 w-4.5 text-brand-600" />
                    Scheduled Blocks ({plan.blocks.filter((b) => b.category !== "break").length})
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    ~{(plan.totalFocusMinutes / 60).toFixed(1)}h focus time allocated
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => generate()}
                  disabled={generating}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Re-shuffle
                </button>
              </div>

              {/* Hourly Time-Blocked Schedule Items */}
              <div className="space-y-3">
                {plan.blocks.map((block, idx) => {
                  const isBreak = block.category === "break";

                  // Color styles matching desktop-daily-planner.jpg
                  let blockStyle = "border-l-4 border-l-blue-500 bg-blue-50/50 text-blue-950 border-blue-100";
                  let badgeStyle = "bg-blue-100 text-blue-800";
                  let priorityLabel = "Medium Priority";

                  const duration = getBlockMinutes(block);

                  if (duration >= 90) {
                    blockStyle = "border-l-4 border-l-rose-500 bg-rose-50/50 text-rose-950 border-rose-100";
                    badgeStyle = "bg-rose-100 text-rose-800";
                    priorityLabel = "Urgent";
                  } else if (duration >= 60) {
                    blockStyle = "border-l-4 border-l-amber-500 bg-amber-50/50 text-amber-950 border-amber-100";
                    badgeStyle = "bg-amber-100 text-amber-800";
                    priorityLabel = "High-Priority";
                  } else if (isBreak) {
                    return (
                      <div
                        key={`${block.startTime}-${idx}`}
                        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-2 px-3 text-xs font-semibold text-slate-400"
                      >
                        <Coffee className="h-3.5 w-3.5" />
                        <span>Scheduled break: {duration}m ({block.startTime} – {block.endTime})</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`${block.startTime}-${idx}`}
                      className={`rounded-2xl border p-4 transition-all hover:shadow-xs ${blockStyle}`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {block.startTime} – {block.endTime}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                            {priorityLabel} ({duration}m)
                          </span>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 tracking-tight">{block.title}</h3>

                      {block.rationale && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{block.rationale}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center">
              <CalendarClock className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h2 className="text-base font-bold text-slate-800">No Plan Generated Yet</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Set your available hours and start time above, then click 'Generate Daily Plan' to let LifePilot construct an optimal schedule.
              </p>
              <button
                type="button"
                onClick={() => generate()}
                disabled={generating}
                className="btn-primary text-xs mt-4 py-2 px-4"
              >
                <Sparkles className="h-4 w-4" />
                Generate Plan Now
              </button>
            </div>
          )}

          {/* Saved History List */}
          {savedPlans.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Saved Plan History</h3>
              <div className="divide-y divide-slate-100">
                {savedPlans.map((sp) => (
                  <div key={sp.date} className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="font-bold text-xs text-slate-800">{sp.date}</span>
                      <span className="text-xs text-slate-400 ml-2">
                        {sp.blocks.filter((b) => b.category !== "break").length} focus blocks
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDate(sp.date);
                          setPlan({
                            date: sp.date,
                            timeZone,
                            availableHours: hours,
                            planId: sp.id,
                            unscheduled: [],
                            blocks: sp.blocks,
                            summary: sp.summary,
                            totalFocusMinutes: sp.blocks.reduce(
                              (acc, b) => acc + (b.category !== "break" ? getBlockMinutes(b) : 0),
                              0,
                            ),
                            persisted: true,
                          });
                        }}
                        className="btn-secondary text-[11px] py-1 px-2.5"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(sp)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        aria-label="Delete plan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Unscheduled Tasks Drawer matching desktop-daily-planner.jpg */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Unscheduled Tasks Drawer</h2>
                <p className="text-[11px] text-slate-400 font-medium">Open tasks ready for schedule</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                {unscheduledTasks.length}
              </span>
            </div>

            {unscheduledTasks.length > 0 ? (
              <div className="space-y-2.5">
                {unscheduledTasks.map((task) => {
                  const priorityBadge =
                    task.priority === "urgent"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : task.priority === "high"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-blue-50 text-blue-700 border-blue-200";

                  return (
                    <div
                      key={task.id}
                      className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition hover:border-slate-300"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-bold text-slate-900 leading-snug">{task.title}</h3>
                        <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${priorityBadge}`}>
                          {task.priority}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px]">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600 font-medium">
                          {CATEGORY_LABELS[task.category] ?? task.category}
                        </span>
                        {task.dueDate && (
                          <span className="text-slate-400 font-medium font-mono text-[10px]">
                            Due: {task.dueDate.slice(0, 10)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-400 mb-1.5" />
                No unscheduled overflow tasks!
              </div>
            )}
          </div>
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          open={true}
          title="Delete Saved Plan"
          message={`Permanently remove the daily plan saved for ${deleteTarget.date}?`}
          confirmLabel={deleting ? "Deleting..." : "Delete Plan"}
          danger={true}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}