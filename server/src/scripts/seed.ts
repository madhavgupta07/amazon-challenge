import bcrypt from "bcryptjs";
import {
  buildDailyPlan,
  ConversationModel,
  DailyPlanModel,
  NoteModel,
  TaskModel,
  UserModel,
} from "@lifepilot/shared";
import { connectDatabase, disconnectDatabase } from "../config/db.js";
import { logger } from "../utils/logger.js";

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo@lifepilot.app";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "demo1234";
const DEMO_NAME = process.env.DEMO_NAME ?? "Alex Demo";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs);

async function upsertUser() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  return UserModel.findOneAndUpdate(
    { email: DEMO_EMAIL },
    {
      $set: {
        name: DEMO_NAME,
        passwordHash,
        preferences: {
          theme: "system",
          timeZone: "UTC",
          workStartHour: 9,
          workEndHour: 18,
          dailyAvailableHours: 6,
        },
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function main(): Promise<void> {
  await connectDatabase();
  const user = await upsertUser();
  const userId = String(user._id);

  await Promise.all([
    TaskModel.deleteMany({ user: userId }),
    NoteModel.deleteMany({ user: userId }),
    DailyPlanModel.deleteMany({ user: userId }),
    ConversationModel.deleteMany({ user: userId }),
  ]);

  await TaskModel.insertMany([
    {
      user: userId,
      title: "Prepare for the React interview",
      description: "Review hooks, rendering, and the take-home exercise.",
      category: "study",
      priority: "urgent",
      status: "pending",
      dueDate: iso(4 * HOUR),
      tags: ["interview", "react"],
    },
    {
      user: userId,
      title: "Review system design notes",
      category: "study",
      priority: "high",
      status: "pending",
      dueDate: iso(7 * HOUR),
    },
    {
      user: userId,
      title: "Reply to recruiter email",
      category: "work",
      priority: "medium",
      status: "pending",
      dueDate: iso(-DAY),
    },
    {
      user: userId,
      title: "Submit MLH hackathon project",
      category: "work",
      priority: "urgent",
      status: "in_progress",
      dueDate: iso(DAY),
    },
    {
      user: userId,
      title: "Gym session",
      category: "health",
      priority: "medium",
      status: "pending",
      dueDate: iso(10 * HOUR),
    },
    {
      user: userId,
      title: "Buy groceries",
      category: "personal",
      priority: "low",
      status: "pending",
      dueDate: iso(DAY + 3 * HOUR),
    },
    {
      user: userId,
      title: "Fix the login redirect bug",
      category: "work",
      priority: "high",
      status: "pending",
      dueDate: iso(2 * DAY),
    },
    {
      user: userId,
      title: "Plan the weekend trip",
      category: "personal",
      priority: "low",
      status: "pending",
      dueDate: null,
    },
    {
      user: userId,
      title: "Finish algorithms practice set",
      category: "study",
      priority: "high",
      status: "completed",
      dueDate: iso(-2 * DAY),
      completedAt: iso(-1 * DAY),
    },
    {
      user: userId,
      title: "Update résumé",
      category: "work",
      priority: "medium",
      status: "completed",
      dueDate: iso(-3 * DAY),
      completedAt: iso(-2 * DAY),
    },
    {
      user: userId,
      title: "Morning run",
      category: "health",
      priority: "low",
      status: "completed",
      dueDate: null,
      completedAt: iso(-3 * DAY),
    },
    {
      user: userId,
      title: "Read chapter 4 of the design book",
      category: "study",
      priority: "medium",
      status: "completed",
      dueDate: iso(-6 * DAY),
      completedAt: iso(-5 * DAY),
    },
  ]);

  await NoteModel.insertMany([
    {
      user: userId,
      title: "React interview talking points",
      content:
        "• Reconciliation & the virtual DOM\n• When to use useMemo/useCallback\n• Controlled vs uncontrolled components\n• Talk through the take-home trade-offs",
      tags: ["interview", "react"],
      pinned: true,
    },
    {
      user: userId,
      title: "Hackathon idea — LifePilot",
      content:
        "An agentic personal assistant that plans your day from real tasks, using MCP tools for the data layer.",
      tags: ["project", "ideas"],
    },
    {
      user: userId,
      title: "Recruiter referral contact",
      content: "Sam — referred by the MLH community. Follow up after the interview.",
      tags: ["work"],
    },
    {
      user: userId,
      title: "Books to read",
      content: "1. Designing Data-Intensive Applications\n2. The Pragmatic Programmer",
      tags: ["personal"],
    },
  ]);

  const plan = await buildDailyPlan(userId, { save: true, timeZone: "UTC" });

  logger.info("seed.complete", {
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    tasks: 12,
    notes: 4,
    planBlocks: plan.blocks.length,
  });

  await disconnectDatabase();
}

main().catch(async (error) => {
  logger.error("seed.failed", { message: (error as Error).message });
  await disconnectDatabase();
  process.exit(1);
});
