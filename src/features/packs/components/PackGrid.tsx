import { PackCard } from "./PackCard";
import { PackCardSkeleton } from "./PackCardSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Box } from "lucide-react";
import type { PackListRow } from "@/lib/supabase/queries/packs";

interface PackGridProps {
  packs: PackListRow[];
  isLoading?: boolean;
  searchQuery?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function PackGrid({
  packs,
  isLoading,
  searchQuery = "",
  emptyTitle = "No packs found",
  emptyDescription = "No packaging formats have been added for this brand yet.",
}: PackGridProps) {
  if (isLoading) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <PackCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (packs.length === 0) {
    return (
      <EmptyState
        icon={<Box className="w-5 h-5" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
        gap: "1.5rem",
      }}
    >
      {packs.map((pack) => (
        <PackCard key={pack.id} pack={pack} searchQuery={searchQuery} />
      ))}
    </div>
  );
}
