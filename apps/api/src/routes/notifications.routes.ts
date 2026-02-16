import { Router } from "express";
import { authJwt } from "../middlewares/authJwt";
import { ensureActiveUser } from "../middlewares/ensureActiveUser";
import {
  getMyNotificationsController,
  markAllNotificationsAsReadController,
  markNotificationAsReadController
} from "../controllers/notifications.controller";

export const notificationsRoutes = Router();

notificationsRoutes.get("/me", authJwt, ensureActiveUser, getMyNotificationsController);
notificationsRoutes.patch("/:id/read", authJwt, ensureActiveUser, markNotificationAsReadController);
notificationsRoutes.patch("/read-all", authJwt, ensureActiveUser, markAllNotificationsAsReadController);
