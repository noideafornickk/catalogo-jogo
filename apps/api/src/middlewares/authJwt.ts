import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../utils/env";
import { AppError } from "./errorHandler";
import { ensureUserWithProfile } from "../services/profile.service";

export type AuthenticatedUser = {
  id: string;
  googleSub: string;
  email: string | null;
  name: string;
  avatarUrl: string;
  suspendedUntil: Date | null;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

type ApiJwtPayload = {
  userId: string;
  googleSub: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
};

async function resolveAuthenticatedUserFromToken(token: string): Promise<AuthenticatedUser> {
  const decoded = jwt.verify(token, env.API_JWT_SECRET) as ApiJwtPayload;

  if (!decoded.userId || !decoded.googleSub) {
    throw new AppError(401, "Invalid token payload");
  }

  const { user } = await ensureUserWithProfile({
    googleSub: decoded.googleSub,
    email: decoded.email,
    name: decoded.name,
    avatarUrl: decoded.avatarUrl
  });

  return {
    id: user.id,
    googleSub: user.googleSub,
    email: decoded.email ?? null,
    name: user.name,
    avatarUrl: user.avatarUrl,
    suspendedUntil: user.suspendedUntil
  };
}

export function isAccountSuspended(user: AuthenticatedUser): boolean {
  if (!user.suspendedUntil) {
    return false;
  }

  return user.suspendedUntil.getTime() > Date.now();
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length);
}

export async function authJwt(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw new AppError(401, "Missing Bearer token");
    }

    const authReq = req as AuthenticatedRequest;
    authReq.user = await resolveAuthenticatedUserFromToken(token);

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError(401, "Invalid or expired token"));
  }
}

export async function optionalAuthJwt(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      next();
      return;
    }

    const authReq = req as AuthenticatedRequest;
    authReq.user = await resolveAuthenticatedUserFromToken(token);

    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
}
