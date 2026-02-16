import type { NotificationsResponse } from "@gamebox/shared/types/api";
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
      review: {
        id: item.review.id,
        game: {
          rawgId: item.review.game.rawgId,
          title: item.review.game.title
        },
        likesCount: item.review._count.likes
      }
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
