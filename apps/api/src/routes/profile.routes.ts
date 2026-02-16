import { Router } from "express";
import multer from "multer";
import { authJwt, optionalAuthJwt } from "../middlewares/authJwt";
import { ensureActiveUser } from "../middlewares/ensureActiveUser";
import {
  createMySuspensionAppealController,
  getMyProfileController,
  getPublicProfileController,
  uploadMyAvatarController,
  updateMyAvatarController,
  updateMyProfileController
} from "../controllers/profile.controller";

export const profileRoutes = Router();
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});

profileRoutes.get("/me", authJwt, getMyProfileController);
profileRoutes.put("/me", authJwt, ensureActiveUser, updateMyProfileController);
profileRoutes.post("/me/suspension-appeal", authJwt, createMySuspensionAppealController);
profileRoutes.post(
  "/me/avatar/upload",
  authJwt,
  ensureActiveUser,
  avatarUpload.single("avatar"),
  uploadMyAvatarController
);
profileRoutes.put("/me/avatar", authJwt, ensureActiveUser, updateMyAvatarController);
profileRoutes.get("/users/:userId", optionalAuthJwt, getPublicProfileController);
