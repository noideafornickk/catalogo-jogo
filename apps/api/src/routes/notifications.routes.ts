import { Router } from "express";
import { authJwt } from "../middlewares/authJwt";
import {
  getMyNotificationsController,
  markAllNotificationsAsReadController,
  markNotificationAsReadController
} from "../controllers/notifications.controller";

export const notificationsRoutes = Router();

notificationsRoutes.get("/me", authJwt, getMyNotificationsController);
notificationsRoutes.patch("/:id/read", authJwt, markNotificationAsReadController);
notificationsRoutes.patch("/read-all", authJwt, markAllNotificationsAsReadController);
