import { Router } from "express";
import multer from "multer";
import { authJwt, optionalAuthJwt } from "../middlewares/authJwt";
import {
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
profileRoutes.put("/me", authJwt, updateMyProfileController);
profileRoutes.post("/me/avatar/upload", authJwt, avatarUpload.single("avatar"), uploadMyAvatarController);
profileRoutes.put("/me/avatar", authJwt, updateMyAvatarController);
profileRoutes.get("/users/:userId", optionalAuthJwt, getPublicProfileController);
