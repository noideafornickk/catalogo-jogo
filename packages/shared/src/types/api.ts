import { GameSummary } from "./game";
import { ReviewItem } from "./review";

export type RankingRange = "week" | "month";

export type RankingItem = {
  game: GameSummary;
  avgRating: number;
  reviewCount: number;
  score: number;
};

export type RankingsResponse = {
  range: RankingRange;
  fallback?: "month";
  items: RankingItem[];
};

export type ApiErrorResponse = {
  error: string;
};

export type PaginatedResponse<TItem> = {
  items: TItem[];
  limit: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
};

export type PaginatedReviewsResponse = PaginatedResponse<ReviewItem>;

export type ProfileCounts = {
  totalReviews: number;
  finishedCount: number;
  playingCount: number;
  wishlistCount: number;
  droppedCount: number;
  totalLikesReceived: number;
};

export type AvatarCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ProfileMeResponse = {
  id: string;
  name: string;
  avatarUrl: string;
  avatarPublicId: string | null;
  avatarCrop: AvatarCrop | null;
  bio: string | null;
  isPrivate: boolean;
  counts: ProfileCounts;
};

export type PublicProfileResponse = {
  id: string;
  name: string;
  avatarUrl: string;
  avatarPublicId: string | null;
  avatarCrop: AvatarCrop | null;
  bio: string | null;
  isPrivate: boolean;
  counts: ProfileCounts;
  reviews: ReviewItem[];
};

export type NotificationType = "REVIEW_LIKED";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  createdAt: string;
  readAt: string | null;
  actor: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  review: {
    id: string;
    game: {
      rawgId: number;
      title: string;
    };
    likesCount: number;
  };
};

export type NotificationsResponse = {
  unreadCount: number;
  items: NotificationItem[];
};
