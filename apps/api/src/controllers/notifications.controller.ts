import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/authJwt";
import { AppError } from "../middlewares/errorHandler";
import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from "../services/notifications.service";

export async function getMyNotificationsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const safeLimit = Number.isNaN(limit) || limit <= 0 ? 20 : limit;

    const data = await getMyNotifications(user.id, safeLimit);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function markNotificationAsReadController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const result = await markNotificationAsRead(user.id, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsAsReadController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const result = await markAllNotificationsAsRead(user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
