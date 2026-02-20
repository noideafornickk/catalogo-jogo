import {
  NotificationType,
  ReportStatus,
  ReviewVisibilityStatus,
  type Prisma
} from "@prisma/client";
import {
  Status as SharedStatus,
  ReviewVisibilityStatus as SharedReviewVisibilityStatus
} from "@gamebox/shared/constants/enums";
import { reviewReportValidator } from "@gamebox/shared/validators/moderation";
import type { ReviewReportCreateResponse } from "@gamebox/shared/types/api";
import { reviewUpdateValidator, reviewValidator } from "@gamebox/shared/validators/review";
import type { ReviewItem } from "@gamebox/shared/types/review";
import type { PaginatedReviewsResponse } from "@gamebox/shared/types/api";
import type { RankBadge } from "@gamebox/shared/types/rank";
import { prisma } from "../db/prisma";
import { AppError } from "../middlewares/errorHandler";
import { getRawgGameDetails, syncGameDescriptions } from "./rawg.service";
import { toIsoDate } from "../utils/dates";
import { toDescriptionPreview } from "../utils/text";
import { normalizeRawgImageUrl } from "../utils/rawgImage";
import { getRankBadgesForUsers } from "./rankBadge.service";

const reviewInclude = {
  user: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      profile: {
        select: {
          isPrivate: true
        }
      }
    }
  },
  game: {
    select: {
      id: true,
      rawgId: true,
      title: true,
      coverUrl: true,
      released: true,
      descriptionText: true,
      _count: {
        select: {
          reviews: {
            where: {
              visibilityStatus: ReviewVisibilityStatus.ACTIVE
            }
          }
        }
      }
    }
  },
  _count: {
    select: {
      likes: true
    }
  }
} satisfies Prisma.ReviewInclude;

type ReviewWithRelations = Prisma.ReviewGetPayload<{
  include: typeof reviewInclude;
}>;

type RecentQueueRow = {
  id: string;
  gameId: string;
  createdAt: Date;
};

type RecentHighlightEntry = {
  reviewId: string;
  gameId: string;
  reviewCreatedAt: Date;
  activeSince: Date;
};

const RECENT_HIGHLIGHT_WINDOW_MS = 48 * 60 * 60 * 1000;

function normalizeBody(body: string | undefined): string | null {
  if (!body) {
    return null;
  }

  return body.trim().length > 0 ? body.trim() : null;
}

async function getLikedReviewIds(
  reviewIds: string[],
  viewerUserId?: string
): Promise<Set<string>> {
  if (!viewerUserId || reviewIds.length === 0) {
    return new Set();
  }

  const rows = await prisma.reviewLike.findMany({
    where: {
      reviewId: {
        in: reviewIds
      },
      userId: viewerUserId
    },
    select: {
      reviewId: true
    }
  });

  return new Set(rows.map((row) => row.reviewId));
}

function toReviewItem(
  review: ReviewWithRelations,
  descriptionText: string | null,
  rankBadges: RankBadge[],
  likedByMe: boolean,
  isOwner: boolean
): ReviewItem {
  return {
    id: review.id,
    rating: review.rating,
    recommend: review.recommend,
    status: review.status as SharedStatus,
    visibilityStatus: review.visibilityStatus as SharedReviewVisibilityStatus,
    body: review.body,
    likesCount: review._count.likes,
    likedByMe,
    isOwner,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    game: {
      rawgId: review.game.rawgId,
      title: review.game.title,
      coverUrl: normalizeRawgImageUrl(review.game.coverUrl),
      released: toIsoDate(review.game.released),
      descriptionPreview: toDescriptionPreview(descriptionText),
      reviewCount: review.game._count.reviews,
      otherReviewsCount: Math.max(0, review.game._count.reviews - 1),
      otherReviewers: []
    },
    user: {
      id: review.user.id,
      name: review.user.name,
      avatarUrl: review.user.avatarUrl,
      isPrivate: review.user.profile?.isPrivate ?? false,
      rankBadges
    }
  };
}

async function ensureGame(rawgId: number) {
  const existing = await prisma.game.findUnique({
    where: {
      rawgId
    }
  });

  if (existing?.descriptionText) {
    return existing;
  }

  const details = await getRawgGameDetails(String(rawgId));

  return prisma.game.upsert({
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
    }
  });
}

