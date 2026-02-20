import type { NextFunction, Request, Response } from "express";
import { ReportStatus, SuspensionAppealStatus } from "@prisma/client";
import {
  adminHideReviewValidator,
  adminMessageValidator,
  adminReportStatusUpdateValidator,
  adminUserLookupQueryValidator,
  adminSuspensionAppealStatusUpdateValidator
} from "@gamebox/shared/validators/moderation";
import type { AuthenticatedRequest } from "../middlewares/authJwt";
import { AppError } from "../middlewares/errorHandler";
import {
  getAdminReports,
  getAdminSuspensionAppeals,
  hideReviewAsAdmin,
  lookupAdminUsers,
  unhideReviewAsAdmin,
  updateAdminReportStatus,
  updateAdminSuspensionAppealStatus
} from "../services/moderation.service";
import { sendAdminMessage } from "../services/notifications.service";
import { getRequiredRouteParam } from "../utils/request";

function parseReportStatusQuery(value: unknown): ReportStatus {
  const normalized = String(value ?? "OPEN").trim().toUpperCase();

  if (normalized === ReportStatus.RESOLVED) {
    return ReportStatus.RESOLVED;
  }

  if (normalized === ReportStatus.DISMISSED) {
    return ReportStatus.DISMISSED;
  }

  return ReportStatus.OPEN;
}

function parseAppealStatusQuery(value: unknown): SuspensionAppealStatus {
  const normalized = String(value ?? "OPEN").trim().toUpperCase();

  if (normalized === SuspensionAppealStatus.RESOLVED) {
    return SuspensionAppealStatus.RESOLVED;
  }

  if (normalized === SuspensionAppealStatus.REJECTED) {
    return SuspensionAppealStatus.REJECTED;
  }

  return SuspensionAppealStatus.OPEN;
}

export async function getAdminReportsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const status = parseReportStatusQuery(req.query.status);
    const limit = Number(req.query.limit ?? 50);
    const data = await getAdminReports({ status, limit });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function patchAdminReportController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const parsed = adminReportStatusUpdateValidator.parse(req.body);
    const reportId = getRequiredRouteParam(req, "id");
    const data = await updateAdminReportStatus(reportId, parsed.status, user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getAdminSuspensionAppealsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const status = parseAppealStatusQuery(req.query.status);
    const limit = Number(req.query.limit ?? 50);
    const data = await getAdminSuspensionAppeals({ status, limit });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function patchAdminSuspensionAppealController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const parsed = adminSuspensionAppealStatusUpdateValidator.parse(req.body);
    const status = parsed.status as SuspensionAppealStatus;
    const appealId = getRequiredRouteParam(req, "id");
    const data = await updateAdminSuspensionAppealStatus(appealId, status, user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function hideReviewAsAdminController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const parsed = adminHideReviewValidator.parse(req.body);
    const reviewId = getRequiredRouteParam(req, "id");
    const data = await hideReviewAsAdmin(reviewId, user.id, parsed.reason);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function unhideReviewAsAdminController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reviewId = getRequiredRouteParam(req, "id");
    const data = await unhideReviewAsAdmin(reviewId);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function postAdminMessageController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const parsed = adminMessageValidator.parse(req.body);
    const result = await sendAdminMessage(user.id, parsed);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getAdminUsersController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const parsed = adminUserLookupQueryValidator.parse({
      query: req.query.query,
      limit: req.query.limit
    });

    const result = await lookupAdminUsers(user.id, parsed.query, parsed.limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
