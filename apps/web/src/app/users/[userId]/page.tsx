"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FollowRelationshipStatus, Status } from "@gamebox/shared/constants/enums";
import type {
  FollowMutationResponse,
  PublicProfileResponse
} from "@gamebox/shared/types/api";
import type { ReviewItem } from "@gamebox/shared/types/review";
import { CatalogReviewCard } from "@/components/reviews/CatalogReviewCard";
import { ReportReviewDialog } from "@/components/reviews/ReportReviewDialog";
import { PermanentBadges } from "@/components/users/PermanentBadges";
import { RankBadgeIcons } from "@/components/users/RankBadgeIcons";
import { EmptyState } from "@/components/states/EmptyState";
import { PublicProfilePageSkeleton } from "@/components/states/ProfilePageSkeleton";

export default function PublicProfilePage() {
  const { status: sessionStatus } = useSession();
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const userId = params.userId;
  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportingReview, setReportingReview] = useState<ReviewItem | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setError("Perfil invalido");
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
        throw new Error(
          data && "error" in data ? data.error ?? "Falha ao carregar perfil" : "Falha ao carregar perfil"
        );
      }

      setProfile(data as PublicProfileResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro inesperado");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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

  async function handleFollowAction() {
    if (!profile || followBusy) {
      return;
    }

    if (sessionStatus !== "authenticated") {
      router.push("/login");
      return;
    }

    if (profile.followStatus === FollowRelationshipStatus.SELF) {
      return;
    }

    setFollowBusy(true);
    setFollowError(null);

    const shouldRemoveRelation =
      profile.followStatus === FollowRelationshipStatus.FOLLOWING ||
      profile.followStatus === FollowRelationshipStatus.REQUESTED;
    const method = shouldRemoveRelation ? "DELETE" : "POST";

    try {
      const response = await fetch(`/api/bff/follows/${encodeURIComponent(profile.id)}`, {
        method
      });
      const data = (await response.json().catch(() => null)) as
        | FollowMutationResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          data && "error" in data ? data.error ?? "Falha ao atualizar follow." : "Falha ao atualizar follow."
        );
      }

      const result = data as FollowMutationResponse;
      let shouldReloadProfile = false;
      setProfile((previous) => {
        if (!previous) {
          return previous;
        }

        const wasFollowing = previous.followStatus === FollowRelationshipStatus.FOLLOWING;
        const willFollow = result.status === FollowRelationshipStatus.FOLLOWING;

        let nextFollowersCount = previous.counts.followersCount;
        if (!wasFollowing && willFollow) {
          nextFollowersCount += 1;
        } else if (wasFollowing && !willFollow) {
          nextFollowersCount = Math.max(0, nextFollowersCount - 1);
        }

        const nextCanViewFullProfile = previous.isPrivate
          ? result.status === FollowRelationshipStatus.FOLLOWING
          : true;
        const shouldHidePrivateContent = !nextCanViewFullProfile;
        if (!previous.canViewFullProfile && nextCanViewFullProfile) {
          shouldReloadProfile = true;
        }

        return {
          ...previous,
          followStatus: result.status,
          canViewFullProfile: nextCanViewFullProfile,
          counts: {
            ...previous.counts,
            followersCount: nextFollowersCount
          },
          reviews: shouldHidePrivateContent ? [] : previous.reviews,
          favorites: shouldHidePrivateContent ? [] : previous.favorites
        };
      });

      if (shouldReloadProfile) {
        await loadProfile();
      }
    } catch (requestError) {
      setFollowError(requestError instanceof Error ? requestError.message : "Erro inesperado.");
    } finally {
      setFollowBusy(false);
    }
  }

  function getFollowButtonLabel(): string {
    if (!profile) {
      return "Seguir";
    }

    if (followBusy) {
      return "Averiguando...";
    }

    if (profile.followStatus === FollowRelationshipStatus.FOLLOWING) {
      return "Seguindo";
    }

    if (profile.followStatus === FollowRelationshipStatus.REQUESTED) {
      return "Solicitado";
    }

    return profile.isPrivate ? "Pedir para seguir" : "Seguir";
  }

  if (loading) {
    return <PublicProfilePageSkeleton />;
  }

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Perfil público</h1>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {followError ? <p className="text-sm text-red-600">{followError}</p> : null}

      {!error && profile ? (
        <>
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                  {(profile.rankBadges?.length ?? 0) > 0 ? (
                    <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-2">
                      <RankBadgeIcons
                        badges={profile.rankBadges ?? []}
                        size="md"
                        variant="labels"
                        iconScale={0.95}
                      />
                      {profile.isPrivate ? (
                        <span className="inline-flex w-fit rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                          Perfil privado
                        </span>
                      ) : null}
                    </div>
                  ) : profile.isPrivate ? (
                    <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                      Perfil privado
                    </span>
                  ) : null}
                </div>
              </div>

              {profile.followStatus !== FollowRelationshipStatus.SELF ? (
                sessionStatus === "authenticated" ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleFollowAction();
                    }}
                    disabled={followBusy}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${
                      profile.followStatus === FollowRelationshipStatus.FOLLOWING
                        ? "border border-slate-300 text-slate-700 hover:bg-slate-100"
                        : profile.followStatus === FollowRelationshipStatus.REQUESTED
                        ? "border border-amber-300 text-amber-700 hover:bg-amber-50"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {getFollowButtonLabel()}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Entrar para seguir
                  </Link>
                )
              ) : null}
            </div>

            {profile.bio ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-sm text-slate-700">{profile.bio}</p>
              </div>
            ) : null}

            <div className="space-y-3">
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Estatisticas gerais
                  </p>
                  <p className="text-[10px] text-slate-500">Visão geral pública</p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="flex min-h-[70px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center">
                    <p className="text-base font-semibold text-slate-900">{profile.counts.totalReviews}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600">Total reviews</p>
                  </div>
                  <div className="flex min-h-[70px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center">
                    <p className="text-base font-semibold text-slate-900">{profile.counts.totalLikesReceived}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600">Total de curtidas</p>
                  </div>
                  <div className="flex min-h-[70px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center">
                    <p className="text-base font-semibold text-slate-900">{profile.counts.followersCount}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600">Seguidores</p>
                  </div>
                  <div className="flex min-h-[70px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center">
                    <p className="text-base font-semibold text-slate-900">{profile.counts.followingCount}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600">Seguindo</p>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Status do catálogo
                  </p>
                  <p className="text-[10px] text-slate-500">Distribuição das resenhas</p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="flex min-h-[66px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center">
                    <p className="text-base font-semibold text-slate-900">{profile.counts.finishedCount}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600">Finalizados</p>
                  </div>
                  <div className="flex min-h-[66px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center">
                    <p className="text-base font-semibold text-slate-900">{profile.counts.playingCount}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600">Jogando</p>
                  </div>
                  <div className="flex min-h-[66px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center">
                    <p className="text-base font-semibold text-slate-900">{profile.counts.wishlistCount}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600">Wishlist</p>
                  </div>
                  <div className="flex min-h-[66px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center">
                    <p className="text-base font-semibold text-slate-900">{profile.counts.droppedCount}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600">Dropados</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-900">Jogos favoritos</p>

              {profile.favorites.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {profile.favorites.map((favorite) => (
                    <Link
                      key={`public-favorite-${favorite.rawgId}`}
                      href={`/games/${favorite.rawgId}`}
                      className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-2 hover:bg-slate-50"
                    >
                      {favorite.coverUrl ? (
                        <img
                          src={favorite.coverUrl}
                          alt={favorite.title}
                          className="h-10 w-8 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-8 rounded bg-slate-200" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {favorite.title}
                        </p>
                        <p className="text-[11px] text-slate-500">#{favorite.position}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600">
                  {profile.isPrivate && !profile.canViewFullProfile
                    ? "Favoritos visíveis apenas para seguidores aprovados."
                    : "Este usuário ainda não definiu jogos favoritos."}
                </p>
              )}
            </div>

            <div className="border-t border-slate-200 pt-3 text-center">
              <p className="text-sm font-medium text-slate-900">Badges</p>
              <p className="mt-1 text-xs text-slate-600">Conquistas permanentes deste usuário.</p>
              <PermanentBadges
                className="mt-2"
                mode="public"
                visibility={profile.badgeVisibility}
                totalReviews={profile.counts.totalReviews}
                totalLikesReceived={profile.counts.totalLikesReceived}
                followersCount={profile.counts.followersCount}
                finishedCount={profile.counts.finishedCount}
                playingCount={profile.counts.playingCount}
                wishlistCount={profile.counts.wishlistCount}
                droppedCount={profile.counts.droppedCount}
              />
            </div>
          </section>

          {profile.isPrivate && !profile.canViewFullProfile ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-700">
                Este perfil esta privado. Para ver o catálogo completo, envie um pedido para seguir.
              </p>
              {profile.followStatus === FollowRelationshipStatus.REQUESTED ? (
                <p className="mt-2 text-sm text-amber-700">
                  Pedido pendente. Aguarde o usuário aceitar no sino de notificações.
                </p>
              ) : null}
            </section>
          ) : profile.reviews.length === 0 ? (
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

