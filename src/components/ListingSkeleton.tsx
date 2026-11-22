export function ListingGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-[#1c1a17]"
        >
          <div className="aspect-[4/3] w-full animate-pulse bg-stone-200 dark:bg-stone-800" />
          <div className="space-y-3 p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
            <div className="h-5 w-4/5 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
            <div className="h-5 w-1/3 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-[#1c1a17]"
        >
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
