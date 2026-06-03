import { createSupabaseServerClient } from "../server";
import type { PackRow, PackWithImages } from "../types";

const PACKS_PER_PAGE = 50; // larger default — filters reduce result set

// ── PackListRow ───────────────────────────────────────────────────────────────

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
  | "region"
  | "color"
  | "size"
>;

// ── PackListRow extended with brand info (used on home page global search) ───

export type PackListRowWithBrand = PackListRow & {
  brands: { id: string; name: string; slug: string };
};

// ── Filter params shared across queries ──────────────────────────────────────

export interface PackFilterParams {
  region?: string;
  color?: string;
  size?: string;
}

// ── Get packs for a single brand with optional filters ────────────────────────

const BRAND_SELECT_COLS =
  "id, name, slug, format, material, thumbnail_url, height_mm, width_mm, depth_mm, brand_id, glb_drive_id, region, color, size";

export async function getPacksByBrand(
  brandId: string,
  page = 1,
  filters: PackFilterParams = {}
): Promise<{ data: PackListRow[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const from = (page - 1) * PACKS_PER_PAGE;
  const to   = from + PACKS_PER_PAGE - 1;

  let query = supabase
    .from("packs")
    .select(BRAND_SELECT_COLS, { count: "exact" })
    .eq("brand_id", brandId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (filters.region) query = query.eq("region", filters.region);
  if (filters.color)  query = query.eq("color",  filters.color);
  if (filters.size)   query = query.eq("size",   filters.size);

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return { data: (data ?? []) as PackListRow[], total: count ?? 0 };
}

// ── Get all packs across all brands with optional filters (home page) ─────────

export interface GlobalFilterParams extends PackFilterParams {
  brandSlug?: string;
}

export async function getAllPacksFiltered(
  filters: GlobalFilterParams = {},
  page = 1
): Promise<{ data: PackListRowWithBrand[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const from = (page - 1) * PACKS_PER_PAGE;
  const to   = from + PACKS_PER_PAGE - 1;

  // Use !inner join so filtering by brand slug works
  const selectCols = filters.brandSlug
    ? `${BRAND_SELECT_COLS}, brands!inner(id, name, slug)`
    : `${BRAND_SELECT_COLS}, brands(id, name, slug)`;

  let query = supabase
    .from("packs")
    .select(selectCols, { count: "exact" })
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (filters.brandSlug) query = (query as ReturnType<typeof supabase.from>).eq("brands.slug", filters.brandSlug);
  if (filters.region)    query = query.eq("region", filters.region);
  if (filters.color)     query = query.eq("color",  filters.color);
  if (filters.size)      query = query.eq("size",   filters.size);

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return { data: (data ?? []) as PackListRowWithBrand[], total: count ?? 0 };
}

// ── Get distinct filter values for dropdowns (used to populate options) ───────

export async function getPackFilterOptions(): Promise<{
  regions: string[];
  colors: string[];
  sizes: string[];
}> {
  const supabase = await createSupabaseServerClient();

  const [rRes, cRes, sRes] = await Promise.all([
    supabase.from("packs").select("region").eq("is_active", true).not("region", "is", null),
    supabase.from("packs").select("color").eq("is_active",  true).not("color",  "is", null),
    supabase.from("packs").select("size").eq("is_active",   true).not("size",   "is", null),
  ]);

  const unique = <T>(arr: T[]) => [...new Set(arr)].sort() as T[];

  return {
    regions: unique((rRes.data ?? []).map((r) => r.region as string)),
    colors:  unique((cRes.data ?? []).map((c) => c.color  as string)),
    sizes:   unique((sRes.data ?? []).map((s) => s.size   as string)),
  };
}

// ── Single pack ──────────────────────────────────────────────────────────────

export async function getPackById(id: string): Promise<PackWithImages | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("packs")
    .select(
      `*,
      brands ( id, name, slug ),
      pack_images ( id, drive_id, url, label, sort_order )`
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
      `*,
      brands ( id, name, slug ),
      pack_images ( id, drive_id, url, label, sort_order )`
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
