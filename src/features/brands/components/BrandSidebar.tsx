import { getBrands } from "@/lib/supabase/queries/brands";
import { BrandSidebarClient } from "./BrandSidebarClient";
import type { Brand } from "../types";

interface BrandSidebarProps {
  activeBrandSlug?: string;
}

export async function BrandSidebar({ activeBrandSlug }: BrandSidebarProps) {
  const brandsData = await getBrands();
  const brands: Brand[] = brandsData.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    sort_order: b.sort_order,
    is_active: b.is_active,
  }));

  return <BrandSidebarClient brands={brands} activeBrandSlug={activeBrandSlug} />;
}
