"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Status } from "@gamebox/shared/constants/enums";
import type { PublicProfileResponse } from "@gamebox/shared/types/api";
import type { ReviewItem } from "@gamebox/shared/types/review";
import { CatalogReviewCard } from "@/components/reviews/CatalogReviewCard";
import { ReportReviewDialog } from "@/components/reviews/ReportReviewDialog";
import { EmptyState } from "@/components/states/EmptyState";
import { PublicProfilePageSkeleton } from "@/components/states/ProfilePageSkeleton";

export default function PublicProfilePage() {
  const { status: sessionStatus } = useSession();
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportingReview, setReportingReview] = useState<ReviewItem | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!userId) {
        setError("Perfil inválido");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/bff/users/${encodeURIComponent(userId)}`);
        const data = (await response.json().catch(() => null)) as
          | PublicProfileResponse
          | { error?: string }
          | null;

        if (!response.ok) {
          if (response.status === 403) {
            setError("Este perfil é privado.");
            setProfile(null);
            return;
          }

          throw new Error(
            data && "error" in data ? data.error ?? "Falha ao carregar perfil" : "Falha ao carregar perfil"
          );
        }

        setProfile(data as PublicProfileResponse);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Erro inesperado");
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [userId]);

  const grouped = useMemo(() => {
    const map = new Map<Status, PublicProfileResponse["reviews"]>();
    Object.values(Status).forEach((statusValue) => {
      map.set(statusValue, []);
    });

    profile?.reviews.forEach((review) => {
      map.get(review.status)?.push(review);
    });

    return map;
  }, [profile]);

  if (loading) {
    return <PublicProfilePageSkeleton />;
  }

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Perfil público</h1>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!error && profile ? (
        <>
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : null}

              <div className="space-y-1">
                <p className="text-xl font-semibold text-slate-900">{profile.name}</p>
                {profile.isPrivate ? (
                  <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                    Perfil privado
                  </span>
                ) : null}
              </div>
            </div>

            {profile.bio ? <p className="text-sm text-slate-700">{profile.bio}</p> : null}

            <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
              <p>Total reviews: {profile.counts.totalReviews}</p>
              <p>Finalizados: {profile.counts.finishedCount}</p>
              <p>Jogando: {profile.counts.playingCount}</p>
              <p>Wishlist: {profile.counts.wishlistCount}</p>
              <p>Dropados: {profile.counts.droppedCount}</p>
              <p>Total de curtidas: {profile.counts.totalLikesReceived}</p>
            </div>
          </section>

          {profile.reviews.length === 0 ? (
            <EmptyState title="Sem reviews públicas ainda" />
          ) : (
            Object.values(Status).map((statusValue) => {
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
                          onReport={
                            sessionStatus === "authenticated" && !review.isOwner
                              ? () => setReportingReview(review)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="Nenhuma review neste status" />
                  )}
                </section>
              );
            })
          )}
        </>
      ) : null}

      <ReportReviewDialog
        open={Boolean(reportingReview)}
        reviewId={reportingReview?.id ?? null}
        gameTitle={reportingReview?.game.title}
        onClose={() => setReportingReview(null)}
      />
    </section>
  );
}
