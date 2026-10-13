import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import { ZodEffects, type ZodTypeAny } from "zod";
import { toolDefinitions } from "@lifepilot/shared";
import { ToolError, toToolError } from "./errors.js";
import { toolHandlers } from "./tools/index.js";
import { logger } from "./logger.js";

function extractUserId(
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
): string | null {
  const value = extra.authInfo?.extra?.userId;
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * The SDK's zod→JSON conversion cannot introspect a top-level `.refine()`
 * (ZodEffects) schema, so tools wrapped in `.refine()` would advertise empty
 * arguments. Unwrap to the inner object for the advertised JSON schema; the
 * handler still parses with the full schema (including the refinement).
 */
function advertisedSchema(schema: ZodTypeAny): ZodTypeAny {
  return schema instanceof ZodEffects ? schema.innerType() : schema;
}

function serializeResult(payload: unknown, isError = false) {
  return {
    ...(isError ? { isError: true } : {}),
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
  };
}

export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: "lifepilot-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  for (const def of toolDefinitions) {
    const handler = toolHandlers[def.name];
    if (!handler) {
      logger.warn("tool.missing_handler", { tool: def.name });
      continue;
    }

    server.registerTool(
      def.name,
      {
        title: def.title,
        description: def.description,
        inputSchema: advertisedSchema(def.schema),
        annotations: {
          title: def.title,
          readOnlyHint: !def.mutates,
          destructiveHint: def.destructive,
          idempotentHint: !def.mutates,
        },
      },
      async (args, extra) => {
        const startedAt = Date.now();
        const userId = extractUserId(extra);
        try {
          if (!userId) throw new ToolError("UNAUTHORIZED", "Missing authenticated user");
          const result = await handler(args, { userId });
          logger.info("tool.executed", {
            tool: def.name,
            userId,
            ms: Date.now() - startedAt,
          });
          return serializeResult({
            ok: true,
            tool: def.name,
            summary: result.summary,
            data: result.data,
          });
        } catch (error) {
          const toolError = toToolError(error);
          logger.warn("tool.failed", {
            tool: def.name,
            userId: userId ?? "unknown",
            code: toolError.code,
            message: toolError.message,
            ms: Date.now() - startedAt,
          });
          return serializeResult(
            {
              ok: false,
              tool: def.name,
              error: { code: toolError.code, message: toolError.message },
            },
            true,
          );
        }
      },
    );
  }

  return server;
}
