import { getBrands } from "@/lib/supabase/queries/brands";

export const revalidate = 300;

export async function GET() {
  try {
    const brands = await getBrands();
    return Response.json(
      { data: brands },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    return Response.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch brands" } },
      { status: 500 }
    );
  }
}
