import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";
import { AppError } from "../utils/AppError.js";

export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(AppError.badRequest("Invalid request body", result.error.flatten()));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(AppError.badRequest("Invalid query parameters", result.error.flatten()));
      return;
    }
    req.query = result.data as typeof req.query;
    next();
  };
}

export function validateParams(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(AppError.badRequest("Invalid path parameters", result.error.flatten()));
      return;
    }
    req.params = result.data as typeof req.params;
    next();
  };
}
