import {
  NotificationType,
  ReportStatus,
  SuspensionAppealStatus,
  ReviewVisibilityStatus,
  type Prisma
} from "@prisma/client";
import {
  ReportReason as SharedReportReason,
  ReportStatus as SharedReportStatus,
  ReviewVisibilityStatus as SharedReviewVisibilityStatus
} from "@gamebox/shared/constants/enums";
import type {
  AdminUserLookupResponse,
  AdminReportItem,
  AdminReportsResponse,
  AdminSuspensionAppealItem,
  AdminSuspensionAppealsResponse
} from "@gamebox/shared/types/api";
import { prisma } from "../db/prisma";
import { AppError } from "../middlewares/errorHandler";
import { env } from "../utils/env";

type GetAdminReportsOptions = {
  status: ReportStatus;
  limit: number;
};

type GetAdminSuspensionAppealsOptions = {
  status: SuspensionAppealStatus;
  limit: number;
};

const MODERATION_STRIKE_LIMIT = env.MODERATION_STRIKE_LIMIT;
const MODERATION_SUSPENSION_DAYS = env.MODERATION_SUSPENSION_DAYS;

function normalizeNullableText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function lookupAdminUsers(
  adminUserId: string,
  query: string,
  limit: number
): Promise<AdminUserLookupResponse> {
  const normalizedQuery = query.trim();
  const safeLimit = Number.isNaN(limit) || limit <= 0 ? 8 : Math.min(limit, 20);

  if (!normalizedQuery) {
    return {
      query: "",
      limit: safeLimit,
      items: []
    };
  }

  const rows = await prisma.user.findMany({
    where: {
      id: {
        not: adminUserId
      },
      OR: [
        {
          name: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        },
        {
          googleSub: {
            contains: normalizedQuery
          }
        }
      ]
    },
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
    take: safeLimit,
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      googleSub: true
    }
  });

  return {
    query: normalizedQuery,
    limit: safeLimit,
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      avatarUrl: row.avatarUrl,
      googleSub: row.googleSub
    }))
  };
}

async function createUnreadNotificationIfMissing(
  tx: Prisma.TransactionClient,
  recipientUserId: string,
  actorUserId: string,
  reviewId: string,
  type: NotificationType
): Promise<void> {
  const existing = await tx.notification.findFirst({
    where: {
      recipientUserId,
      actorUserId,
      reviewId,
      type,
      readAt: null
    },
    select: {
      id: true
    }
  });

  if (existing) {
    return;
  }

  await tx.notification.create({
    data: {
      recipientUserId,
      actorUserId,
      reviewId,
      type
    }
  });
}

