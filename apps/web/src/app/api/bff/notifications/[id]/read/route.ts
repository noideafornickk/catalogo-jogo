import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { apiClient } from "@/lib/bff/apiClient";
import { signApiJwt } from "@/lib/bff/signApiJwt";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = signApiJwt(user);
  const { id } = await context.params;

  const { status, data } = await apiClient(`/notifications/${id}/read`, {
    method: "PATCH",
    token
  });

  return NextResponse.json(data, { status });
}
