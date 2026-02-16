import "server-only";
import jwt from "jsonwebtoken";
import type { SessionUser } from "../auth/session";

const secret = process.env.API_JWT_SECRET;

if (!secret) {
  throw new Error("API_JWT_SECRET is not configured for apps/web");
}

const jwtSecret: string = secret;

export function signApiJwt(user: SessionUser): string {
  if (!user.googleSub) {
    throw new Error("googleSub is required to sign API JWT");
  }

  return jwt.sign(
    {
      userId: user.googleSub,
      googleSub: user.googleSub,
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      avatarUrl: user.image ?? undefined
    },
    jwtSecret,
    {
      expiresIn: "60s"
    }
  );
}
