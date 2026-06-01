import { createSupabaseServerClient } from "../server";
import type { PackRow, PackWithImages } from "../types";

const PACKS_PER_PAGE = 20;

export type PackListRow = Pick<
  PackRow,
  | "id"
  | "brand_id"
  | "name"
  | "slug"
  | "format"
  | "material"
  | "thumbnail_url"
  | "height_mm"
  | "width_mm"
  | "depth_mm"
  | "glb_drive_id"
>;

export async function getPacksByBrand(
  brandId: string,
  page = 1
): Promise<{ data: PackListRow[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const from = (page - 1) * PACKS_PER_PAGE;
  const to = from + PACKS_PER_PAGE - 1;

  const { data, error, count } = await supabase
    .from("packs")
    .select(
      "id, name, slug, format, material, thumbnail_url, height_mm, width_mm, depth_mm, brand_id, glb_drive_id",
      { count: "exact" }
    )
    .eq("brand_id", brandId)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .range(from, to);

  if (error) throw error;
  return { data: (data ?? []) as PackListRow[], total: count ?? 0 };
}

export async function getPackById(id: string): Promise<PackWithImages | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("packs")
    .select(
      `
      *,
      brands ( id, name, slug ),
      pack_images ( id, drive_id, url, label, sort_order )
    `
    )
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as PackWithImages;
}

export async function getPackBySlug(
  brandId: string,
  slug: string
): Promise<PackWithImages | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("packs")
    .select(
      `
      *,
      brands ( id, name, slug ),
      pack_images ( id, drive_id, url, label, sort_order )
    `
    )
    .eq("brand_id", brandId)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as PackWithImages;
}

export async function getPacksByIds(ids: string[]): Promise<PackRow[]> {
  if (ids.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("packs")
    .select("*")
    .in("id", ids)
    .eq("is_active", true);
  if (error) throw error;
  return data ?? [];
}
