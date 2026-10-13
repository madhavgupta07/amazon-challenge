const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

const configured = (process.env.LOG_LEVEL as Level) ?? "info";
const threshold = LEVELS[configured] ?? LEVELS.info;

function emit(level: Level, message: string, meta: Record<string, unknown> = {}): void {
  if (LEVELS[level] < threshold) return;
  process.stdout.write(
    `${JSON.stringify({ ts: new Date().toISOString(), level, service: "server", message, ...meta })}\n`,
  );
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => emit("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => emit("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit("error", message, meta),
};
