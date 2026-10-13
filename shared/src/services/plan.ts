import { DailyPlanModel } from "../models/DailyPlan.js";
import { TaskModel } from "../models/Task.js";
import { UserModel } from "../models/User.js";
import type { CreateDailyPlanInput } from "../tools/schemas.js";
import { serializePlan, serializeTask, sortTasks } from "../utils/serialize.js";
import { dateInTimeZone, dayRangeUtc } from "../utils/time.js";

const DURATION_MINUTES: Record<string, number> = {
  urgent: 90,
  high: 60,
  medium: 45,
  low: 30,
};

function minutesToHHMM(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function buildDailyPlan(userId: string, input: CreateDailyPlanInput = {}) {
  const user = await UserModel.findById(userId).lean();
  const prefs = (user?.preferences ?? {}) as {
    timeZone?: string;
    dailyAvailableHours?: number;
    workStartHour?: number;
    workEndHour?: number;
  };
  const timeZone = input.timeZone ?? prefs.timeZone ?? "UTC";
  const date = input.date ?? dateInTimeZone(new Date(), timeZone);
  const { start, end } = dayRangeUtc(date, timeZone);
  const availableHours = input.availableHours ?? prefs.dailyAvailableHours ?? 6;
  const workStartMinute = (prefs.workStartHour ?? 9) * 60;

  const candidates = await TaskModel.find({
    user: userId,
    status: { $in: ["pending", "in_progress"] },
    $or: [
      { dueDate: { $lt: end, $ne: null } },
      { priority: { $in: ["high", "urgent"] } },
      { dueDate: null },
    ],
  })
    .limit(60)
    .lean();

  const focusSet = input.focusCategories?.length ? new Set(input.focusCategories) : null;
  const eligible = (candidates as any[]).filter((task) => !focusSet || focusSet.has(task.category));
  const ordered = sortTasks(eligible);

  const now = Date.now();
  const budget = Math.round(availableHours * 60);
  let used = 0;
  let cursor = workStartMinute;
  const blocks: Record<string, unknown>[] = [];
  const scheduled: string[] = [];
  let focusBlocks = 0;

  for (const task of ordered) {
    const duration = DURATION_MINUTES[task.priority] ?? 45;
    if (used + duration > budget) break;
    const overdue = task.dueDate ? new Date(task.dueDate).getTime() < now : false;
    blocks.push({
      startTime: minutesToHHMM(cursor),
      endTime: minutesToHHMM(cursor + duration),
      title: task.title,
      taskId: task._id,
      category: task.category,
      priority: task.priority,
      rationale: overdue
        ? "Overdue — highest urgency, schedule first."
        : task.priority === "urgent" || task.priority === "high"
          ? "High priority — needs a focused block."
          : "Open task — fit around higher-priority work.",
      status: "planned",
    });
    scheduled.push(String(task._id));
    used += duration;
    cursor += duration;
    focusBlocks += 1;
    if (focusBlocks % 2 === 0 && used < budget) {
      blocks.push({
        startTime: minutesToHHMM(cursor),
        endTime: minutesToHHMM(cursor + 15),
        title: "Break",
        taskId: null,
        category: "break",
        priority: null,
        rationale: "Short recovery break between focus blocks.",
        status: "planned",
      });
      cursor += 15;
    }
  }

  const unscheduled = (ordered as any[])
    .filter((task) => !scheduled.includes(String(task._id)))
    .map(serializeTask);

  const summary =
    blocks.length === 0
      ? `No open tasks found for ${date}; nothing to schedule.`
      : `Proposed ${focusBlocks} focus block(s) (~${(used / 60).toFixed(1)}h) for ${date}, ordered by overdue status and priority.`;

  let persisted = false;
  let planId: string | null = null;
  if (input.save === true) {
    const plan = await DailyPlanModel.findOneAndUpdate(
      { user: userId, date },
      { $set: { summary, blocks, saved: true, generatedBy: "agent" } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    persisted = true;
    planId = String(plan._id);
  }

  return {
    date,
    timeZone,
    availableHours,
    totalFocusMinutes: used,
    persisted,
    planId,
    blocks,
    unscheduled,
    summary,
  };
}

export async function getPlanByDate(userId: string, date: string) {
  const plan = await DailyPlanModel.findOne({ user: userId, date }).lean();
  return plan ? serializePlan(plan) : null;
}

export async function listPlanRecords(userId: string, limit = 30) {
  const plans = await DailyPlanModel.find({ user: userId, saved: true })
    .sort({ date: -1 })
    .limit(limit)
    .lean();
  return plans.map(serializePlan);
}

export async function savePlanRecord(
  userId: string,
  date: string,
  payload: { summary?: string; blocks?: unknown[]; generatedBy?: "agent" | "user" | "mock" },
) {
  const set: Record<string, unknown> = { saved: true };
  if (payload.summary !== undefined) set.summary = payload.summary;
  if (payload.blocks !== undefined) set.blocks = payload.blocks;
  if (payload.generatedBy) set.generatedBy = payload.generatedBy;
  const plan = await DailyPlanModel.findOneAndUpdate(
    { user: userId, date },
    { $set: set },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();
  return serializePlan(plan);
}

export async function deletePlanRecord(userId: string, date: string) {
  const plan = await DailyPlanModel.findOneAndDelete({ user: userId, date }).lean();
  return plan ? serializePlan(plan) : null;
}
