import { z } from "zod";
import {
  ReportReason,
  ReportStatus,
  SuspensionAppealStatus
} from "../constants/enums";

const reportDetailsSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const hideReasonSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const suspensionAppealMessageSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value === "" ? undefined : value));

export const reviewReportValidator = z.object({
  reason: z.nativeEnum(ReportReason),
  details: reportDetailsSchema
});

export const adminReportStatusUpdateValidator = z.object({
  status: z.enum([ReportStatus.RESOLVED, ReportStatus.DISMISSED])
});

export const adminHideReviewValidator = z.object({
  reason: hideReasonSchema
});

export const adminMessageValidator = z.object({
  recipientUserId: z
    .string()
    .trim()
    .uuid()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(1).max(1200)
});

export const adminUserLookupQueryValidator = z.object({
  query: z.string().trim().min(1).max(80),
  limit: z.coerce.number().int().min(1).max(20).default(8)
});

export const createSuspensionAppealValidator = z.object({
  message: suspensionAppealMessageSchema
});

export const adminSuspensionAppealStatusUpdateValidator = z.object({
  status: z.enum([SuspensionAppealStatus.RESOLVED, SuspensionAppealStatus.REJECTED])
});

export type ReviewReportInput = z.infer<typeof reviewReportValidator>;
export type AdminReportStatusUpdateInput = z.infer<typeof adminReportStatusUpdateValidator>;
export type AdminHideReviewInput = z.infer<typeof adminHideReviewValidator>;
export type AdminMessageInput = z.infer<typeof adminMessageValidator>;
export type AdminUserLookupQueryInput = z.infer<typeof adminUserLookupQueryValidator>;
export type CreateSuspensionAppealInput = z.infer<typeof createSuspensionAppealValidator>;
export type AdminSuspensionAppealStatusUpdateInput = z.infer<
  typeof adminSuspensionAppealStatusUpdateValidator
>;
