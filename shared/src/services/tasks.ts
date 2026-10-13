import { TaskModel } from "../models/Task.js";
import type {
  CreateTaskInput,
  GetTodayTasksInput,
  ListTasksInput,
  UpdateTaskInput,
} from "../tools/schemas.js";
import { escapeRegex } from "../utils/strings.js";
import { serializeTask, sortTasks } from "../utils/serialize.js";
import { dateInTimeZone, dayRangeUtc } from "../utils/time.js";

export interface ListTaskFilter {
  status?: ListTasksInput["status"];
  category?: ListTasksInput["category"];
  priority?: ListTasksInput["priority"];
  search?: string;
  dueBefore?: string;
  dueAfter?: string;
  includeCompleted?: boolean;
  limit?: number;
}

export async function createTaskRecord(
  userId: string,
  input: CreateTaskInput,
  source: "manual" | "agent" = "manual",
) {
  const task = await TaskModel.create({
    user: userId,
    title: input.title,
    description: input.description ?? "",
    category: input.category ?? "other",
    priority: input.priority ?? "medium",
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    tags: input.tags ?? [],
    source,
  });
  return serializeTask(task.toObject());
}

export async function listTaskRecords(userId: string, input: ListTaskFilter = {}) {
  const filter: Record<string, unknown> = { user: userId };

  if (input.status === "open") filter.status = { $in: ["pending", "in_progress"] };
  else if (input.status && input.status !== "all") filter.status = input.status;
  else if (input.includeCompleted === false) filter.status = { $in: ["pending", "in_progress"] };

  if (input.category && input.category !== "all") filter.category = input.category;
  if (input.priority && input.priority !== "all") filter.priority = input.priority;

  if (input.search) {
    const rx = new RegExp(escapeRegex(input.search), "i");
    filter.$or = [{ title: rx }, { description: rx }, { tags: rx }];
  }

  const due: Record<string, Date> = {};
  if (input.dueBefore) due.$lt = new Date(input.dueBefore);
  if (input.dueAfter) due.$gte = new Date(input.dueAfter);
  if (Object.keys(due).length) filter.dueDate = due;

  const tasks = await TaskModel.find(filter).limit(input.limit ?? 50).lean();
  return sortTasks(tasks as unknown as any[]).map(serializeTask);
}

export async function getTodayTaskRecords(userId: string, input: GetTodayTasksInput = {}) {
  const timeZone = input.timeZone ?? "UTC";
  const date = input.date ?? dateInTimeZone(new Date(), timeZone);
  const { start, end } = dayRangeUtc(date, timeZone);
  const includeOverdue = input.includeOverdue ?? true;

  const openFilter = { user: userId, status: { $in: ["pending", "in_progress"] } };
  const dueToday = await TaskModel.find({ ...openFilter, dueDate: { $gte: start, $lt: end } }).lean();
  const overdue = includeOverdue
    ? await TaskModel.find({ ...openFilter, dueDate: { $lt: start, $ne: null } }).lean()
    : [];

  const tasks = sortTasks([...(dueToday as any[]), ...(overdue as any[])]).map(serializeTask);
  return {
    date,
    timeZone,
    dueTodayCount: dueToday.length,
    overdueCount: overdue.length,
    tasks,
  };
}

export async function getTaskRecord(userId: string, taskId: string) {
  const task = await TaskModel.findOne({ _id: taskId, user: userId }).lean();
  return task ? serializeTask(task) : null;
}

export async function updateTaskRecord(userId: string, input: UpdateTaskInput) {
  const set: Record<string, unknown> = {};
  if (input.title !== undefined) set.title = input.title;
  if (input.description !== undefined) set.description = input.description;
  if (input.category !== undefined) set.category = input.category;
  if (input.priority !== undefined) set.priority = input.priority;
  if (input.status !== undefined) set.status = input.status;
  if (input.tags !== undefined) set.tags = input.tags;
  if (input.dueDate !== undefined) set.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  if (input.status === "completed") set.completedAt = new Date();
  else if (input.status !== undefined) set.completedAt = null;

  const task = await TaskModel.findOneAndUpdate(
    { _id: input.taskId, user: userId },
    { $set: set },
    { new: true },
  ).lean();
  return task ? { task: serializeTask(task), changes: Object.keys(set) } : null;
}

export async function completeTaskRecord(userId: string, taskId: string) {
  const task = await TaskModel.findOneAndUpdate(
    { _id: taskId, user: userId },
    { $set: { status: "completed", completedAt: new Date() } },
    { new: true },
  ).lean();
  return task ? serializeTask(task) : null;
}

export async function deleteTaskRecord(userId: string, taskId: string) {
  const task = await TaskModel.findOneAndDelete({ _id: taskId, user: userId }).lean();
  return task ? serializeTask(task) : null;
}

export interface TaskCounts {
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  dueToday: number;
  total: number;
}

export async function taskCounts(userId: string, timeZone = "UTC"): Promise<TaskCounts> {
  const now = new Date();
  const today = dayRangeUtc(dateInTimeZone(now, timeZone), timeZone);
  const [pending, inProgress, completed, overdue, dueToday, total] = await Promise.all([
    TaskModel.countDocuments({ user: userId, status: "pending" }),
    TaskModel.countDocuments({ user: userId, status: "in_progress" }),
    TaskModel.countDocuments({ user: userId, status: "completed" }),
    TaskModel.countDocuments({
      user: userId,
      status: { $in: ["pending", "in_progress"] },
      dueDate: { $lt: now, $ne: null },
    }),
    TaskModel.countDocuments({
      user: userId,
      status: { $in: ["pending", "in_progress"] },
      dueDate: { $gte: today.start, $lt: today.end },
    }),
    TaskModel.countDocuments({ user: userId }),
  ]);
  return { pending, inProgress, completed, overdue, dueToday, total };
}
