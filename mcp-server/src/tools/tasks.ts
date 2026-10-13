import {
  completeTaskInput,
  completeTaskRecord,
  createTaskInput,
  createTaskRecord,
  deleteTaskInput,
  deleteTaskRecord,
  getTodayTaskRecords,
  getTodayTasksInput,
  listTaskRecords,
  listTasksInput,
  updateTaskInput,
  updateTaskRecord,
} from "@lifepilot/shared";
import { ToolError } from "../errors.js";
import type { ToolContext, ToolHandlerResult } from "./types.js";

export async function createTask(args: unknown, ctx: ToolContext): Promise<ToolHandlerResult> {
  const input = createTaskInput.parse(args);
  const task = await createTaskRecord(ctx.userId, input, "agent");
  return {
    summary: `Created task "${task.title}"${task.dueDate ? ` due ${task.dueDate.slice(0, 10)}` : ""}.`,
    data: { task },
  };
}

export async function listTasks(args: unknown, ctx: ToolContext): Promise<ToolHandlerResult> {
  const input = listTasksInput.parse(args ?? {});
  const tasks = await listTaskRecords(ctx.userId, input);
  return {
    summary: `Found ${tasks.length} task${tasks.length === 1 ? "" : "s"}.`,
    data: { count: tasks.length, tasks },
  };
}

export async function getTodayTasks(args: unknown, ctx: ToolContext): Promise<ToolHandlerResult> {
  const input = getTodayTasksInput.parse(args ?? {});
  const data = await getTodayTaskRecords(ctx.userId, input);
  return {
    summary: `${data.dueTodayCount} task(s) due today and ${data.overdueCount} overdue for ${data.date}.`,
    data,
  };
}

export async function updateTask(args: unknown, ctx: ToolContext): Promise<ToolHandlerResult> {
  const input = updateTaskInput.parse(args);
  const result = await updateTaskRecord(ctx.userId, input);
  if (!result) throw new ToolError("NOT_FOUND", "Task not found");
  return {
    summary: `Updated task "${result.task.title}".`,
    data: { task: result.task, changes: result.changes },
  };
}

export async function completeTask(args: unknown, ctx: ToolContext): Promise<ToolHandlerResult> {
  const input = completeTaskInput.parse(args);
  const task = await completeTaskRecord(ctx.userId, input.taskId);
  if (!task) throw new ToolError("NOT_FOUND", "Task not found");
  return {
    summary: `Marked "${task.title}" as completed.`,
    data: { task, note: input.note ?? null },
  };
}

export async function deleteTask(args: unknown, ctx: ToolContext): Promise<ToolHandlerResult> {
  const input = deleteTaskInput.parse(args);
  if (input.confirm !== true) {
    throw new ToolError("CONFIRMATION_REQUIRED", "Deletion requires explicit confirmation");
  }
  const task = await deleteTaskRecord(ctx.userId, input.taskId);
  if (!task) throw new ToolError("NOT_FOUND", "Task not found");
  return { summary: `Deleted task "${task.title}".`, data: { deleted: true, task } };
}

export const taskToolHandlers = {
  create_task: createTask,
  list_tasks: listTasks,
  get_today_tasks: getTodayTasks,
  update_task: updateTask,
  complete_task: completeTask,
  delete_task: deleteTask,
};
