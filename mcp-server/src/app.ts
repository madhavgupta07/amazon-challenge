import cors from "cors";
import express from "express";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { OBJECT_ID_REGEX } from "@lifepilot/shared";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { createMcpServer } from "./register.js";

/**
 * LifePilot MCP server over Streamable HTTP (spec 2025-11-25 compatible).
 *
 * The transport runs in stateless mode: the SDK forbids reusing a stateless
 * transport, so a fresh `McpServer` + transport pair is created per request.
 * The endpoint is an internal service — callers must present `x-internal-token`
 * and `x-user-id`; the user id becomes `authInfo.extra.userId` and is the only
 * source of identity tools trust (never tool arguments).
 */
export function createApp() {
  const app = express();
  app.disable("x-powered-by");

  const allowedOrigins = new Set(config.allowedOrigins);

  // Spec 2025-11-25 security: validate the Origin header to prevent DNS
  // rebinding. Requests without an Origin (non-browser clients) are allowed.
  function originGuard(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ): void {
    const origin = req.header("origin");
    if (origin && !allowedOrigins.has(origin)) {
      logger.warn("request.forbidden_origin", { origin, ip: req.ip });
      res.status(403).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Forbidden origin" },
        id: null,
      });
      return;
    }
    next();
  }

  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || allowedOrigins.has(origin));
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use("/mcp", originGuard);

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "lifepilot-mcp", version: "1.0.0" });
  });

  app.post("/mcp", async (req, res) => {
    const token = req.header("x-internal-token");
    const userId = req.header("x-user-id");

    if (!token || token !== config.internalToken) {
      logger.warn("request.unauthorized", { ip: req.ip });
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (!userId || !OBJECT_ID_REGEX.test(userId)) {
      res.status(400).json({ error: "missing_or_invalid_user" });
      return;
    }

    const auth: AuthInfo = {
      token,
      clientId: "lifepilot-server",
      scopes: ["tools"],
      extra: { userId },
    };

    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      (req as express.Request & { auth?: AuthInfo }).auth = auth;
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error("request.failed", { message: (error as Error).message });
      if (!res.headersSent) res.status(500).json({ error: "internal_error" });
    }
  });

  app.get("/mcp", (_req, res) => res.status(405).json({ error: "method_not_allowed" }));
  app.delete("/mcp", (_req, res) => res.status(405).json({ error: "method_not_allowed" }));

  return { app };
}
