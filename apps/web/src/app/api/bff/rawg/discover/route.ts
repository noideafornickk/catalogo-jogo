import { NextResponse } from "next/server";
import { apiClient } from "@/lib/bff/apiClient";

export async function GET() {
  const { status, data } = await apiClient("/rawg/discover");
  return NextResponse.json(data, { status });
}
