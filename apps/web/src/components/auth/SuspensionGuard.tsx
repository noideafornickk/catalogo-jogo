"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ApiErrorResponse, ProfileMeResponse } from "@gamebox/shared/types/api";
import { buildSuspendedPath, isSuspendedUntil } from "@/lib/utils/suspension";

function extractSuspendedUntil(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if ("suspendedUntil" in payload && typeof payload.suspendedUntil === "string") {
    return payload.suspendedUntil;
  }

  return null;
}

export function SuspensionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !pathname) {
      return;
    }

    let cancelled = false;

    async function checkSuspension(): Promise<void> {
      try {
        const response = await fetch("/api/bff/profile", {
          cache: "no-store"
        });
        const payload = (await response
          .json()
          .catch(() => null)) as ProfileMeResponse | ApiErrorResponse | null;

        if (cancelled || !payload) {
          return;
        }

        const suspendedUntil = extractSuspendedUntil(payload);
        const isSuspended = isSuspendedUntil(suspendedUntil);

        if (pathname === "/suspended") {
          if (!isSuspended) {
            router.replace("/");
          }
          return;
        }

        if (
          response.status === 403 &&
          "error" in payload &&
          payload.error === "account_suspended"
        ) {
          router.replace(buildSuspendedPath(suspendedUntil));
          return;
        }

        if (response.ok && isSuspended) {
          router.replace(buildSuspendedPath(suspendedUntil));
        }
      } catch {
        // No-op: we avoid blocking navigation on transient fetch errors.
      }
    }

    void checkSuspension();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, status]);

  return null;
}
