import { Router } from "express";
import { authJwt } from "../middlewares/authJwt";
import { ensureActiveUser } from "../middlewares/ensureActiveUser";
import { requireAdmin } from "../middlewares/isAdmin";
import {
  getAdminSuspensionAppealsController,
  getAdminReportsController,
  getAdminUsersController,
  hideReviewAsAdminController,
  postAdminMessageController,
  patchAdminSuspensionAppealController,
  patchAdminReportController,
  unhideReviewAsAdminController
} from "../controllers/admin.controller";

export const adminRoutes = Router();

adminRoutes.use(authJwt, ensureActiveUser, requireAdmin);

adminRoutes.get("/reports", getAdminReportsController);
adminRoutes.patch("/reports/:id", patchAdminReportController);
adminRoutes.get("/appeals", getAdminSuspensionAppealsController);
adminRoutes.patch("/appeals/:id", patchAdminSuspensionAppealController);
adminRoutes.patch("/reviews/:id/hide", hideReviewAsAdminController);
adminRoutes.patch("/reviews/:id/unhide", unhideReviewAsAdminController);
adminRoutes.post("/messages", postAdminMessageController);
adminRoutes.get("/users", getAdminUsersController);
