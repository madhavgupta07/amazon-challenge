import mongoose from "mongoose";
import { loadEnv } from "@lifepilot/shared";
import { logger } from "./logger.js";

loadEnv();

function splitList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  const items = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}

export const config = {
  port: Number(process.env.MCP_SERVER_PORT ?? 4001),
  mongoUri: process.env.MONGODB_URI ?? "",
  /** Shared secret: only the LifePilot API server may call this MCP server. */
  internalToken: process.env.MCP_INTERNAL_TOKEN ?? "dev-internal-token",
  host: process.env.MCP_HOST ?? "127.0.0.1",
  /**
   * Browser origins allowed to call the MCP endpoint (DNS-rebinding defence).
   * Non-browser clients send no Origin header and are unaffected. Set
   * `MCP_ALLOWED_ORIGINS` (comma-separated) to override.
   */
  allowedOrigins: splitList(process.env.MCP_ALLOWED_ORIGINS ?? process.env.CLIENT_URL, [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]),
};

let connected = false;

export async function connectDatabase(uri = config.mongoUri): Promise<void> {
  if (connected) return;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env and configure it.");
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  connected = true;
  logger.info("MongoDB connected", { db: mongoose.connection.name });
}

export async function disconnectDatabase(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

export function isDbConnected(): boolean {
  return connected;
}
