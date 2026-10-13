import type { AddressInfo } from "node:net";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../mcp-server/src/app.js";

process.env.MCP_INTERNAL_TOKEN = "test-internal-token";
process.env.LOG_LEVEL = "debug";

async function main() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const { app } = await createApp();
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}/mcp`;

  const headers = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "x-internal-token": "test-internal-token",
    "x-user-id": new mongoose.Types.ObjectId().toString(),
  };

  const init = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "smoke", version: "1.0.0" },
    },
  };
  const r1 = await fetch(url, { method: "POST", headers, body: JSON.stringify(init) });
  console.log("initialize status", r1.status, "session", r1.headers.get("mcp-session-id"));
  console.log((await r1.text()).slice(0, 400));

  const note = { jsonrpc: "2.0", method: "notifications/initialized" };
  const r2 = await fetch(url, { method: "POST", headers, body: JSON.stringify(note) });
  console.log("initialized status", r2.status);
  console.log((await r2.text()).slice(0, 400));

  const call = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  };
  const r3 = await fetch(url, { method: "POST", headers, body: JSON.stringify(call) });
  console.log("tools/list status", r3.status);
  console.log((await r3.text()).slice(0, 300));

  server.close();
  await mongoose.disconnect();
  await mongod.stop();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
