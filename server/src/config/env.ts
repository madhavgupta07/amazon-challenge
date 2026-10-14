import { loadEnv } from "@lifepilot/shared";

loadEnv();

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const isProd = process.env.NODE_ENV === "production";

if (isProd && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production");
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd,
  port: num(process.env.SERVER_PORT, 4000),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI ?? "",
  jwtSecret:
    process.env.JWT_SECRET ?? "insecure-development-secret-change-me-please-000000",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",

  mcp: {
    url: process.env.MCP_SERVER_URL ?? "http://127.0.0.1:4001/mcp",
    internalToken: process.env.MCP_INTERNAL_TOKEN ?? "dev-internal-token",
    timeoutMs: num(process.env.MCP_TIMEOUT_MS, 15_000),
  },

  ai: {
    maxIterations: num(process.env.AI_MAX_TOOL_ITERATIONS, 6),
    requestTimeoutMs: num(process.env.AI_REQUEST_TIMEOUT_MS, 45_000),
    temperature: Number(process.env.AI_TEMPERATURE ?? 0.3),
  },

  aws: {
    /**
     * Confirmation-store backend: memory | dynamodb | auto.
     * auto -> dynamodb when AWS_REGION or DYNAMODB_ENDPOINT is set, else memory.
     */
    pendingActionStore: (
      ["memory", "dynamodb", "auto"].includes(
        (process.env.PENDING_ACTION_STORE ?? "auto").toLowerCase(),
      )
        ? (process.env.PENDING_ACTION_STORE ?? "auto").toLowerCase()
        : "auto"
    ) as "memory" | "dynamodb" | "auto",
    region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "",
    /** Override endpoint, e.g. http://localhost:8000 for DynamoDB Local. */
    dynamoEndpoint: process.env.DYNAMODB_ENDPOINT ?? "",
    pendingActionsTable:
      process.env.DYNAMODB_PENDING_ACTIONS_TABLE ?? "lifepilot_pending_actions",
  },

  rateLimit: {
    windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: num(process.env.RATE_LIMIT_MAX, 300),
    chatMax: num(process.env.RATE_LIMIT_CHAT_MAX, 30),
  },

  demoSeed: process.env.DEMO_SEED === "true",
};
