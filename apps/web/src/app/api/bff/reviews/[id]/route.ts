import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { apiClient } from "@/lib/bff/apiClient";
import { signApiJwt } from "@/lib/bff/signApiJwt";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = signApiJwt(user);
  const payload = (await request.json()) as unknown;
  const params = await context.params;

  const { status, data } = await apiClient(`/reviews/${params.id}`, {
    method: "PUT",
    body: payload,
    token
  });

  return NextResponse.json(data, { status });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = signApiJwt(user);
  const params = await context.params;

  const { status } = await apiClient(`/reviews/${params.id}`, {
    method: "DELETE",
    token
  });

  return new NextResponse(null, { status });
}
