import { ReviewCardSkeleton } from "@/components/states/ReviewCardSkeleton";

export function ProfilePageSkeleton() {
  return (
    <section className="space-y-5">
      <div className="h-8 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="h-20 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-8 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-6 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />

          <div className="space-y-2 pt-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`profile-count-skeleton-${index}`}
                className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700"
              />
            ))}
          </div>

          <div className="h-9 w-40 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
        </aside>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="space-y-2">
            <div className="h-4 w-14 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-36 w-full animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
          </div>

          <div className="h-20 w-full animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 w-32 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </section>
  );
}

export function PublicProfilePageSkeleton() {
  return (
    <section className="space-y-5">
      <div className="h-8 w-44 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-5 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>

        <div className="h-16 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`public-profile-count-skeleton-${index}`}
              className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700"
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="h-6 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <ReviewCardSkeleton />
        <ReviewCardSkeleton compact />
      </section>
    </section>
  );
}
