import { Router } from "express";
import { authJwt, optionalAuthJwt } from "../middlewares/authJwt";
import { ensureActiveUser } from "../middlewares/ensureActiveUser";
import {
  createReviewController,
  deleteReviewController,
  getMyReviewsController,
  getRecentReviewsController,
  getReviewsByGameController,
  likeReviewController,
  reportReviewController,
  unlikeReviewController,
  updateReviewController
} from "../controllers/reviews.controller";

export const reviewsRoutes = Router();

reviewsRoutes.get("/recent", optionalAuthJwt, getRecentReviewsController);
reviewsRoutes.get("/game/:rawgId", optionalAuthJwt, getReviewsByGameController);
reviewsRoutes.get("/mine", authJwt, ensureActiveUser, getMyReviewsController);
reviewsRoutes.post("/", authJwt, ensureActiveUser, createReviewController);
reviewsRoutes.put("/:id", authJwt, ensureActiveUser, updateReviewController);
reviewsRoutes.delete("/:id", authJwt, ensureActiveUser, deleteReviewController);
reviewsRoutes.post("/:id/report", authJwt, ensureActiveUser, reportReviewController);
reviewsRoutes.post("/:id/like", authJwt, ensureActiveUser, likeReviewController);
reviewsRoutes.delete("/:id/like", authJwt, ensureActiveUser, unlikeReviewController);
