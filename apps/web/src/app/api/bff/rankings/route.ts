import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/bff/apiClient";

export async function GET(request: NextRequest) {
  const range = request.nextUrl.searchParams.get("range") === "month" ? "month" : "week";
  const { status, data } = await apiClient(`/rankings?range=${range}`);
  return NextResponse.json(data, { status });
}
