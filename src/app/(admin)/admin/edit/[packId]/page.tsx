import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAdminToken, COOKIE_NAME } from "@/lib/auth";
import { getBrands } from "@/lib/supabase/queries/brands";
import { getPackById } from "@/lib/supabase/queries/packs";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { AddPackForm } from "@/features/admin/components/AddPackForm";
import { DeletePackButton } from "@/features/admin/components/DeletePackButton";
import type { Brand } from "@/features/brands/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ packId: string }>;
}

export default async function EditPackPage({ params }: PageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token || !verifyAdminToken(token)) {
    redirect("/");
  }

  const { packId } = await params;
  const [brandsData, pack] = await Promise.all([
    getBrands(),
    getPackById(packId),
  ]);

  if (!pack) notFound();

  const brands: Brand[] = brandsData.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    sort_order: b.sort_order,
    is_active: b.is_active,
  }));

  return (
    <AppShell>
      <Topbar showAddButton={false} />
      <div className="px-8 py-8 max-w-[900px] mx-auto w-full">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-label-md text-muted-foreground mb-1">Edit Pack</p>
            <h1 className="text-headline-lg text-foreground">{pack.name}</h1>
          </div>
          <DeletePackButton
            packId={packId}
            packName={pack.name}
            brandSlug={pack.brands.slug}
          />
        </div>
        <AddPackForm brands={brands} initialData={pack} packId={packId} />
      </div>
    </AppShell>
  );
}
