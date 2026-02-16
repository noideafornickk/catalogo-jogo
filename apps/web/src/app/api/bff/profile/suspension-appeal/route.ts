import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { apiClient } from "@/lib/bff/apiClient";
import { signApiJwt } from "@/lib/bff/signApiJwt";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as unknown;
  const token = signApiJwt(user);
  const { status, data } = await apiClient("/profile/me/suspension-appeal", {
    method: "POST",
    body: payload,
    token
  });

  return NextResponse.json(data, { status });
}
