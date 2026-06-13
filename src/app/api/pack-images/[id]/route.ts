import { requireAdmin, unauthorizedResponse } from "@/app/api/_lib/auth-guard";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getStorageProvider } from "@/lib/storage";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) return unauthorizedResponse();

  const { id } = await params;
  const supabase = await createSupabaseServiceClient();

  // Fetch the record so we can clean up Drive
  const { data: img, error: fetchError } = await supabase
    .from("pack_images")
    .select("id, pack_id, drive_id")
    .eq("id", id)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      return Response.json({ error: { code: "NOT_FOUND", message: "Image not found" } }, { status: 404 });
    }
    return Response.json({ error: { code: "DB_ERROR", message: fetchError.message } }, { status: 500 });
  }

  // Delete from storage (best-effort)
  await getStorageProvider().deleteFile(img.drive_id).catch(() => false);

  // Delete from DB
  const { error: delError } = await supabase
    .from("pack_images")
    .delete()
    .eq("id", id);

  if (delError) {
    return Response.json({ error: { code: "DB_ERROR", message: delError.message } }, { status: 500 });
  }

  revalidatePath(`/packs/${img.pack_id}`);
  return Response.json({ success: true });
}
