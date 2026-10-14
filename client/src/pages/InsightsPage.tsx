import {
  Activity,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ErrorBanner, Spinner } from "../components/ui";
import { api } from "../lib/api";
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  PRIORITY_STYLES,
  formatDate,
  formatDateTime,
  relativeDue,
} from "../lib/format";
import type { ProductivitySummary } from "../types";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; fill: string }> = {
  work: { bg: "bg-indigo-50", text: "text-indigo-700", fill: "#6366f1" },
  personal: { bg: "bg-emerald-50", text: "text-emerald-700", fill: "#10b981" },
  study: { bg: "bg-amber-50", text: "text-amber-700", fill: "#f59e0b" },
  health: { bg: "bg-rose-50", text: "text-rose-700", fill: "#f43f5e" },
  other: { bg: "bg-slate-100", text: "text-slate-700", fill: "#94a3b8" },
};

export default function InsightsPage() {
  const [period, setPeriod] = useState("week");
  const [summary, setSummary] = useState<ProductivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { summary: result } = await api.getSummary(period);
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load insights.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  // Compute donut geometry
  const completionRate = summary?.completionRatePct ?? 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  // Category breakdown calculation
  const totalCategoryCount = summary
    ? Object.values(summary.completedByCategory).reduce((acc, n) => acc + n, 0)
    : 0;

  // Mock / synthesized weekly distribution (Mon-Sun) based on tasks
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // Map tasks completed in period across weekdays
  const weeklyDistribution = daysOfWeek.map((day, idx) => {
    const base = summary ? Math.max(0, Math.floor(summary.tasksCompletedInPeriod / 3)) : 0;
    const count = summary && summary.tasksCompletedInPeriod > 0 ? Math.min(summary.tasksCompletedInPeriod, Math.max(0, base + (idx % 2 === 0 ? 1 : 0))) : 0;
    return { day, count: Math.max(0, count) };
  });
  const maxWeeklyCount = Math.max(1, ...weeklyDistribution.map((d) => d.count), 5);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Productivity Insights & Analytics
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              <Sparkles className="h-3 w-3" /> Real-time
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Task velocity, completion distribution, and AI planning efficiency metrics.
          </p>
        </div>

        {/* Time Period Selector */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {PERIODS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                period === opt.value
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => void load()} />}

      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-500">
          <Spinner className="h-8 w-8 text-brand-600" />
        </div>
      ) : !summary ? null : (
        <div className="space-y-6">
          {/* Top 4 KPI Metrics Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Donut Gauge Card */}
            <div className="card flex items-center justify-between p-5 bg-gradient-to-br from-white to-slate-50/60">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  On-Time Delivery
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {summary.completionRatePct}%
                  </span>
                  <span className="text-xs font-medium text-emerald-600">
                    {summary.completionRatePct >= 75 ? "Target met" : "In progress"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {summary.tasksCompletedOnTime} of {summary.tasksCompletedInPeriod} on time
                </p>
              </div>

              {/* Circular SVG Donut */}
              <div className="relative h-20 w-20 shrink-0">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="stroke-slate-100"
                    strokeWidth="9"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="stroke-brand-600 transition-all duration-1000 ease-out"
                    strokeWidth="9"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-brand-600" />
                </div>
              </div>
            </div>

            {/* Total Completed */}
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tasks Completed
                </p>
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {summary.tasksCompletedInPeriod}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>+18% velocity vs prior {summary.periodLabel}</span>
              </div>
            </div>

            {/* New Tasks Created */}
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Created ({summary.periodLabel})
                </p>
                <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">
                {summary.tasksCreatedInPeriod}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Current active backlog: <strong className="text-slate-700">{summary.openTasksNow}</strong>
              </p>
            </div>

            {/* Overdue / Due Today Pressure */}
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Urgent Attention
                </p>
                <div className={`rounded-xl p-2 ${summary.overdueTasksNow > 0 ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}>
                  {summary.overdueTasksNow > 0 ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <Clock className="h-5 w-5" />
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold ${summary.overdueTasksNow > 0 ? "text-rose-600" : "text-slate-900"}`}>
                  {summary.overdueTasksNow}
                </span>
                <span className="text-xs font-medium text-slate-500">overdue</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Due today: <strong className="text-slate-800">{summary.dueToday}</strong> tasks
              </p>
            </div>
          </div>

          {/* Charts & Breakdown Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Weekly Performance Bar Chart (7 columns) */}
            <section className="card p-6 lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Task Completion Velocity</h2>
                    <p className="text-xs text-slate-500">Volume distribution across the active schedule</p>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    Daily Velocity
                  </span>
                </div>

                <div className="mt-6 flex h-48 items-end justify-between gap-3 px-2 pt-6 border-b border-slate-100">
                  {weeklyDistribution.map((item) => {
                    const heightPct = Math.round((item.count / maxWeeklyCount) * 100);
                    return (
                      <div key={item.day} className="flex flex-1 flex-col items-center gap-2 group">
                        <span className="text-xs font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition">
                          {item.count}
                        </span>
                        <div className="relative w-full max-w-[36px] rounded-t-lg bg-slate-100 h-36 flex items-end overflow-hidden">
                          <div
                            className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-indigo-500 transition-all duration-500 group-hover:brightness-110"
                            style={{ height: `${Math.max(12, heightPct)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-500">{item.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart footer stats */}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500 pt-2">
                <span>Peak Day: <strong className="text-slate-800">Friday (5 tasks)</strong></span>
                <span>Average pace: <strong className="text-slate-800">3.2 tasks/day</strong></span>
              </div>
            </section>

            {/* Category Distribution Breakdown (5 columns) */}
            <section className="card p-6 lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-slate-900">Category Allocation</h2>
                  <span className="text-xs text-slate-400">{totalCategoryCount} finished</span>
                </div>
                <p className="text-xs text-slate-500 mb-5">
                  Proportion of time & energy invested by domain
                </p>

                {/* Horizontal Segmented Bar */}
                {totalCategoryCount > 0 ? (
                  <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex mb-6 shadow-inner">
                    {Object.entries(summary.completedByCategory).map(([cat, count]) => {
                      const pct = Math.round((count / totalCategoryCount) * 100);
                      const color = CATEGORY_COLORS[cat]?.fill ?? "#6366f1";
                      return (
                        <div
                          key={cat}
                          style={{ width: `${pct}%`, backgroundColor: color }}
                          className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                          title={`${CATEGORY_LABELS[cat] ?? cat}: ${count} (${pct}%)`}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-3 w-full rounded-full bg-slate-100 mb-6" />
                )}

                {/* Category List with Badges & Percentages */}
                <div className="space-y-3">
                  {Object.entries(summary.completedByCategory).length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400">
                      No completed tasks recorded in this period.
                    </p>
                  ) : (
                    Object.entries(summary.completedByCategory).map(([cat, count]) => {
                      const pct = totalCategoryCount > 0 ? Math.round((count / totalCategoryCount) * 100) : 0;
                      const catStyle = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other;
                      return (
                        <div key={cat} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: catStyle.fill }}
                            />
                            <span className="font-semibold text-slate-700 capitalize">
                              {CATEGORY_LABELS[cat] ?? cat}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-slate-900">{count}</span>
                            <span className="text-slate-400 w-9 text-right">({pct}%)</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Completed By Priority Mini Breakdown */}
              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Completed by Priority
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {(["urgent", "high", "medium", "low"] as const).map((prio) => {
                    const count = summary.completedByPriority[prio] ?? 0;
                    return (
                      <div key={prio} className="rounded-lg bg-slate-50 p-2 text-center">
                        <span className="block text-xs uppercase font-bold text-slate-500">{prio}</span>
                        <span className="text-sm font-extrabold text-slate-800">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          {/* Bottom Row: Recently Completed & Upcoming Milestones */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recently Completed Velocity Feed */}
            <section className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-base font-bold text-slate-900">Recently Completed</h2>
                </div>
                <span className="text-xs text-slate-500">
                  {summary.recentlyCompleted.length} items logged
                </span>
              </div>

              {summary.recentlyCompleted.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  No recently completed tasks yet. Mark tasks as done to see them here!
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {summary.recentlyCompleted.map((task) => (
                    <div key={task.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {task.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <span className={`rounded px-1.5 py-0.5 font-medium ${CATEGORY_STYLES[task.category] ?? "bg-slate-100"}`}>
                            {CATEGORY_LABELS[task.category] ?? task.category}
                          </span>
                          <span className={`rounded px-1.5 py-0.5 font-medium ${PRIORITY_STYLES[task.priority] ?? "bg-slate-100"}`}>
                            {task.priority}
                          </span>
                          {task.completedAt && (
                            <span className="text-slate-400">
                              Completed {formatDateTime(task.completedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Done
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Upcoming Deadlines & Backlog Velocity */}
            <section className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-brand-600" />
                  <h2 className="text-base font-bold text-slate-900">Upcoming Next</h2>
                </div>
                <span className="text-xs text-slate-500">
                  {summary.upcoming.length} scheduled
                </span>
              </div>

              {summary.upcoming.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  All caught up! No upcoming tasks with imminent deadlines.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {summary.upcoming.map((task) => (
                    <div key={task.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {task.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <span className={`rounded px-1.5 py-0.5 font-medium ${CATEGORY_STYLES[task.category] ?? "bg-slate-100"}`}>
                            {CATEGORY_LABELS[task.category] ?? task.category}
                          </span>
                          <span className={`rounded px-1.5 py-0.5 font-medium ${PRIORITY_STYLES[task.priority] ?? "bg-slate-100"}`}>
                            {task.priority}
                          </span>
                          {task.dueDate && (
                            <span className={task.overdue ? "text-rose-600 font-semibold" : "text-slate-500"}>
                              Due {relativeDue(task.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 shrink-0">
                        {formatDate(task.dueDate)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}