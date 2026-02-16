import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { apiClient } from "@/lib/bff/apiClient";
import { signApiJwt } from "@/lib/bff/signApiJwt";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = signApiJwt(user);
  const limit = request.nextUrl.searchParams.get("limit") ?? "20";

  const { status, data } = await apiClient(`/notifications/me?limit=${encodeURIComponent(limit)}`, {
    token
  });

  return NextResponse.json(data, { status });
}
