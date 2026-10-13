import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` },
  });
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  logger.error("unhandled_error", {
    message: (error as Error)?.message,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong" } });
};
