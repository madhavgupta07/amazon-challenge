import { TASK_PRIORITIES } from "../constants.js";
import { TaskModel } from "../models/Task.js";
import type { GetProductivitySummaryInput } from "../tools/schemas.js";
import { serializeTask } from "../utils/serialize.js";
import { dateInTimeZone, dayRangeUtc, monthRangeUtc, weekRangeUtc } from "../utils/time.js";

function resolveRange(
  input: GetProductivitySummaryInput,
  timeZone: string,
  now: Date,
): { start: Date | null; end: Date | null; label: string } {
  switch (input.period) {
    case "today": {
      const { start, end } = dayRangeUtc(dateInTimeZone(now, timeZone), timeZone);
      return { start, end, label: `today (${dateInTimeZone(now, timeZone)})` };
    }
    case "week": {
      const { start, end } = weekRangeUtc(now, timeZone);
      return { start, end, label: "this week" };
    }
    case "month": {
      const { start, end } = monthRangeUtc(now, timeZone);
      return { start, end, label: "this month" };
    }
    case "custom": {
      const start = input.startDate ? new Date(input.startDate) : null;
      const end = input.endDate ? new Date(input.endDate) : now;
      return { start, end, label: "custom range" };
    }
    case "all":
    default:
      return { start: null, end: null, label: "all time" };
  }
}

export async function computeProductivitySummary(
  userId: string,
  input: GetProductivitySummaryInput = {},
  now = new Date(),
) {
  const timeZone = input.timeZone ?? "UTC";
  const { start, end, label } = resolveRange(input, timeZone, now);

  const completedFilter: Record<string, unknown> = { user: userId, status: "completed" };
  if (start || end) {
    completedFilter.completedAt = {
      ...(start ? { $gte: start } : {}),
      ...(end ? { $lte: end } : {}),
    };
  } else {
    completedFilter.completedAt = { $ne: null };
  }

  const createdFilter: Record<string, unknown> = { user: userId };
  if (start || end) {
    createdFilter.createdAt = {
      ...(start ? { $gte: start } : {}),
      ...(end ? { $lte: end } : {}),
    };
  }

  const openStatusFilter = { $in: ["pending", "in_progress"] };
  const todayRange = dayRangeUtc(dateInTimeZone(now, timeZone), timeZone);

  const [
    completedInPeriod,
    createdInPeriod,
    openNow,
    overdueNow,
    dueToday,
    byCategory,
    byPriority,
    completedOnTime,
    recentCompleted,
    upcoming,
  ] = await Promise.all([
    TaskModel.countDocuments(completedFilter),
    TaskModel.countDocuments(createdFilter),
    TaskModel.countDocuments({ user: userId, status: openStatusFilter }),
    TaskModel.countDocuments({
      user: userId,
      status: openStatusFilter,
      dueDate: { $lt: now, $ne: null },
    }),
    TaskModel.countDocuments({
      user: userId,
      status: openStatusFilter,
      dueDate: { $gte: todayRange.start, $lt: todayRange.end },
    }),
    TaskModel.aggregate([
      { $match: completedFilter },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    TaskModel.aggregate([
      { $match: completedFilter },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),
    TaskModel.countDocuments({
      ...completedFilter,
      dueDate: { $ne: null },
      $expr: { $lte: ["$completedAt", "$dueDate"] },
    }),
    TaskModel.find(completedFilter).sort({ completedAt: -1 }).limit(5).lean(),
    TaskModel.find({
      user: userId,
      status: openStatusFilter,
      dueDate: { $gte: now, $ne: null },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .lean(),
  ]);

  const completionRatePct =
    createdInPeriod > 0
      ? Math.round((completedInPeriod / createdInPeriod) * 1000) / 10
      : completedInPeriod > 0
        ? 100
        : 0;

  const completedByCategory = Object.fromEntries(
    (byCategory as { _id: string; count: number }[]).map((entry) => [entry._id, entry.count]),
  );
  const completedByPriority: Record<string, number> = Object.fromEntries(
    TASK_PRIORITIES.map((priority) => [priority, 0]),
  );
  for (const entry of byPriority as { _id: string; count: number }[]) {
    completedByPriority[entry._id] = entry.count;
  }

  return {
    period: input.period ?? "week",
    periodLabel: label,
    rangeStart: start ? start.toISOString() : null,
    rangeEnd: end ? end.toISOString() : null,
    timeZone,
    tasksCreatedInPeriod: createdInPeriod,
    tasksCompletedInPeriod: completedInPeriod,
    tasksCompletedOnTime: completedOnTime,
    completionRatePct,
    openTasksNow: openNow,
    overdueTasksNow: overdueNow,
    dueToday,
    completedByCategory,
    completedByPriority,
    recentlyCompleted: (recentCompleted as any[]).map(serializeTask),
    upcoming: (upcoming as any[]).map(serializeTask),
  };
}

export type ProductivitySummary = Awaited<ReturnType<typeof computeProductivitySummary>>;
