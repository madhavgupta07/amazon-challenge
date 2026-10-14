import { logger } from "../utils/logger.js";
import { MockProvider } from "./mockProvider.js";
import type { AIProvider } from "./types.js";

export const mockProvider = new MockProvider();

/**
 * The app runs a single local, deterministic provider. The `AIProvider`
 * interface stays pluggable so another engine can be added later without
 * touching the agent loop.
 */
export function selectProvider(): AIProvider {
  return mockProvider;
}

export function logProviderSelection(provider: AIProvider): void {
  logger.info("ai.provider_selected", { provider: provider.id, label: provider.label });
}

export * from "./types.js";
export { parseModelOutput } from "./parse.js";
export { buildSystemPrompt, buildContextMessage, buildObservation, formatConversationHistory } from "./prompt.js";
export type { AgentContext } from "./prompt.js";
