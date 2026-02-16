import type { NextFunction, Request, Response } from "express";
import type { RankingRange } from "@gamebox/shared/types/api";
import { getRankings } from "../services/rankings.service";

export async function getRankingsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const range: RankingRange = req.query.range === "month" ? "month" : "week";

    const weekOrMonth = await getRankings(range);

    if (range === "week" && weekOrMonth.length === 0) {
      const monthItems = await getRankings("month");
      res.json({
        range,
        fallback: "month",
        items: monthItems
      });
      return;
    }

    res.json({
      range,
      items: weekOrMonth
    });
  } catch (error) {
    next(error);
  }
}
