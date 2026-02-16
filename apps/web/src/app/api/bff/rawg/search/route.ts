import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/bff/apiClient";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const { status, data } = await apiClient(`/rawg/search?q=${encodeURIComponent(q)}`);

  return NextResponse.json(data, { status });
}
