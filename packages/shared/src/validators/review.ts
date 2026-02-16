import { z } from "zod";
import { Status } from "../constants/enums";

const reviewBodySchema = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value === "" ? undefined : value));

export const reviewValidator = z.object({
  rawgId: z.number().int().positive(),
  rating: z.number().int().min(1).max(10),
  recommend: z.boolean(),
  status: z.nativeEnum(Status),
  body: reviewBodySchema
});

export const reviewUpdateValidator = z
  .object({
    rating: z.number().int().min(1).max(10).optional(),
    recommend: z.boolean().optional(),
    status: z.nativeEnum(Status).optional(),
    body: reviewBodySchema
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one field is required"
  });

export type ReviewInput = z.infer<typeof reviewValidator>;
export type ReviewUpdateInput = z.infer<typeof reviewUpdateValidator>;
