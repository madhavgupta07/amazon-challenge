import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { MockProvider } from "./mockProvider.js";
import { NpmaiProvider } from "./npmaiProvider.js";
import type { AIProvider } from "./types.js";

export const mockProvider = new MockProvider();

export const npmaiProvider = new NpmaiProvider({
  baseUrl: env.npmai.baseUrl,
  fallbackUrl: env.npmai.fallbackUrl,
  apiKey: env.npmai.apiKey,
  model: env.npmai.model,
  temperature: env.ai.temperature,
  timeoutMs: env.ai.requestTimeoutMs,
  retries: env.npmai.retries,
});

/**
 * Choose the configured provider. With "auto", NPMAI is used when configured,
 * otherwise the local deterministic provider runs so the app always works.
 */
export function selectProvider(): AIProvider {
  if (env.ai.provider === "mock") return mockProvider;
  if (env.ai.provider === "npmai") {
    if (!env.npmai.baseUrl && !env.npmai.fallbackUrl) {
      throw AppError.internal("AI_PROVIDER=npmai but NPMAI_BASE_URL is not configured");
    }
    return npmaiProvider;
  }
  const configured = Boolean(env.npmai.baseUrl);
  return configured ? npmaiProvider : mockProvider;
}

export function logProviderSelection(provider: AIProvider): void {
  logger.info("ai.provider_selected", { provider: provider.id, label: provider.label });
}

export * from "./types.js";
export { parseModelOutput } from "./parse.js";
export { buildSystemPrompt, buildContextMessage, buildObservation, formatConversationHistory } from "./prompt.js";
export type { AgentContext } from "./prompt.js";
