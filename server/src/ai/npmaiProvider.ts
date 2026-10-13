import { logger } from "../utils/logger.js";
import { ProviderError, type AIProvider, type ChatMessage, type CompletionOptions } from "./types.js";

export interface NpmaiConfig {
  baseUrl: string;
  fallbackUrl?: string;
  apiKey?: string;
  model: string;
  temperature: number;
  timeoutMs: number;
  retries: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * NPMAI provider.
 *
 * Verified contract (from the public npmai-api source and documented examples):
 *   POST <endpoint>  { prompt: string, model: string, temperature?: number }
 *   -> { response: string }
 *
 * NPMAI exposes text completion only (no native tool calling) and the free tier
 * needs no API key. An optional key is attached when configured for a
 * self-hosted gateway. Failures retry, then fail over to the fallback endpoint.
 */
export class NpmaiProvider implements AIProvider {
  readonly id = "npmai";
  readonly label = "NPMAI";

  constructor(private readonly config: NpmaiConfig) {}

  private endpoints(): string[] {
    return [this.config.baseUrl, this.config.fallbackUrl].filter(
      (url): url is string => Boolean(url),
    );
  }

  async complete(messages: ChatMessage[], options?: CompletionOptions): Promise<string> {
    const prompt = this.renderPrompt(messages);
    const endpoints = this.endpoints();
    if (endpoints.length === 0) {
      throw new ProviderError("unavailable", "NPMAI is not configured (set NPMAI_BASE_URL)");
    }

    let lastError: ProviderError | null = null;
    for (const endpoint of endpoints) {
      for (let attempt = 0; attempt <= this.config.retries; attempt += 1) {
        try {
          return await this.post(endpoint, prompt, options);
        } catch (error) {
          lastError =
            error instanceof ProviderError
              ? error
              : new ProviderError("unavailable", (error as Error).message);
          logger.warn("npmai.request_failed", {
            endpoint,
            attempt,
            code: lastError.code,
            status: lastError.status,
          });
          if (attempt < this.config.retries) await delay(300 * (attempt + 1));
        }
      }
    }
    throw lastError ?? new ProviderError("unavailable", "NPMAI did not return a response");
  }

  private renderPrompt(messages: ChatMessage[]): string {
    const lines = messages.map((message) => {
      const label =
        message.role === "system" ? "system" : message.role === "assistant" ? "assistant" : "user";
      return `${label}: ${message.content}`;
    });
    lines.push("assistant:");
    return lines.join("\n\n");
  }

  private async post(
    endpoint: string,
    prompt: string,
    options?: CompletionOptions,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options?.timeoutMs ?? this.config.timeoutMs,
    );
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (this.config.apiKey) headers.authorization = `Bearer ${this.config.apiKey}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt,
          model: this.config.model,
          temperature: options?.temperature ?? this.config.temperature,
        }),
        signal: controller.signal,
      });

      const bodyText = await response.text();
      if (!response.ok) {
        throw new ProviderError("http", `NPMAI responded ${response.status}`, response.status);
      }

      let data: any;
      try {
        data = JSON.parse(bodyText);
      } catch {
        throw new ProviderError("bad_response", "NPMAI returned a non-JSON response");
      }

      const output =
        typeof data?.response === "string"
          ? data.response
          : typeof data?.text === "string"
            ? data.text
            : undefined;

      if (!output || !output.trim()) {
        throw new ProviderError("empty", "NPMAI returned an empty response");
      }
      return output.trim();
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if ((error as Error).name === "AbortError") {
        throw new ProviderError("timeout", "NPMAI request timed out");
      }
      throw new ProviderError("network", `Could not reach NPMAI: ${(error as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}
