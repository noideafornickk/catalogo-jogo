import type { GameSummary, RawgGameDetails } from "@gamebox/shared/types/game";
import { ReviewVisibilityStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { memoryCache } from "../cache/memoryCache";
import { AppError } from "../middlewares/errorHandler";
import { env } from "../utils/env";
import { normalizeRawgImageUrl } from "../utils/rawgImage";
import { toDescriptionPreview } from "../utils/text";

const RAWG_BASE_URL = "https://api.rawg.io/api";
const SEARCH_TTL_MS = 5 * 60 * 1000;
const DISCOVER_TTL_MS = 24 * 60 * 60 * 1000;
const DETAILS_TTL_MS = 24 * 60 * 60 * 1000;
const DESCRIPTION_SYNC_CHUNK_SIZE = 4;

type RawgGameListItem = {
  id: number;
  name: string;
  background_image: string | null;
  released: string | null;
};

type RawgGameDetailsResponse = {
  id: number;
  slug: string;
  name: string;
  background_image: string | null;
  description: string | null;
  released: string | null;
  metacritic: number | null;
  rating: number | null;
};

type RawgListResponse = {
  results: RawgGameListItem[];
};

function normalizeDescriptionText(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function chunkNumbers(values: number[], chunkSize: number): number[][] {
  const chunks: number[][] = [];

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }

  return chunks;
}

function normalizeCoverUrl(url: string | null): string | null {
  return normalizeRawgImageUrl(url);
}

function normalizeRawgGame(game: RawgGameListItem): GameSummary {
  return {
    rawgId: game.id,
    title: game.name,
    coverUrl: normalizeCoverUrl(game.background_image),
    released: game.released
  };
}

function decodeHtmlEntitiesBasic(input: string): string {
  return input
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(input: string): string {
  if (!input) {
    return "";
  }

  const withoutScripts = input.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, " ");
  const withoutTags = withoutStyles.replace(/<[^>]+>/g, " ");
  const decoded = decodeHtmlEntitiesBasic(withoutTags);

  return decoded.replace(/\s+/g, " ").trim();
}

function normalizeRawgDetails(payload: RawgGameDetailsResponse): RawgGameDetails {
  const descriptionHtml = payload.description ?? "";

  return {
    id: payload.id,
    slug: payload.slug,
    name: payload.name,
    coverUrl: normalizeCoverUrl(payload.background_image),
    descriptionHtml,
    descriptionText: stripHtml(descriptionHtml),
    released: payload.released,
    metacritic: payload.metacritic,
    rating: payload.rating
  };
}

async function fetchRawg<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${RAWG_BASE_URL}${path}`);
  url.searchParams.set("key", env.RAWG_API_KEY);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new AppError(502, `RAWG request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

async function enrichWithReviewStats(games: GameSummary[]): Promise<GameSummary[]> {
  if (games.length === 0) {
    return games;
  }

  const rawgIds = games.map((game) => game.rawgId);
  const dbGames = await prisma.game.findMany({
    where: {
      rawgId: { in: rawgIds }
    },
    select: {
      id: true,
      rawgId: true
    }
  });

  const gameIds = dbGames.map((game) => game.id);
  const reviewStats =
    gameIds.length > 0
        ? await prisma.review.groupBy({
            by: ["gameId"],
            where: {
              visibilityStatus: ReviewVisibilityStatus.ACTIVE,
              gameId: { in: gameIds }
            },
          _avg: {
            rating: true
          },
          _count: {
            _all: true
          }
        })
      : [];

  const gameByRawgId = new Map(dbGames.map((game) => [game.rawgId, game.id]));
  const statsByGameId = new Map(
    reviewStats.map((stat) => [
      stat.gameId,
      {
        avgRating: stat._avg.rating,
        reviewCount: stat._count._all
      }
    ])
  );

  return games.map((game) => {
    const dbGameId = gameByRawgId.get(game.rawgId);
    const stats = dbGameId ? statsByGameId.get(dbGameId) : undefined;

    return {
      ...game,
      hasReviews: Boolean(stats && stats.reviewCount > 0),
      avgRating: stats?.avgRating ? Number(stats.avgRating.toFixed(2)) : null,
      reviewCount: stats?.reviewCount ?? 0
    };
  });
}

async function getRawgDetailsBase(idOrSlug: string): Promise<RawgGameDetails> {
  const safeIdOrSlug = idOrSlug.trim();
  if (!safeIdOrSlug) {
    throw new AppError(400, "idOrSlug is required");
  }

  const cacheKey = `rawg:details:en:${safeIdOrSlug.toLowerCase()}`;
  const cached = memoryCache.get<RawgGameDetails>(cacheKey);
  if (cached) {
    return cached;
  }

  const payload = await fetchRawg<RawgGameDetailsResponse>(`/games/${encodeURIComponent(safeIdOrSlug)}`, {});
  const details = normalizeRawgDetails(payload);
  memoryCache.set(cacheKey, details, DETAILS_TTL_MS);

  return details;
}

export async function searchGames(q: string): Promise<GameSummary[]> {
  const cacheKey = `rawg:search:${q.trim().toLowerCase()}`;
  const cached = memoryCache.get<GameSummary[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const payload = await fetchRawg<RawgListResponse>("/games", {
    search: q,
    page_size: "10"
  });

  const games = payload.results.map(normalizeRawgGame);
  const descriptionMap = await syncGameDescriptions(games.map((game) => game.rawgId));

  const enriched = games.map((game) => ({
    ...game,
    descriptionPreview: toDescriptionPreview(descriptionMap.get(game.rawgId))
  }));

  memoryCache.set(cacheKey, enriched, SEARCH_TTL_MS);
  return enriched;
}

export async function discoverGames(): Promise<GameSummary[]> {
  const cacheKey = "rawg:discover";
  const cached = memoryCache.get<GameSummary[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const payload = await fetchRawg<RawgListResponse>("/games", {
    ordering: "-added",
    page_size: "20"
  });

  const normalized = payload.results.map(normalizeRawgGame);
  const enriched = await enrichWithReviewStats(normalized);

  memoryCache.set(cacheKey, enriched, DISCOVER_TTL_MS);
  return enriched;
}

export async function getRawgGameDetails(idOrSlug: string): Promise<RawgGameDetails> {
  return getRawgDetailsBase(idOrSlug);
}

export async function syncGameDescriptions(rawgIds: number[]): Promise<Map<number, string | null>> {
  const uniqueRawgIds = Array.from(
    new Set(rawgIds.filter((rawgId) => Number.isInteger(rawgId) && rawgId > 0))
  );

  const descriptionByRawgId = new Map<number, string | null>(
    uniqueRawgIds.map((rawgId) => [rawgId, null])
  );

  if (uniqueRawgIds.length === 0) {
    return descriptionByRawgId;
  }

  const games = await prisma.game.findMany({
    where: {
      rawgId: {
        in: uniqueRawgIds
      }
    },
    select: {
      rawgId: true,
      descriptionText: true
    }
  });

  for (const game of games) {
    descriptionByRawgId.set(game.rawgId, normalizeDescriptionText(game.descriptionText));
  }

  const missingRawgIds = uniqueRawgIds.filter((rawgId) => !descriptionByRawgId.get(rawgId));

  if (missingRawgIds.length === 0) {
    return descriptionByRawgId;
  }

  for (const chunk of chunkNumbers(missingRawgIds, DESCRIPTION_SYNC_CHUNK_SIZE)) {
    await Promise.all(
      chunk.map(async (rawgId) => {
        try {
          const details = await getRawgDetailsBase(String(rawgId));
          const normalized = normalizeDescriptionText(details.descriptionText);

          await prisma.game.updateMany({
            where: { rawgId },
            data: { descriptionText: normalized }
          });

          descriptionByRawgId.set(rawgId, normalized);
        } catch {
          descriptionByRawgId.set(rawgId, null);
        }
      })
    );
  }

  return descriptionByRawgId;
}
