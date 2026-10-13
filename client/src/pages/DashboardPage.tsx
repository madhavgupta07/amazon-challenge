import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorBanner, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type { ProductivitySummary, Task } from "../types";

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "slate",
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: "slate" | "brand" | "rose" | "emerald" | "amber";
  hint?: string;
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    brand: "bg-brand-50 text-brand-600",
    rose: "bg-rose-50 text-rose-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="card flex items-start gap-3 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const timeZone = user?.preferences.timeZone ?? "UTC";
  const [today, setToday] = useState<{
    date: string;
    dueTodayCount: number;
    overdueCount: number;
    tasks: Task[];
  } | null>(null);
  const [summary, setSummary] = useState<ProductivitySummary | null>(null);
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load your dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, [timeZone]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-slate-500">
            Here's your day at a glance. Plan it in seconds with the assistant.
          </p>
        </div>
        <Link to="/assistant" className="btn-primary">
          <Sparkles className="h-4 w-4" />
          Ask your agent
        </Link>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={CalendarClock}
          label="Due today"
          value={today?.dueTodayCount ?? 0}
          tone="brand"
        />
        <StatCard
          icon={AlertCircle}
          label="Overdue"
          value={summary?.overdueTasksNow ?? 0}
          tone="rose"
        />
        <StatCard
          icon={ClipboardList}
          label="Open tasks"
          value={summary?.openTasksNow ?? 0}
          tone="amber"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed this week"
          value={summary?.tasksCompletedInPeriod ?? 0}
          tone="emerald"
          hint={summary ? `${summary.completionRatePct}% of created on time` : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-slate-800">
              <Target className="h-4 w-4 text-brand-600" />
              Today's focus
            </h2>
            <Link to="/tasks" className="text-sm font-medium text-brand-600 hover:underline">
              All tasks
            </Link>
          </div>
          {today && today.tasks.length > 0 ? (
            <ul className="space-y-2">
              {today.tasks.slice(0, 6).map((task) => (
                <li key={task.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      task.overdue ? "bg-rose-500" : "bg-brand-500"
                    }`}
                  />
                  <span className="truncate">{task.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">
              Nothing scheduled today. Ask the assistant to plan your day.
            </p>
          )}
          <Link
            to="/assistant"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
          >
            Plan your day <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-slate-800">
              <CheckCircle2 className="h-4 w-4 text-brand-600" />
              Recently completed
            </h2>
            <Link to="/insights" className="text-sm font-medium text-brand-600 hover:underline">
              Insights
            </Link>
          </div>
          {summary && summary.recentlyCompleted.length > 0 ? (
            <ul className="space-y-2">
              {summary.recentlyCompleted.slice(0, 6).map((task) => (
                <li key={task.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="truncate">{task.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">
              No completions yet this week. Go get some wins!
            </p>
          )}
        </section>
      </div>
    </div>
  );
}