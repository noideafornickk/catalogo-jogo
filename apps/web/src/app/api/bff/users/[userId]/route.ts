import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { apiClient } from "@/lib/bff/apiClient";
import { signApiJwt } from "@/lib/bff/signApiJwt";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { userId } = await context.params;
  const user = await getSessionUser();
  const token = user ? signApiJwt(user) : undefined;

  const { status, data } = await apiClient(`/profile/users/${encodeURIComponent(userId)}`, {
    token
  });

  return NextResponse.json(data, { status });
}
