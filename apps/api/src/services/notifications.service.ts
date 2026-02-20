import type { AdminSendMessageResponse, NotificationsResponse } from "@gamebox/shared/types/api";
import type { AdminMessageInput } from "@gamebox/shared/validators/moderation";
import { AppError } from "../middlewares/errorHandler";
import { prisma } from "../db/prisma";

export async function getMyNotifications(
  userId: string,
  limit = 20
): Promise<NotificationsResponse> {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 100)) : 20;

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        recipientUserId: userId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: safeLimit,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        },
        review: {
          select: {
            id: true,
            game: {
              select: {
                rawgId: true,
                title: true
              }
            },
            _count: {
              select: {
                likes: true
              }
            }
          }
        },
        follow: {
          select: {
            id: true,
            status: true,
            followerUserId: true,
            followingUserId: true
          }
        }
      }
    }),
    prisma.notification.count({
      where: {
        recipientUserId: userId,
        readAt: null
      }
    })
  ]);

  return {
    unreadCount,
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      createdAt: item.createdAt.toISOString(),
      readAt: item.readAt ? item.readAt.toISOString() : null,
      actor: {
        id: item.actor.id,
        name: item.actor.name,
        avatarUrl: item.actor.avatarUrl
      },
      review: item.review
        ? {
            id: item.review.id,
            game: {
              rawgId: item.review.game.rawgId,
              title: item.review.game.title
            },
            likesCount: item.review._count.likes
          }
        : null,
      message: {
        title: item.title ?? null,
        body: item.body ?? null
      },
      follow: item.follow
        ? {
            id: item.follow.id,
            status: item.follow.status,
            followerUserId: item.follow.followerUserId,
            followingUserId: item.follow.followingUserId
          }
        : null
    }))
  };
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      recipientUserId: userId,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  return {
    updated: result.count > 0
  };
}

export async function markAllNotificationsAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: {
      recipientUserId: userId,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  return {
    updatedCount: result.count
  };
}

export async function sendAdminMessage(
  adminUserId: string,
  input: AdminMessageInput
): Promise<AdminSendMessageResponse> {
  if (input.recipientUserId) {
    const recipient = await prisma.user.findUnique({
      where: {
        id: input.recipientUserId
      },
      select: {
        id: true
      }
    });

    if (!recipient) {
      throw new AppError(404, "Recipient user not found");
    }

    if (recipient.id === adminUserId) {
      throw new AppError(400, "Admin cannot send a message to self");
    }

    await prisma.notification.create({
      data: {
        recipientUserId: recipient.id,
        actorUserId: adminUserId,
        type: "ADMIN_MESSAGE",
        title: input.title,
        body: input.body
      }
    });

    return {
      ok: true,
      sentCount: 1,
      recipientMode: "single"
    };
  }

  const recipients = await prisma.user.findMany({
    where: {
      id: {
        not: adminUserId
      }
    },
    select: {
      id: true
    }
  });

  if (recipients.length === 0) {
    return {
      ok: true,
      sentCount: 0,
      recipientMode: "broadcast"
    };
  }

  const chunkSize = 500;
  for (let index = 0; index < recipients.length; index += chunkSize) {
    const chunk = recipients.slice(index, index + chunkSize);

    await prisma.notification.createMany({
      data: chunk.map((recipient) => ({
        recipientUserId: recipient.id,
        actorUserId: adminUserId,
        type: "ADMIN_MESSAGE",
        title: input.title,
        body: input.body
      }))
    });
  }

  return {
    ok: true,
    sentCount: recipients.length,
    recipientMode: "broadcast"
  };
}
