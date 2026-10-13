import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
import { env } from "./env.js";

let memoryServer: { stop: () => Promise<void>; getUri: () => string } | null = null;
let connected = false;

export async function connectDatabase(uri = env.mongoUri): Promise<void> {
  if (connected) return;

  let target = uri;
  if (!target) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env and configure it.");
  }

  if (target === "memory") {
    const mod = await import("mongodb-memory-server");
    const server = await mod.MongoMemoryServer.create();
    memoryServer = server as unknown as { stop: () => Promise<void>; getUri: () => string };
    target = server.getUri();
    logger.warn("Using in-memory MongoDB (development only) — data is not persisted");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(target, { serverSelectionTimeoutMS: 8000 });
  connected = true;
  logger.info("MongoDB connected", { db: mongoose.connection.name });
}

export async function disconnectDatabase(): Promise<void> {
  if (connected) {
    await mongoose.disconnect();
    connected = false;
  }
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

export function isDatabaseConnected(): boolean {
  return connected;
}
