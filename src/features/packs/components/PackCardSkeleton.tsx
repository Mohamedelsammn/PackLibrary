import { Skeleton } from "@/components/ui/skeleton";

export function PackCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-7 w-7 rounded-full" />
      </div>
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="aspect-[4/3] w-full rounded-lg" />
      <div className="grid grid-cols-3 gap-2 pt-3 mt-1 border-t border-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
