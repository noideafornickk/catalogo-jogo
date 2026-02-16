import { NextResponse } from "next/server";
import { apiClient } from "@/lib/bff/apiClient";

type RouteContext = {
  params: Promise<{ idOrSlug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { idOrSlug } = await context.params;
  const { status, data } = await apiClient(`/rawg/games/${encodeURIComponent(idOrSlug)}`);

  return NextResponse.json(data, { status });
}
