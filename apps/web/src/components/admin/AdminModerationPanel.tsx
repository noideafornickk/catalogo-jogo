"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ReportReason,
  ReportStatus,
  ReviewVisibilityStatus,
  SuspensionAppealStatus
} from "@gamebox/shared/constants/enums";
import type {
  AdminReportItem,
  AdminReportsResponse,
  AdminSuspensionAppealItem,
  AdminSuspensionAppealsResponse
} from "@gamebox/shared/types/api";
import { EmptyState } from "@/components/states/EmptyState";

const STATUS_TABS: Array<{ value: ReportStatus; label: string }> = [
  { value: ReportStatus.OPEN, label: "Abertas" },
  { value: ReportStatus.RESOLVED, label: "Resolvidas" },
  { value: ReportStatus.DISMISSED, label: "Descartadas" }
];

const REASON_LABELS: Record<ReportReason, string> = {
  [ReportReason.OFFENSIVE]: "Conteudo ofensivo",
  [ReportReason.HATE]: "Discurso de odio",
  [ReportReason.SPAM]: "Spam",
  [ReportReason.SEXUAL]: "Conteudo sexual improprio",
  [ReportReason.PERSONAL_DATA]: "Exposicao de dados pessoais",
  [ReportReason.OTHER]: "Outro"
};

