import { AppShell } from "@/components/layout/AppShell";
import { PackCardSkeleton } from "@/features/packs/components/PackCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function BrandLoading() {
  return (
    <AppShell>
      <div className="h-14 border-b border-border/50 bg-background/95" />
      <div className="px-8 py-8 max-w-[1200px] mx-auto w-full">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <PackCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
