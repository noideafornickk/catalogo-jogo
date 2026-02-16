export function isSuspendedUntil(suspendedUntil: string | null | undefined): boolean {
  if (!suspendedUntil) {
    return false;
  }

  const timestamp = Date.parse(suspendedUntil);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return timestamp > Date.now();
}

export function buildSuspendedPath(suspendedUntil: string | null | undefined): string {
  if (!suspendedUntil) {
    return "/suspended";
  }

  const params = new URLSearchParams({ until: suspendedUntil });
  return `/suspended?${params.toString()}`;
}

export function getSuspendedUntilFromApiError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const value = payload as { error?: unknown; suspendedUntil?: unknown };
  if (value.error !== "account_suspended") {
    return null;
  }

  return typeof value.suspendedUntil === "string" ? value.suspendedUntil : null;
}
