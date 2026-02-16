type ReviewCardSkeletonProps = {
  compact?: boolean;
};

export function ReviewCardSkeleton({ compact = false }: ReviewCardSkeletonProps) {
  return (
    <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-5 w-3/5 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="h-8 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </div>

      {compact ? null : (
        <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      )}

      <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
    </article>
  );
}
