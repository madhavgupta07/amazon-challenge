export type ParsedModelOutput =
  | { type: "tool"; tool: string; arguments: Record<string, unknown>; thought?: string }
  | { type: "final"; text: string }
  | { type: "unknown"; raw: string };

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  return trimmed;
}

/** Extract the first balanced JSON object, ignoring braces inside strings. */
function firstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function coerceArguments(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      /* ignore non-JSON argument strings */
    }
  }
  return {};
}

/**
 * Parse the model's response into either a tool call or a final answer.
 * The engine has no native tool-calling, so we standardise on a JSON protocol
 * and extract the first valid object even if it is wrapped in prose or fences.
 * OpenAI-style shapes ({"name","parameters"} / {"function":{...}}) are also
 * accepted for compatibility with other text-completion engines.
 */
export function parseModelOutput(raw: string): ParsedModelOutput {
  const text = stripCodeFences(raw ?? "");
  const candidate = firstJsonObject(text);
  if (!candidate) return { type: "unknown", raw: text };

  let parsed: any;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return { type: "unknown", raw: text };
  }

  if (parsed && typeof parsed === "object") {
    const thought = typeof parsed.thought === "string" ? parsed.thought : undefined;

    const toolName =
      (typeof parsed.tool === "string" && parsed.tool) ||
      (typeof parsed.name === "string" && parsed.name) ||
      (typeof parsed.action === "string" && parsed.action) ||
      (parsed.tool && typeof parsed.tool === "object" && typeof parsed.tool.name === "string"
        ? parsed.tool.name
        : "") ||
      (parsed.function && typeof parsed.function === "object" && typeof parsed.function.name === "string"
        ? parsed.function.name
        : "");

    if (toolName) {
      const nested = parsed.tool && typeof parsed.tool === "object" ? parsed.tool : parsed.function;
      const args =
        parsed.arguments ?? parsed.parameters ?? parsed.args ?? (nested ? nested.arguments : undefined);
      return { type: "tool", tool: toolName, arguments: coerceArguments(args), thought };
    }

    for (const key of ["final_answer", "final", "answer", "response", "message", "reply"]) {
      const value = parsed[key];
      if (typeof value === "string") return { type: "final", text: value };
    }
  }

  return { type: "unknown", raw: text };
}
