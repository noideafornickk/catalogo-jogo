import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { apiClient } from "@/lib/bff/apiClient";
import { signApiJwt } from "@/lib/bff/signApiJwt";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode") ?? "recent";
  const rawgId = request.nextUrl.searchParams.get("rawgId");
  const pagination = request.nextUrl.searchParams.get("pagination");
  const limit = request.nextUrl.searchParams.get("limit") ?? "20";
  const offset = request.nextUrl.searchParams.get("offset");
  const sessionUser = await getSessionUser();
  const optionalToken = sessionUser ? signApiJwt(sessionUser) : undefined;

  if (mode === "mine") {
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = signApiJwt(sessionUser);
    const mineParams = new URLSearchParams();
    if (pagination === "1" || pagination === "true") {
      mineParams.set("pagination", "1");
      mineParams.set("limit", limit);
      mineParams.set("offset", offset ?? "0");
    }

    const minePath = mineParams.size > 0 ? `/reviews/mine?${mineParams.toString()}` : "/reviews/mine";
    const { status, data } = await apiClient(minePath, { token });
    return NextResponse.json(data, { status });
  }

  if (rawgId) {
    const { status, data } = await apiClient(`/reviews/game/${rawgId}`, {
      token: optionalToken
    });
    return NextResponse.json(data, { status });
  }

  const recentParams = new URLSearchParams();
  recentParams.set("limit", limit);
  if (pagination === "1" || pagination === "true") {
    recentParams.set("pagination", "1");
    recentParams.set("offset", offset ?? "0");
  }

  const { status, data } = await apiClient(`/reviews/recent?${recentParams.toString()}`, {
    token: optionalToken
  });
  return NextResponse.json(data, { status });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = signApiJwt(user);
  const payload = (await request.json()) as unknown;

  const { status, data } = await apiClient("/reviews", {
    method: "POST",
    body: payload,
    token
  });

  return NextResponse.json(data, { status });
}
