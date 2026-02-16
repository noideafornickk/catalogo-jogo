import { z } from "zod";

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
  isPrivate: z.boolean().optional()
});

export type ProfileInput = z.infer<typeof profileValidator>;
