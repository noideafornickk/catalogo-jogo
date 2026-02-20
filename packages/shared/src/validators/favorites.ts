import { z } from "zod";

export const favoriteRawgIdValidator = z
  .number()
  .int()
  .positive();

export const favoritesUpdateValidator = z.object({
  rawgIds: z
    .array(favoriteRawgIdValidator)
    .max(4)
    .refine((items) => new Set(items).size === items.length, {
      message: "rawgIds must not contain duplicates"
    })
});

export type FavoritesUpdateInput = z.infer<typeof favoritesUpdateValidator>;
