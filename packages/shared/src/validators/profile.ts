import { z } from "zod";

const badgeVisibilityValidator = z
  .object({
    first_of_many: z.boolean().optional(),
    reviews_master: z.boolean().optional(),
    review_critic: z.boolean().optional(),
    followers_star: z.boolean().optional(),
    full_explorer: z.boolean().optional()
  })
  .strict()
  .optional();

export const profileValidator = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  bio: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  isPrivate: z.boolean().optional(),
  badgeVisibility: badgeVisibilityValidator
});

export type ProfileInput = z.infer<typeof profileValidator>;
