import type { NextFunction, Request, Response } from "express";
import { ReportStatus, SuspensionAppealStatus } from "@prisma/client";
import {
  adminHideReviewValidator,
  adminReportStatusUpdateValidator,
  adminSuspensionAppealStatusUpdateValidator
} from "@gamebox/shared/validators/moderation";
import type { AuthenticatedRequest } from "../middlewares/authJwt";
import { AppError } from "../middlewares/errorHandler";
import {
  getAdminReports,
  getAdminSuspensionAppeals,
  hideReviewAsAdmin,
  unhideReviewAsAdmin,
  updateAdminReportStatus,
  updateAdminSuspensionAppealStatus
} from "../services/moderation.service";

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
    const data = await updateAdminReportStatus(req.params.id, parsed.status, user.id);
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
    const data = await updateAdminSuspensionAppealStatus(req.params.id, status, user.id);
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
    const data = await hideReviewAsAdmin(req.params.id, user.id, parsed.reason);
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
    const data = await unhideReviewAsAdmin(req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}
