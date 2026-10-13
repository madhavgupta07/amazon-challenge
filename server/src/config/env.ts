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

const provider = (process.env.AI_PROVIDER ?? "auto").toLowerCase();

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
    /** auto | npmai | mock */
    provider: (["npmai", "mock", "auto"].includes(provider) ? provider : "auto") as
      | "npmai"
      | "mock"
      | "auto",
    /** Fall back to the local deterministic provider when NPMAI is unreachable. */
    allowMockFallback: process.env.ALLOW_MOCK_FALLBACK !== "false",
    maxIterations: num(process.env.AI_MAX_TOOL_ITERATIONS, 6),
    requestTimeoutMs: num(process.env.AI_REQUEST_TIMEOUT_MS, 45_000),
    temperature: Number(process.env.AI_TEMPERATURE ?? 0.3),
  },

  npmai: {
    baseUrl: process.env.NPMAI_BASE_URL ?? "",
    /**
     * Fail-over endpoint. Only honoured when a primary URL is set, so an
     * unconfigured install picks the local provider instead of waiting on an
     * unreachable host.
     */
    fallbackUrl: process.env.NPMAI_BASE_URL
      ? (process.env.NPMAI_FALLBACK_BASE_URL ??
        "https://npmaiecosystem-loadbalancerfallback.hf.space/load_balancer")
      : "",
    /** NPMAI's free tier requires no key; set this only for a self-hosted gateway. */
    apiKey: process.env.NPMAI_API_KEY ?? "",
    model: process.env.NPMAI_MODEL ?? "llama3.2",
    retries: num(process.env.NPMAI_RETRIES, 1),
  },

  rateLimit: {
    windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: num(process.env.RATE_LIMIT_MAX, 300),
    chatMax: num(process.env.RATE_LIMIT_CHAT_MAX, 30),
  },

  demoSeed: process.env.DEMO_SEED === "true",
};

export function npmaiConfigured(): boolean {
  return Boolean(env.npmai.baseUrl || env.npmai.fallbackUrl);
}
