"use client";

import { useState, useMemo } from "react";
import { BrandSearch } from "./BrandSearch";
import { BrandListItem } from "./BrandListItem";
import type { Brand } from "../types";

interface BrandSidebarClientProps {
  brands: Brand[];
  activeBrandSlug?: string;
}

export function BrandSidebarClient({
  brands,
  activeBrandSlug,
}: BrandSidebarClientProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <BrandSearch value={search} onChange={setSearch} />

      <div className="px-3 mb-1.5">
        <span className="text-label-md text-white/30 px-2">Brands</span>
      </div>

      <nav
        className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-4 space-y-0.5"
        aria-label="Brands"
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-sm text-white/30">No brands found</p>
        ) : (
          filtered.map((brand) => (
            <BrandListItem
              key={brand.id}
              brand={brand}
              isActive={brand.slug === activeBrandSlug}
            />
          ))
        )}
      </nav>
    </div>
  );
}
