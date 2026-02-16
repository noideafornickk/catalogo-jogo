"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Status } from "@gamebox/shared/constants/enums";
import type { PaginatedReviewsResponse } from "@gamebox/shared/types/api";
import type { ReviewItem } from "@gamebox/shared/types/review";
import { CatalogReviewCard } from "@/components/reviews/CatalogReviewCard";
import { EmptyState } from "@/components/states/EmptyState";
import { GameSearchModal } from "@/components/games/GameSearchModal";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { ReviewCardSkeleton } from "@/components/states/ReviewCardSkeleton";
import { ConfirmActionDialog } from "@/components/ui/ConfirmActionDialog";

const MINE_PAGE_SIZE = 10;

export default function MePage() {
  const { status } = useSession();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [error, setError] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [pendingDeleteReview, setPendingDeleteReview] = useState<ReviewItem | null>(null);
  const [deletingReview, setDeletingReview] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);

  async function loadMyReviewsPage(offset: number, initial: boolean) {
    if (initial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const response = await fetch(
        `/api/bff/reviews?mode=mine&pagination=1&limit=${MINE_PAGE_SIZE}&offset=${offset}`
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Falha ao carregar catálogo");
      }

      const page = (await response.json()) as PaginatedReviewsResponse;
      setReviews((previous) => {
        if (initial) {
          return page.items;
        }

        const map = new Map(previous.map((item) => [item.id, item]));
        for (const item of page.items) {
          map.set(item.id, item);
        }
        return Array.from(map.values());
      });
      setHasMore(page.hasMore);
      setNextOffset(page.nextOffset);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro inesperado");
    } finally {
      if (initial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }

  async function refreshMyReviews() {
    setNextOffset(0);
    await loadMyReviewsPage(0, true);
  }

  useEffect(() => {
    if (status === "authenticated") {
      void refreshMyReviews();
      return;
    }

    if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  async function handleConfirmDelete() {
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
        throw new Error(data?.error ?? "Não foi possível excluir a avaliação.");
      }

      await refreshMyReviews();
      setPendingDeleteReview(null);
    } catch (deleteRequestError) {
      setDeleteError(
        deleteRequestError instanceof Error ? deleteRequestError.message : "Não foi possível excluir a avaliação."
      );
    } finally {
      setDeletingReview(false);
    }
  }

  useEffect(() => {
    if (status !== "authenticated" || !sentinel || loading || loadingMore || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || loadingMore || !hasMore || nextOffset === null) {
          return;
        }

        void loadMyReviewsPage(nextOffset, false);
      },
      { rootMargin: "220px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [status, sentinel, loading, loadingMore, hasMore, nextOffset]);

  const grouped = useMemo(() => {
    const map = new Map<Status, ReviewItem[]>();
    Object.values(Status).forEach((statusValue) => {
      map.set(statusValue, []);
    });

    reviews.forEach((review) => {
      map.get(review.status)?.push(review);
    });

    return map;
  }, [reviews]);

  if (status === "loading") {
    return <p className="text-sm text-slate-600">Carregando sessão...</p>;
  }

  if (status === "unauthenticated") {
    return (
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-700">Você precisa logar para ver seu catálogo.</p>
        <Link
          href="/login"
          className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          Ir para login
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Meu Catálogo</h1>
        <p className="text-sm text-slate-600">Gerencie suas reviews por status.</p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <ReviewCardSkeleton key={`mine-skeleton-${index}`} />
          ))}
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error && reviews.length === 0 ? (
        <EmptyState title="Você ainda não cadastrou reviews" description="Use a busca para avaliar jogos." />
      ) : null}

      {!loading && !error
        ? Object.values(Status).map((statusValue) => {
            const statusReviews = grouped.get(statusValue) ?? [];

            return (
              <section key={statusValue} className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">{statusValue}</h2>

                {statusReviews.length > 0 ? (
                  <div className="space-y-3">
                    {statusReviews.map((review) => (
                      <CatalogReviewCard
                        key={review.id}
                        review={review}
                        onEdit={() => setEditingReview(review)}
                        onDelete={() => {
                          setDeleteError(null);
                          setPendingDeleteReview(review);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="Nenhuma review neste status" />
                )}
              </section>
            );
          })
        : null}

      {!loading && !error && loadingMore ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <ReviewCardSkeleton key={`mine-loading-more-${index}`} compact />
          ))}
        </div>
      ) : null}

      {!loading && hasMore ? <div ref={setSentinel} className="h-2 w-full" /> : null}

      <ConfirmActionDialog
        open={Boolean(pendingDeleteReview)}
        title="Excluir avaliação"
        description={
          pendingDeleteReview
            ? `Excluir sua avaliação de "${pendingDeleteReview.game.title}"?`
            : "Excluir esta avaliação?"
        }
        confirmLabel="Excluir avaliação"
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
          void handleConfirmDelete();
        }}
      />

      <GameSearchModal
        open={Boolean(editingReview)}
        title={editingReview ? `Editar review - ${editingReview.game.title}` : "Editar review"}
        onClose={() => setEditingReview(null)}
      >
        {editingReview ? (
          <ReviewForm
            rawgId={editingReview.game.rawgId}
            reviewId={editingReview.id}
            initialData={{
              rating: editingReview.rating,
              recommend: editingReview.recommend,
              status: editingReview.status,
              body: editingReview.body
            }}
            onSuccess={() => {
              setEditingReview(null);
              void refreshMyReviews();
            }}
            onCancel={() => setEditingReview(null)}
          />
        ) : null}
      </GameSearchModal>
    </section>
  );
}
