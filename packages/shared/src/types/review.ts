import { ReviewVisibilityStatus, Status } from "../constants/enums";
import type { RankBadge } from "./rank";

export type ReviewPayload = {
  rawgId: number;
  rating: number;
  recommend: boolean;
  status: Status;
  body?: string;
};

export type ReviewItem = {
  id: string;
  rating: number;
  recommend: boolean;
  status: Status;
  visibilityStatus: ReviewVisibilityStatus;
  body: string | null;
  likesCount: number;
  likedByMe: boolean;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
  game: {
    rawgId: number;
    title: string;
    coverUrl: string | null;
    released: string | null;
    descriptionPreview: string | null;
    reviewCount: number;
    otherReviewsCount: number;
    otherReviewers: Array<{
      id: string;
      name: string;
      avatarUrl: string;
    }>;
  };
  user: {
    id: string;
    name: string;
    avatarUrl: string;
    isPrivate: boolean;
    rankBadges: RankBadge[];
  };
};
