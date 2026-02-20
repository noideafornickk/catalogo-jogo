import type { FavoriteGame } from "@gamebox/shared/types/game";
import { favoritesUpdateValidator } from "@gamebox/shared/validators/favorites";
import { prisma } from "../db/prisma";
import { AppError } from "../middlewares/errorHandler";
import { getRawgGameDetails } from "./rawg.service";
import { normalizeRawgImageUrl } from "../utils/rawgImage";
import { toIsoDate } from "../utils/dates";

async function resolveGameIdsByRawgIds(rawgIds: number[]): Promise<Map<number, string>> {
  const idMap = new Map<number, string>();

  if (rawgIds.length === 0) {
    return idMap;
  }

  const existingGames = await prisma.game.findMany({
    where: {
      rawgId: {
        in: rawgIds
      }
    },
    select: {
      id: true,
      rawgId: true
    }
  });

  for (const game of existingGames) {
    idMap.set(game.rawgId, game.id);
  }

  const missingRawgIds = rawgIds.filter((rawgId) => !idMap.has(rawgId));
  if (missingRawgIds.length === 0) {
    return idMap;
  }

  for (const rawgId of missingRawgIds) {
    const details = await getRawgGameDetails(String(rawgId));
    const game = await prisma.game.upsert({
      where: {
        rawgId
      },
      create: {
        rawgId: details.id,
        title: details.name,
        coverUrl: details.coverUrl,
        released: details.released ? new Date(details.released) : null,
        descriptionText: details.descriptionText || null
      },
      update: {
        title: details.name,
        coverUrl: details.coverUrl,
        released: details.released ? new Date(details.released) : null,
        descriptionText: details.descriptionText || null
      },
      select: {
        id: true,
        rawgId: true
      }
    });

    idMap.set(game.rawgId, game.id);
  }

  return idMap;
}

function toFavoriteGame(item: {
  position: number;
  game: {
    rawgId: number;
    title: string;
    coverUrl: string | null;
    released: Date | null;
  };
}): FavoriteGame {
  return {
    position: item.position,
    rawgId: item.game.rawgId,
    title: item.game.title,
    coverUrl: normalizeRawgImageUrl(item.game.coverUrl),
    released: toIsoDate(item.game.released)
  };
}

export async function getFavoriteGamesForUser(userId: string): Promise<FavoriteGame[]> {
  const rows = await prisma.userFavoriteGame.findMany({
    where: {
      userId
    },
    orderBy: {
      position: "asc"
    },
    include: {
      game: {
        select: {
          rawgId: true,
          title: true,
          coverUrl: true,
          released: true
        }
      }
    }
  });

  return rows.map(toFavoriteGame);
}

export async function updateFavoriteGamesForUser(
  userId: string,
  input: unknown
): Promise<FavoriteGame[]> {
  const parsed = favoritesUpdateValidator.parse(input);
  const rawgIds = parsed.rawgIds;

  if (rawgIds.length === 0) {
    await prisma.userFavoriteGame.deleteMany({
      where: {
        userId
      }
    });
    return [];
  }

  const gameIdByRawgId = await resolveGameIdsByRawgIds(rawgIds);
  const orderedGameIds = rawgIds.map((rawgId) => {
    const gameId = gameIdByRawgId.get(rawgId);
    if (!gameId) {
      throw new AppError(400, `Invalid game rawgId: ${rawgId}`);
    }

    return gameId;
  });

  await prisma.$transaction(async (tx) => {
    await tx.userFavoriteGame.deleteMany({
      where: {
        userId
      }
    });

    await tx.userFavoriteGame.createMany({
      data: orderedGameIds.map((gameId, index) => ({
        userId,
        gameId,
        position: index + 1
      }))
    });
  });

  return getFavoriteGamesForUser(userId);
}
