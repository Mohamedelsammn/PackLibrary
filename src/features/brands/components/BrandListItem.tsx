"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Brand } from "../types";

interface BrandListItemProps {
  brand: Brand;
  isActive: boolean;
}

export function BrandListItem({ brand, isActive }: BrandListItemProps) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className={cn(
        "block w-full px-3 py-2 rounded-lg text-sm transition-all duration-150",
        isActive
          ? "bg-white text-black font-medium"
          : "text-white/60 hover:text-white hover:bg-white/8"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {brand.name}
    </Link>
  );
}
