import { getBrands } from "@/lib/supabase/queries/brands";
import { getAllPacksFiltered } from "@/lib/supabase/queries/packs";
import { AppShell } from "@/components/layout/AppShell";
import { SearchLayout } from "@/features/search/components/SearchLayout";

interface PageProps {
  searchParams: Promise<{
    brand?:  string;
    region?: string;
    color?:  string;
    size?:   string;
    search?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: PageProps) {
  const filters = await searchParams;

  const [brands, { data: packs }] = await Promise.all([
    getBrands(),
    getAllPacksFiltered({
      brandSlug: filters.brand  || undefined,
      region:    filters.region || undefined,
      color:     filters.color  || undefined,
      size:      filters.size   || undefined,
      search:    filters.search || undefined,
    }),
  ]);

  return (
    <AppShell>
      <SearchLayout
        packs={packs}
        brands={brands}
        initialFilters={{
          brand:  filters.brand  || undefined,
          region: filters.region || undefined,
          color:  filters.color  || undefined,
          size:   filters.size   || undefined,
        }}
        initialSearch={filters.search || ""}
        basePath="/"
        showAddButton
      />
    </AppShell>
  );
}