export async function getAdminReports({
  status,
  limit
}: GetAdminReportsOptions): Promise<AdminReportsResponse> {
  const safeLimit = Number.isNaN(limit) || limit <= 0 ? 50 : Math.min(limit, 100);

  const rows = await prisma.reviewReport.findMany({
    where: {
      status
    },
    orderBy: {
      createdAt: "desc"
    },
    take: safeLimit,
    include: {
      review: {
        select: {
          id: true,
          rating: true,
          body: true,
          createdAt: true,
          visibilityStatus: true,
          hiddenAt: true,
          hiddenReason: true,
          game: {
            select: {
              rawgId: true,
              title: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              suspendedUntil: true,
              profile: {
                select: {
                  isPrivate: true
                }
              }
            }
          }
        }
      },
      reporter: {
        select: {
          id: true,
          name: true,
          avatarUrl: true
        }
      },
      resolvedByUser: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  const authorIds = Array.from(new Set(rows.map((row) => row.review.user.id)));
  const strikeCounts =
    authorIds.length > 0
      ? await prisma.moderationStrike.groupBy({
          by: ["userId"],
          where: {
            userId: {
              in: authorIds
            },
            revokedAt: null
          },
          _count: {
            _all: true
          }
        })
      : [];
  const activeStrikeCountByUserId = new Map(
    strikeCounts.map((row) => [row.userId, row._count._all])
  );

  const items: AdminReportItem[] = rows.map((row) => ({
    id: row.id,
    reason: row.reason as SharedReportReason,
    details: row.details,
    status: row.status as SharedReportStatus,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    review: {
      id: row.review.id,
      rating: row.review.rating,
      body: row.review.body,
      createdAt: row.review.createdAt.toISOString(),
      visibilityStatus: row.review.visibilityStatus as SharedReviewVisibilityStatus,
      hiddenAt: row.review.hiddenAt?.toISOString() ?? null,
      hiddenReason: row.review.hiddenReason ?? null,
      game: {
        rawgId: row.review.game.rawgId,
        title: row.review.game.title
      },
      author: {
        id: row.review.user.id,
        name: row.review.user.name,
        avatarUrl: row.review.user.avatarUrl,
        isPrivate: row.review.user.profile?.isPrivate ?? false,
        suspendedUntil: row.review.user.suspendedUntil?.toISOString() ?? null,
        activeStrikeCount: activeStrikeCountByUserId.get(row.review.user.id) ?? 0
      }
    },
    reporter: {
      id: row.reporter.id,
      name: row.reporter.name,
      avatarUrl: row.reporter.avatarUrl
    },
    resolvedBy: row.resolvedByUser
      ? {
          id: row.resolvedByUser.id,
          name: row.resolvedByUser.name
        }
      : null
  }));

  return {
    status: status as SharedReportStatus,
    limit: safeLimit,
    items
  };
}

export async function getAdminSuspensionAppeals({
  status,
  limit
}: GetAdminSuspensionAppealsOptions): Promise<AdminSuspensionAppealsResponse> {
  const safeLimit = Number.isNaN(limit) || limit <= 0 ? 50 : Math.min(limit, 100);

  const rows = await prisma.suspensionAppeal.findMany({
    where: {
      status
    },
    orderBy: {
      createdAt: "desc"
    },
    take: safeLimit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          suspendedUntil: true
        }
      },
      resolvedByUser: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  const items: AdminSuspensionAppealItem[] = rows.map((row) => ({
    id: row.id,
    status: row.status as AdminSuspensionAppealItem["status"],
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    suspendedUntil: row.user.suspendedUntil?.toISOString() ?? null,
    user: {
      id: row.user.id,
      name: row.user.name,
      avatarUrl: row.user.avatarUrl
    },
    resolvedBy: row.resolvedByUser
      ? {
          id: row.resolvedByUser.id,
          name: row.resolvedByUser.name
        }
      : null
  }));

  return {
    status: status as AdminSuspensionAppealsResponse["status"],
    limit: safeLimit,
    items
  };
}

export async function updateAdminSuspensionAppealStatus(
  appealId: string,
  status: SuspensionAppealStatus,
  adminUserId: string
): Promise<{ ok: true; status: SuspensionAppealStatus }> {
  const appeal = await prisma.suspensionAppeal.findUnique({
    where: {
      id: appealId
    },
    select: {
      id: true
    }
  });

  if (!appeal) {
    throw new AppError(404, "Appeal not found");
  }

  await prisma.suspensionAppeal.update({
    where: {
      id: appealId
    },
    data: {
      status,
      resolvedAt: new Date(),
      resolvedByUserId: adminUserId
    }
  });

  return {
    ok: true,
    status
  };
}

export async function updateAdminReportStatus(
  reportId: string,
  status: ReportStatus,
  adminUserId: string
): Promise<{ ok: true; status: ReportStatus }> {
  const report = await prisma.reviewReport.findUnique({
    where: {
      id: reportId
    },
    select: {
      id: true,
      reviewId: true,
      reporterUserId: true,
      review: {
        select: {
          userId: true,
          visibilityStatus: true
        }
      }
    }
  });

  if (!report) {
    throw new AppError(404, "Report not found");
  }

  await prisma.reviewReport.update({
    where: {
      id: reportId
    },
    data: {
      status,
      resolvedAt: new Date(),
      resolvedByUserId: adminUserId
    }
  });

  if (status === ReportStatus.RESOLVED) {
    await prisma.$transaction(async (tx) => {
      if (report.reporterUserId !== adminUserId) {
        await createUnreadNotificationIfMissing(
          tx,
          report.reporterUserId,
          adminUserId,
          report.reviewId,
          NotificationType.REPORT_RESOLVED
        );
      }

      if (
        report.review.visibilityStatus === ReviewVisibilityStatus.HIDDEN &&
        report.review.userId !== adminUserId
      ) {
        await createUnreadNotificationIfMissing(
          tx,
          report.review.userId,
          adminUserId,
          report.reviewId,
          NotificationType.REVIEW_MODERATED
        );
      }
    });
  }

  return {
    ok: true,
    status
  };
}

export async function hideReviewAsAdmin(
  reviewId: string,
  adminUserId: string,
  reason?: string
): Promise<{
  ok: true;
  visibilityStatus: ReviewVisibilityStatus;
  activeStrikeCount: number;
  strikeLimit: number;
  suspendedUntil: string | null;
}> {
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

  const now = new Date();
  const suspendedUntil = await prisma.$transaction(async (tx) => {
    await tx.review.update({
      where: {
        id: reviewId
      },
      data: {
        visibilityStatus: ReviewVisibilityStatus.HIDDEN,
        hiddenAt: now,
        hiddenReason: normalizeNullableText(reason),
        hiddenByUserId: adminUserId
      }
    });

    await tx.moderationStrike.upsert({
      where: {
        reviewId
      },
      create: {
        userId: review.userId,
        reviewId,
        issuedByUserId: adminUserId
      },
      update: {
        revokedAt: null,
        issuedByUserId: adminUserId
      }
    });

    const activeStrikeCount = await tx.moderationStrike.count({
      where: {
        userId: review.userId,
        revokedAt: null
      }
    });

    const currentUser = await tx.user.findUnique({
      where: {
        id: review.userId
      },
      select: {
        suspendedUntil: true
      }
    });

    if (!currentUser) {
      throw new AppError(404, "User not found");
    }

    let nextSuspendedUntil = currentUser.suspendedUntil;
    if (activeStrikeCount >= MODERATION_STRIKE_LIMIT) {
      const targetSuspendedUntil = new Date(
        now.getTime() + MODERATION_SUSPENSION_DAYS * 24 * 60 * 60 * 1000
      );
      if (!nextSuspendedUntil || nextSuspendedUntil < targetSuspendedUntil) {
        nextSuspendedUntil = targetSuspendedUntil;
      }

      await tx.user.update({
        where: {
          id: review.userId
        },
        data: {
          suspendedUntil: nextSuspendedUntil
        }
      });
    }

    return {
      activeStrikeCount,
      suspendedUntil: nextSuspendedUntil
    };
  });

  return {
    ok: true,
    visibilityStatus: ReviewVisibilityStatus.HIDDEN,
    activeStrikeCount: suspendedUntil.activeStrikeCount,
    strikeLimit: MODERATION_STRIKE_LIMIT,
    suspendedUntil: suspendedUntil.suspendedUntil?.toISOString() ?? null
  };
}

export async function unhideReviewAsAdmin(
  reviewId: string
): Promise<{
  ok: true;
  visibilityStatus: ReviewVisibilityStatus;
  activeStrikeCount: number;
  strikeLimit: number;
  suspendedUntil: string | null;
}> {
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

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    await tx.review.update({
      where: {
        id: reviewId
      },
      data: {
        visibilityStatus: ReviewVisibilityStatus.ACTIVE,
        hiddenAt: null,
        hiddenReason: null,
        hiddenByUserId: null
      }
    });

    await tx.moderationStrike.updateMany({
      where: {
        reviewId,
        revokedAt: null
      },
      data: {
        revokedAt: now
      }
    });

    const activeStrikeCount = await tx.moderationStrike.count({
      where: {
        userId: review.userId,
        revokedAt: null
      }
    });

    const user = await tx.user.findUnique({
      where: {
        id: review.userId
      },
      select: {
        suspendedUntil: true
      }
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    const shouldClearSuspension =
      activeStrikeCount < MODERATION_STRIKE_LIMIT && Boolean(user.suspendedUntil);
    if (shouldClearSuspension) {
      await tx.user.update({
        where: {
          id: review.userId
        },
        data: {
          suspendedUntil: null
        }
      });
    }

    return {
      activeStrikeCount,
      suspendedUntil: shouldClearSuspension ? null : user.suspendedUntil
    };
  });

  return {
    ok: true,
    visibilityStatus: ReviewVisibilityStatus.ACTIVE,
    activeStrikeCount: result.activeStrikeCount,
    strikeLimit: MODERATION_STRIKE_LIMIT,
    suspendedUntil: result.suspendedUntil?.toISOString() ?? null
  };
}
