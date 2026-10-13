import type { Request, Response } from "express";
import {
  completeTaskRecord,
  createTaskRecord,
  deleteTaskRecord,
  getTaskRecord,
  getTodayTaskRecords,
  listTaskRecords,
  updateTaskRecord,
} from "@lifepilot/shared";
import { currentUser } from "../middleware/auth.js";
import { AppError } from "../utils/AppError.js";
import { getUserTimeZone } from "../services/authService.js";

export async function list(req: Request, res: Response) {
  const tasks = await listTaskRecords(currentUser(req).id, req.query as never);
  res.json({ tasks });
}

export async function today(req: Request, res: Response) {
  const userId = currentUser(req).id;
  const query = req.query as { date?: string; timeZone?: string };
  const timeZone = query.timeZone ?? (await getUserTimeZone(userId));
  res.json(await getTodayTaskRecords(userId, { ...query, timeZone }));
}

export async function create(req: Request, res: Response) {
  const task = await createTaskRecord(currentUser(req).id, req.body, "manual");
  res.status(201).json({ task });
}

export async function getOne(req: Request, res: Response) {
  const task = await getTaskRecord(currentUser(req).id, req.params.id);
  if (!task) throw AppError.notFound("Task not found");
  res.json({ task });
}

export async function update(req: Request, res: Response) {
  const result = await updateTaskRecord(currentUser(req).id, {
    taskId: req.params.id,
    ...req.body,
  });
  if (!result) throw AppError.notFound("Task not found");
  res.json(result);
}

export async function complete(req: Request, res: Response) {
  const task = await completeTaskRecord(currentUser(req).id, req.params.id);
  if (!task) throw AppError.notFound("Task not found");
  res.json({ task });
}

export async function remove(req: Request, res: Response) {
  const task = await deleteTaskRecord(currentUser(req).id, req.params.id);
  if (!task) throw AppError.notFound("Task not found");
  res.json({ task, deleted: true });
}
