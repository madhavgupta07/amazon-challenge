import { BarChart3, CheckCircle2, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ErrorBanner, Spinner } from "../components/ui";
import { api } from "../lib/api";
import { CATEGORY_LABELS, CATEGORY_STYLES, formatDate } from "../lib/format";
import type { ProductivitySummary } from "../types";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

function Bar({ label, value, max, style }: { label: string; value: number; max: number; style?: string }) {
  const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className={`rounded px-1.5 text-xs font-medium ${style ?? "bg-slate-100 text-slate-600"}`}>
          {label}
        </span>
        <span className="font-medium text-slate-600">{value}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-brand-500 transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

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

  const categoryMax = Math.max(1, ...Object.values(summary?.completedByCategory ?? {}));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Insights</h1>
          <p className="text-sm text-slate-500">Your productivity at a glance.</p>
        </div>
        <select className="field w-auto" value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIODS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex h-48 items-center justify-center text-slate-500">
          <Spinner className="h-6 w-6" />
        </div>
      ) : !summary ? null : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="card flex items-center gap-3 p-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-slate-800">{summary.tasksCompletedInPeriod}</p>
                <p className="text-sm text-slate-500">Completed {summary.periodLabel}</p>
              </div>
            </div>
            <div className="card flex items-center gap-3 p-4">
              <TrendingUp className="h-6 w-6 text-brand-500" />
              <div>
                <p className="text-2xl font-bold text-slate-800">{summary.completionRatePct}%</p>
                <p className="text-sm text-slate-500">Completion rate</p>
              </div>
            </div>
            <div className="card flex items-center gap-3 p-4">
              <CheckCircle2 className="h-6 w-6 text-sky-500" />
              <div>
                <p className="text-2xl font-bold text-slate-800">{summary.tasksCompletedOnTime}</p>
                <p className="text-sm text-slate-500">Done on time</p>
              </div>
            </div>
            <div className="card flex items-center gap-3 p-4">
              <BarChart3 className="h-6 w-6 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-slate-800">{summary.tasksCreatedInPeriod}</p>
                <p className="text-sm text-slate-500">Created {summary.periodLabel}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-4 font-semibold text-slate-800">Completed by category</h2>
              {Object.keys(summary.completedByCategory).length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">No completions in this period.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(summary.completedByCategory).map(([category, count]) => (
                    <Bar
                      key={category}
                      label={CATEGORY_LABELS[category] ?? category}
                      value={count}
                      max={categoryMax}
                      style={CATEGORY_STYLES[category]}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="card p-5">
              <h2 className="mb-4 font-semibold text-slate-800">Completed by priority</h2>
              <div className="space-y-4">
                {Object.entries(summary.completedByPriority).map(([priority, count]) => (
                  <Bar
                    key={priority}
                    label={priority}
                    value={count}
                    max={Math.max(1, ...Object.values(summary.completedByPriority))}
                  />
                ))}
              </div>
            </section>
          </div>

          {summary.upcoming.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 font-semibold text-slate-800">Next up</h2>
              <ul className="space-y-2">
                {summary.upcoming.map((task) => (
                  <li key={task.id} className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium text-slate-700">{task.title}</span>
                    <span className="ml-3 shrink-0 text-slate-400">{formatDate(task.dueDate)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}