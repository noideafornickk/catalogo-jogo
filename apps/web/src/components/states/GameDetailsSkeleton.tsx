import { ReviewCardSkeleton } from "@/components/states/ReviewCardSkeleton";

export function GameDetailsSkeleton() {
  return (
    <section className="space-y-5">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-start">
          <div className="aspect-[3/4] w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />

          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-9 w-24 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />

            <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-800">
              <div className="h-6 w-44 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="h-6 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 lg:grid-cols-2">
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
        </div>
      </section>
    </section>
  );
}
