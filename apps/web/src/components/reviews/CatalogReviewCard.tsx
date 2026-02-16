import Image from "next/image";
import Link from "next/link";
import type { ReviewItem } from "@gamebox/shared/types/review";
import { formatDateTime } from "@/lib/utils/dates";
import { rating10ToStars } from "@/lib/utils/rating";
import { StarRating } from "./StarRating";
import { ReviewLikeButton } from "./ReviewLikeButton";

type CatalogReviewCardProps = {
  review: ReviewItem;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function CatalogReviewCard({ review, onEdit, onDelete }: CatalogReviewCardProps) {
  return (
    <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <Link
            href={`/games/${review.game.rawgId}`}
            className="inline-flex max-w-full text-base font-semibold text-slate-900 hover:underline"
          >
            <span className="truncate">{review.game.title}</span>
          </Link>

          <p className="text-sm text-slate-600">
            {review.game.reviewCount} reviews no total
          </p>

          {review.game.descriptionPreview ? (
            <Link
              href={`/games/${review.game.rawgId}`}
              className="mt-2 block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Descrição oficial
              </p>
              <p className="mt-1 text-preview-clamp-two text-fade-last-line text-sm leading-6 text-slate-700">
                {review.game.descriptionPreview}
              </p>
            </Link>
          ) : null}
        </div>

        <Link
          href={`/games/${review.game.rawgId}`}
          className="relative h-44 w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100 sm:h-40 sm:w-28 sm:shrink-0 md:h-44 md:w-32"
        >
          {review.game.coverUrl ? (
            <Image
              src={review.game.coverUrl}
              alt={`Capa de ${review.game.title}`}
              fill
              sizes="(max-width: 768px) 112px, 128px"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-slate-200" />
          )}
        </Link>
      </div>

      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-sm text-slate-500">{formatDateTime(review.updatedAt)}</p>
        <div className="rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-2">
            <StarRating value={rating10ToStars(review.rating)} />
            <span>{review.rating}/10</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full bg-slate-100 px-2 py-1">{review.status}</span>
        <span
          className={`rounded-full px-2 py-1 ${
            review.recommend
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
          }`}
        >
          {review.recommend ? "Recomenda" : "Não recomenda"}
        </span>
        <ReviewLikeButton
          reviewId={review.id}
          initialLikesCount={review.likesCount}
          initialLikedByMe={review.likedByMe}
          isOwner={review.isOwner}
        />
      </div>

      {review.body ? <p className="text-sm text-slate-700">{review.body}</p> : null}

      {onEdit || onDelete ? (
        <div className="flex gap-2">
          {onEdit ? (
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              onClick={onEdit}
            >
              Editar
            </button>
          ) : null}

          {onDelete ? (
            <button
              type="button"
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
              onClick={onDelete}
            >
              Excluir
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
