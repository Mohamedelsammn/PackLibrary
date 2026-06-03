import { createSupabaseServerClient } from "../server";
import type { PackRow, PackWithImages } from "../types";

const PACKS_PER_PAGE = 50;

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

export type PackListRowWithBrand = PackListRow & {
  brands: { id: string; name: string; slug: string };
};

// ── Shared column list ────────────────────────────────────────────────────────

const PACK_COLS =
  "id, name, slug, format, material, thumbnail_url, height_mm, width_mm, depth_mm, brand_id, glb_drive_id, region, color, size";

// ── Filter params ─────────────────────────────────────────────────────────────

export interface PackFilterParams {
  region?: string;
  color?:  string;
  size?:   string;
  /** Free-text search across name, region, color, size, format */
  search?: string;
}

export interface GlobalFilterParams extends PackFilterParams {
  brandSlug?: string;
}

// ── Build OR clause for text search ──────────────────────────────────────────

function buildSearchOr(term: string, extraBrandIds: string[] = []): string {
  const t = term.replace(/'/g, "''"); // basic escape for Supabase PostgREST
  const packFields = [
    `name.ilike.%${t}%`,
    `region.ilike.%${t}%`,
    `color.ilike.%${t}%`,
    `size.ilike.%${t}%`,
    `format.ilike.%${t}%`,
    `material.ilike.%${t}%`,
  ];
  if (extraBrandIds.length > 0) {
    packFields.push(`brand_id.in.(${extraBrandIds.join(",")})`);
  }
  return packFields.join(",");
}

// ── Get packs for a single brand with optional filters ────────────────────────

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
    .select(PACK_COLS, { count: "exact" })
    .eq("brand_id", brandId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (filters.region) query = query.eq("region", filters.region);
  if (filters.color)  query = query.eq("color",  filters.color);
  if (filters.size)   query = query.eq("size",   filters.size);

  // Text search within a single brand — search pack fields only
  if (filters.search?.trim()) {
    query = query.or(buildSearchOr(filters.search.trim()));
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return { data: (data ?? []) as PackListRow[], total: count ?? 0 };
}

// ── Global search across all brands ──────────────────────────────────────────

export async function getAllPacksFiltered(
  filters: GlobalFilterParams = {},
  page = 1
): Promise<{ data: PackListRowWithBrand[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const from = (page - 1) * PACKS_PER_PAGE;
  const to   = from + PACKS_PER_PAGE - 1;

  // When filtering by brand slug, use !inner join so the eq() on brands.slug
  // eliminates non-matching brands.
  const selectCols = filters.brandSlug
    ? `${PACK_COLS}, brands!inner(id, name, slug)`
    : `${PACK_COLS}, brands(id, name, slug)`;

  let query = supabase
    .from("packs")
    .select(selectCols, { count: "exact" })
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (filters.brandSlug) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq("brands.slug", filters.brandSlug);
  }
  if (filters.region) query = query.eq("region", filters.region);
  if (filters.color)  query = query.eq("color",  filters.color);
  if (filters.size)   query = query.eq("size",   filters.size);

  // Text search: search pack fields + any brands whose name matches
  if (filters.search?.trim()) {
    const term = filters.search.trim();

    // Find brand IDs whose name matches the search term (for brand-name search)
    const { data: matchingBrands } = await supabase
      .from("brands")
      .select("id")
      .ilike("name", `%${term}%`)
      .eq("is_active", true);

    const brandIds = matchingBrands?.map((b) => b.id) ?? [];
    query = query.or(buildSearchOr(term, brandIds));
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return { data: (data ?? []) as PackListRowWithBrand[], total: count ?? 0 };
}

// ── Distinct filter values for dropdown options ───────────────────────────────

export async function getPackFilterOptions(): Promise<{
  regions: string[];
  colors:  string[];
  sizes:   string[];
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

// ── Single pack ───────────────────────────────────────────────────────────────

export async function getPackById(id: string): Promise<PackWithImages | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("packs")
    .select(`*, brands(id, name, slug), pack_images(id, drive_id, url, label, sort_order)`)
    .eq("id", id)
    .eq("is_active", true)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as PackWithImages;
}

export async function getPackBySlug(brandId: string, slug: string): Promise<PackWithImages | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("packs")
    .select(`*, brands(id, name, slug), pack_images(id, drive_id, url, label, sort_order)`)
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
