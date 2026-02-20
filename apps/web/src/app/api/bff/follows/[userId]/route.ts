import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { apiClient } from "@/lib/bff/apiClient";
import { signApiJwt } from "@/lib/bff/signApiJwt";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = signApiJwt(sessionUser);
  const { userId } = await context.params;

  const { status, data } = await apiClient(`/follows/${encodeURIComponent(userId)}`, {
    method: "POST",
    token
  });

  return NextResponse.json(data, { status });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = signApiJwt(sessionUser);
  const { userId } = await context.params;

  const { status, data } = await apiClient(`/follows/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    token
  });

  return NextResponse.json(data, { status });
}
