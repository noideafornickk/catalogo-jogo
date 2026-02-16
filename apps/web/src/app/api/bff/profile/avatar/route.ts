import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { signApiJwt } from "@/lib/bff/signApiJwt";
import { apiClient } from "@/lib/bff/apiClient";

const apiBaseUrl = process.env.API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("API_BASE_URL is not configured for apps/web");
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = signApiJwt(user);
  const payload = (await request.json()) as unknown;

  const { status, data } = await apiClient("/profile/me/avatar", {
    method: "PUT",
    body: payload,
    token
  });

  return NextResponse.json(data, { status });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const incoming = await request.formData();
  const avatar = incoming.get("avatar");

  if (!(avatar instanceof File)) {
    return NextResponse.json({ error: "Arquivo de avatar ausente." }, { status: 400 });
  }

  const formData = new FormData();
  formData.append("avatar", avatar, avatar.name || "avatar");

  const token = signApiJwt(user);
  const response = await fetch(`${apiBaseUrl}/profile/me/avatar/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData,
    cache: "no-store"
  });

  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  return NextResponse.json(data, { status: response.status });
}
