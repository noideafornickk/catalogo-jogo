"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BadgeVisibility } from "@gamebox/shared/types/api";

type PermanentBadgeId = keyof BadgeVisibility;

type BadgeIcon = {
  src: string;
  alt: string;
  size: number;
  className?: string;
};

type PermanentBadge = {
  id: PermanentBadgeId;
  title: string;
  description: string;
  unlockRule: string;
  icon: BadgeIcon;
  unlockedToneClass: string;
  lockedToneClass: string;
  unlocked: boolean;
  progressLabel: string;
};

const DEFAULT_BADGE_VISIBILITY: BadgeVisibility = {
  first_of_many: true,
  reviews_master: true,
  review_critic: true,
  followers_star: true,
  full_explorer: true
};

type PermanentBadgesProps = {
  totalReviews: number;
  totalLikesReceived: number;
  followersCount: number;
  finishedCount: number;
  playingCount: number;
  wishlistCount: number;
  droppedCount: number;
  mode: "owner" | "public";
  ownerStorageKey?: string;
  helperTextAlign?: "left" | "center";
  visibility?: BadgeVisibility | null;
  onVisibilityChange?: (next: BadgeVisibility) => void;
  className?: string;
};

function buildPermanentBadges(
  totalReviews: number,
  totalLikesReceived: number,
  followersCount: number,
  finishedCount: number,
  playingCount: number,
  wishlistCount: number,
  droppedCount: number
): PermanentBadge[] {
  const firstReviewMin = 1;
  const reviewMasterMin = 5;
  const criticMinLikes = 10;
  const followersMin = 10;
  const fullExplorerMinCategories = 4;
  const completedCategories = [
    finishedCount > 0,
    playingCount > 0,
    wishlistCount > 0,
    droppedCount > 0
  ].filter(Boolean).length;

  return [
    {
      id: "first_of_many",
      title: "Primeira de muitas",
      description: "Sua primeira review abriu o caminho para muitas outras.",
      unlockRule: "Faça pelo menos 1 review para desbloquear!",
      icon: {
        src: "/badges/pena.png",
        alt: "Badge Primeira de muitas",
        size: 14
      },
      unlockedToneClass: "border-indigo-300 bg-indigo-50 text-indigo-800",
      lockedToneClass: "border-zinc-700 bg-zinc-900 text-zinc-100",
      unlocked: totalReviews >= firstReviewMin,
      progressLabel: `${Math.min(totalReviews, firstReviewMin)}/${firstReviewMin} reviews`
    },
    {
      id: "reviews_master",
      title: "Não ha limite pra resenha",
      description: "Seu papel nas resenhas foram brutais! Parabéns.",
      unlockRule: "Faça pelo menos 5 reviews para desbloquear!",
      icon: {
        src: "/badges/fogo.png",
        alt: "Badge Não ha limite pra resenha",
        size: 14
      },
      unlockedToneClass: "border-orange-300 bg-orange-50 text-orange-800",
      lockedToneClass: "border-zinc-700 bg-zinc-900 text-zinc-100",
      unlocked: totalReviews >= reviewMasterMin,
      progressLabel: `${Math.min(totalReviews, reviewMasterMin)}/${reviewMasterMin} reviews`
    },
    {
      id: "review_critic",
      title: "Critico resenhista",
      description: "Suas reviews recebem atencao e mostram consistencia critica.",
      unlockRule: "Receba pelo menos 10 curtidas totais para desbloquear!",
      icon: {
        src: "/badges/lupa.png",
        alt: "Badge Critico resenhista",
        size: 14
      },
      unlockedToneClass: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800",
      lockedToneClass: "border-zinc-700 bg-zinc-900 text-zinc-100",
      unlocked: totalLikesReceived >= criticMinLikes,
      progressLabel: `${Math.min(totalLikesReceived, criticMinLikes)}/${criticMinLikes} curtidas`
    },
    {
      id: "followers_star",
      title: "Como eles chegaram aqui?",
      description: "Seu perfil chamou atencao e passou a ser acompanhado por mais pessoas.",
      unlockRule: "Conquiste pelo menos 10 seguidores para desbloquear!",
      icon: {
        src: "/badges/so.png",
        alt: "Badge de seguidores",
        size: 14
      },
      unlockedToneClass: "border-cyan-300 bg-cyan-50 text-cyan-800",
      lockedToneClass: "border-zinc-700 bg-zinc-900 text-zinc-100",
      unlocked: followersCount >= followersMin,
      progressLabel: `${Math.min(followersCount, followersMin)}/${followersMin} seguidores`
    },
    {
      id: "full_explorer",
      title: "Explorador Completo",
      description: "Você explorou todas as categorias de status do catálogo.",
      unlockRule:
        "Tenha pelo menos 1 review em cada categoria: Finalizados, Jogando, Wishlist e Dropados.",
      icon: {
        src: "/badges/controle.png",
        alt: "Badge Explorador Completo",
        size: 14
      },
      unlockedToneClass: "border-teal-300 bg-teal-50 text-teal-800",
      lockedToneClass: "border-zinc-700 bg-zinc-900 text-zinc-100",
      unlocked: completedCategories >= fullExplorerMinCategories,
      progressLabel: `${Math.min(completedCategories, fullExplorerMinCategories)}/${fullExplorerMinCategories} categorias`
    }
  ];
}

