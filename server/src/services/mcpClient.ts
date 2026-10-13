import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface McpToolError {
  code: string;
  message: string;
}

export interface McpToolResponse {
  ok: boolean;
  summary?: string;
  data?: unknown;
  error?: McpToolError;
}

export interface McpSession {
  callTool(name: string, args: Record<string, unknown>): Promise<McpToolResponse>;
  close(): Promise<void>;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function parseResult(result: any): McpToolResponse {
  const text = result?.content?.[0]?.text;
  let parsed: any = null;
  try {
    parsed = typeof text === "string" ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (result?.isError) {
    return {
      ok: false,
      error: parsed?.error ?? { code: "INTERNAL", message: "Tool execution failed" },
    };
  }
  return { ok: true, summary: parsed?.summary, data: parsed?.data };
}

/**
 * Open a short-lived MCP session bound to one user. Identity travels in request
 * headers (never in tool arguments), matching the MCP server's auth expectations.
 */
export async function createMcpSession(userId: string): Promise<McpSession> {
  const transport = new StreamableHTTPClientTransport(new URL(env.mcp.url), {
    requestInit: {
      headers: {
        "x-internal-token": env.mcp.internalToken,
        "x-user-id": userId,
      },
    },
  });
  const client = new Client({ name: "lifepilot-server", version: "1.0.0" });
  await client.connect(transport);

  return {
    async callTool(name, args) {
      try {
        const result = await withTimeout(
          client.callTool({ name, arguments: args }),
          env.mcp.timeoutMs,
          `MCP tool ${name}`,
        );
        return parseResult(result);
      } catch (error) {
        logger.error("mcp.tool_failed", { tool: name, message: (error as Error).message });
        return { ok: false, error: { code: "MCP_ERROR", message: (error as Error).message } };
      }
    },
    async close() {
      try {
        await client.close();
      } catch {
        /* ignore */
      }
    },
  };
}

export async function callToolOnce(
  userId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<McpToolResponse> {
  const session = await createMcpSession(userId);
  try {
    return await session.callTool(name, args);
  } finally {
    await session.close();
  }
}
