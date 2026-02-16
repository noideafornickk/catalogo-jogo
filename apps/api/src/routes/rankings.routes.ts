import { Router } from "express";
import { getRankingsController } from "../controllers/rankings.controller";

export const rankingsRoutes = Router();

rankingsRoutes.get("/", getRankingsController);
