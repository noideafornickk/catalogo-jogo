import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./authJwt";
import { AppError } from "./errorHandler";
import { isAdminEmail } from "../utils/admin";

export function requireAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authUser = req.user;
  if (!authUser) {
    next(new AppError(401, "Unauthorized"));
    return;
  }

  if (!isAdminEmail(authUser.email)) {
    next(new AppError(403, "forbidden"));
    return;
  }

  next();
}
