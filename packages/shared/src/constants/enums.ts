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
