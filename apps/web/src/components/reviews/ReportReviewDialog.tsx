"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ReportReason } from "@gamebox/shared/constants/enums";
import { buildSuspendedPath, getSuspendedUntilFromApiError } from "@/lib/utils/suspension";

type ReportReviewDialogProps = {
  open: boolean;
  reviewId: string | null;
  gameTitle?: string;
  onClose: () => void;
};

const REASON_LABELS: Record<ReportReason, string> = {
  [ReportReason.OFFENSIVE]: "Conteúdo ofensivo",
  [ReportReason.HATE]: "Discurso de odio",
  [ReportReason.SPAM]: "Spam",
  [ReportReason.SEXUAL]: "Conteúdo sexual impróprio",
  [ReportReason.PERSONAL_DATA]: "Exposicao de dados pessoais",
  [ReportReason.OTHER]: "Outro"
};

export function ReportReviewDialog({ open, reviewId, gameTitle, onClose }: ReportReviewDialogProps) {
  const router = useRouter();
  const [reason, setReason] = useState<ReportReason>(ReportReason.OFFENSIVE);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason(ReportReason.OFFENSIVE);
      setDetails("");
      setSubmitting(false);
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const reviewLabel = useMemo(() => {
    if (!gameTitle) {
      return "esta review";
    }

    return `a review de "${gameTitle}"`;
  }, [gameTitle]);

  if (!open || !reviewId) {
    return null;
  }

  async function submitReport() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/bff/reviews/${reviewId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reason,
          details
        })
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = (await response.json().catch(() => null)) as
        | { error?: string; suspendedUntil?: string | null }
        | null;

      if (data?.error === "account_suspended") {
        router.push(buildSuspendedPath(getSuspendedUntilFromApiError(data)));
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error ?? "Não foi possível enviar a denúncia.");
      }

      setSuccess(true);
      window.setTimeout(() => {
        onClose();
      }, 700);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível enviar a denúncia.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-3 py-4 sm:items-center sm:px-4 sm:py-8"
      onClick={() => {
        if (!submitting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Denunciar review</h2>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Você está denunciando {reviewLabel}.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <label htmlFor="report-reason" className="block space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <span>Motivo</span>
            <select
              id="report-reason"
              name="reason"
              value={reason}
              disabled={submitting || success}
              onChange={(event) => setReason(event.target.value as ReportReason)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            >
              {Object.values(ReportReason).map((value) => (
                <option key={value} value={value}>
                  {REASON_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="report-details" className="block space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <span>Detalhes (opcional)</span>
            <textarea
              id="report-details"
              name="details"
              value={details}
              maxLength={500}
              rows={4}
              disabled={submitting || success}
              onChange={(event) => setDetails(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            />
          </label>

          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700 dark:text-emerald-400">Denuncia enviada.</p> : null}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              void submitReport();
            }}
            disabled={submitting || success}
            className="rounded-md border border-amber-300 bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Enviando..." : "Enviar denúncia"}
          </button>
        </div>
      </div>
    </div>
  );
}
