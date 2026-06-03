import { z } from "zod";
import { requireAdmin, unauthorizedResponse } from "@/app/api/_lib/auth-guard";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { deleteFileFromDrive, deleteFolderByName } from "@/lib/google-drive/upload";

export const runtime = "nodejs";

const updatePackSchema = z.object({
  name:         z.string().min(1).max(200).optional(),
  internalName: z.string().max(200).nullable().optional(),
  format:       z.string().min(1).max(100).optional(),
  material:     z.string().max(100).nullable().optional(),
  description:  z.string().max(2000).nullable().optional(),
  heightMm:     z.number().positive().max(500).optional(),
  widthMm:      z.number().positive().max(500).optional(),
  depthMm:      z.number().positive().max(500).optional(),
  region:       z.string().max(100).nullable().optional(),
  color:        z.string().max(100).nullable().optional(),
  size:         z.string().max(100).nullable().optional(),
  glbDriveId:     z.string().nullable().optional(),
  glbUrl:         z.string().url().nullable().optional(),
  dielineDriveId: z.string().nullable().optional(),
  dielineUrl:     z.string().url().nullable().optional(),
  thumbnailUrl:   z.string().url().nullable().optional(),
  images: z
    .array(
      z.object({
        driveId: z.string(),
        url:     z.string().url(),
        label:   z.string().max(100).optional(),
      })
    )
    .optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) return unauthorizedResponse();

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: { code: "INVALID_JSON", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = updatePackSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("packs")
    .update({
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.internalName !== undefined && {
        internal_name: parsed.data.internalName,
      }),
      ...(parsed.data.format && { format: parsed.data.format }),
      ...(parsed.data.material !== undefined && {
        material: parsed.data.material,
      }),
      ...(parsed.data.description !== undefined && {
        description: parsed.data.description,
      }),
      ...(parsed.data.heightMm && { height_mm: parsed.data.heightMm }),
      ...(parsed.data.widthMm && { width_mm: parsed.data.widthMm }),
      ...(parsed.data.depthMm && { depth_mm: parsed.data.depthMm }),
      ...(parsed.data.glbDriveId !== undefined && {
        glb_drive_id: parsed.data.glbDriveId,
      }),
      ...(parsed.data.glbUrl !== undefined && { glb_url: parsed.data.glbUrl }),
      ...(parsed.data.dielineDriveId !== undefined && {
        dieline_drive_id: parsed.data.dielineDriveId,
      }),
      ...(parsed.data.dielineUrl !== undefined && {
        dieline_url: parsed.data.dielineUrl,
      }),
      ...(parsed.data.thumbnailUrl !== undefined && { thumbnail_url: parsed.data.thumbnailUrl }),
      ...(parsed.data.region !== undefined && { region: parsed.data.region }),
      ...(parsed.data.color  !== undefined && { color:  parsed.data.color }),
      ...(parsed.data.size   !== undefined && { size:   parsed.data.size }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 }
    );
  }

  // If new images were uploaded during edit, insert them (append to existing)
  if (parsed.data.images && parsed.data.images.length > 0) {
    // Find the current highest sort_order to append after existing images
    const { data: existingImages } = await supabase
      .from("pack_images")
      .select("sort_order")
      .eq("pack_id", id)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = existingImages?.[0]?.sort_order != null
      ? existingImages[0].sort_order + 1
      : 0;

    await supabase.from("pack_images").insert(
      parsed.data.images.map((img, i) => ({
        pack_id: id,
        drive_id: img.driveId,
        url: img.url,
        label: img.label,
        sort_order: nextOrder + i,
      }))
    );
  }

  revalidatePath(`/packs/${id}`);
  revalidatePath(`/brands/${data.brand_id}`);

  return Response.json({ data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) return unauthorizedResponse();

  const { id } = await params;
  const supabase = await createSupabaseServiceClient();

  // ── 1. Fetch full pack record so we know every Drive file ID ──────────────
  const { data: pack, error: fetchError } = await supabase
    .from("packs")
    .select("*, pack_images ( id, drive_id )")
    .eq("id", id)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      return Response.json({ error: { code: "NOT_FOUND", message: "Pack not found" } }, { status: 404 });
    }
    return Response.json({ error: { code: "DB_ERROR", message: fetchError.message } }, { status: 500 });
  }

  // ── 2. Collect all Drive file IDs ─────────────────────────────────────────
  const driveIds: string[] = [];

  if (pack.glb_drive_id)     driveIds.push(pack.glb_drive_id);
  if (pack.dieline_drive_id) driveIds.push(pack.dieline_drive_id);

  // Thumbnail is stored as https://lh3.googleusercontent.com/d/{driveId}
  if (pack.thumbnail_url) {
    const match = pack.thumbnail_url.match(/\/d\/([^/?&#]+)/);
    if (match?.[1]) driveIds.push(match[1]);
  }

  // All pack_images
  const images = (pack as typeof pack & { pack_images: { id: string; drive_id: string }[] }).pack_images ?? [];
  for (const img of images) {
    if (img.drive_id) driveIds.push(img.drive_id);
  }

  // ── 3. Delete all Drive files concurrently (best-effort) ─────────────────
  await Promise.allSettled(driveIds.map((fid) => deleteFileFromDrive(fid)));

  // ── 4. Try to delete the pack's Drive folder (best-effort) ────────────────
  // Folder path: {rootFolderId} / {brandSlug} / {packSlug}
  // We don't store folder IDs, so we find the pack folder by slug name.
  // Best-effort — a failure here must not block the DB deletion.
  try {
    const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (ROOT_FOLDER_ID) {
      // Get brand slug to find the intermediate folder
      const { data: brand } = await supabase
        .from("brands")
        .select("slug")
        .eq("id", pack.brand_id)
        .single();

      if (brand?.slug) {
        const { getDriveClient } = await import("@/lib/google-drive/client");
        const drive = getDriveClient();

        // Find brand folder
        const brandFolderRes = await drive.files.list({
          q: `name='${brand.slug}' and '${ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: "files(id)",
        });
        const brandFolderId = brandFolderRes.data.files?.[0]?.id;

        if (brandFolderId) {
          // Delete pack folder (and all its subfolders) by pack slug
          await deleteFolderByName(pack.slug, brandFolderId, true);
        }
      }
    }
  } catch {
    // Best-effort — do not fail the whole delete if folder cleanup errors
  }

  // ── 5. Hard-delete Supabase records (images first due to FK) ─────────────
  const { error: imgError } = await supabase
    .from("pack_images")
    .delete()
    .eq("pack_id", id);

  if (imgError) {
    return Response.json(
      { error: { code: "DB_ERROR", message: `Failed to delete images: ${imgError.message}` } },
      { status: 500 }
    );
  }

  const { error: packError } = await supabase
    .from("packs")
    .delete()
    .eq("id", id);

  if (packError) {
    return Response.json(
      { error: { code: "DB_ERROR", message: packError.message } },
      { status: 500 }
    );
  }

  // ── 6. Revalidate caches ──────────────────────────────────────────────────
  revalidatePath("/");
  revalidatePath(`/brands/${pack.brand_id}`);

  return Response.json({ success: true });
}
