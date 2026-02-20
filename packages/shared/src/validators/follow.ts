import { z } from "zod";
import { FollowRequestAction } from "../constants/enums";

export const followRequestActionValidator = z.object({
  action: z.nativeEnum(FollowRequestAction)
});

export type FollowRequestActionInput = z.infer<typeof followRequestActionValidator>;
