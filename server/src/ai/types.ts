export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  timeoutMs?: number;
}

export interface AIProvider {
  /** Stable id, e.g. "npmai" | "mock". */
  readonly id: string;
  /** Human-readable label surfaced in the UI. */
  readonly label: string;
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<string>;
}

export type ProviderErrorCode =
  | "network"
  | "timeout"
  | "http"
  | "bad_response"
  | "empty"
  | "unavailable";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly status?: number;
  /** Whether switching to another provider could plausibly help. */
  readonly retryable: boolean;

  constructor(code: ProviderErrorCode, message: string, status?: number) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.status = status;
    this.retryable = true;
  }
}
