import type { Request, Response } from "express";
import { computeProductivitySummary } from "@lifepilot/shared";
import { currentUser } from "../middleware/auth.js";
import { getUserTimeZone } from "../services/authService.js";

export async function get(req: Request, res: Response) {
  const userId = currentUser(req).id;
  const { period, timeZone } = req.query as { period?: never; timeZone?: string };
  const summary = await computeProductivitySummary(userId, {
    period,
    timeZone: timeZone ?? (await getUserTimeZone(userId)),
  });
  res.json({ summary });
}
