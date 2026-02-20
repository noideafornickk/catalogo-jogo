"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { RankBadgeCode } from "@gamebox/shared/constants/enums";
import type { RankBadge } from "@gamebox/shared/types/rank";

type RankBadgeIconsProps = {
  badges: RankBadge[];
  size?: "sm" | "md";
  variant?: "icons" | "labels" | "chips";
  iconScale?: number;
  className?: string;
};

const rankBadgeIconMap: Record<RankBadgeCode, string> = {
  [RankBadgeCode.TOP_REVIEWS]: "/ranks/olho.png",
  [RankBadgeCode.TOP_LIKES]: "/ranks/coracao.png",
  [RankBadgeCode.TOP_FOLLOWERS]: "/ranks/social.png"
};

const rankBadgeTitleMap: Record<RankBadgeCode, string> = {
  [RankBadgeCode.TOP_REVIEWS]: "Profissional da Resenha",
  [RankBadgeCode.TOP_LIKES]: "Queridinho da Resenha",
  [RankBadgeCode.TOP_FOLLOWERS]: "Averiguador de Resenha"
};

const rankBadgeDescriptionMap: Record<RankBadgeCode, string> = {
  [RankBadgeCode.TOP_REVIEWS]:
    "Destinado para somente os mais resenheiros! Seja o top 1 com mais resenhas feitas para liberar.",
  [RankBadgeCode.TOP_LIKES]:
    "Conquistado por quem tem a melhor média de curtidas por resenha. Seja o top 1 em curtidas/reviews para liberar.",
  [RankBadgeCode.TOP_FOLLOWERS]:
    "Título para o perfil mais acompanhado da comunidade. Seja o top 1 em seguidores para liberar."
};

function badgeToneClass(code: RankBadgeCode): string {
  switch (code) {
    case RankBadgeCode.TOP_REVIEWS:
      return "border-sky-300/70 bg-sky-50/70 text-sky-800";
    case RankBadgeCode.TOP_LIKES:
      return "border-rose-300/70 bg-rose-50/70 text-rose-800";
    case RankBadgeCode.TOP_FOLLOWERS:
      return "border-emerald-300/70 bg-emerald-50/70 text-emerald-800";
    default:
      return "border-slate-300/70 bg-slate-50 text-slate-700";
  }
}

export function RankBadgeIcons({
  badges,
  size = "sm",
  variant = "icons",
  iconScale = 1,
  className
}: RankBadgeIconsProps) {
  const [activeBadge, setActiveBadge] = useState<{
    title: string;
    description: string;
  } | null>(null);

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

  if (!badges || badges.length === 0) {
    return null;
  }

  const iconSize = size === "md" ? 22 : 16;

  function resolveIconSize(code: RankBadgeCode): number {
    const baseSize =
      code === RankBadgeCode.TOP_FOLLOWERS
        ? Math.round(iconSize * 2.16)
        : iconSize;

    return Math.max(1, Math.round(baseSize * iconScale));
  }

  function resolveIconClass(code: RankBadgeCode, baseClassName: string): string {
    if (code === RankBadgeCode.TOP_FOLLOWERS) {
      return baseClassName;
    }

    if (code === RankBadgeCode.TOP_LIKES) {
      return `${baseClassName} -translate-x-[3%] md:translate-x-0`;
    }

    return baseClassName;
  }

  function openBadgeInfo(code: RankBadgeCode, fallbackTitle?: string) {
    const title = fallbackTitle || rankBadgeTitleMap[code];
    const description = rankBadgeDescriptionMap[code];
    setActiveBadge({ title, description });
  }

  if (variant === "labels") {
    return (
      <>
        <span className={`inline-flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
          {badges.map((badge) => {
            const iconSrc = rankBadgeIconMap[badge.code];
            const title = badge.title || rankBadgeTitleMap[badge.code];

            return (
              <button
                key={badge.code}
                type="button"
                title={title}
                aria-label={title}
                onClick={() => openBadgeInfo(badge.code, title)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${badgeToneClass(
                  badge.code
                )}`}
              >
                <span
                  className="relative inline-flex shrink-0 items-center justify-center overflow-visible"
                  style={{ width: iconSize, height: iconSize }}
                >
                  <Image
                    src={iconSrc}
                    alt={title}
                    width={resolveIconSize(badge.code)}
                    height={resolveIconSize(badge.code)}
                    className={resolveIconClass(
                      badge.code,
                      "drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]"
                    )}
                    style={{
                      width: resolveIconSize(badge.code),
                      height: resolveIconSize(badge.code),
                      maxWidth: "none"
                    }}
                  />
                </span>
                <span className="leading-none">{title}</span>
              </button>
            );
          })}
        </span>
        {activeBadge ? (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
            onClick={() => setActiveBadge(null)}
          >
            <div
              className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{activeBadge.title}</p>
                <button
                  type="button"
                  onClick={() => setActiveBadge(null)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                >
                  Fechar
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-700">{activeBadge.description}</p>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  if (variant === "chips") {
    const chipFrameSize = size === "md" ? 30 : 25;

    return (
      <>
        <span className={`inline-flex shrink-0 items-center gap-1.5 ${className ?? ""}`}>
          {badges.map((badge) => {
            const iconSrc = rankBadgeIconMap[badge.code];
            const title = badge.title || rankBadgeTitleMap[badge.code];

            return (
              <button
                key={badge.code}
                type="button"
                title={title}
                aria-label={title}
                onClick={() => openBadgeInfo(badge.code, title)}
                className={`inline-flex items-center justify-center rounded-full border transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${badgeToneClass(
                  badge.code
                )}`}
                style={{ width: chipFrameSize, height: chipFrameSize }}
              >
                <Image
                  src={iconSrc}
                  alt={title}
                  width={resolveIconSize(badge.code)}
                  height={resolveIconSize(badge.code)}
                  className={resolveIconClass(
                    badge.code,
                    "drop-shadow-[0_1px_1px_rgba(0,0,0,0.22)]"
                  )}
                />
              </button>
            );
          })}
        </span>
        {activeBadge ? (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
            onClick={() => setActiveBadge(null)}
          >
            <div
              className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{activeBadge.title}</p>
                <button
                  type="button"
                  onClick={() => setActiveBadge(null)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                >
                  Fechar
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-700">{activeBadge.description}</p>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <span className={`inline-flex shrink-0 items-center gap-1 ${className ?? ""}`}>
        {badges.map((badge) => {
          const iconSrc = rankBadgeIconMap[badge.code];
          const title = badge.title || rankBadgeTitleMap[badge.code];

          return (
            <button
              key={badge.code}
              type="button"
              title={title}
              aria-label={title}
              onClick={() => openBadgeInfo(badge.code, title)}
              className="inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <Image
                src={iconSrc}
                alt={title}
                width={resolveIconSize(badge.code)}
                height={resolveIconSize(badge.code)}
                className={resolveIconClass(
                  badge.code,
                  "drop-shadow-[0_1px_1px_rgba(0,0,0,0.22)]"
                )}
              />
            </button>
          );
        })}
      </span>
      {activeBadge ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setActiveBadge(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{activeBadge.title}</p>
              <button
                type="button"
                onClick={() => setActiveBadge(null)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-700">{activeBadge.description}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
