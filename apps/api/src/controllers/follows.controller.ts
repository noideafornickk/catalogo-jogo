import type { NextFunction, Request, Response } from "express";
import { followRequestActionValidator } from "@gamebox/shared/validators/follow";
import type { AuthenticatedRequest } from "../middlewares/authJwt";
import { AppError } from "../middlewares/errorHandler";
import {
  followUser,
  respondToFollowRequest,
  unfollowUser
} from "../services/follows.service";

export async function followUserController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authUser = (req as AuthenticatedRequest).user;
    if (!authUser) {
      throw new AppError(401, "Unauthorized");
    }

    const targetUserId = String(req.params.userId ?? "").trim();
    if (!targetUserId) {
      throw new AppError(400, "Invalid userId");
    }

    const result = await followUser(authUser.id, targetUserId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function unfollowUserController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authUser = (req as AuthenticatedRequest).user;
    if (!authUser) {
      throw new AppError(401, "Unauthorized");
    }

    const targetUserId = String(req.params.userId ?? "").trim();
    if (!targetUserId) {
      throw new AppError(400, "Invalid userId");
    }

    const result = await unfollowUser(authUser.id, targetUserId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function decideFollowRequestController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authUser = (req as AuthenticatedRequest).user;
    if (!authUser) {
      throw new AppError(401, "Unauthorized");
    }

    const followId = String(req.params.id ?? "").trim();
    if (!followId) {
      throw new AppError(400, "Invalid follow request id");
    }

    const parsed = followRequestActionValidator.parse(req.body);
    const result = await respondToFollowRequest(authUser.id, followId, parsed.action);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
