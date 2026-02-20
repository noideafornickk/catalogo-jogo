import { RankBadgeCode } from "@gamebox/shared/constants/enums";
import type { RankBadge } from "@gamebox/shared/types/rank";
import { Prisma } from "@prisma/client";
import { memoryCache } from "../cache/memoryCache";
import { prisma } from "../db/prisma";

type Leader = {
  userId: string;
  total: number;
};

type RankLeaderMap = Record<RankBadgeCode, Leader | null>;

const RANK_LEADER_CACHE_KEY = "rank-badges:leaders:v1";
const RANK_LEADER_TTL_MS = 15_000;
const REVIEW_LEADER_MIN_REVIEWS = 5;
const LIKE_LEADER_MIN_REVIEWS = 5;
const LIKE_LEADER_MIN_LIKES = 10;
const FOLLOWER_LEADER_MIN_FOLLOWERS = 10;

function getRankTitle(code: RankBadgeCode): string {
  switch (code) {
    case RankBadgeCode.TOP_REVIEWS:
      return "Profissional da Resenha";
    case RankBadgeCode.TOP_LIKES:
      return "Queridinho da Resenha";
    case RankBadgeCode.TOP_FOLLOWERS:
      return "Averiguador de Resenha";
    default:
      return "Rank";
  }
}

async function querySingleLeader(query: Prisma.Sql): Promise<Leader | null> {
  const rows = await prisma.$queryRaw<Array<{ userId: string; total: number }>>(query);
  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    userId: row.userId,
    total: Number(row.total)
  };
}

async function loadRankLeaders(): Promise<RankLeaderMap> {
  const cached = memoryCache.get<RankLeaderMap>(RANK_LEADER_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const [topReviews, topLikes, topFollowers] = await Promise.all([
    querySingleLeader(
      Prisma.sql`
        SELECT u.id AS "userId", COUNT(r.id)::int AS total
        FROM "User" u
        JOIN "Review" r
          ON r."userId" = u.id
         AND r."visibilityStatus" = 'ACTIVE'
        GROUP BY u.id, u."createdAt"
        HAVING COUNT(r.id) >= ${REVIEW_LEADER_MIN_REVIEWS}
        ORDER BY total DESC, u."createdAt" ASC, u.id ASC
        LIMIT 1
      `
    ),
    querySingleLeader(
      Prisma.sql`
        SELECT
          u.id AS "userId",
          COUNT(rl.id)::int AS total,
          (COUNT(rl.id)::double precision / NULLIF(COUNT(DISTINCT r.id), 0)::double precision) AS score
        FROM "User" u
        JOIN "Review" r
          ON r."userId" = u.id
         AND r."visibilityStatus" = 'ACTIVE'
        LEFT JOIN "ReviewLike" rl
          ON rl."reviewId" = r.id
        GROUP BY u.id, u."createdAt"
        HAVING COUNT(DISTINCT r.id) >= ${LIKE_LEADER_MIN_REVIEWS}
           AND COUNT(rl.id) >= ${LIKE_LEADER_MIN_LIKES}
        ORDER BY score DESC, total DESC, u."createdAt" ASC, u.id ASC
        LIMIT 1
      `
    ),
    querySingleLeader(
      Prisma.sql`
        SELECT u.id AS "userId", COUNT(f.id)::int AS total
        FROM "User" u
        JOIN "Follow" f
          ON f."followingUserId" = u.id
         AND f.status = 'ACCEPTED'
        GROUP BY u.id, u."createdAt"
        HAVING COUNT(f.id) >= ${FOLLOWER_LEADER_MIN_FOLLOWERS}
        ORDER BY total DESC, u."createdAt" ASC, u.id ASC
        LIMIT 1
      `
    )
  ]);

  const leaderMap: RankLeaderMap = {
    [RankBadgeCode.TOP_REVIEWS]: topReviews,
    [RankBadgeCode.TOP_LIKES]: topLikes,
    [RankBadgeCode.TOP_FOLLOWERS]: topFollowers
  };

  memoryCache.set(RANK_LEADER_CACHE_KEY, leaderMap, RANK_LEADER_TTL_MS);
  return leaderMap;
}

function buildBadgesForUserFromLeaders(
  userId: string,
  leaders: RankLeaderMap
): RankBadge[] {
  const badges: RankBadge[] = [];
  const orderedCodes = [
    RankBadgeCode.TOP_REVIEWS,
    RankBadgeCode.TOP_LIKES,
    RankBadgeCode.TOP_FOLLOWERS
  ];

  for (const code of orderedCodes) {
    const leader = leaders[code];
    if (leader?.userId !== userId) {
      continue;
    }

    badges.push({
      code,
      title: getRankTitle(code)
    });
  }

  return badges;
}

export async function getRankBadgesForUser(userId: string): Promise<RankBadge[]> {
  const leaders = await loadRankLeaders();
  return buildBadgesForUserFromLeaders(userId, leaders);
}

export async function getRankBadgesForUsers(userIds: string[]): Promise<Map<string, RankBadge[]>> {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const result = new Map<string, RankBadge[]>();

  if (uniqueUserIds.length === 0) {
    return result;
  }

  const leaders = await loadRankLeaders();
  for (const userId of uniqueUserIds) {
    result.set(userId, buildBadgesForUserFromLeaders(userId, leaders));
  }

  return result;
}
