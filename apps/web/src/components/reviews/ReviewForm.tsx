"use client";

import { useState } from "react";
import { Status } from "@gamebox/shared/constants/enums";
import { RatingInput } from "./RatingInput";

type ReviewFormProps = {
  rawgId: number;
  reviewId?: string;
  initialData?: {
    rating: number;
    recommend: boolean;
    status: Status;
    body: string | null;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function ReviewForm({ rawgId, reviewId, initialData, onSuccess, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(initialData?.rating ?? 7);
  const [recommend, setRecommend] = useState(initialData?.recommend ?? true);
  const [status, setStatus] = useState<Status>(initialData?.status ?? Status.PLAYING);
  const [body, setBody] = useState(initialData?.body ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...(reviewId ? {} : { rawgId }),
        rating,
        recommend,
        status,
        body
      };

      const response = await fetch(reviewId ? `/api/bff/reviews/${reviewId}` : "/api/bff/reviews", {
        method: reviewId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Não foi possível salvar a review");
      }

      onSuccess?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <RatingInput value={rating} onChange={setRating} />

      <label htmlFor="review-status" className="block space-y-1 text-sm text-slate-700">
        <span>Status</span>
        <select
          id="review-status"
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value as Status)}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        >
          {Object.values(Status).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-2">
        <p className="text-sm text-slate-700 dark:text-slate-200">Recomendação</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-4">
          <button
            type="button"
            aria-pressed={recommend}
            onClick={() => setRecommend(true)}
            className={`w-full rounded-md border px-4 py-2 text-sm font-medium transition sm:w-auto ${
              recommend
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/70 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            Recomendo este jogo
          </button>

          <button
            type="button"
            aria-pressed={!recommend}
            onClick={() => setRecommend(false)}
            className={`w-full rounded-md border px-4 py-2 text-sm font-medium transition sm:w-auto ${
              !recommend
                ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/70 dark:bg-rose-900/30 dark:text-rose-300"
                : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            Não recomendo este jogo
          </button>
        </div>
      </div>

      <label htmlFor="review-body" className="block space-y-1 text-sm text-slate-700">
        <span>Review (opcional)</span>
        <textarea
          id="review-body"
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          rows={5}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
