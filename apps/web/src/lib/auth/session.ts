import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export type SessionUser = {
  googleSub: string;
  name?: string | null;
  image?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | {
        googleSub?: string;
        name?: string | null;
        image?: string | null;
      }
    | undefined;

  if (!user?.googleSub) {
    return null;
  }

  return {
    googleSub: user.googleSub,
    name: user.name,
    image: user.image
  };
}
