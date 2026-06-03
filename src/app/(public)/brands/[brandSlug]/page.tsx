import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getBrandBySlug } from "@/lib/supabase/queries/brands";
import { getPacksByBrand } from "@/lib/supabase/queries/packs";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { PackGrid } from "@/features/packs/components/PackGrid";
import { FilterBar } from "@/features/search/components/FilterBar";
import { PackCardSkeleton } from "@/features/packs/components/PackCardSkeleton";

interface PageProps {
  params:      Promise<{ brandSlug: string }>;
  searchParams: Promise<{ region?: string; color?: string; size?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brandSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) return {};
  return {
    title: `${brand.name} — Pack Library`,
    description: `Browse packaging formats for ${brand.name}`,
  };
}

export const dynamic = "force-dynamic"; // filter params change per request

export default async function BrandPage({ params, searchParams }: PageProps) {
  const { brandSlug } = await params;
  const filters       = await searchParams;

  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const { data: packs, total } = await getPacksByBrand(brand.id, 1, {
    region: filters.region || undefined,
    color:  filters.color  || undefined,
    size:   filters.size   || undefined,
  });

  const hasFilters = !!(filters.region || filters.color || filters.size);

  return (
    <AppShell activeBrandSlug={brandSlug}>
      <Topbar brandName={brand.name} />

      {/* Region / Color / Size filters — no Brand dropdown here */}
      <Suspense>
        <FilterBar
          activeFilters={filters}
          basePath={`/brands/${brandSlug}`}
        />
      </Suspense>

      <div className="px-6 py-8 max-w-[1440px] mx-auto w-full">
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
              {Array.from({ length: 4 }).map((_, i) => <PackCardSkeleton key={i} />)}
            </div>
          }
        >
          <PackGrid packs={packs} />
        </Suspense>
      </div>
    </AppShell>
  );
}
