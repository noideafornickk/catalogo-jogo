import { redirect } from "next/navigation";
import type { ProfileMeResponse } from "@gamebox/shared/types/api";
import { AdminModerationPanel } from "@/components/admin/AdminModerationPanel";
import { getSessionUser } from "@/lib/auth/session";
import { apiClient } from "@/lib/bff/apiClient";
import { signApiJwt } from "@/lib/bff/signApiJwt";

type ProfileMeResponseOrError = ProfileMeResponse | { error?: string };

export default async function AdminPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/");
  }

  const token = signApiJwt(sessionUser);
  const { status, data } = await apiClient<ProfileMeResponseOrError>("/profile/me", { token });

  if (
    status !== 200 ||
    typeof data !== "object" ||
    data === null ||
    !("isAdmin" in data) ||
    !data.isAdmin
  ) {
    redirect("/");
  }

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Painel de Moderação</h1>
        <p className="text-sm text-slate-600">
          Gerencie denúncias abertas, oculte reviews maliciosas e resolva casos.
        </p>
      </header>

      <AdminModerationPanel />
    </section>
  );
}
