import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import apiRoutes from "./routes/index.js";

function rateLimiter(max: number, message: string) {
  return rateLimit({
    windowMs: env.rateLimit.windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: "RATE_LIMITED", message } },
  });
}

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.clientUrl.split(",").map((value) => value.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "lifepilot-server", time: new Date().toISOString() });
  });

  app.use("/api", rateLimiter(env.rateLimit.max, "Too many requests, please slow down."));
  app.use(
    "/api/chat",
    rateLimiter(env.rateLimit.chatMax, "Too many chat messages, please wait a moment."),
  );

  app.use("/api", apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
