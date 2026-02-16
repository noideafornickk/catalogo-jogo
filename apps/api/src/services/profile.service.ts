import {
  ReviewVisibilityStatus,
  Status,
  SuspensionAppealStatus
} from "@prisma/client";
import { avatarApplyValidator } from "@gamebox/shared/validators/avatar";
import type { ProfileCounts } from "@gamebox/shared/types/api";
import type { SuspensionAppealCreateResponse } from "@gamebox/shared/types/api";
import { createSuspensionAppealValidator } from "@gamebox/shared/validators/moderation";
import { profileValidator } from "@gamebox/shared/validators/profile";
import { prisma } from "../db/prisma";
import { AppError } from "../middlewares/errorHandler";
import { getReviewsByUser } from "./reviews.service";
import { isAdminEmail } from "../utils/admin";
import {
  buildAvatarUrl,
  destroyAvatarAsset,
  isValidAvatarPublicIdForUser,
  normalizeAvatarCrop,
  uploadAvatarOriginalToCloudinary,
  type AvatarCrop,
  type AvatarUploadFile
} from "./avatar.service";

export type JwtIdentity = {
  googleSub: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
};

function toIsoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function isFutureDate(value: Date | null): boolean {
  if (!value) {
    return false;
  }

  return value.getTime() > Date.now();
}

function parseAvatarCrop(value: string | null): AvatarCrop | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    const validated = avatarApplyValidator.shape.crop.parse(parsed);
    return normalizeAvatarCrop(validated);
  } catch {
    return null;
  }
}

export async function ensureUserWithProfile(identity: JwtIdentity) {
  let user = await prisma.user.findUnique({
    where: { googleSub: identity.googleSub }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        googleSub: identity.googleSub,
        name: identity.name ?? "Usuario",
        avatarUrl: identity.avatarUrl ?? ""
      }
    });
  } else if (!user.avatarUrl && identity.avatarUrl) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: identity.avatarUrl }
    });
  }

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {}
  });

  return { user, profile };
}

export async function getMyProfile(userId: string, requesterEmail?: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true }
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const counts = await getProfileCounts(userId);

  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    avatarPublicId: user.avatarPublicId,
    avatarCrop: parseAvatarCrop(user.avatarCrop ?? null),
    bio: user.profile?.bio ?? null,
    isPrivate: user.profile?.isPrivate ?? false,
    isAdmin: isAdminEmail(requesterEmail),
    suspendedUntil: toIsoOrNull(user.suspendedUntil),
    isSuspended: isFutureDate(user.suspendedUntil),
    counts
  };
}

export async function updateMyProfile(
  userId: string,
  input: unknown,
  requesterEmail?: string | null
) {
  const parsed = profileValidator.parse(input);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        ...(parsed.name !== undefined ? { name: parsed.name } : {})
      }
    }),
    prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        bio: parsed.bio ?? null,
        isPrivate: parsed.isPrivate ?? false
      },
      update: {
        bio: parsed.bio ?? null,
        ...(parsed.isPrivate !== undefined ? { isPrivate: parsed.isPrivate } : {})
      }
    })
  ]);

  return getMyProfile(userId, requesterEmail);
}

export async function uploadMyAvatarOriginal(userId: string, file: AvatarUploadFile) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const uploaded = await uploadAvatarOriginalToCloudinary(userId, file);

  return {
    publicId: uploaded.publicId
  };
}

export async function updateMyAvatar(userId: string, input: unknown, requesterEmail?: string | null) {
  const parsed = avatarApplyValidator.parse(input);
  const crop = normalizeAvatarCrop(parsed.crop);

  if (!isValidAvatarPublicIdForUser(parsed.publicId, userId)) {
    throw new AppError(400, "publicId de avatar inválido para este usuário.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      avatarPublicId: true
    }
  });

  if (!existingUser) {
    throw new AppError(404, "User not found");
  }

  const avatarUrl = buildAvatarUrl(parsed.publicId, crop);

  await prisma.user.update({
    where: { id: userId },
    data: {
      avatarPublicId: parsed.publicId,
      avatarCrop: JSON.stringify(crop),
      avatarUrl
    }
  });

  if (existingUser.avatarPublicId && existingUser.avatarPublicId !== parsed.publicId) {
    await destroyAvatarAsset(existingUser.avatarPublicId);
  }

  return getMyProfile(userId, requesterEmail);
}

async function getProfileCounts(userId: string): Promise<ProfileCounts> {
  const [
    totalReviews,
    finishedCount,
    playingCount,
    wishlistCount,
    droppedCount,
    totalLikesReceived
  ] = await Promise.all([
    prisma.review.count({
      where: { userId, visibilityStatus: ReviewVisibilityStatus.ACTIVE }
    }),
    prisma.review.count({
      where: {
        userId,
        status: Status.FINISHED,
        visibilityStatus: ReviewVisibilityStatus.ACTIVE
      }
    }),
    prisma.review.count({
      where: {
        userId,
        status: Status.PLAYING,
        visibilityStatus: ReviewVisibilityStatus.ACTIVE
      }
    }),
    prisma.review.count({
      where: {
        userId,
        status: Status.WISHLIST,
        visibilityStatus: ReviewVisibilityStatus.ACTIVE
      }
    }),
    prisma.review.count({
      where: {
        userId,
        status: Status.DROPPED,
        visibilityStatus: ReviewVisibilityStatus.ACTIVE
      }
    }),
    prisma.reviewLike.count({
      where: {
        review: {
          userId,
          visibilityStatus: ReviewVisibilityStatus.ACTIVE
        }
      }
    })
  ]);

  return {
    totalReviews,
    finishedCount,
    playingCount,
    wishlistCount,
    droppedCount,
    totalLikesReceived
  };
}

export async function getPublicProfile(targetUserId: string, viewerUserId?: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: targetUserId
    },
    include: {
      profile: true
    }
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const isPrivate = user.profile?.isPrivate ?? false;
  const isOwner = viewerUserId === user.id;
  if (isPrivate && !isOwner) {
    throw new AppError(403, "Profile is private");
  }

  const [counts, reviews] = await Promise.all([
    getProfileCounts(user.id),
    getReviewsByUser(user.id, viewerUserId)
  ]);

  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    avatarPublicId: user.avatarPublicId,
    avatarCrop: parseAvatarCrop(user.avatarCrop ?? null),
    bio: user.profile?.bio ?? null,
    isPrivate,
    counts,
    reviews
  };
}

export async function createMySuspensionAppeal(
  userId: string,
  input: unknown
): Promise<SuspensionAppealCreateResponse> {
  const parsed = createSuspensionAppealValidator.parse(input ?? {});

  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      suspendedUntil: true
    }
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const isSuspended = Boolean(
    user.suspendedUntil && user.suspendedUntil.getTime() > Date.now()
  );
  if (!isSuspended) {
    throw new AppError(400, "account_not_suspended");
  }

  const existingOpenAppeal = await prisma.suspensionAppeal.findFirst({
    where: {
      userId,
      status: SuspensionAppealStatus.OPEN
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      status: true
    }
  });

  if (existingOpenAppeal) {
    return {
      ok: true,
      appealId: existingOpenAppeal.id,
      status: existingOpenAppeal.status as SuspensionAppealCreateResponse["status"]
    };
  }

  const created = await prisma.suspensionAppeal.create({
    data: {
      userId,
      message:
        parsed.message ??
        "Solicito revisão da suspensão. Acredito que houve um engano."
    },
    select: {
      id: true,
      status: true
    }
  });

  return {
    ok: true,
    appealId: created.id,
    status: created.status as SuspensionAppealCreateResponse["status"]
  };
}
