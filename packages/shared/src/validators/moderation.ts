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

export const createSuspensionAppealValidator = z.object({
  message: suspensionAppealMessageSchema
});

export const adminSuspensionAppealStatusUpdateValidator = z.object({
  status: z.enum([SuspensionAppealStatus.RESOLVED, SuspensionAppealStatus.REJECTED])
});

export type ReviewReportInput = z.infer<typeof reviewReportValidator>;
export type AdminReportStatusUpdateInput = z.infer<typeof adminReportStatusUpdateValidator>;
export type AdminHideReviewInput = z.infer<typeof adminHideReviewValidator>;
export type CreateSuspensionAppealInput = z.infer<typeof createSuspensionAppealValidator>;
export type AdminSuspensionAppealStatusUpdateInput = z.infer<
  typeof adminSuspensionAppealStatusUpdateValidator
>;
