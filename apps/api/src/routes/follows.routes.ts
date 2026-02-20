import { Router } from "express";
import { authJwt } from "../middlewares/authJwt";
import { ensureActiveUser } from "../middlewares/ensureActiveUser";
import {
  decideFollowRequestController,
  followUserController,
  unfollowUserController
} from "../controllers/follows.controller";

export const followsRoutes = Router();

followsRoutes.post("/:userId", authJwt, ensureActiveUser, followUserController);
followsRoutes.delete("/:userId", authJwt, ensureActiveUser, unfollowUserController);
followsRoutes.patch("/requests/:id", authJwt, ensureActiveUser, decideFollowRequestController);