async function toReviewItems(rows: ReviewWithRelations[], viewerUserId?: string): Promise<ReviewItem[]> {
  const rawgIds = rows.map((row) => row.game.rawgId);
  const descriptionMap = await syncGameDescriptions(rawgIds);
  const likedReviewIds = await getLikedReviewIds(
    rows.map((row) => row.id),
    viewerUserId
  );
  const userRankBadgeMap = await getRankBadgesForUsers(rows.map((row) => row.user.id));

  return rows.map((row) =>
    toReviewItem(
      row,
      descriptionMap.get(row.game.rawgId) ?? (row.game.descriptionText?.trim() || null),
      userRankBadgeMap.get(row.user.id) ?? [],
      likedReviewIds.has(row.id),
      viewerUserId ? row.user.id === viewerUserId : false
    )
  );
}

function buildRecentHighlightEntries(
  rows: RecentQueueRow[],
  nowDate: Date = new Date()
): RecentHighlightEntry[] {
  if (rows.length === 0) {
    return [];
  }

  const nowMs = nowDate.getTime();
  const queueByGame = new Map<string, RecentQueueRow[]>();

  for (const row of rows) {
    const queue = queueByGame.get(row.gameId);
    if (queue) {
      queue.push(row);
    } else {
      queueByGame.set(row.gameId, [row]);
    }
  }

  const entries: RecentHighlightEntry[] = [];

  for (const [gameId, queue] of queueByGame.entries()) {
    let active = queue[0];
    let activeSinceMs = active.createdAt.getTime();

    for (let index = 1; index < queue.length; index += 1) {
      if (nowMs < activeSinceMs + RECENT_HIGHLIGHT_WINDOW_MS) {
        break;
      }

      const nextReview = queue[index];
      const nextWindowStartMs = activeSinceMs + RECENT_HIGHLIGHT_WINDOW_MS;
      active = nextReview;
      activeSinceMs = Math.max(nextReview.createdAt.getTime(), nextWindowStartMs);
    }

    entries.push({
      reviewId: active.id,
      gameId,
      reviewCreatedAt: active.createdAt,
      activeSince: new Date(activeSinceMs)
    });
  }

  entries.sort((a, b) => {
    const byActiveSince = b.activeSince.getTime() - a.activeSince.getTime();
    if (byActiveSince !== 0) {
      return byActiveSince;
    }

    const byCreatedAt = b.reviewCreatedAt.getTime() - a.reviewCreatedAt.getTime();
    if (byCreatedAt !== 0) {
      return byCreatedAt;
    }

    return b.reviewId.localeCompare(a.reviewId);
  });

  return entries;
}

async function getRecentHighlightEntries(): Promise<RecentHighlightEntry[]> {
  const queueRows = await prisma.review.findMany({
    where: {
      visibilityStatus: ReviewVisibilityStatus.ACTIVE
    },
    select: {
      id: true,
      gameId: true,
      createdAt: true
    },
    orderBy: [
      {
        gameId: "asc"
      },
      {
        createdAt: "asc"
      },
      {
        id: "asc"
      }
    ]
  });

  return buildRecentHighlightEntries(queueRows);
}

async function enrichRecentItemsWithOtherReviewers(items: ReviewItem[]): Promise<ReviewItem[]> {
  if (items.length === 0) {
    return items;
  }

  const rawgIds = Array.from(new Set(items.map((item) => item.game.rawgId)));
  const selectedReviewIdByRawgId = new Map(items.map((item) => [item.game.rawgId, item.id]));
  const otherReviewersByRawgId = new Map<
    number,
    Array<{
      id: string;
      name: string;
      avatarUrl: string;
    }>
  >();

  const relatedRows = await prisma.review.findMany({
    where: {
      visibilityStatus: ReviewVisibilityStatus.ACTIVE,
      game: {
        rawgId: {
          in: rawgIds
        }
      }
    },
    select: {
      id: true,
      game: {
        select: {
          rawgId: true
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true
        }
      }
    },
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "desc"
      }
    ]
  });

  for (const row of relatedRows) {
    const rawgId = row.game.rawgId;

    if (row.id === selectedReviewIdByRawgId.get(rawgId)) {
      continue;
    }

    const existing = otherReviewersByRawgId.get(rawgId) ?? [];
    if (existing.length >= 3) {
      continue;
    }

    if (!existing.some((user) => user.id === row.user.id)) {
      existing.push({
        id: row.user.id,
        name: row.user.name,
        avatarUrl: row.user.avatarUrl
      });
      otherReviewersByRawgId.set(rawgId, existing);
    }
  }

  return items.map((item) => ({
    ...item,
    game: {
      ...item.game,
      otherReviewsCount: Math.max(0, item.game.reviewCount - 1),
      otherReviewers: otherReviewersByRawgId.get(item.game.rawgId) ?? []
    }
  }));
}

