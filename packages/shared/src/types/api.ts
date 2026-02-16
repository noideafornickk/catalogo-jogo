import { GameSummary } from "./game";
import { ReviewItem } from "./review";
import {
  ReportReason,
  ReportStatus,
  ReviewVisibilityStatus
} from "../constants/enums";

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
  message?: string;
  suspendedUntil?: string | null;
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
  isAdmin: boolean;
  suspendedUntil: string | null;
  isSuspended: boolean;
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

export type NotificationType =
  | "REVIEW_LIKED"
  | "REPORT_RESOLVED"
  | "REVIEW_MODERATED";

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

export type ReviewReportCreateResponse = {
  ok: true;
  reportId: string;
};

export type SuspensionAppealCreateResponse = {
  ok: true;
  appealId: string;
  status: "OPEN" | "RESOLVED" | "REJECTED";
};

export type AdminReportItem = {
  id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  review: {
    id: string;
    rating: number;
    body: string | null;
    createdAt: string;
    visibilityStatus: ReviewVisibilityStatus;
    hiddenAt: string | null;
    hiddenReason: string | null;
    game: {
      rawgId: number;
      title: string;
    };
    author: {
      id: string;
      name: string;
      avatarUrl: string;
      isPrivate: boolean;
      suspendedUntil: string | null;
      activeStrikeCount: number;
    };
  };
  reporter: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  resolvedBy: {
    id: string;
    name: string;
  } | null;
};

export type AdminReportsResponse = {
  status: ReportStatus;
  limit: number;
  items: AdminReportItem[];
};

export type AdminSuspensionAppealItem = {
  id: string;
  status: "OPEN" | "RESOLVED" | "REJECTED";
  message: string | null;
  createdAt: string;
  resolvedAt: string | null;
  suspendedUntil: string | null;
  user: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  resolvedBy: {
    id: string;
    name: string;
  } | null;
};

export type AdminSuspensionAppealsResponse = {
  status: "OPEN" | "RESOLVED" | "REJECTED";
  limit: number;
  items: AdminSuspensionAppealItem[];
};
