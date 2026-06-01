import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getBrandBySlug } from "@/lib/supabase/queries/brands";
import { getPacksByIds } from "@/lib/supabase/queries/packs";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { CompareTable } from "@/features/compare/components/CompareTable";
import { EmptyState } from "@/components/common/EmptyState";
import { GitCompare } from "lucide-react";

interface PageProps {
  params: Promise<{ brandSlug: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}

export default async function ComparePage({
  params,
  searchParams,
}: PageProps) {
  const { brandSlug } = await params;
  const { a, b } = await searchParams;

  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const ids = [a, b].filter(Boolean) as string[];
  const packs = ids.length >= 2 ? await getPacksByIds(ids) : [];

  const packA = packs.find((p) => p.id === a);
  const packB = packs.find((p) => p.id === b);

  return (
    <AppShell activeBrandSlug={brandSlug}>
      <Topbar brandName={brand.name} />
      <div className="px-8 py-8 max-w-[1200px] mx-auto w-full">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={`/brands/${brandSlug}`}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            aria-label="Back to brand"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-headline-lg text-foreground">Compare Packs</h1>
        </div>

        {packA && packB ? (
          <CompareTable packA={packA} packB={packB} />
        ) : (
          <EmptyState
            icon={<GitCompare className="w-5 h-5" />}
            title="Select two packs to compare"
            description="Use the ⋯ menu on pack cards to add them to the comparison."
          />
        )}
      </div>
    </AppShell>
  );
}
