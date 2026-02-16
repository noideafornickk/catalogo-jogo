"use client";

import { useMemo, useState } from "react";
import { signOut } from "next-auth/react";

type SuspendedClientProps = {
  initialUntil: string | null;
};

function formatSuspendedUntil(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short"
  }).format(date);
}

export function SuspendedClient({ initialUntil }: SuspendedClientProps) {
  const formattedUntil = useMemo(
    () => formatSuspendedUntil(initialUntil),
    [initialUntil]
  );
  const [appealMessage, setAppealMessage] = useState("");
  const [appealSending, setAppealSending] = useState(false);
  const [appealSent, setAppealSent] = useState(false);
  const [appealError, setAppealError] = useState<string | null>(null);

  async function submitAppeal(): Promise<void> {
    setAppealSending(true);
    setAppealError(null);

    try {
      const response = await fetch("/api/bff/profile/suspension-appeal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: appealMessage
        })
      });

      const payload = (await response
        .json()
        .catch(() => null)) as { error?: string } | null;

      if (response.status === 401) {
        await signOut({ callbackUrl: "/login" });
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.error ?? "Não foi possível enviar o recurso.");
      }

      setAppealSent(true);
    } catch (error) {
      setAppealError(
        error instanceof Error ? error.message : "Não foi possível enviar o recurso."
      );
    } finally {
      setAppealSending(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4 rounded-xl border border-amber-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Conta suspensa temporariamente</h1>
      <p className="text-sm leading-6 text-slate-700">
        Sua conta foi suspensa por violação das regras da comunidade. Durante a suspensão você não
        pode interagir com reviews ou usar áreas privadas do site.
      </p>
      {formattedUntil ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Suspensão ativa até: <span className="font-semibold">{formattedUntil}</span>
        </p>
      ) : (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Suspensão ativa no momento.
        </p>
      )}
      <p className="text-xs text-slate-500">
        Se você acredita que houve engano, envie um recurso para a moderação.
      </p>

      <label htmlFor="appeal-message" className="block space-y-1 text-sm text-slate-700">
        <span>Mensagem do recurso (opcional)</span>
        <textarea
          id="appeal-message"
          name="appeal-message"
          maxLength={500}
          rows={4}
          value={appealMessage}
          disabled={appealSending || appealSent}
          onChange={(event) => setAppealMessage(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          placeholder="Explique brevemente o motivo do recurso."
        />
      </label>

      {appealError ? <p className="text-sm text-red-600">{appealError}</p> : null}
      {appealSent ? (
        <p className="text-sm text-emerald-700">
          Recurso enviado. A moderação vai analisar e verificar seu recurso.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={appealSending || appealSent}
          onClick={() => {
            void submitAppeal();
          }}
          className="inline-flex rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {appealSending ? "Enviando recurso..." : appealSent ? "Recurso enviado" : "Enviar recurso"}
        </button>
        <button
          type="button"
          onClick={() => {
            void signOut({ callbackUrl: "/login" });
          }}
          className="inline-flex rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
        >
          Logout
        </button>
      </div>
    </section>
  );
}
