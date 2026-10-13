import bcrypt from "bcryptjs";
import { UserModel } from "@lifepilot/shared";
import { AppError } from "../utils/AppError.js";
import { signToken } from "../utils/jwt.js";

const BCRYPT_ROUNDS = 10;

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  preferences: {
    theme: string;
    timeZone: string;
    workStartHour: number;
    workEndHour: number;
    dailyAvailableHours: number;
  };
  createdAt: string | null;
}

export function toPublicUser(user: any): PublicUser {
  const preferences = user.preferences ?? {};
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    preferences: {
      theme: preferences.theme ?? "system",
      timeZone: preferences.timeZone ?? "UTC",
      workStartHour: preferences.workStartHour ?? 9,
      workEndHour: preferences.workEndHour ?? 18,
      dailyAvailableHours: preferences.dailyAvailableHours ?? 6,
    },
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
  };
}

function issue(user: any) {
  return {
    user: toPublicUser(user),
    token: signToken({ sub: String(user._id), email: user.email, name: user.name }),
  };
}

export async function registerUser(input: { email: string; name: string; password: string }) {
  const existing = await UserModel.findOne({ email: input.email });
  if (existing) throw AppError.conflict("An account with that email already exists");

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await UserModel.create({
    email: input.email,
    name: input.name,
    passwordHash,
    preferences: { timeZone: "UTC" },
  });
  return issue(user);
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await UserModel.findOne({ email: input.email }).select("+passwordHash");
  if (!user) throw AppError.unauthorized("Incorrect email or password");

  const ok = await bcrypt.compare(input.password, (user as any).passwordHash);
  if (!ok) throw AppError.unauthorized("Incorrect email or password");
  return issue(user);
}

export async function getProfile(userId: string): Promise<PublicUser> {
  const user = await UserModel.findById(userId).lean();
  if (!user) throw AppError.notFound("User not found");
  return toPublicUser(user);
}

export async function updatePreferences(
  userId: string,
  preferences: Record<string, unknown>,
): Promise<PublicUser> {
  const set: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(preferences)) {
    if (value !== undefined) set[`preferences.${key}`] = value;
  }
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: set },
    { new: true, runValidators: true },
  ).lean();
  if (!user) throw AppError.notFound("User not found");
  return toPublicUser(user);
}

export async function getUserTimeZone(userId: string): Promise<string> {
  const user = await UserModel.findById(userId).select("preferences.timeZone").lean();
  return (user?.preferences as { timeZone?: string } | undefined)?.timeZone ?? "UTC";
}
