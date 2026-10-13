import { loadEnv } from "@lifepilot/shared";

loadEnv();

const LOG_ORDER = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LOG_ORDER;

const threshold = LOG_ORDER[(process.env.LOG_LEVEL as Level) in LOG_ORDER ? (process.env.LOG_LEVEL as Level) : "info"];

export function log(level: Level, message: string, meta: Record<string, unknown> = {}): void {
  if (LOG_ORDER[level] < threshold) return;
  process.stderr.write(
    `${JSON.stringify({ ts: new Date().toISOString(), level, service: "mcp-server", message, ...meta })}\n`,
  );
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};