function renderBadgeIcon(icon: BadgeIcon, locked: boolean) {
  return (
    <Image
      src={icon.src}
      alt={icon.alt}
      width={icon.size}
      height={icon.size}
      className={`${icon.className ?? ""} ${locked ? "brightness-0 saturate-0 contrast-125 opacity-95" : ""}`}
      style={{ width: icon.size, height: icon.size }}
    />
  );
}

function normalizeVisibility(value?: BadgeVisibility | null): BadgeVisibility {
  return {
    first_of_many: value?.first_of_many ?? DEFAULT_BADGE_VISIBILITY.first_of_many,
    reviews_master: value?.reviews_master ?? DEFAULT_BADGE_VISIBILITY.reviews_master,
    review_critic: value?.review_critic ?? DEFAULT_BADGE_VISIBILITY.review_critic,
    followers_star: value?.followers_star ?? DEFAULT_BADGE_VISIBILITY.followers_star,
    full_explorer: value?.full_explorer ?? DEFAULT_BADGE_VISIBILITY.full_explorer
  };
}

export function PermanentBadges({
  totalReviews,
  totalLikesReceived,
  followersCount,
  finishedCount,
  playingCount,
  wishlistCount,
  droppedCount,
  mode,
  ownerStorageKey,
  helperTextAlign = "left",
  visibility,
  onVisibilityChange,
  className
}: PermanentBadgesProps) {
  const [activeBadge, setActiveBadge] = useState<PermanentBadge | null>(null);
  const [unlockToasts, setUnlockToasts] = useState<
    Array<{ key: string; id: PermanentBadgeId; title: string; icon: BadgeIcon }>
  >([]);
  const timeoutIdsRef = useRef<number[]>([]);

  const badges = useMemo(
    () =>
      buildPermanentBadges(
        totalReviews,
        totalLikesReceived,
        followersCount,
        finishedCount,
        playingCount,
        wishlistCount,
        droppedCount
      ),
    [
      totalReviews,
      totalLikesReceived,
      followersCount,
      finishedCount,
      playingCount,
      wishlistCount,
      droppedCount
    ]
  );

  const visibilityMap = useMemo(() => normalizeVisibility(visibility), [visibility]);

  const visibleBadges =
    mode === "public"
      ? badges.filter((badge) => badge.unlocked && visibilityMap[badge.id])
      : badges;
  const helperTextClassName = helperTextAlign === "center" ? "text-center" : "";

  function pushUnlockToasts(nextUnlockedBadges: PermanentBadge[]) {
    if (nextUnlockedBadges.length === 0) {
      return;
    }

    const now = Date.now();
    const nextEntries = nextUnlockedBadges.map((badge, index) => ({
      key: `${badge.id}-${now}-${index}`,
      id: badge.id,
      title: badge.title,
      icon: badge.icon
    }));

    setUnlockToasts((prev) => [...prev, ...nextEntries]);

    nextEntries.forEach((entry) => {
      const timeoutId = window.setTimeout(() => {
        setUnlockToasts((prev) => prev.filter((item) => item.key !== entry.key));
      }, 2500);
      timeoutIdsRef.current.push(timeoutId);
    });
  }

  function toggleVisibility(badgeId: PermanentBadgeId) {
    if (!onVisibilityChange) {
      return;
    }

    onVisibilityChange({
      ...visibilityMap,
      [badgeId]: !visibilityMap[badgeId]
    });
  }

  useEffect(() => {
    if (!activeBadge) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveBadge(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeBadge]);

  useEffect(() => {
    if (mode !== "owner") {
      return;
    }

    const seenKey = `gamebox.badges.seen.${ownerStorageKey ?? "current"}`;
    const unlockedBadges = badges.filter((badge) => badge.unlocked);
    const unlockedIds = unlockedBadges.map((badge) => badge.id);

    let seenIds: PermanentBadgeId[] = [];
    try {
      const raw = window.localStorage.getItem(seenKey);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          seenIds = parsed.filter((item): item is PermanentBadgeId => typeof item === "string");
        }
      }
    } catch {
      seenIds = [];
    }

    const newlyUnlocked = unlockedBadges.filter((badge) => !seenIds.includes(badge.id));

    if (newlyUnlocked.length > 0) {
      pushUnlockToasts(newlyUnlocked);
    }

    try {
      window.localStorage.setItem(seenKey, JSON.stringify(unlockedIds));
    } catch {
      // Ignore storage write failures (private mode, quota, etc.).
    }
  }, [badges, mode, ownerStorageKey]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutIdsRef.current = [];
    };
  }, []);

  return (
    <>
      {mode === "owner" && unlockToasts.length > 0 ? (
        <div className="pointer-events-none fixed right-4 top-4 z-[140] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
          {unlockToasts.map((toast) => (
            <div
              key={toast.key}
              className="pointer-events-auto flex items-center gap-3 rounded-xl border border-emerald-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:border-emerald-900/60 dark:bg-slate-900/95"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/40">
                <Image
                  src={toast.icon.src}
                  alt={toast.icon.alt}
                  width={18}
                  height={18}
                  className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]"
                />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {toast.title}
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Nova badge desbloqueada 🎉
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className={`space-y-2 ${className ?? ""}`}>
        {visibleBadges.length === 0 ? (
          mode === "public" ? (
            <p className="text-xs text-slate-500">Sem badges públicas visíveis no momento.</p>
          ) : (
            <p className="text-xs text-slate-500">Nenhuma conquista cadastrada.</p>
          )
        ) : (
          <div
            className={
              mode === "owner"
                ? "flex flex-wrap items-center justify-center gap-2"
                : "flex flex-wrap items-center justify-center gap-2"
            }
          >
            {visibleBadges.map((badge) => {
              const locked = !badge.unlocked;
              const isVisibleOnPublic = visibilityMap[badge.id];

              return (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => setActiveBadge(badge)}
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                    locked ? badge.lockedToneClass : badge.unlockedToneClass
                  } ${
                    mode === "owner" && badge.unlocked && !isVisibleOnPublic
                      ? "opacity-65"
                      : ""
                  }`}
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm leading-none">
                    {renderBadgeIcon(badge.icon, locked)}
                  </span>
                  <span>{locked ? "???" : badge.title}</span>
                  {mode === "owner" && badge.unlocked && !isVisibleOnPublic ? (
                    <span className="rounded bg-white/70 px-1 py-0.5 text-[10px] text-slate-700">
                      oculta
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        {mode === "owner" ? (
          <p className={`text-[11px] text-slate-500 ${helperTextClassName}`}>
            Badges bloqueadas aparecem como mistério. Clique para detalhes e para escolher se
            exibe no perfil público.
          </p>
        ) : (
          <p className={`text-[11px] text-slate-500 ${helperTextClassName}`}>
            São exibidas apenas badges desbloqueadas.
          </p>
        )}
      </div>

      {activeBadge ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setActiveBadge(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">
                {activeBadge.unlocked ? activeBadge.title : "???"}
              </p>
              <button
                type="button"
                onClick={() => setActiveBadge(null)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>

            <p className="mt-2 text-sm text-slate-700">
              {activeBadge.unlocked ? activeBadge.description : "Conquista secreta."}
            </p>

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Como conseguir
              </p>
              <p className="mt-1 text-sm text-slate-700">{activeBadge.unlockRule}</p>
              <p className="mt-2 text-xs text-slate-500">{activeBadge.progressLabel}</p>
            </div>

            {mode === "owner" && activeBadge.unlocked ? (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-medium text-slate-700">Exibir no perfil público</p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={visibilityMap[activeBadge.id]}
                  onClick={() => toggleVisibility(activeBadge.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                    visibilityMap[activeBadge.id] ? "bg-slate-900" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      visibilityMap[activeBadge.id] ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ) : null}

            <p
              className={`mt-3 text-xs font-medium ${
                activeBadge.unlocked ? "text-emerald-700" : "text-slate-600"
              }`}
            >
              {activeBadge.unlocked ? "Conquista desbloqueada." : "Conquista ainda bloqueada."}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
