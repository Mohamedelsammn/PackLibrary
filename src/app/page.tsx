import { redirect } from "next/navigation";
import { getBrands } from "@/lib/supabase/queries/brands";

export default async function HomePage() {
  const brands = await getBrands();
  if (brands.length > 0) {
    redirect(`/brands/${brands[0].slug}`);
  }
  return (
    <div className="flex items-center justify-center min-h-screen text-muted-foreground">
      No brands configured.
    </div>
  );
}
