import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBrandBySlug } from "@/lib/supabase/queries/brands";
import { getPacksByBrand } from "@/lib/supabase/queries/packs";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { PackGrid } from "@/features/packs/components/PackGrid";

interface PageProps {
  params: Promise<{ brandSlug: string }>;
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

export const revalidate = 300;

export default async function BrandPage({ params }: PageProps) {
  const { brandSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const { data: packs } = await getPacksByBrand(brand.id);

  return (
    <AppShell activeBrandSlug={brandSlug}>
      <Topbar brandName={brand.name} />
      <div className="px-6 py-8 max-w-[1440px] mx-auto w-full">
        <PackGrid packs={packs} />
      </div>
    </AppShell>
  );
}
