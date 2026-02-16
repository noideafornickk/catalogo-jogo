import Image from "next/image";
import Link from "next/link";
import type { GameSummary } from "@gamebox/shared/types/game";
import { formatDate } from "@/lib/utils/dates";
import { StarRating } from "@/components/reviews/StarRating";

type GameCardProps = {
  game: GameSummary;
  actionLabel?: string;
  onAction?: (game: GameSummary) => void;
};

export function GameCard({ game, actionLabel, onAction }: GameCardProps) {
  const coverSrc = game.coverUrl ?? "/placeholder-game.svg";

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Link href={`/games/${game.rawgId}`} className="block">
        <div className="relative aspect-[4/3] w-full bg-slate-100">
          <Image src={coverSrc} alt={game.title} fill sizes="(max-width: 1024px) 100vw, 25vw" className="object-cover" />
        </div>

        <div className="space-y-2 p-4">
          <h3 className="line-clamp-1 text-base font-semibold text-slate-900">{game.title}</h3>
          <p className="text-sm text-slate-500">Lançamento: {formatDate(game.released)}</p>

          <div className="text-sm text-slate-600">
            {game.reviewCount && game.reviewCount > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <StarRating value={(game.avgRating ?? 0) / 2} />
                <span>
                  Nota média {game.avgRating ?? "-"} ({game.reviewCount} reviews)
                </span>
              </span>
            ) : (
              <span>Ainda sem reviews</span>
            )}
          </div>
        </div>
      </Link>

      {actionLabel && onAction ? (
        <div className="px-4 pb-4">
          <button
            type="button"
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => onAction(game)}
          >
            {actionLabel}
          </button>
        </div>
      ) : null}
    </article>
  );
}
