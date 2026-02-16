import type { NextFunction, Request, Response } from "express";
import { searchValidator } from "@gamebox/shared/validators/search";
import { discoverGames, getRawgGameDetails, searchGames } from "../services/rawg.service";

export async function getRawgSearch(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = searchValidator.parse({
      q: String(req.query.q ?? "")
    });

    const items = await searchGames(parsed.q);
    res.json(items);
  } catch (error) {
    next(error);
  }
}

export async function getRawgDiscover(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const items = await discoverGames();
    res.json(items);
  } catch (error) {
    next(error);
  }
}

export async function getRawgGameDetailsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const idOrSlug = String(req.params.idOrSlug ?? "").trim();
    const details = await getRawgGameDetails(idOrSlug);
    res.json(details);
  } catch (error) {
    next(error);
  }
}
