import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { apiClient } from "@/lib/bff/apiClient";
import { signApiJwt } from "@/lib/bff/signApiJwt";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = signApiJwt(user);
  const { status, data } = await apiClient("/profile/me/favorites", {
    token
  });

  return NextResponse.json(data, { status });
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = signApiJwt(user);
  const payload = (await request.json()) as unknown;

  const { status, data } = await apiClient("/profile/me/favorites", {
    method: "PUT",
    body: payload,
    token
  });

  return NextResponse.json(data, { status });
}
