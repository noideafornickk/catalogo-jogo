import { NotificationType, type Prisma } from "@prisma/client";
import { reviewUpdateValidator, reviewValidator } from "@gamebox/shared/validators/review";
import type { ReviewItem } from "@gamebox/shared/types/review";
import type { PaginatedReviewsResponse } from "@gamebox/shared/types/api";
import { prisma } from "../db/prisma";
import { AppError } from "../middlewares/errorHandler";
import { getRawgGameDetails, syncGameDescriptions } from "./rawg.service";
import { toIsoDate } from "../utils/dates";
import { toDescriptionPreview } from "../utils/text";
import { normalizeRawgImageUrl } from "../utils/rawgImage";

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
          reviews: true
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
  likedByMe: boolean,
  isOwner: boolean
): ReviewItem {
  return {
    id: review.id,
    rating: review.rating,
    recommend: review.recommend,
    status: review.status,
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
      reviewCount: review.game._count.reviews
    },
    user: {
      id: review.user.id,
      name: review.user.name,
      avatarUrl: review.user.avatarUrl,
      isPrivate: review.user.profile?.isPrivate ?? false
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

  return rows.map((row) =>
    toReviewItem(
      row,
      descriptionMap.get(row.game.rawgId) ?? (row.game.descriptionText?.trim() || null),
      likedReviewIds.has(row.id),
      viewerUserId ? row.user.id === viewerUserId : false
    )
  );
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
  const rows = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: reviewInclude
  });

  return toReviewItems(rows, viewerUserId);
}

export async function getRecentReviewsPage(
  limit: number,
  offset: number,
  viewerUserId?: string
): Promise<PaginatedReviewsResponse> {
  const rows = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: limit + 1,
    include: reviewInclude
  });

  return toPaginatedReviewResponse(rows, limit, offset, viewerUserId);
}

export async function getReviewsByGame(rawgId: number, viewerUserId?: string): Promise<ReviewItem[]> {
  const rows = await prisma.review.findMany({
    where: {
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
      userId
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
      userId
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
      userId: true
    }
  });

  if (!review) {
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
      userId: true
    }
  });

  if (!review) {
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
