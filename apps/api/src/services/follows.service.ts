import {
  FollowStatus,
  NotificationType,
  type Prisma
} from "@prisma/client";
import { FollowRelationshipStatus } from "@gamebox/shared/constants/enums";
import type {
  FollowMutationResponse,
  FollowRequestDecisionResponse
} from "@gamebox/shared/types/api";
import { prisma } from "../db/prisma";
import { AppError } from "../middlewares/errorHandler";

function mapFollowStatusToRelationship(
  status: FollowStatus | null,
  isSelf: boolean
): FollowRelationshipStatus {
  if (isSelf) {
    return FollowRelationshipStatus.SELF;
  }

  if (status === FollowStatus.ACCEPTED) {
    return FollowRelationshipStatus.FOLLOWING;
  }

  if (status === FollowStatus.PENDING) {
    return FollowRelationshipStatus.REQUESTED;
  }

  return FollowRelationshipStatus.NONE;
}

async function createUnreadFollowNotificationIfMissing(
  tx: Prisma.TransactionClient,
  params: {
    recipientUserId: string;
    actorUserId: string;
    followId: string;
    type: NotificationType;
  }
): Promise<void> {
  const existing = await tx.notification.findFirst({
    where: {
      recipientUserId: params.recipientUserId,
      actorUserId: params.actorUserId,
      followId: params.followId,
      type: params.type,
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
      recipientUserId: params.recipientUserId,
      actorUserId: params.actorUserId,
      followId: params.followId,
      type: params.type
    }
  });
}

type FollowStatusLookup = {
  relationshipStatus: FollowRelationshipStatus;
  canViewPrivateProfile: boolean;
  followId: string | null;
};

export async function getViewerFollowStatus(
  viewerUserId: string | undefined,
  targetUserId: string
): Promise<FollowStatusLookup> {
  const isSelf = viewerUserId === targetUserId;
  if (!viewerUserId) {
    return {
      relationshipStatus: FollowRelationshipStatus.NONE,
      canViewPrivateProfile: false,
      followId: null
    };
  }

  if (isSelf) {
    return {
      relationshipStatus: FollowRelationshipStatus.SELF,
      canViewPrivateProfile: true,
      followId: null
    };
  }

  const relation = await prisma.follow.findUnique({
    where: {
      followerUserId_followingUserId: {
        followerUserId: viewerUserId,
        followingUserId: targetUserId
      }
    },
    select: {
      id: true,
      status: true
    }
  });

  const relationshipStatus = mapFollowStatusToRelationship(relation?.status ?? null, false);
  return {
    relationshipStatus,
    canViewPrivateProfile: relation?.status === FollowStatus.ACCEPTED,
    followId: relation?.id ?? null
  };
}

export async function followUser(
  followerUserId: string,
  targetUserId: string
): Promise<FollowMutationResponse> {
  if (followerUserId === targetUserId) {
    throw new AppError(400, "You cannot follow yourself");
  }

  const targetUser = await prisma.user.findUnique({
    where: {
      id: targetUserId
    },
    select: {
      id: true,
      profile: {
        select: {
          isPrivate: true
        }
      }
    }
  });

  if (!targetUser) {
    throw new AppError(404, "User not found");
  }

  const targetIsPrivate = targetUser.profile?.isPrivate ?? false;
  const existing = await prisma.follow.findUnique({
    where: {
      followerUserId_followingUserId: {
        followerUserId,
        followingUserId: targetUserId
      }
    },
    select: {
      id: true,
      status: true
    }
  });

  if (existing?.status === FollowStatus.ACCEPTED) {
    return {
      ok: true,
      status: FollowRelationshipStatus.FOLLOWING,
      followId: existing.id,
      requiresApproval: false
    };
  }

  if (existing?.status === FollowStatus.PENDING && targetIsPrivate) {
    await prisma.$transaction(async (tx) => {
      await createUnreadFollowNotificationIfMissing(tx, {
        recipientUserId: targetUserId,
        actorUserId: followerUserId,
        followId: existing.id,
        type: NotificationType.FOLLOW_REQUEST
      });
    });

    return {
      ok: true,
      status: FollowRelationshipStatus.REQUESTED,
      followId: existing.id,
      requiresApproval: true
    };
  }

  if (existing?.status === FollowStatus.PENDING && !targetIsPrivate) {
    await prisma.$transaction(async (tx) => {
      await tx.follow.update({
        where: {
          id: existing.id
        },
        data: {
          status: FollowStatus.ACCEPTED
        }
      });

      await tx.notification.updateMany({
        where: {
          followId: existing.id,
          type: NotificationType.FOLLOW_REQUEST,
          recipientUserId: targetUserId,
          readAt: null
        },
        data: {
          readAt: new Date()
        }
      });

      await createUnreadFollowNotificationIfMissing(tx, {
        recipientUserId: targetUserId,
        actorUserId: followerUserId,
        followId: existing.id,
        type: NotificationType.FOLLOW_CREATED
      });
    });

    return {
      ok: true,
      status: FollowRelationshipStatus.FOLLOWING,
      followId: existing.id,
      requiresApproval: false
    };
  }

  const desiredStatus = targetIsPrivate ? FollowStatus.PENDING : FollowStatus.ACCEPTED;

  const created = await prisma.$transaction(async (tx) => {
    const follow = await tx.follow.create({
      data: {
        followerUserId,
        followingUserId: targetUserId,
        status: desiredStatus
      },
      select: {
        id: true
      }
    });

    await createUnreadFollowNotificationIfMissing(tx, {
      recipientUserId: targetUserId,
      actorUserId: followerUserId,
      followId: follow.id,
      type:
        desiredStatus === FollowStatus.PENDING
          ? NotificationType.FOLLOW_REQUEST
          : NotificationType.FOLLOW_CREATED
    });

    return follow;
  });

  return {
    ok: true,
    status:
      desiredStatus === FollowStatus.PENDING
        ? FollowRelationshipStatus.REQUESTED
        : FollowRelationshipStatus.FOLLOWING,
    followId: created.id,
    requiresApproval: desiredStatus === FollowStatus.PENDING
  };
}

