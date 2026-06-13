import { z } from "zod";
import { requireAdmin, unauthorizedResponse } from "@/app/api/_lib/auth-guard";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { slugify, assetUrlSchema } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

const createPackSchema = z.object({
  brandId: z.string().uuid(),
  name: z.string().min(1).max(200),
  internalName: z.string().max(200).optional(),
  format: z.string().min(1).max(100),
  material: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  heightMm: z.number().positive().max(500),
  widthMm: z.number().positive().max(500),
  depthMm: z.number().positive().max(500),
  region: z.string().max(100).optional(),
  color:  z.string().max(100).optional(),
  size:   z.string().max(100).optional(),
  glbDriveId: z.string().optional(),
  glbUrl: assetUrlSchema.optional(),
  dielineDriveId: z.string().optional(),
  dielineUrl: assetUrlSchema.optional(),
  thumbnailUrl: assetUrlSchema.optional(),
  images: z
    .array(
      z.object({
        driveId: z.string(),
        url: assetUrlSchema,
        label: z.string().max(100).optional(),
      })
    )
    .optional(),
});

export async function POST(req: Request) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: { code: "INVALID_JSON", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = createPackSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      { status: 400 }
    );
  }

  const {
    brandId, name, internalName, format, material, description,
    heightMm, widthMm, depthMm, region, color, size,
    glbDriveId, glbUrl, dielineDriveId, dielineUrl, thumbnailUrl, images,
  } = parsed.data;

  const supabase = await createSupabaseServiceClient();
  const slug = slugify(name);

  const { data: pack, error: packError } = await supabase
    .from("packs")
    .insert({
      brand_id: brandId,
      name,
      internal_name: internalName,
      slug,
      format,
      material,
      description,
      height_mm: heightMm,
      width_mm:  widthMm,
      depth_mm:  depthMm,
      region:    region ?? null,
      color:     color  ?? null,
      size:      size   ?? null,
      glb_drive_id:     glbDriveId,
      glb_url:          glbUrl,
      dieline_drive_id: dielineDriveId,
      dieline_url:      dielineUrl,
      thumbnail_url:    thumbnailUrl,
    })
    .select()
    .single();

  if (packError) {
    return Response.json(
      { error: { code: "DB_ERROR", message: packError.message } },
      { status: 500 }
    );
  }

  if (images && images.length > 0) {
    await supabase.from("pack_images").insert(
      images.map((img, i) => ({
        pack_id: pack.id,
        drive_id: img.driveId,
        url: img.url,
        label: img.label,
        sort_order: i,
      }))
    );
  }

  // Revalidate brand page ISR cache
  revalidatePath(`/brands/${pack.brand_id}`);

  return Response.json({ data: pack }, { status: 201 });
}
