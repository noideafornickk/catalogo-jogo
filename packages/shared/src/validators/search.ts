import { z } from "zod";

export const searchValidator = z.object({
  q: z.string().trim().min(2).max(50)
});

export type SearchInput = z.infer<typeof searchValidator>;
