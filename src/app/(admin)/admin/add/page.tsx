import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/auth";
import { getBrands } from "@/lib/supabase/queries/brands";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { AddPackForm } from "@/features/admin/components/AddPackForm";
import type { Brand } from "@/features/brands/types";

export const dynamic = "force-dynamic";

export default async function AddPackPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token || !verifyAdminToken(token)) {
    redirect("/");
  }

  const brandsData = await getBrands();
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
        <div className="mb-8">
          <p className="text-label-md text-muted-foreground mb-1">
            Internal Asset Upload
          </p>
          <h1 className="text-display text-foreground">Add New Pack</h1>
        </div>
        <AddPackForm brands={brands} />
      </div>
    </AppShell>
  );
}