function formatDateTime(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export function AdminModerationPanel() {
  const [activeStatus, setActiveStatus] = useState<ReportStatus>(ReportStatus.OPEN);
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hideReasons, setHideReasons] = useState<Record<string, string>>({});

  const [appeals, setAppeals] = useState<AdminSuspensionAppealItem[]>([]);
  const [appealsLoading, setAppealsLoading] = useState(true);
  const [appealsError, setAppealsError] = useState<string | null>(null);
  const [appealsBusyId, setAppealsBusyId] = useState<string | null>(null);

  async function loadReports(status: ReportStatus) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/bff/admin/reports?status=${status}&limit=50`);
      const data = (await response.json().catch(() => null)) as
        | AdminReportsResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          data && "error" in data
            ? data.error ?? "Falha ao carregar denúncias."
            : "Falha ao carregar denúncias."
        );
      }

      setReports((data as AdminReportsResponse).items);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Falha ao carregar denúncias."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAppeals() {
    setAppealsLoading(true);
    setAppealsError(null);

    try {
      const response = await fetch("/api/bff/admin/appeals?status=OPEN&limit=20");
      const data = (await response.json().catch(() => null)) as
        | AdminSuspensionAppealsResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          data && "error" in data
            ? data.error ?? "Falha ao carregar recursos de suspensão."
            : "Falha ao carregar recursos de suspensão."
        );
      }

      setAppeals((data as AdminSuspensionAppealsResponse).items);
    } catch (loadError) {
      setAppealsError(
        loadError instanceof Error
          ? loadError.message
          : "Falha ao carregar recursos de suspensão."
      );
    } finally {
      setAppealsLoading(false);
    }
  }

  useEffect(() => {
    void loadReports(activeStatus);
  }, [activeStatus]);

  useEffect(() => {
    void loadAppeals();
  }, []);

  const hasOpenActions = useMemo(
    () => activeStatus === ReportStatus.OPEN,
    [activeStatus]
  );

  async function patchReportStatus(
    reportId: string,
    status: ReportStatus.RESOLVED | ReportStatus.DISMISSED
  ) {
    setBusyId(reportId);
    setActionError(null);

    try {
      const response = await fetch(`/api/bff/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Falha ao atualizar denúncia.");
      }

      await loadReports(activeStatus);
    } catch (patchError) {
      setActionError(
        patchError instanceof Error
          ? patchError.message
          : "Falha ao atualizar denúncia."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function hideReview(reviewId: string) {
    setBusyId(reviewId);
    setActionError(null);

    try {
      const response = await fetch(`/api/bff/admin/reviews/${reviewId}/hide`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reason: hideReasons[reviewId] ?? ""
        })
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Falha ao ocultar review.");
      }

      await loadReports(activeStatus);
      await loadAppeals();
    } catch (hideError) {
      setActionError(
        hideError instanceof Error ? hideError.message : "Falha ao ocultar review."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function unhideReview(reviewId: string) {
    setBusyId(reviewId);
    setActionError(null);

    try {
      const response = await fetch(`/api/bff/admin/reviews/${reviewId}/unhide`, {
        method: "PATCH"
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Falha ao reativar review.");
      }

      await loadReports(activeStatus);
      await loadAppeals();
    } catch (unhideError) {
      setActionError(
        unhideError instanceof Error ? unhideError.message : "Falha ao reativar review."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function patchAppealStatus(
    appealId: string,
    status: SuspensionAppealStatus.RESOLVED | SuspensionAppealStatus.REJECTED
  ) {
    setAppealsBusyId(appealId);
    setAppealsError(null);

    try {
      const response = await fetch(`/api/bff/admin/appeals/${appealId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Falha ao atualizar recurso.");
      }

      await loadAppeals();
    } catch (updateError) {
      setAppealsError(
        updateError instanceof Error ? updateError.message : "Falha ao atualizar recurso."
      );
    } finally {
      setAppealsBusyId(null);
    }
  }

  return (
    <section className="space-y-6">
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Recursos de suspensão</h2>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
            {appeals.length} abertos
          </span>
        </div>

        {appealsLoading ? <p className="text-sm text-slate-600">Carregando recursos...</p> : null}
        {appealsError ? <p className="text-sm text-red-600">{appealsError}</p> : null}

        {!appealsLoading && !appealsError && appeals.length === 0 ? (
          <EmptyState title="Sem recursos abertos" description="Nenhum usuário enviou recurso no momento." />
        ) : null}

        {!appealsLoading && !appealsError && appeals.length > 0 ? (
          <div className="space-y-3">
            {appeals.map((appeal) => (
              <article key={appeal.id} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{appeal.user.name}</p>
                  <p className="text-xs text-slate-500">Enviado em {formatDateTime(appeal.createdAt)}</p>
                </div>

                <p className="text-sm text-slate-700">
                  {appeal.message ?? "Recurso sem mensagem adicional."}
                </p>

                {appeal.suspendedUntil ? (
                  <p className="text-xs text-rose-700">
                    Suspenso até {formatDateTime(appeal.suspendedUntil) ?? appeal.suspendedUntil}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void patchAppealStatus(appeal.id, SuspensionAppealStatus.RESOLVED);
                    }}
                    disabled={appealsBusyId === appeal.id}
                    className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    Resolver
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void patchAppealStatus(appeal.id, SuspensionAppealStatus.REJECTED);
                    }}
                    disabled={appealsBusyId === appeal.id}
                    className="rounded-md border border-rose-300 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    Rejeitar
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveStatus(tab.value)}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                activeStatus === tab.value
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? <p className="text-sm text-slate-600">Carregando denúncias...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

        {!loading && !error && reports.length === 0 ? (
          <EmptyState title="Sem denúncias nesta aba" />
        ) : null}

        {!loading && !error && reports.length > 0 ? (
          <div className="space-y-3">
            {reports.map((report) => (
              <article
                key={report.id}
                className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {REASON_LABELS[report.reason]} - {report.status}
                    </p>
                    <p className="text-xs text-slate-500">
                      Denunciado em {new Date(report.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      report.review.visibilityStatus === ReviewVisibilityStatus.HIDDEN
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {report.review.visibilityStatus === ReviewVisibilityStatus.HIDDEN
                      ? "Review oculta"
                      : "Review ativa"}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-slate-700">
                  <p>
                    <span className="font-medium">Jogo:</span>{" "}
                    <Link href={`/games/${report.review.game.rawgId}`} className="underline">
                      {report.review.game.title}
                    </Link>
                  </p>
                  <p>
                    <span className="font-medium">Autor:</span> {report.review.author.name}
                  </p>
                  <p>
                    <span className="font-medium">Strikes ativos:</span>{" "}
                    {report.review.author.activeStrikeCount}
                  </p>
                  {report.review.author.suspendedUntil ? (
                    <p className="text-rose-700">
                      <span className="font-medium">Suspenso até:</span>{" "}
                      {formatDateTime(report.review.author.suspendedUntil) ??
                        report.review.author.suspendedUntil}
                    </p>
                  ) : null}
                  <p>
                    <span className="font-medium">Denunciante:</span> {report.reporter.name}
                  </p>
                  <p>
                    <span className="font-medium">Nota:</span> {report.review.rating}/10
                  </p>
                </div>

                {report.details ? (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {report.details}
                  </p>
                ) : null}

                {report.review.body ? (
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {report.review.body}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">Sem texto na review.</p>
                )}

                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <input
                    type="text"
                    maxLength={200}
                    placeholder="Motivo opcional para ocultar a review"
                    value={hideReasons[report.review.id] ?? ""}
                    onChange={(event) =>
                      setHideReasons((previous) => ({
                        ...previous,
                        [report.review.id]: event.target.value
                      }))
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    {report.review.visibilityStatus === ReviewVisibilityStatus.HIDDEN ? (
                      <button
                        type="button"
                        onClick={() => {
                          void unhideReview(report.review.id);
                        }}
                        disabled={busyId === report.review.id}
                        className="rounded-md border border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                      >
                        Reativar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          void hideReview(report.review.id);
                        }}
                        disabled={busyId === report.review.id}
                        className="rounded-md border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        Ocultar review
                      </button>
                    )}

                    {hasOpenActions ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            void patchReportStatus(report.id, ReportStatus.RESOLVED);
                          }}
                          disabled={busyId === report.id}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                        >
                          Resolver
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void patchReportStatus(report.id, ReportStatus.DISMISSED);
                          }}
                          disabled={busyId === report.id}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                        >
                          Descartar
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}
