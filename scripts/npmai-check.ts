/**
 * Live end-to-end check against the real NPMAI provider.
 *
 * Boots the MCP server and the API server in one process (sharing an in-memory
 * Mongo), forces `AI_PROVIDER=npmai`, and drives the chat endpoint through the
 * full REST -> agent -> MCP -> Mongo loop.
 *
 * Usage: npx tsx scripts/npmai-check.ts ["plan my day"] ["add a task to ..."]
 */
process.env.AI_PROVIDER = process.env.AI_PROVIDER ?? "npmai";
process.env.ALLOW_MOCK_FALLBACK = process.env.ALLOW_MOCK_FALLBACK ?? "true";
process.env.NPMAI_BASE_URL =
  process.env.NPMAI_BASE_URL ?? "https://npmaiecosystem-loadbalancerfallback.hf.space/load_balancer";
process.env.NPMAI_MODEL = process.env.NPMAI_MODEL ?? "llama3.2";
process.env.NPMAI_RETRIES = process.env.NPMAI_RETRIES ?? "2";
process.env.AI_REQUEST_TIMEOUT_MS = process.env.AI_REQUEST_TIMEOUT_MS ?? "90000";
process.env.MCP_INTERNAL_TOKEN = process.env.MCP_INTERNAL_TOKEN ?? "e2e-internal-token";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "e2e-secret";
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "warn";

async function main() {
  const { default: mongoose } = await import("mongoose");
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const { default: request } = await import("supertest");

  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const { createApp: createMcpApp } = await import("../mcp-server/src/app.js");
  const { app: mcpApp } = await createMcpApp();
  const mcpServer = mcpApp.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => mcpServer.on("listening", () => resolve()));
  const address = mcpServer.address();
  const port = typeof address === "object" && address ? address.port : 0;
  process.env.MCP_SERVER_URL = `http://127.0.0.1:${port}/mcp`;

  const { createApp } = await import("../server/src/app.js");
  const api = createApp();

  const register = await request(api)
    .post("/api/auth/register")
    .send({ email: "e2e@example.com", name: "E2E", password: "password123" });
  const token = register.body.token as string;
  const auth = (r: any) => r.set("authorization", `Bearer ${token}`);

  await auth(request(api).post("/api/tasks")).send({
    title: "Prepare for React interview",
    priority: "urgent",
    category: "study",
  });
  await auth(request(api).post("/api/tasks")).send({
    title: "Reply to recruiter email",
    priority: "high",
    category: "work",
  });

  const script = process.argv.slice(2);
  const messages = script.length ? script : ["Plan my day"];

  let conversationId: string | undefined;
  for (const message of messages) {
    const startedAt = Date.now();
    const res = await auth(request(api).post("/api/chat")).send({ message, conversationId });
    conversationId = res.body.conversationId;
    const ms = Date.now() - startedAt;
    console.log(`\n=== USER: ${message}`);
    console.log(`provider: ${res.body.provider}  (${ms}ms, http ${res.status})`);
    const tools = (res.body.toolsUsed ?? []).map((t: { name: string }) => t.name).join(", ");
    console.log(`toolsUsed: ${tools || "(none)"}`);
    if (res.body.pendingAction) {
      console.log(`pendingAction: ${res.body.pendingAction.name} ${JSON.stringify(res.body.pendingAction.arguments)}`);
    }
    console.log(`reply:\n${res.body.reply ?? JSON.stringify(res.body)}`);
  }

  await mongoose.disconnect();
  await mongod.stop();
  mcpServer.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
