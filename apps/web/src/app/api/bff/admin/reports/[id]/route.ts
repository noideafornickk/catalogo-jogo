import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { apiClient } from "@/lib/bff/apiClient";
import { signApiJwt } from "@/lib/bff/signApiJwt";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as unknown;
  const token = signApiJwt(user);
  const { id } = await context.params;

  const { status, data } = await apiClient(`/admin/reports/${id}`, {
    method: "PATCH",
    body: payload,
    token
  });

  return NextResponse.json(data, { status });
}
