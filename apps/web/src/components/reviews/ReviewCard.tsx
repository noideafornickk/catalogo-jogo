import Image from "next/image";
import Link from "next/link";
import type { ReviewItem } from "@gamebox/shared/types/review";
import { formatDateTime } from "@/lib/utils/dates";
import { rating10ToStars } from "@/lib/utils/rating";
import { StarRating } from "./StarRating";
import { ReviewLikeButton } from "./ReviewLikeButton";

type ReviewCardProps = {
  review: ReviewItem;
  showUser?: boolean;
  showGameCover?: boolean;
  gameCoverSize?: "sm" | "md";
  showDescriptionPreview?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
};

export function ReviewCard({
  review,
  showUser,
  showGameCover = true,
  gameCoverSize = "sm",
  showDescriptionPreview = true,
  onEdit,
  onDelete,
  onReport
}: ReviewCardProps) {
  const shouldShowGameCover = Boolean(showUser && showGameCover);
  const shouldShowDescriptionPreview = Boolean(
    showUser && showDescriptionPreview && review.game.descriptionPreview
  );
  const coverClassName =
  gameCoverSize === "md"
      ? "relative h-20 w-32 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 sm:h-24 sm:w-40"
      : "relative h-12 w-9 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100";
  const coverSizes = gameCoverSize === "md" ? "(max-width: 640px) 128px, 160px" : "36px";

  return (
    <article className="w-full max-w-full space-y-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:relative lg:flex lg:h-full lg:flex-col lg:gap-3 lg:space-y-0 lg:pb-14">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <Link
            href={`/games/${review.game.rawgId}`}
            className="block max-w-full text-base font-semibold text-slate-900 hover:underline"
          >
            <span className="block max-w-full truncate">{review.game.title}</span>
          </Link>
          <p className="text-sm text-slate-500">{formatDateTime(review.createdAt)}</p>
        </div>

        <div className="self-start rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:shrink-0">
          <div className="flex items-center gap-2">
            <StarRating value={rating10ToStars(review.rating)} />
            <span>{review.rating}/10</span>
          </div>
        </div>
      </header>

      {showUser ? (
        <div
          className={`flex w-full max-w-full flex-wrap items-center gap-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 ${
            shouldShowGameCover ? "sm:justify-between" : "justify-start"
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-700">
            {review.user.isPrivate ? (
              <div className="flex min-w-0 max-w-full items-center gap-2">
                {review.user.avatarUrl ? (
                  <img
                    src={review.user.avatarUrl}
                    alt={review.user.name}
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                  />
                ) : null}
                <span className="block min-w-0 max-w-full truncate">{review.user.name}</span>
              </div>
            ) : (
              <Link
                href={`/users/${review.user.id}`}
                className="flex min-w-0 max-w-full items-center gap-2 hover:underline"
              >
                {review.user.avatarUrl ? (
                  <img
                    src={review.user.avatarUrl}
                    alt={review.user.name}
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                  />
                ) : null}
                <span className="block min-w-0 max-w-full truncate">{review.user.name}</span>
              </Link>
            )}

            {review.user.isPrivate ? (
              <span className="shrink-0 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Perfil privado
              </span>
            ) : null}
          </div>

          {shouldShowGameCover ? (
            <Link
              href={`/games/${review.game.rawgId}`}
              className={`${coverClassName} ml-auto`}
            >
              {review.game.coverUrl ? (
                <Image
                  src={review.game.coverUrl}
                  alt={`Capa de ${review.game.title}`}
                  fill
                  sizes={coverSizes}
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full bg-slate-200" />
              )}
            </Link>
          ) : null}
        </div>
      ) : null}

      {shouldShowDescriptionPreview ? (
        <Link
          href={`/games/${review.game.rawgId}`}
          className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Descrição oficial</p>
          <p className="mt-1 break-words text-preview-clamp-two text-fade-last-line text-sm leading-6 text-slate-700">
            {review.game.descriptionPreview}
          </p>
        </Link>
      ) : null}

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

      {review.body ? <p className="break-words text-sm text-slate-700">{review.body}</p> : null}

      {onEdit || onDelete || onReport ? (
        <div className="flex w-full items-center justify-end gap-2 pt-1 lg:absolute lg:bottom-4 lg:right-4 lg:w-auto lg:pt-0">
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

          {onReport ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-amber-200 px-2 py-0.5 text-[11px] text-amber-700 hover:bg-amber-50"
              onClick={onReport}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
                className="h-3 w-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.591c.75 1.334-.213 2.99-1.742 2.99H3.48c-1.53 0-2.492-1.656-1.742-2.99L8.257 3.1Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 7.25v4.25"
                />
                <circle cx="10" cy="14.75" r="0.8" fill="currentColor" stroke="none" />
              </svg>
              Denunciar
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
