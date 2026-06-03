"use client";

import { useState, useMemo, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { FilterBar } from "./FilterBar";
import { PackGrid } from "@/features/packs/components/PackGrid";
import type { PackListRow, PackListRowWithBrand } from "@/lib/supabase/queries/packs";
import type { BrandRow } from "@/lib/supabase/types";

type AnyPack = PackListRow | PackListRowWithBrand;

export interface SearchLayoutProps {
  /** Packs already pre-filtered server-side by brand/region/color/size (+search) */
  packs: AnyPack[];
  /** When provided, the Brand dropdown appears in FilterBar (global / All page) */
  brands?: Pick<BrandRow, "slug" | "name">[];
  /** Current filter state from URL searchParams */
  initialFilters: {
    brand?:  string;
    region?: string;
    color?:  string;
    size?:   string;
  };
  /** Initial search value from URL searchParams */
  initialSearch?: string;
  /** Base path for URL updates (e.g. "/" or "/brands/marlboro") */
  basePath?: string;
  brandName?: string;
  showAddButton?: boolean;
}

// ── Text matching used for optimistic client-side filtering ───────────────────
function matchesPack(pack: AnyPack, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const haystack = [
    pack.name,
    "brands" in pack ? (pack as PackListRowWithBrand).brands?.name ?? "" : "",
    pack.region  ?? "",
    pack.color   ?? "",
    pack.size    ?? "",
    pack.format  ?? "",
    pack.material ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SearchLayout({
  packs,
  brands,
  initialFilters,
  initialSearch = "",
  basePath = "/",
  brandName,
  showAddButton,
}: SearchLayoutProps) {
  const router = useRouter();

  // Local search state — drives optimistic filtering before server responds
  const [localSearch, setLocalSearch] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Sync from URL when server re-renders with new initialSearch
  // (e.g. after a filter dropdown changes, the page re-renders)
  useEffect(() => {
    if (!isTypingRef.current) {
      setLocalSearch(initialSearch ?? "");
    }
  }, [initialSearch]);

  // Debounced URL update — uses router.replace so FilterBar's useSearchParams
  // stays in sync and preserves search when filter dropdowns are also changed.
  const handleSearch = useCallback(
    (value: string) => {
      isTypingRef.current = true;
      setLocalSearch(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        isTypingRef.current = false;

        // Build the new URL from current filter state + new search value
        const params = new URLSearchParams();
        if (initialFilters.brand)  params.set("brand",  initialFilters.brand);
        if (initialFilters.region) params.set("region", initialFilters.region);
        if (initialFilters.color)  params.set("color",  initialFilters.color);
        if (initialFilters.size)   params.set("size",   initialFilters.size);
        if (value.trim())          params.set("search", value.trim());

        const qs = params.toString();
        router.replace(`${basePath}${qs ? `?${qs}` : ""}`, { scroll: false });
      }, 300);
    },
    [router, basePath, initialFilters]
  );

  // Optimistic client-side filter for instant feedback
  // (applies the typed-but-not-yet-debounced search on top of server results)
  const terms = useMemo(
    () =>
      localSearch
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean),
    [localSearch]
  );

  const filteredPacks = useMemo(
    () => packs.filter((p) => matchesPack(p, terms)),
    [packs, terms]
  );

  const hasSearch = localSearch.trim().length > 0;
  const total     = filteredPacks.length;

  return (
    <>
      {/* Topbar with search */}
      <Topbar
        brandName={brandName}
        showAddButton={showAddButton}
        searchValue={localSearch}
        onSearchChange={handleSearch}
      />

      {/* Filter dropdowns */}
      <Suspense fallback={<FilterBarPlaceholder hasBrand={!!brands?.length} />}>
        <FilterBar
          brands={brands}
          activeFilters={initialFilters}
          basePath={basePath}
        />
      </Suspense>

      {/* Results */}
      <div className="px-6 py-8 max-w-[1440px] mx-auto w-full">
        {/* Result count — shown when search or filters are active */}
        {(hasSearch || Object.values(initialFilters).some(Boolean)) && (
          <p
            style={{
              fontSize: 13,
              color: "#747878",
              marginBottom: 20,
              fontWeight: 500,
            }}
          >
            {total === 0
              ? "No packs found"
              : `${total} pack${total !== 1 ? "s" : ""} found`}
          </p>
        )}

        <PackGrid
          packs={filteredPacks}
          searchQuery={hasSearch ? localSearch : ""}
          emptyTitle={
            hasSearch
              ? "No packs match your search"
              : "No packs found"
          }
          emptyDescription={
            hasSearch
              ? "Try different keywords or clear the search."
              : "No packaging formats have been added yet."
          }
        />
      </div>
    </>
  );
}

// ── FilterBar placeholder (shown during Suspense) ─────────────────────────────

function FilterBarPlaceholder({ hasBrand }: { hasBrand: boolean }) {
  const count = hasBrand ? 4 : 3;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 24px",
        borderBottom: "1px solid #e5e2e1",
        backgroundColor: "#fdf8f8",
        height: 54,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 120,
            height: 34,
            borderRadius: 8,
            backgroundColor: "#f0eeec",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
