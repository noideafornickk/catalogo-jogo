import { Router } from "express";
import { authJwt, optionalAuthJwt } from "../middlewares/authJwt";
import {
  createReviewController,
  deleteReviewController,
  getMyReviewsController,
  getRecentReviewsController,
  getReviewsByGameController,
  likeReviewController,
  unlikeReviewController,
  updateReviewController
} from "../controllers/reviews.controller";

export const reviewsRoutes = Router();

reviewsRoutes.get("/recent", optionalAuthJwt, getRecentReviewsController);
reviewsRoutes.get("/game/:rawgId", optionalAuthJwt, getReviewsByGameController);
reviewsRoutes.get("/mine", authJwt, getMyReviewsController);
reviewsRoutes.post("/", authJwt, createReviewController);
reviewsRoutes.put("/:id", authJwt, updateReviewController);
reviewsRoutes.delete("/:id", authJwt, deleteReviewController);
reviewsRoutes.post("/:id/like", authJwt, likeReviewController);
reviewsRoutes.delete("/:id/like", authJwt, unlikeReviewController);
