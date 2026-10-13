import type { Request, Response } from "express";
import { currentUser } from "../middleware/auth.js";
import {
  getProfile,
  loginUser,
  registerUser,
  updatePreferences,
} from "../services/authService.js";

export async function register(req: Request, res: Response) {
  const result = await registerUser(req.body);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const result = await loginUser(req.body);
  res.json(result);
}

export async function me(req: Request, res: Response) {
  res.json({ user: await getProfile(currentUser(req).id) });
}

export async function patchPreferences(req: Request, res: Response) {
  const user = await updatePreferences(currentUser(req).id, req.body);
  res.json({ user });
}
