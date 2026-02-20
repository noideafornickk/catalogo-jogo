export enum Status {
  WISHLIST = "WISHLIST",
  PLAYING = "PLAYING",
  FINISHED = "FINISHED",
  DROPPED = "DROPPED"
}

export const STATUS_VALUES = Object.values(Status);

export enum ReviewVisibilityStatus {
  ACTIVE = "ACTIVE",
  HIDDEN = "HIDDEN"
}

export const REVIEW_VISIBILITY_STATUS_VALUES = Object.values(ReviewVisibilityStatus);

export enum ReportReason {
  OFFENSIVE = "OFFENSIVE",
  HATE = "HATE",
  SPAM = "SPAM",
  SEXUAL = "SEXUAL",
  PERSONAL_DATA = "PERSONAL_DATA",
  OTHER = "OTHER"
}

export const REPORT_REASON_VALUES = Object.values(ReportReason);

export enum ReportStatus {
  OPEN = "OPEN",
  RESOLVED = "RESOLVED",
  DISMISSED = "DISMISSED"
}

export const REPORT_STATUS_VALUES = Object.values(ReportStatus);

export enum SuspensionAppealStatus {
  OPEN = "OPEN",
  RESOLVED = "RESOLVED",
  REJECTED = "REJECTED"
}

export const SUSPENSION_APPEAL_STATUS_VALUES = Object.values(SuspensionAppealStatus);

export enum FollowRelationshipStatus {
  NONE = "NONE",
  REQUESTED = "REQUESTED",
  FOLLOWING = "FOLLOWING",
  SELF = "SELF"
}

export const FOLLOW_RELATIONSHIP_STATUS_VALUES = Object.values(FollowRelationshipStatus);

export enum FollowRequestAction {
  ACCEPT = "accept",
  REJECT = "reject"
}

export const FOLLOW_REQUEST_ACTION_VALUES = Object.values(FollowRequestAction);

export enum RankBadgeCode {
  TOP_REVIEWS = "TOP_REVIEWS",
  TOP_LIKES = "TOP_LIKES",
  TOP_FOLLOWERS = "TOP_FOLLOWERS"
}

export const RANK_BADGE_CODE_VALUES = Object.values(RankBadgeCode);
