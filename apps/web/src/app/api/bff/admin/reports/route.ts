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
  const statusParam = request.nextUrl.searchParams.get("status");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const query = new URLSearchParams();

  if (statusParam) {
    query.set("status", statusParam);
  }

  if (limitParam) {
    query.set("limit", limitParam);
  }

  const path = query.size > 0 ? `/admin/reports?${query.toString()}` : "/admin/reports";
  const { status, data } = await apiClient(path, { token });
  return NextResponse.json(data, { status });
}
