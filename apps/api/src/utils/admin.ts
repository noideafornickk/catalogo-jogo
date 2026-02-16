import { env } from "./env";

const configuredAdminEmail = env.ADMIN_EMAIL?.trim().toLowerCase() ?? null;

export function isAdminEmail(email?: string | null): boolean {
  if (!configuredAdminEmail || !email) {
    return false;
  }

  return email.trim().toLowerCase() === configuredAdminEmail;
}

export function hasConfiguredAdmin(): boolean {
  return Boolean(configuredAdminEmail);
}
