import type { RankingItem, RankingRange } from "@gamebox/shared/types/api";
import { ReviewVisibilityStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { daysAgo, toIsoDate } from "../utils/dates";
import { toDescriptionPreview } from "../utils/text";
import { syncGameDescriptions } from "./rawg.service";
import { normalizeRawgImageUrl } from "../utils/rawgImage";

export async function getRankings(range: RankingRange): Promise<RankingItem[]> {
  const fromDate = daysAgo(range === "week" ? 7 : 30);

  const grouped = await prisma.review.groupBy({
    by: ["gameId"],
    where: {
      visibilityStatus: ReviewVisibilityStatus.ACTIVE,
      createdAt: {
        gte: fromDate
      }
    },
    _avg: {
      rating: true
    },
    _count: {
      _all: true
    }
  });

  if (grouped.length === 0) {
    return [];
  }

  const games = await prisma.game.findMany({
    where: {
      id: {
        in: grouped.map((row) => row.gameId)
      }
    },
    select: {
      id: true,
      rawgId: true,
      title: true,
      coverUrl: true,
      released: true,
      descriptionText: true
    }
  });

  const gameMap = new Map(games.map((game) => [game.id, game]));
  const descriptionMap = await syncGameDescriptions(games.map((game) => game.rawgId));

  const items: RankingItem[] = grouped
    .map((row) => {
      const game = gameMap.get(row.gameId);
      if (!game) {
        return null;
      }

      const avgRating = Number((row._avg.rating ?? 0).toFixed(2));
      const reviewCount = row._count._all;
      const score = Number(((avgRating * reviewCount) / (reviewCount + 2)).toFixed(4));

      return {
        game: {
          rawgId: game.rawgId,
          title: game.title,
          coverUrl: normalizeRawgImageUrl(game.coverUrl),
          released: toIsoDate(game.released),
          descriptionPreview: toDescriptionPreview(
            descriptionMap.get(game.rawgId) ?? game.descriptionText
          ),
          hasReviews: reviewCount > 0,
          avgRating,
          reviewCount
        },
        avgRating,
        reviewCount,
        score
      };
    })
    .filter((item): item is RankingItem => Boolean(item))
    .sort((a, b) => b.score - a.score);

  return items;
}
