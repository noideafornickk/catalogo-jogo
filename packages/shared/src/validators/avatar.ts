import { z } from "zod";

const cropNumber = z.number().finite().nonnegative().max(10000);

export const avatarCropValidator = z.object({
  x: cropNumber,
  y: cropNumber,
  width: cropNumber.positive(),
  height: cropNumber.positive()
});

export const avatarApplyValidator = z.object({
  publicId: z.string().trim().min(1).max(255),
  crop: avatarCropValidator
});

export type AvatarCropInput = z.infer<typeof avatarCropValidator>;
export type AvatarApplyInput = z.infer<typeof avatarApplyValidator>;