export async function unfollowUser(
  followerUserId: string,
  targetUserId: string
): Promise<FollowMutationResponse> {
  if (followerUserId === targetUserId) {
    throw new AppError(400, "You cannot unfollow yourself");
  }

  const existing = await prisma.follow.findUnique({
    where: {
      followerUserId_followingUserId: {
        followerUserId,
        followingUserId: targetUserId
      }
    },
    select: {
      id: true
    }
  });

  if (!existing) {
    return {
      ok: true,
      status: FollowRelationshipStatus.NONE,
      followId: null,
      requiresApproval: false
    };
  }

  await prisma.follow.delete({
    where: {
      id: existing.id
    }
  });

  return {
    ok: true,
    status: FollowRelationshipStatus.NONE,
    followId: null,
    requiresApproval: false
  };
}

export async function respondToFollowRequest(
  currentUserId: string,
  followId: string,
  action: "accept" | "reject"
): Promise<FollowRequestDecisionResponse> {
  const relation = await prisma.follow.findUnique({
    where: {
      id: followId
    },
    select: {
      id: true,
      status: true,
      followerUserId: true,
      followingUserId: true
    }
  });

  if (!relation) {
    throw new AppError(404, "Follow request not found");
  }

  if (relation.followingUserId !== currentUserId) {
    throw new AppError(403, "Forbidden");
  }

  if (relation.status !== FollowStatus.PENDING) {
    throw new AppError(400, "Follow request is no longer pending");
  }

  if (action === "accept") {
    await prisma.$transaction(async (tx) => {
      await tx.follow.update({
        where: {
          id: relation.id
        },
        data: {
          status: FollowStatus.ACCEPTED
        }
      });

      await tx.notification.updateMany({
        where: {
          followId: relation.id,
          type: NotificationType.FOLLOW_REQUEST,
          recipientUserId: currentUserId,
          readAt: null
        },
        data: {
          readAt: new Date()
        }
      });

      await createUnreadFollowNotificationIfMissing(tx, {
        recipientUserId: relation.followerUserId,
        actorUserId: currentUserId,
        followId: relation.id,
        type: NotificationType.FOLLOW_ACCEPTED
      });
    });

    return {
      ok: true,
      status: FollowRelationshipStatus.FOLLOWING,
      followId: relation.id
    };
  }

  await prisma.follow.delete({
    where: {
      id: relation.id
    }
  });

  return {
    ok: true,
    status: FollowRelationshipStatus.NONE,
    followId: relation.id
  };
}

export async function getFollowCounters(userId: string): Promise<{
  followersCount: number;
  followingCount: number;
}> {
  const [followersCount, followingCount] = await Promise.all([
    prisma.follow.count({
      where: {
        followingUserId: userId,
        status: FollowStatus.ACCEPTED
      }
    }),
    prisma.follow.count({
      where: {
        followerUserId: userId,
        status: FollowStatus.ACCEPTED
      }
    })
  ]);

  return {
    followersCount,
    followingCount
  };
}
