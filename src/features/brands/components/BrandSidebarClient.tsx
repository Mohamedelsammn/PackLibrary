"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
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

  // "All" is active when no specific brand is selected (home page)
  const isAllActive = !activeBrandSlug;

  const filtered = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <BrandSearch value={search} onChange={setSearch} />

      <nav
        className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-4 space-y-0.5"
        aria-label="Brands"
      >
        {/* ── "All" virtual item — always pinned at top, never filtered ── */}
        <Link
          href="/"
          className={cn(
            "block w-full px-3 py-2 rounded-lg text-sm transition-all duration-150",
            isAllActive
              ? "bg-white text-black font-medium"
              : "text-white/60 hover:text-white hover:bg-white/8"
          )}
          aria-current={isAllActive ? "page" : undefined}
        >
          All
        </Link>

        {/* ── Divider + label ─────────────────────────────────────────── */}
        <div className="pt-2 pb-1 px-2">
          <span className="text-label-md text-white/30">Brands</span>
        </div>

        {/* ── Filtered brand list ─────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <p className="px-2 py-2 text-sm text-white/30">No brands found</p>
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