async function getRecentHighlightedItems(
  limit: number,
  offset: number,
  viewerUserId?: string
): Promise<PaginatedReviewsResponse> {
  const entries = await getRecentHighlightEntries();
  const pageEntries = entries.slice(offset, offset + limit);
  const hasMore = offset + limit < entries.length;

  if (pageEntries.length === 0) {
    return {
      items: [],
      limit,
      offset,
      hasMore,
      nextOffset: null
    };
  }

  const selectedIds = pageEntries.map((entry) => entry.reviewId);
  const rows = await prisma.review.findMany({
    where: {
      id: {
        in: selectedIds
      }
    },
    include: reviewInclude
  });

  const rowById = new Map(rows.map((row) => [row.id, row]));
  const orderedRows = selectedIds
    .map((reviewId) => rowById.get(reviewId))
    .filter((row): row is ReviewWithRelations => Boolean(row));

  const items = await toReviewItems(orderedRows, viewerUserId);
  const enrichedItems = await enrichRecentItemsWithOtherReviewers(items);

  return {
    items: enrichedItems,
    limit,
    offset,
    hasMore,
    nextOffset: hasMore ? offset + limit : null
  };
}

async function toPaginatedReviewResponse(
  rows: ReviewWithRelations[],
  limit: number,
  offset: number,
  viewerUserId?: string
): Promise<PaginatedReviewsResponse> {
  const hasMore = rows.length > limit;
  const currentRows = hasMore ? rows.slice(0, limit) : rows;
  const items = await toReviewItems(currentRows, viewerUserId);

  return {
    items,
    limit,
    offset,
    hasMore,
    nextOffset: hasMore ? offset + limit : null
  };
}

export async function getRecentReviews(limit: number, viewerUserId?: string): Promise<ReviewItem[]> {
  const page = await getRecentHighlightedItems(limit, 0, viewerUserId);
  return page.items;
}

export async function getRecentReviewsPage(
  limit: number,
  offset: number,
  viewerUserId?: string
): Promise<PaginatedReviewsResponse> {
  return getRecentHighlightedItems(limit, offset, viewerUserId);
}

