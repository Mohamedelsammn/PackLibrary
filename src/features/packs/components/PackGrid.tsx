import { PackCard } from "./PackCard";
import { PackCardSkeleton } from "./PackCardSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Box } from "lucide-react";
import type { PackListRow } from "@/lib/supabase/queries/packs";

interface PackGridProps {
  packs: PackListRow[];
  isLoading?: boolean;
}

export function PackGrid({ packs, isLoading }: PackGridProps) {
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
        title="No packs found"
        description="No packaging formats have been added for this brand yet."
      />
    );
  }

  return (
    <div
      style={{
        display: "grid",
        /* auto-fill: fills columns using minimum 340px each.
           On a 900px content area → 2 columns of ~440px.
           On a 1200px area → 3 columns of ~380px.
           With 1 pack → 1 wide column that fills available space, capped below. */
        gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
        gap: "1.5rem",
      }}
    >
      {packs.map((pack) => (
        <PackCard key={pack.id} pack={pack} />
      ))}
    </div>
  );
}
