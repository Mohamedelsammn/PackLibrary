import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBrandBySlug } from "@/lib/supabase/queries/brands";
import { getPacksByBrand } from "@/lib/supabase/queries/packs";
import { AppShell } from "@/components/layout/AppShell";
import { SearchLayout } from "@/features/search/components/SearchLayout";

interface PageProps {
  params:      Promise<{ brandSlug: string }>;
  searchParams: Promise<{
    region?: string;
    color?:  string;
    size?:   string;
    search?: string;
  }>;
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

export const dynamic = "force-dynamic";

export default async function BrandPage({ params, searchParams }: PageProps) {
  const { brandSlug } = await params;
  const filters       = await searchParams;

  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const { data: packs } = await getPacksByBrand(brand.id, 1, {
    region: filters.region || undefined,
    color:  filters.color  || undefined,
    size:   filters.size   || undefined,
    search: filters.search || undefined,
  });

  return (
    <AppShell activeBrandSlug={brandSlug}>
      <SearchLayout
        packs={packs}
        // No brands prop → no Brand dropdown on brand pages
        initialFilters={{
          region: filters.region || undefined,
          color:  filters.color  || undefined,
          size:   filters.size   || undefined,
        }}
        initialSearch={filters.search || ""}
        basePath={`/brands/${brandSlug}`}
        brandName={brand.name}
        showAddButton
      />
    </AppShell>
  );
}
