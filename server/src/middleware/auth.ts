import type { RequestHandler } from "express";
import { AppError } from "../utils/AppError.js";
import { verifyToken } from "../utils/jwt.js";
import type { AuthUser } from "../types.js";

/** Require a valid bearer token and attach the authenticated user to the request. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    next(AppError.unauthorized());
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    const user: AuthUser = { id: payload.sub, email: payload.email, name: payload.name };
    req.user = user;
    next();
  } catch {
    next(AppError.unauthorized("Invalid or expired session"));
  }
};

/** Narrowed accessor: the previous middleware guarantees a user exists. */
export function currentUser(req: { user?: AuthUser }): AuthUser {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}
