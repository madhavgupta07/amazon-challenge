import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../mcp-server/src/app.js";

const TOKEN = "test-internal-token";

let mongod: MongoMemoryServer;
let baseUrl: string;
let server: import("node:http").Server;

async function makeClient(userId: string) {
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: { headers: { "x-internal-token": TOKEN, "x-user-id": userId } },
  });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

function parse(result: any) {
  return JSON.parse(result.content[0].text);
}

describe("MCP server over Streamable HTTP", () => {
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    const { app } = await createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
    userA = new mongoose.Types.ObjectId().toString();
    userB = new mongoose.Types.ObjectId().toString();
  }, 180_000);

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("rejects requests without the internal token", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects a disallowed browser origin with 403", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://evil.example" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: { message?: string } };
    expect(body.error?.message).toContain("origin");
  });

  it("lets an allowed browser origin reach the auth check", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:5173" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects an unsupported MCP-Protocol-Version with 400", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "x-internal-token": TOKEN,
        "x-user-id": userA,
        "MCP-Protocol-Version": "1999-01-01",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(400);
  });

  it("lists the registered tools", async () => {
    const client = await makeClient(userA);
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("create_task");
    expect(names).toContain("create_daily_plan");
    expect(names).toContain("get_productivity_summary");
    expect(names.length).toBeGreaterThanOrEqual(13);
    await client.close();
  });

  it("advertises full argument schemas for refined tools", async () => {
    const client = await makeClient(userA);
    const { tools } = await client.listTools();
    const updateTask = tools.find((t) => t.name === "update_task");
    const updateNote = tools.find((t) => t.name === "update_note");
    expect(Object.keys((updateTask?.inputSchema as any)?.properties ?? {})).toContain("taskId");
    expect(Object.keys((updateNote?.inputSchema as any)?.properties ?? {})).toContain("noteId");
    await client.close();
  });

  it("creates a task and keeps users isolated", async () => {
    const clientA = await makeClient(userA);
    const created = await clientA.callTool({
      name: "create_task",
      arguments: { title: "Prepare for interview", priority: "high", category: "study" },
    });
    const createdPayload = parse(created);
    expect(createdPayload.ok).toBe(true);
    expect(createdPayload.data.task.title).toBe("Prepare for interview");
    await clientA.close();

    const clientB = await makeClient(userB);
    const listB = parse(await clientB.callTool({ name: "list_tasks", arguments: {} }));
    expect(listB.data.count).toBe(0);
    await clientB.close();
  });

  it("returns a validation error for missing required arguments", async () => {
    const client = await makeClient(userA);
    const result = await client.callTool({ name: "create_task", arguments: {} as never });
    expect(result.isError).toBe(true);
    await client.close();
  });

  it("refuses delete_task without confirmation", async () => {
    const client = await makeClient(userA);
    const created = parse(
      await client.callTool({ name: "create_task", arguments: { title: "Temp" } }),
    );
    const id = created.data.task.id;
    const bad = await client.callTool({
      name: "delete_task",
      arguments: { taskId: id, confirm: false as never },
    });
    expect(bad.isError).toBe(true);
    const good = parse(
      await client.callTool({ name: "delete_task", arguments: { taskId: id, confirm: true } }),
    );
    expect(good.data.deleted).toBe(true);
    await client.close();
  });
});
