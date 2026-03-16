import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { AuthorizationError } from "../errors";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const requireAdmin = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  if (!req.user?.email) {
    return next(new AuthorizationError("Admin access required"));
  }

  if (ADMIN_EMAILS.length === 0) {
    return next(
      new AuthorizationError(
        "No admin users configured. Set ADMIN_EMAILS env var.",
      ),
    );
  }

  if (!ADMIN_EMAILS.includes(req.user.email.toLowerCase())) {
    return next(new AuthorizationError("Admin access required"));
  }

  next();
};
