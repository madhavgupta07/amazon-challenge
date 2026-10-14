import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorBanner, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type { PlanBlock, ProductivitySummary, SavedPlan, Task } from "../types";

function getBlockMinutes(block: PlanBlock): number {
  const [sh = 0, sm = 0] = block.startTime.split(":").map(Number);
  const [eh = 0, em = 0] = block.endTime.split(":").map(Number);
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone = "slate",
  progressPct,
  to,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: "brand" | "rose" | "emerald" | "amber" | "slate";
  progressPct?: number;
  to?: string;
}) {
  const tones = {
    brand: {
      bg: "bg-blue-50/80 text-blue-600 border-blue-100",
      bar: "bg-blue-600",
      pill: "bg-blue-50 text-blue-700",
    },
    rose: {
      bg: "bg-rose-50/80 text-rose-600 border-rose-100",
      bar: "bg-rose-600",
      pill: "bg-rose-50 text-rose-700",
    },
    emerald: {
      bg: "bg-emerald-50/80 text-emerald-600 border-emerald-100",
      bar: "bg-emerald-600",
      pill: "bg-emerald-50 text-emerald-700",
    },
    amber: {
      bg: "bg-amber-50/80 text-amber-600 border-amber-100",
      bar: "bg-amber-600",
      pill: "bg-amber-50 text-amber-700",
    },
    slate: {
      bg: "bg-slate-50 text-slate-600 border-slate-100",
      bar: "bg-slate-600",
      pill: "bg-slate-100 text-slate-700",
    },
  };

  const currentTone = tones[tone];

  const content = (
    <div className="card p-5 group hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        {to ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition">
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        ) : (
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${currentTone.bg}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
      </div>

      {progressPct !== undefined ? (
        <div className="mt-3.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${currentTone.bar} transition-all duration-500`}
            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
          />
        </div>
      ) : null}
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const timeZone = user?.preferences.timeZone ?? "UTC";

  const [today, setToday] = useState<{
    date: string;
    dueTodayCount: number;
    overdueCount: number;
    tasks: Task[];
  } | null>(null);
  const [summary, setSummary] = useState<ProductivitySummary | null>(null);
  const [todayPlan, setTodayPlan] = useState<SavedPlan | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [todayResult, summaryResult] = await Promise.all([
          api.todayTasks(timeZone),
          api.getSummary("week"),
        ]);
        setToday(todayResult);
        setSummary(summaryResult.summary);

        // Fetch plan for today if available
        try {
          const planData = await api.getPlan(todayResult.date);
          setTodayPlan(planData.plan);
        } catch {
          // Non-fatal if no saved plan yet
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load your dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, [timeZone]);

  const handleToggleTask = async (task: Task) => {
    if (task.status === "completed") return;
    setCompletingId(task.id);
    try {
      await api.completeTask(task.id);
      // Optimistic update
      setToday((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === task.id ? { ...t, status: "completed" as const, completedAt: new Date().toISOString() } : t,
              ),
              dueTodayCount: Math.max(0, prev.dueTodayCount - 1),
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete task.");
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center text-slate-400">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  // Calculate planned focus hours from today's plan
  const focusMinutes = todayPlan?.blocks.reduce((acc, b) => acc + (b.category !== "break" ? getBlockMinutes(b) : 0), 0) ?? 0;
  const plannedHours = focusMinutes > 0 ? (focusMinutes / 60).toFixed(1) + "h" : "0.0h";

  return (
    <div className="space-y-7">
      {/* Top Greeting Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome back, {user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Here's your day at a glance. Backed by real records & tools.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/planner" className="btn-secondary text-xs font-semibold py-2">
            <CalendarClock className="h-4 w-4" />
            Daily Planner
          </Link>
          <Link to="/assistant" className="btn-primary text-xs font-semibold py-2">
            <Sparkles className="h-4 w-4" />
            Ask LifePilot
          </Link>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={CalendarClock}
          label="Due Today"
          value={today?.dueTodayCount ?? 0}
          tone="brand"
          progressPct={today?.dueTodayCount ? Math.min(100, (today.dueTodayCount / 8) * 100) : 0}
          to="/tasks"
        />
        <MetricCard
          icon={AlertCircle}
          label="Overdue"
          value={today?.overdueCount ?? 0}
          tone="rose"
          progressPct={today?.overdueCount ? 100 : 0}
          to="/tasks"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Weekly Completion"
          value={`${summary?.completionRatePct ?? 0}%`}
          tone="emerald"
          progressPct={summary?.completionRatePct ?? 0}
          to="/insights"
        />
        <MetricCard
          icon={Clock}
          label="Planned Focus"
          value={plannedHours}
          tone="amber"
          progressPct={focusMinutes ? Math.min(100, (focusMinutes / 360) * 100) : 0}
          to="/planner"
        />
      </div>

      {/* Main 2-Column Schedule + Tasks Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left Column: Today's Focus Schedule */}
        <section className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Today's Focus Schedule</h2>
                  <p className="text-xs text-slate-500 font-medium">Time-blocked algorithmic plan</p>
                </div>
              </div>
              <Link to="/planner" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                Planner <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Blocks Timeline Display */}
            {todayPlan && todayPlan.blocks.length > 0 ? (
              <div className="space-y-2.5">
                {todayPlan.blocks.map((block: PlanBlock, idx: number) => {
                  const isBreak = block.category === "break";
                  const blockMinutes = getBlockMinutes(block);
                  const blockColor =
                    blockMinutes >= 90
                      ? "border-l-rose-500 bg-rose-50/40 text-rose-950"
                      : blockMinutes >= 60
                        ? "border-l-amber-500 bg-amber-50/40 text-amber-950"
                        : isBreak
                          ? "border-l-slate-300 bg-slate-50/70 text-slate-500 border-dashed"
                          : "border-l-blue-500 bg-blue-50/40 text-blue-950";

                  return (
                    <div
                      key={`${block.startTime}-${idx}`}
                      className={`flex items-center justify-between gap-3 rounded-xl border border-slate-100 border-l-4 p-3 text-xs font-semibold ${blockColor}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-[11px] opacity-75 shrink-0">
                          {block.startTime} – {block.endTime}
                        </span>
                        <span className="truncate">{block.title}</span>
                      </div>
                      <span className="shrink-0 rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200/50">
                        {blockMinutes}m
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center my-4">
                <CalendarClock className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No time-blocked schedule saved for today</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  LifePilot can assemble an optimal schedule sized by your task priority & hours available.
                </p>
                <button
                  onClick={() => navigate("/planner")}
                  className="btn-primary text-xs mt-4 py-2 px-4"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Day Plan
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Start: 09:00 AM · Available: {plannedHours}</span>
            <Link to="/planner" className="font-semibold text-brand-600 hover:underline">
              Adjust Plan →
            </Link>
          </div>
        </section>

        {/* Right Column: Priority Tasks Checklist */}
        <section className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Priority Tasks</h2>
                  <p className="text-xs text-slate-500 font-medium">{today?.tasks.length ?? 0} active today</p>
                </div>
              </div>
              <Link to="/tasks" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Task Checklist Rows */}
            {today && today.tasks.length > 0 ? (
              <div className="space-y-2">
                {today.tasks.slice(0, 7).map((task) => {
                  const isDone = task.status === "completed";
                  const isBusy = completingId === task.id;

                  const priorityTone =
                    task.priority === "urgent"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : task.priority === "high"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-blue-50 text-blue-700 border-blue-200";

                  return (
                    <div
                      key={task.id}
                      className={`group flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-2.5 transition-all hover:bg-slate-50/80 ${
                        isDone ? "opacity-60 bg-slate-50/50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task)}
                          disabled={isDone || isBusy}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                            isDone
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 hover:border-brand-500 bg-white"
                          }`}
                        >
                          {isDone ? <Check className="h-3.5 w-3.5" /> : null}
                        </button>
                        <span className={`text-xs font-semibold truncate text-slate-800 ${isDone ? "line-through text-slate-400" : ""}`}>
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${priorityTone}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-slate-400">All caught up! No open tasks due today.</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <Link to="/tasks" className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Task
            </Link>
            <span className="text-[11px] text-slate-400 font-medium">Synced with MongoDB</span>
          </div>
        </section>
      </div>

      {/* Recently Completed Activity Feed */}
      {summary && summary.recentlyCompleted.length > 0 && (
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Recently Completed</h3>
            <Link to="/insights" className="text-xs font-bold text-brand-600 hover:underline">
              Insights →
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {summary.recentlyCompleted.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 rounded-xl bg-slate-50/70 p-2.5 border border-slate-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-xs font-medium text-slate-700 truncate">{item.title}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}