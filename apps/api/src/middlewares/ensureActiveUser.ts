import type { NextFunction, Response } from "express";
import { isAccountSuspended, type AuthenticatedRequest } from "./authJwt";
import { AppError } from "./errorHandler";

export function ensureActiveUser(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authUser = req.user;
  if (!authUser) {
    next(new AppError(401, "Unauthorized"));
    return;
  }

  if (!isAccountSuspended(authUser)) {
    next();
    return;
  }

  next(
    new AppError(403, "account_suspended", {
      message: "Conta suspensa temporariamente.",
      suspendedUntil: authUser.suspendedUntil?.toISOString() ?? null
    })
  );
}
