"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { buildSuspendedPath, getSuspendedUntilFromApiError } from "@/lib/utils/suspension";

type LikeResponse = {
  likesCount: number;
  likedByMe: boolean;
};

type ReviewLikeButtonProps = {
  reviewId: string;
  initialLikesCount: number;
  initialLikedByMe: boolean;
  isOwner?: boolean;
};

export function ReviewLikeButton({
  reviewId,
  initialLikesCount,
  initialLikedByMe,
  isOwner = false
}: ReviewLikeButtonProps) {
  const router = useRouter();
  const { status } = useSession();
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [likedByMe, setLikedByMe] = useState(initialLikedByMe);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLikesCount(initialLikesCount);
    setLikedByMe(initialLikedByMe);
  }, [initialLikesCount, initialLikedByMe]);

  async function toggleLike() {
    if (isOwner) {
      return;
    }

    if (status !== "authenticated") {
      router.push("/login");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/bff/reviews/${reviewId}/like`, {
        method: likedByMe ? "DELETE" : "POST"
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = (await response.json().catch(() => null)) as
        | LikeResponse
        | { error?: string; suspendedUntil?: string | null }
        | null;

      if (data && "error" in data && data.error === "account_suspended") {
        router.push(buildSuspendedPath(getSuspendedUntilFromApiError(data)));
        return;
      }

      if (!response.ok) {
        throw new Error(data && "error" in data ? data.error ?? "Falha ao curtir review" : "Falha ao curtir review");
      }

      const likeData = data as LikeResponse;
      setLikesCount(likeData.likesCount);
      setLikedByMe(likeData.likedByMe);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Falha ao curtir review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          void toggleLike();
        }}
        disabled={submitting || isOwner}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition ${
          likedByMe
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300"
            : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
          <path d="M2.5 9.5A1.5 1.5 0 0 1 4 8h2.18a1 1 0 0 0 .95-.68l1.55-4.64A1.5 1.5 0 0 1 10.1 1.7h.12A1.78 1.78 0 0 1 12 3.48L11.77 8H15a2 2 0 0 1 1.95 2.45l-1.2 5A2 2 0 0 1 13.8 17H6a1.5 1.5 0 0 1-1.5-1.5V9.5Zm-1 0V17h2V8h-2v1.5Z" />
        </svg>
        <span>{isOwner ? "Sua review" : likedByMe ? "Útil" : "Foi útil"}</span>
      </button>

      <span className="text-xs text-slate-600 dark:text-slate-400">{likesCount}</span>
      {error ? <span className="text-xs text-amber-700">{error}</span> : null}
    </div>
  );
}

