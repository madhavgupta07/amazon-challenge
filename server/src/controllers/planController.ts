import type { Request, Response } from "express";
import {
  buildDailyPlan,
  deletePlanRecord,
  getPlanByDate,
  listPlanRecords,
  savePlanRecord,
} from "@lifepilot/shared";
import { currentUser } from "../middleware/auth.js";
import { AppError } from "../utils/AppError.js";

export async function list(req: Request, res: Response) {
  const plans = await listPlanRecords(currentUser(req).id);
  res.json({ plans });
}

export async function getByDate(req: Request, res: Response) {
  const plan = await getPlanByDate(currentUser(req).id, req.params.date);
  if (!plan) throw AppError.notFound("No plan saved for that date");
  res.json({ plan });
}

export async function generate(req: Request, res: Response) {
  const plan = await buildDailyPlan(currentUser(req).id, req.body);
  res.json({ plan });
}

export async function save(req: Request, res: Response) {
  const plan = await savePlanRecord(currentUser(req).id, req.params.date, {
    ...req.body,
    generatedBy: req.body.generatedBy ?? "user",
  });
  res.json({ plan });
}

export async function remove(req: Request, res: Response) {
  const plan = await deletePlanRecord(currentUser(req).id, req.params.date);
  if (!plan) throw AppError.notFound("No plan saved for that date");
  res.json({ plan, deleted: true });
}
