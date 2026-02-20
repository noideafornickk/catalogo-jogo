import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/authJwt";
import { AppError } from "../middlewares/errorHandler";
import {
  createOrUpdateReview,
  createReviewReport,
  deleteReviewById,
  likeReviewById,
  getMyReviewsPage,
  getMyReviews,
  getRecentReviewsPage,
  getRecentReviews,
  getReviewsByGame,
  unlikeReviewById,
  updateReviewById
} from "../services/reviews.service";
import { getRequiredRouteParam } from "../utils/request";

export async function getRecentReviewsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const limit = Math.min(Number(req.query.limit ?? 20), 50);
    const safeLimit = Number.isNaN(limit) || limit <= 0 ? 20 : limit;
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const safeOffset = Number.isNaN(offset) ? 0 : offset;
    const pagination =
      req.query.pagination === "1" || req.query.pagination === "true";
    const user = (req as AuthenticatedRequest).user;

    if (pagination) {
      const page = await getRecentReviewsPage(safeLimit, safeOffset, user?.id);
      res.json(page);
      return;
    }

    const rows = await getRecentReviews(safeLimit, user?.id);
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function getReviewsByGameController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawgId = Number(req.params.rawgId);

    if (Number.isNaN(rawgId) || rawgId <= 0) {
      throw new AppError(400, "Invalid rawgId");
    }

    const user = (req as AuthenticatedRequest).user;
    const rows = await getReviewsByGame(rawgId, user?.id);
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function getMyReviewsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const limit = Math.min(Number(req.query.limit ?? 20), 50);
    const safeLimit = Number.isNaN(limit) || limit <= 0 ? 20 : limit;
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const safeOffset = Number.isNaN(offset) ? 0 : offset;
    const pagination =
      req.query.pagination === "1" || req.query.pagination === "true";

    if (pagination) {
      const page = await getMyReviewsPage(user.id, safeLimit, safeOffset);
      res.json(page);
      return;
    }

    const rows = await getMyReviews(user.id);
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function createReviewController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const review = await createOrUpdateReview(user.id, req.body);
    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
}

export async function updateReviewController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const reviewId = getRequiredRouteParam(req, "id");
    const review = await updateReviewById(user.id, reviewId, req.body);
    res.json(review);
  } catch (error) {
    next(error);
  }
}

export async function deleteReviewController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const reviewId = getRequiredRouteParam(req, "id");
    await deleteReviewById(user.id, reviewId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function reportReviewController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const reviewId = getRequiredRouteParam(req, "id");
    const report = await createReviewReport(user.id, reviewId, req.body);
    res.json(report);
  } catch (error) {
    next(error);
  }
}

export async function likeReviewController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const reviewId = getRequiredRouteParam(req, "id");
    const result = await likeReviewById(user.id, reviewId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function unlikeReviewController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const reviewId = getRequiredRouteParam(req, "id");
    const result = await unlikeReviewById(user.id, reviewId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
