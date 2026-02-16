import { Router } from "express";
import {
  getRawgDiscover,
  getRawgGameDetailsController,
  getRawgSearch
} from "../controllers/rawg.controller";

export const rawgRoutes = Router();

rawgRoutes.get("/search", getRawgSearch);
rawgRoutes.get("/discover", getRawgDiscover);
rawgRoutes.get("/games/:idOrSlug", getRawgGameDetailsController);
