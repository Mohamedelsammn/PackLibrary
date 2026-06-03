import { Suspense } from "react";
import { getBrands } from "@/lib/supabase/queries/brands";
import { getAllPacksFiltered } from "@/lib/supabase/queries/packs";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { PackGrid } from "@/features/packs/components/PackGrid";
import { FilterBar } from "@/features/search/components/FilterBar";
import { PackCardSkeleton } from "@/features/packs/components/PackCardSkeleton";

interface PageProps {
  searchParams: Promise<{
    brand?:  string;
    region?: string;
    color?:  string;
    size?:   string;
  }>;
}

export const dynamic = "force-dynamic"; // filters change per request

export default async function HomePage({ searchParams }: PageProps) {
  const filters   = await searchParams;
  const [brands, { data: packs, total }] = await Promise.all([
    getBrands(),
    getAllPacksFiltered({
      brandSlug: filters.brand  || undefined,
      region:    filters.region || undefined,
      color:     filters.color  || undefined,
      size:      filters.size   || undefined,
    }),
  ]);

  const hasFilters = !!(filters.brand || filters.region || filters.color || filters.size);

  return (
    <AppShell>
      <Topbar brandName={hasFilters ? buildFilterSummary(filters) : undefined} />

      {/* Filter bar — sticky under topbar */}
      <Suspense>
        <FilterBar
          brands={brands}
          activeFilters={filters}
          basePath="/"
        />
      </Suspense>

      {/* Pack grid */}
      <div className="px-6 py-8 max-w-[1440px] mx-auto w-full">
        {/* Result count */}
        {hasFilters && (
          <p
            style={{
              fontSize: 13,
              color: "#747878",
              marginBottom: 20,
              fontWeight: 500,
            }}
          >
            {total === 0
              ? "No packs match the selected filters"
              : `${total} pack${total !== 1 ? "s" : ""} found`}
          </p>
        )}

        <Suspense
          fallback={
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <PackCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <PackGrid packs={packs} />
        </Suspense>
      </div>
    </AppShell>
  );
}

function buildFilterSummary(filters: {
  brand?: string;
  region?: string;
  color?: string;
  size?: string;
}): string {
  const parts: string[] = [];
  if (filters.brand)  parts.push(capitalize(filters.brand.replace(/-/g, " ")));
  if (filters.region) parts.push(filters.region);
  if (filters.color)  parts.push(filters.color);
  if (filters.size)   parts.push(filters.size);
  return parts.join(" · ");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
