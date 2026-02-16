"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { RawgGameDetails } from "@gamebox/shared/types/game";
import type { ReviewItem } from "@gamebox/shared/types/review";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { ReportReviewDialog } from "@/components/reviews/ReportReviewDialog";
import { EmptyState } from "@/components/states/EmptyState";
import { GameSearchModal } from "@/components/games/GameSearchModal";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { StarRating } from "@/components/reviews/StarRating";
import { ReviewCardSkeleton } from "@/components/states/ReviewCardSkeleton";
import { GameDetailsSkeleton } from "@/components/states/GameDetailsSkeleton";

const DESCRIPTION_PREVIEW_LENGTH = 420;

export default function GamePage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams<{ rawgId: string }>();
  const rawgId = Number(params.rawgId);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reportingReview, setReportingReview] = useState<ReviewItem | null>(null);

  const [gameDetails, setGameDetails] = useState<RawgGameDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState("");

  function handleOpenReview() {
    if (status === "loading") {
      return;
    }

    if (status !== "authenticated") {
      router.push("/login");
      return;
    }

    setShowReviewModal(true);
  }

  useEffect(() => {
    async function loadData() {
      if (!rawgId || Number.isNaN(rawgId)) {
        setReviewsError("rawgId inválido");
        setReviewsLoading(false);
        setDetailsLoading(false);
        return;
      }

      setReviewsLoading(true);
      setReviewsError(null);
      setDetailsLoading(true);
      setDetailsError(null);
      setShowFullDescription(false);

      const [reviewsResult, detailsResult] = await Promise.allSettled([
        fetch(`/api/bff/reviews?rawgId=${rawgId}`),
        fetch(`/api/bff/rawg/games/${rawgId}`)
      ]);

      if (reviewsResult.status === "fulfilled") {
        try {
          if (!reviewsResult.value.ok) {
            throw new Error("Não foi possível carregar reviews do jogo");
          }

          const data = (await reviewsResult.value.json()) as ReviewItem[];
          setReviews(data);
        } catch (error) {
          setReviewsError(error instanceof Error ? error.message : "Erro inesperado");
        }
      } else {
        setReviewsError("Não foi possível carregar reviews do jogo");
      }

      if (detailsResult.status === "fulfilled") {
        try {
          if (!detailsResult.value.ok) {
            throw new Error("Descrição indisponível no momento");
          }

          const data = (await detailsResult.value.json()) as RawgGameDetails;
          setGameDetails(data);
          setDescriptionText(data.descriptionText ?? "");
        } catch (error) {
          setDetailsError(error instanceof Error ? error.message : "Descrição indisponível no momento");
          setDescriptionText("");
        }
      } else {
        setDetailsError("Descrição indisponível no momento");
        setDescriptionText("");
      }

      setReviewsLoading(false);
      setDetailsLoading(false);
    }

    void loadData();
  }, [rawgId]);

  const average = useMemo(() => {
    if (reviews.length === 0) {
      return null;
    }

    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return Number((sum / reviews.length).toFixed(2));
  }, [reviews]);

  const gameTitle = gameDetails?.name ?? reviews[0]?.game.title ?? `Jogo #${rawgId}`;
  const coverSrc = gameDetails?.coverUrl ?? reviews[0]?.game.coverUrl ?? "/placeholder-game.svg";
  const hasLongDescription = descriptionText.length > DESCRIPTION_PREVIEW_LENGTH;
  const visibleDescription =
    !hasLongDescription || showFullDescription
      ? descriptionText
      : `${descriptionText.slice(0, DESCRIPTION_PREVIEW_LENGTH)}...`;
  const isInitialPageLoading =
    detailsLoading &&
    reviewsLoading &&
    !gameDetails &&
    reviews.length === 0 &&
    !detailsError &&
    !reviewsError;

  if (isInitialPageLoading) {
    return <GameDetailsSkeleton />;
  }

  return (
    <section className="space-y-5">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-start">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-slate-100">
            <Image src={coverSrc} alt={gameTitle} fill sizes="(max-width: 768px) 100vw, 220px" className="object-cover" />
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-slate-900">{gameTitle}</h1>
            {reviews.length > 0 && average !== null ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <StarRating value={average / 2} />
                <span>
                  {reviews.length} reviews, nota média {average}
                </span>
              </div>
            ) : (
              <p className="text-sm text-slate-600">Ainda sem reviews para este jogo.</p>
            )}

            <button
              type="button"
              onClick={handleOpenReview}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
            >
              Avaliar
            </button>

            <div className="space-y-3 border-t border-slate-200 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Descrição oficial</h2>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Fonte: RAWG</span>
              </div>

              {detailsLoading ? (
                <div className="space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              ) : null}

              {!detailsLoading && descriptionText ? (
                <div className="space-y-2">
                  <p className="text-sm leading-6 text-slate-700">{visibleDescription}</p>
                  {hasLongDescription ? (
                    <button
                      type="button"
                      onClick={() => setShowFullDescription((previous) => !previous)}
                      className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline"
                    >
                      {showFullDescription ? "Mostrar menos" : "Mostrar mais"}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {!detailsLoading && !descriptionText ? (
                <p className="text-sm text-slate-500">Descrição indisponível no momento.</p>
              ) : null}

              {detailsError ? <p className="text-sm text-amber-700">{detailsError}</p> : null}
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Avaliações da comunidade</h2>
        </div>

        {reviewsLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <ReviewCardSkeleton compact />
            <ReviewCardSkeleton compact />
          </div>
        ) : null}
        {reviewsError ? <p className="text-sm text-red-600">{reviewsError}</p> : null}

        {!reviewsLoading && !reviewsError ? (
          reviews.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  showUser
                  showGameCover={false}
                  showDescriptionPreview={false}
                  onReport={
                    status === "authenticated" && !review.isOwner
                      ? () => setReportingReview(review)
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState title="Sem reviews para este jogo" description="Seja o primeiro a avaliar." />
          )
        ) : null}
      </section>

      <GameSearchModal
        open={showReviewModal}
        title={`Avaliar ${gameTitle}`}
        onClose={() => setShowReviewModal(false)}
      >
        <ReviewForm
          rawgId={rawgId}
          onSuccess={() => {
            setShowReviewModal(false);
            setReviewsLoading(true);
            setReviewsError(null);

            void fetch(`/api/bff/reviews?rawgId=${rawgId}`)
              .then((response) => {
                if (!response.ok) {
                  throw new Error("Não foi possível carregar reviews do jogo");
                }
                return response.json() as Promise<ReviewItem[]>;
              })
              .then((data) => setReviews(data))
              .catch((error) => {
                setReviewsError(error instanceof Error ? error.message : "Erro inesperado");
              })
              .finally(() => setReviewsLoading(false));
          }}
          onCancel={() => setShowReviewModal(false)}
        />
      </GameSearchModal>

      <ReportReviewDialog
        open={Boolean(reportingReview)}
        reviewId={reportingReview?.id ?? null}
        gameTitle={reportingReview?.game.title}
        onClose={() => setReportingReview(null)}
      />
    </section>
  );
}