export async function getReviewsByGame(rawgId: number, viewerUserId?: string): Promise<ReviewItem[]> {
  const rows = await prisma.review.findMany({
    where: {
      visibilityStatus: ReviewVisibilityStatus.ACTIVE,
      game: {
        rawgId
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    include: reviewInclude
  });

  return toReviewItems(rows, viewerUserId);
}

export async function getMyReviews(userId: string): Promise<ReviewItem[]> {
  return getReviewsByUser(userId, userId);
}

export async function getMyReviewsPage(
  userId: string,
  limit: number,
  offset: number
): Promise<PaginatedReviewsResponse> {
  const rows = await prisma.review.findMany({
    where: {
      userId,
      visibilityStatus: ReviewVisibilityStatus.ACTIVE
    },
    orderBy: {
      updatedAt: "desc"
    },
    skip: offset,
    take: limit + 1,
    include: reviewInclude
  });

  return toPaginatedReviewResponse(rows, limit, offset, userId);
}

export async function getReviewsByUser(
  userId: string,
  viewerUserId?: string
): Promise<ReviewItem[]> {
  const rows = await prisma.review.findMany({
    where: {
      userId,
      visibilityStatus: ReviewVisibilityStatus.ACTIVE
    },
    orderBy: {
      updatedAt: "desc"
    },
    include: reviewInclude
  });

  return toReviewItems(rows, viewerUserId);
}

export async function createOrUpdateReview(userId: string, input: unknown): Promise<ReviewItem> {
  const parsed = reviewValidator.parse(input);
  const game = await ensureGame(parsed.rawgId);

  const review = await prisma.review.upsert({
    where: {
      userId_gameId: {
        userId,
        gameId: game.id
      }
    },
    create: {
      userId,
      gameId: game.id,
      rating: parsed.rating,
      recommend: parsed.recommend,
      status: parsed.status,
      body: normalizeBody(parsed.body)
    },
    update: {
      rating: parsed.rating,
      recommend: parsed.recommend,
      status: parsed.status,
      body: normalizeBody(parsed.body)
    },
    include: reviewInclude
  });

  return (await toReviewItems([review], userId))[0];
}

export async function updateReviewById(
  userId: string,
  reviewId: string,
  input: unknown
): Promise<ReviewItem> {
  const parsed = reviewUpdateValidator.parse(input);

  const existing = await prisma.review.findUnique({
    where: {
      id: reviewId
    }
  });

  if (!existing) {
    throw new AppError(404, "Review not found");
  }

  if (existing.userId !== userId) {
    throw new AppError(403, "Forbidden");
  }

  const updateData: Prisma.ReviewUpdateInput = {};

  if (parsed.rating !== undefined) {
    updateData.rating = parsed.rating;
  }

  if (parsed.recommend !== undefined) {
    updateData.recommend = parsed.recommend;
  }

  if (parsed.status !== undefined) {
    updateData.status = parsed.status;
  }

  if (parsed.body !== undefined) {
    updateData.body = normalizeBody(parsed.body);
  }

  const review = await prisma.review.update({
    where: {
      id: reviewId
    },
    data: updateData,
    include: reviewInclude
  });

  return (await toReviewItems([review], userId))[0];
}

export async function deleteReviewById(userId: string, reviewId: string): Promise<void> {
  const existing = await prisma.review.findUnique({
    where: {
      id: reviewId
    }
  });

  if (!existing) {
    throw new AppError(404, "Review not found");
  }

  if (existing.userId !== userId) {
    throw new AppError(403, "Forbidden");
  }

  await prisma.review.delete({
    where: {
      id: reviewId
    }
  });
}

export async function createReviewReport(
  reporterUserId: string,
  reviewId: string,
  input: unknown
): Promise<ReviewReportCreateResponse> {
  const parsed = reviewReportValidator.parse(input);

  const review = await prisma.review.findUnique({
    where: {
      id: reviewId
    },
    select: {
      id: true,
      userId: true,
      visibilityStatus: true
    }
  });

  if (!review || review.visibilityStatus !== ReviewVisibilityStatus.ACTIVE) {
    throw new AppError(404, "Review not found");
  }

  if (review.userId === reporterUserId) {
    throw new AppError(400, "You cannot report your own review");
  }

  const existingOpenReport = await prisma.reviewReport.findUnique({
    where: {
      reviewId_reporterUserId_status: {
        reviewId,
        reporterUserId,
        status: ReportStatus.OPEN
      }
    },
    select: {
      id: true
    }
  });

  if (existingOpenReport) {
    return {
      ok: true,
      reportId: existingOpenReport.id
    };
  }

  const report = await prisma.reviewReport.create({
    data: {
      reviewId,
      reporterUserId,
      reason: parsed.reason,
      details: parsed.details ?? null
    },
    select: {
      id: true
    }
  });

  return {
    ok: true,
    reportId: report.id
  };
}

export async function likeReviewById(
  userId: string,
  reviewId: string
): Promise<{ likesCount: number; likedByMe: boolean }> {
  const review = await prisma.review.findUnique({
    where: {
      id: reviewId
    },
    select: {
      id: true,
      userId: true,
      visibilityStatus: true
    }
  });

  if (!review || review.visibilityStatus !== ReviewVisibilityStatus.ACTIVE) {
    throw new AppError(404, "Review not found");
  }

  if (review.userId === userId) {
    throw new AppError(400, "You cannot like your own review");
  }

  const existingLike = await prisma.reviewLike.findUnique({
    where: {
      reviewId_userId: {
        reviewId,
        userId
      }
    },
    select: {
      id: true
    }
  });

  if (!existingLike) {
    await prisma.$transaction(async (tx) => {
      await tx.reviewLike.create({
        data: {
          reviewId,
          userId
        }
      });

      const existingNotification = await tx.notification.findFirst({
        where: {
          recipientUserId: review.userId,
          actorUserId: userId,
          reviewId,
          type: NotificationType.REVIEW_LIKED,
          readAt: null
        },
        select: {
          id: true
        }
      });

      if (!existingNotification) {
        await tx.notification.create({
          data: {
            recipientUserId: review.userId,
            actorUserId: userId,
            reviewId,
            type: NotificationType.REVIEW_LIKED
          }
        });
      }
    });
  }

  const likesCount = await prisma.reviewLike.count({
    where: {
      reviewId
    }
  });

  return {
    likesCount,
    likedByMe: true
  };
}

export async function unlikeReviewById(
  userId: string,
  reviewId: string
): Promise<{ likesCount: number; likedByMe: boolean }> {
  const review = await prisma.review.findUnique({
    where: {
      id: reviewId
    },
    select: {
      id: true,
      userId: true,
      visibilityStatus: true
    }
  });

  if (!review || review.visibilityStatus !== ReviewVisibilityStatus.ACTIVE) {
    throw new AppError(404, "Review not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.reviewLike.deleteMany({
      where: {
        reviewId,
        userId
      }
    });

    await tx.notification.deleteMany({
      where: {
        recipientUserId: review.userId,
        actorUserId: userId,
        reviewId,
        type: NotificationType.REVIEW_LIKED,
        readAt: null
      }
    });
  });

  const likesCount = await prisma.reviewLike.count({
    where: {
      reviewId
    }
  });

  return {
    likesCount,
    likedByMe: false
  };
}
