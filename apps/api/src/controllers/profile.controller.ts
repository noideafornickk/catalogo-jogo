import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/authJwt";
import { AppError } from "../middlewares/errorHandler";
import {
  createMySuspensionAppeal,
  getMyProfile,
  getPublicProfile,
  uploadMyAvatarOriginal,
  updateMyAvatar,
  updateMyProfile
} from "../services/profile.service";
import type { AvatarUploadFile } from "../services/avatar.service";

export async function getMyProfileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const profile = await getMyProfile(user.id, user.email);
    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function updateMyProfileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const profile = await updateMyProfile(user.id, req.body, user.email);
    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function updateMyAvatarController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const profile = await updateMyAvatar(user.id, req.body, user.email);
    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function uploadMyAvatarController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const requestWithFile = req as Request & { file?: AvatarUploadFile };
    if (!requestWithFile.file) {
      throw new AppError(400, "Arquivo de avatar ausente.");
    }

    const upload = await uploadMyAvatarOriginal(user.id, requestWithFile.file);
    res.json(upload);
  } catch (error) {
    next(error);
  }
}

export async function getPublicProfileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authUser = (req as AuthenticatedRequest).user;
    const targetUserId = String(req.params.userId ?? "").trim();

    if (!targetUserId) {
      throw new AppError(400, "Invalid userId");
    }

    const profile = await getPublicProfile(targetUserId, authUser?.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function createMySuspensionAppealController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    const result = await createMySuspensionAppeal(user.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
