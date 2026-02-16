"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { GameSummary } from "@gamebox/shared/types/game";
import type { PaginatedReviewsResponse, RankingsResponse } from "@gamebox/shared/types/api";
import type { ReviewItem } from "@gamebox/shared/types/review";
import { GameGrid } from "@/components/games/GameGrid";
import { GameSearchModal } from "@/components/games/GameSearchModal";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { StarRating } from "@/components/reviews/StarRating";
import { EmptyState } from "@/components/states/EmptyState";
import { ReviewCardSkeleton } from "@/components/states/ReviewCardSkeleton";
import { ConfirmActionDialog } from "@/components/ui/ConfirmActionDialog";

type HomeTab = "recentes" | "melhores" | "sugestoes";
const RECENT_PAGE_SIZE = 8;

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<HomeTab>("recentes");
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [rankings, setRankings] = useState<RankingsResponse | null>(null);
  const [discoverGames, setDiscoverGames] = useState<GameSummary[]>([]);
  const [recentReviews, setRecentReviews] = useState<ReviewItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentLoadingMore, setRecentLoadingMore] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [recentHasMore, setRecentHasMore] = useState(false);
  const [recentNextOffset, setRecentNextOffset] = useState<number | null>(0);
  const [editingRecentReview, setEditingRecentReview] = useState<ReviewItem | null>(null);
  const [pendingDeleteReview, setPendingDeleteReview] = useState<ReviewItem | null>(null);
  const [deletingReview, setDeletingReview] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const recentSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadData() {
      setHomeLoading(true);
      setHomeError(null);

      try {
        const [rankingsRes, discoverRes] = await Promise.all([
          fetch("/api/bff/rankings?range=week"),
          fetch("/api/bff/rawg/discover")
        ]);

        if (!rankingsRes.ok || !discoverRes.ok) {
          throw new Error("Falha ao carregar dados da home");
        }

        const rankingsData = (await rankingsRes.json()) as RankingsResponse;
        const discoverData = (await discoverRes.json()) as GameSummary[];

        setRankings(rankingsData);
        setDiscoverGames(discoverData);
      } catch (loadError) {
        setHomeError(loadError instanceof Error ? loadError.message : "Erro inesperado");
      } finally {
        setHomeLoading(false);
      }
    }

    void loadData();
  }, []);

  async function fetchRecentPage(offset: number, initial: boolean): Promise<void> {
    if (initial) {
      setRecentLoading(true);
      setRecentError(null);
    } else {
      setRecentLoadingMore(true);
      setRecentError(null);
    }

    try {
      const response = await fetch(
        `/api/bff/reviews?mode=recent&pagination=1&limit=${RECENT_PAGE_SIZE}&offset=${offset}`
      );

      if (!response.ok) {
        throw new Error("Falha ao carregar reviews recentes");
      }

      const page = (await response.json()) as PaginatedReviewsResponse;
      setRecentReviews((previous) => {
        if (initial) {
          return page.items;
        }

        const map = new Map(previous.map((item) => [item.id, item]));
        for (const item of page.items) {
          map.set(item.id, item);
        }

        return Array.from(map.values());
      });
      setRecentHasMore(page.hasMore);
      setRecentNextOffset(page.nextOffset);
    } catch (loadError) {
      setRecentError(loadError instanceof Error ? loadError.message : "Erro inesperado");
    } finally {
      if (initial) {
        setRecentLoading(false);
      } else {
        setRecentLoadingMore(false);
      }
    }
  }

  useEffect(() => {
    void fetchRecentPage(0, true);
  }, []);

  async function refreshRecentReviews() {
    setRecentNextOffset(0);
    await fetchRecentPage(0, true);
  }

  async function handleConfirmDeleteReview() {
    if (!pendingDeleteReview) {
      return;
    }

    setDeletingReview(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/bff/reviews/${pendingDeleteReview.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Nao foi possivel excluir a avaliacao.");
      }

      await refreshRecentReviews();
      setPendingDeleteReview(null);
    } catch (deleteRequestError) {
      setDeleteError(
        deleteRequestError instanceof Error
          ? deleteRequestError.message
          : "Nao foi possivel excluir a avaliacao."
      );
    } finally {
      setDeletingReview(false);
    }
  }

  useEffect(() => {
    if (activeTab !== "recentes") {
      return;
    }

    if (!recentHasMore || recentLoading || recentLoadingMore) {
      return;
    }

    const element = recentSentinelRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          const nextOffset = recentNextOffset ?? 0;
          void fetchRecentPage(nextOffset, false);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [activeTab, recentHasMore, recentLoading, recentLoadingMore, recentNextOffset]);

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("recentes")}
          className={`min-w-0 rounded-md px-2 py-2 text-xs font-medium sm:px-4 sm:text-sm ${
            activeTab === "recentes"
              ? "bg-slate-900 text-white"
              : "border border-slate-300 bg-white text-slate-700"
          }`}
        >
          <span className="truncate">Recentes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("melhores")}
          className={`min-w-0 rounded-md px-2 py-2 text-xs font-medium sm:px-4 sm:text-sm ${
            activeTab === "melhores"
              ? "bg-slate-900 text-white"
              : "border border-slate-300 bg-white text-slate-700"
          }`}
        >
          <span className="truncate sm:hidden">Melhores</span>
          <span className="hidden truncate sm:inline">Melhores da semana</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sugestoes")}
          className={`min-w-0 rounded-md px-2 py-2 text-xs font-medium sm:px-4 sm:text-sm ${
            activeTab === "sugestoes"
              ? "bg-slate-900 text-white"
              : "border border-slate-300 bg-white text-slate-700"
          }`}
        >
          <span className="truncate sm:hidden">Sugestões</span>
          <span className="hidden truncate sm:inline">Sugestões para avaliar</span>
        </button>
      </div>

      {activeTab === "recentes" ? (
        <>
          {recentError ? <p className="text-sm text-red-600">{recentError}</p> : null}

          {recentLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <ReviewCardSkeleton key={`recent-skeleton-${index}`} />
              ))}
            </div>
          ) : null}

          {!recentLoading && !recentError && recentReviews.length > 0 ? (
            <div className="min-w-0 space-y-4">
              <div className="min-w-0 max-w-full grid gap-4 lg:grid-cols-2">
                {recentReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    showUser
                    gameCoverSize="md"
                    onEdit={review.isOwner ? () => setEditingRecentReview(review) : undefined}
                    onDelete={
                      review.isOwner
                        ? () => {
                            setDeleteError(null);
                            setPendingDeleteReview(review);
                          }
                        : undefined
                    }
                  />
                ))}
              </div>

              {recentLoadingMore ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <ReviewCardSkeleton key={`recent-loading-more-${index}`} compact />
                  ))}
                </div>
              ) : null}

              {recentHasMore ? <div ref={recentSentinelRef} className="h-2 w-full" /> : null}
            </div>
          ) : null}

          {!recentLoading && !recentError && recentReviews.length === 0 ? (
            <EmptyState title="Sem reviews recentes" description="Adicione uma review para aparecer aqui." />
          ) : null}
        </>
      ) : null}

      {homeLoading && activeTab !== "recentes" ? <p className="text-sm text-slate-600">Carregando...</p> : null}
      {homeError && activeTab !== "recentes" ? <p className="text-sm text-red-600">{homeError}</p> : null}

      {!homeLoading && !homeError && activeTab === "melhores" ? (
        rankings && rankings.items.length > 0 ? (
          <div className="space-y-3">
            {rankings.fallback === "month" ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Sem dados da semana. Exibindo ranking do mês.
              </p>
            ) : null}

            <div className="space-y-3">
              {rankings.items.map((item, index) => (
                <article
                  key={item.game.rawgId}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs text-slate-500">#{index + 1}</p>
                    <Link
                      href={`/games/${item.game.rawgId}`}
                      className="inline-flex max-w-full text-base font-semibold text-slate-900 hover:underline"
                    >
                      <span className="truncate">{item.game.title}</span>
                    </Link>
                    <p className="text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <StarRating value={item.avgRating / 2} />
                        <span>
                          {item.reviewCount} reviews, média {item.avgRating}
                        </span>
                      </span>
                    </p>

                    {item.game.descriptionPreview ? (
                      <Link
                        href={`/games/${item.game.rawgId}`}
                        className="mt-2 block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Descrição oficial
                        </p>
                        <p className="mt-1 text-preview-clamp-two text-fade-last-line text-sm leading-6 text-slate-700">
                          {item.game.descriptionPreview}
                        </p>
                      </Link>
                    ) : null}
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:items-start sm:justify-start">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 sm:px-2.5 sm:text-sm">
                      score {item.score.toFixed(2)}
                    </span>
                    <Link
                      href={`/games/${item.game.rawgId}`}
                      className="relative h-44 w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100 sm:h-44 sm:w-32"
                    >
                      {item.game.coverUrl ? (
                        <Image
                          src={item.game.coverUrl}
                          alt={`Capa de ${item.game.title}`}
                          fill
                          sizes="(max-width: 640px) 100vw, 128px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-slate-200" />
                      )}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="Sem ranking disponível" description="Crie reviews para popular o ranking." />
        )
      ) : null}

      {!homeLoading && !homeError && activeTab === "sugestoes" ? (
        discoverGames.length > 0 ? (
          <GameGrid games={discoverGames} />
        ) : (
          <EmptyState title="Sem sugestões" description="Tente novamente em instantes." />
        )
      ) : null}

      <ConfirmActionDialog
        open={Boolean(pendingDeleteReview)}
        title="Excluir avaliacao"
        description={
          pendingDeleteReview
            ? `Excluir sua avaliacao de "${pendingDeleteReview.game.title}"?`
            : "Excluir esta avaliacao?"
        }
        confirmLabel="Excluir avaliacao"
        confirmVariant="danger"
        busy={deletingReview}
        error={deleteError}
        onCancel={() => {
          if (!deletingReview) {
            setPendingDeleteReview(null);
            setDeleteError(null);
          }
        }}
        onConfirm={() => {
          void handleConfirmDeleteReview();
        }}
      />

      <GameSearchModal
        open={Boolean(editingRecentReview)}
        title={editingRecentReview ? `Editar review - ${editingRecentReview.game.title}` : "Editar review"}
        onClose={() => setEditingRecentReview(null)}
      >
        {editingRecentReview ? (
          <ReviewForm
            rawgId={editingRecentReview.game.rawgId}
            reviewId={editingRecentReview.id}
            initialData={{
              rating: editingRecentReview.rating,
              recommend: editingRecentReview.recommend,
              status: editingRecentReview.status,
              body: editingRecentReview.body
            }}
            onSuccess={() => {
              setEditingRecentReview(null);
              void refreshRecentReviews();
            }}
            onCancel={() => setEditingRecentReview(null)}
          />
        ) : null}
      </GameSearchModal>
    </section>
  );
}
