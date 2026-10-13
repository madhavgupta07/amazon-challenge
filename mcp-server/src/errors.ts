export type ToolErrorCode =
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFIRMATION_REQUIRED"
  | "UNAUTHORIZED"
  | "INTERNAL";

/** A safe, client-messageable tool failure. Never leaks internal details. */
export class ToolError extends Error {
  readonly code: ToolErrorCode;

  constructor(code: ToolErrorCode, message: string) {
    super(message);
    this.name = "ToolError";
    this.code = code;
  }
}

export function toToolError(error: unknown): ToolError {
  if (error instanceof ToolError) return error;
  if (error && typeof error === "object" && "name" in error && (error as Error).name === "ZodError") {
    return new ToolError("VALIDATION", "Invalid tool arguments");
  }
  return new ToolError("INTERNAL", "The operation could not be completed");
}
