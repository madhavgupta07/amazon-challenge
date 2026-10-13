import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp as createMcpApp } from "../mcp-server/src/app.js";

const TOKEN = "test-internal-token";

let mongod: MongoMemoryServer;
let mcpServer: Server;
let api: import("express").Express;
let token: string;

async function auth(req: request.Test): Promise<request.Test> {
  return req.set("authorization", `Bearer ${token}`);
}

describe("LifePilot API (REST -> agent -> MCP -> Mongo)", () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    const { app: mcpApp } = await createMcpApp();
    await new Promise<void>((resolve) => {
      mcpServer = mcpApp.listen(0, "127.0.0.1", () => resolve());
    });
    const { port } = mcpServer.address() as AddressInfo;

    process.env.MCP_SERVER_URL = `http://127.0.0.1:${port}/mcp`;
    process.env.MCP_INTERNAL_TOKEN = TOKEN;

    const { createApp } = await import("../server/src/app.js");
    api = createApp();

    const register = await request(api)
      .post("/api/auth/register")
      .send({ email: "alex@example.com", name: "Alex", password: "password123" });
    expect(register.status).toBe(201);
    token = register.body.token;
  }, 180_000);

  afterAll(async () => {
    await new Promise<void>((resolve) => mcpServer.close(() => resolve()));
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("reports health", async () => {
    const res = await request(api).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("rejects unauthenticated API access", async () => {
    const res = await request(api).get("/api/tasks");
    expect(res.status).toBe(401);
  });

  it("creates and lists tasks over REST", async () => {
    const created = await auth(
      request(api).post("/api/tasks").send({ title: "Buy milk", priority: "low" }),
    );
    expect(created.status).toBe(201);
    expect(created.body.task.title).toBe("Buy milk");

    const listed = await auth(request(api).get("/api/tasks"));
    expect(listed.status).toBe(200);
    expect(listed.body.tasks).toHaveLength(1);
  });

  it("proposes a plan through the agent using real tools", async () => {
    await auth(
      request(api).post("/api/tasks").send({ title: "Prep for interview", priority: "urgent", category: "study" }),
    );
    const res = await auth(request(api).post("/api/chat").send({ message: "What should I prioritize today?" }));
    expect(res.status).toBe(200);
    expect(res.body.provider).toBe("Local demo");
    const toolNames = res.body.toolsUsed.map((t: { name: string }) => t.name);
    expect(toolNames).toContain("get_today_tasks");
    expect(toolNames).toContain("create_daily_plan");
    expect(res.body.reply).toMatch(/plan/i);
    expect(res.body.conversationId).toBeTruthy();
  });

  it("adds a task from a natural-language request", async () => {
    const res = await auth(
      request(api).post("/api/chat").send({ message: "Add a task to prepare for my interview tomorrow" }),
    );
    expect(res.status).toBe(200);
    const names = res.body.toolsUsed.map((t: { name: string }) => t.name);
    expect(names).toContain("create_task");

    const listed = await auth(request(api).get("/api/tasks?search=interview"));
    const titles = listed.body.tasks.map((t: { title: string }) => t.title);
    expect(titles).toContain("prepare for my interview");
  });

  it("requires confirmation before deleting, then deletes on confirm", async () => {
    const created = await auth(request(api).post("/api/tasks").send({ title: "Temporary chore" }));
    const taskId = created.body.task.id;

    const chat = await auth(
      request(api).post("/api/chat").send({ message: "Delete the task Temporary chore" }),
    );
    expect(chat.status).toBe(200);
    expect(chat.body.pendingAction).toBeTruthy();
    expect(chat.body.pendingAction.name).toBe("delete_task");

    const before = await auth(request(api).get(`/api/tasks/${taskId}`));
    expect(before.status).toBe(200);

    const confirm = await auth(
      request(api).post("/api/chat/confirm").send({
        actionId: chat.body.pendingAction.id,
        decision: "confirm",
        conversationId: chat.body.conversationId,
      }),
    );
    expect(confirm.status).toBe(200);
    expect(confirm.body.toolCall.status).toBe("confirmed");

    const after = await auth(request(api).get(`/api/tasks/${taskId}`));
    expect(after.status).toBe(404);
  });

  it("matches a task by name even when many tasks exist", async () => {
    const target = await auth(request(api).post("/api/tasks").send({ title: "Gym session" }));
    const targetId = target.body.task.id;
    for (let i = 0; i < 12; i += 1) {
      await auth(request(api).post("/api/tasks").send({ title: `Filler task ${i}` }));
    }

    const chat = await auth(
      request(api).post("/api/chat").send({ message: "remove gym session" }),
    );
    expect(chat.status).toBe(200);
    expect(chat.body.pendingAction).toBeTruthy();
    expect(chat.body.pendingAction.name).toBe("delete_task");
    expect(chat.body.pendingAction.arguments.taskId).toBe(targetId);
  });

  it("computes a productivity summary from real data", async () => {
    const res = await auth(request(api).get("/api/summary?period=week"));
    expect(res.status).toBe(200);
    expect(res.body.summary).toHaveProperty("tasksCompletedInPeriod");
    expect(res.body.summary.openTasksNow).toBeGreaterThan(0);
  });

  it("generates and saves a daily plan over REST", async () => {
    const generated = await auth(request(api).post("/api/plans/generate").send({ save: true }));
    expect(generated.status).toBe(200);
    expect(generated.body.plan.persisted).toBe(true);
    expect(Array.isArray(generated.body.plan.blocks)).toBe(true);

    const listed = await auth(request(api).get("/api/plans"));
    expect(listed.body.plans.length).toBeGreaterThan(0);
  });
});
