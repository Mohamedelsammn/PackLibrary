/**
 * POST /api/upload/recover
 *
 * Called when the browser's direct upload to the storage provider succeeds in
 * sending all bytes but fails to READ the response (typically a CORS policy
 * error on the response headers). In this case the file IS on the provider —
 * we just couldn't get its ID back in the browser.
 *
 * This route asks the storage provider to find the file by name in the
 * expected folder, finalise it, and return the same payload that
 * /api/upload/complete would return.
 */

import { z } from "zod";
import { requireAdmin, unauthorizedResponse } from "@/app/api/_lib/auth-guard";
import { getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";

const ASSET_TYPES = ["glb", "image", "dieline"] as const;

const bodySchema = z.object({
  filename:  z.string().min(1).max(255),
  mimeType:  z.string().min(1).max(120),
  brandSlug: z.string().min(1).max(80),
  packSlug:  z.string().min(1).max(80),
  assetType: z.enum(ASSET_TYPES),
});

export async function POST(req: Request) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) return unauthorizedResponse();

  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: { code: "INVALID_JSON", message: "Invalid body" } }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } }, { status: 400 });
  }

  const { filename, mimeType, brandSlug, packSlug, assetType } = parsed.data;

  try {
    const storage = getStorageProvider();
    const result = await storage.recoverUpload({
      filename,
      mimeType,
      folderPath: [brandSlug, packSlug, assetType],
    });

    if (!result) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Upload did not reach storage — please try again" } },
        { status: 404 }
      );
    }

    return Response.json({
      data: {
        driveId:      result.fileId,
        viewLink:     result.viewUrl,
        downloadLink: result.downloadUrl,
        publicUrl:    result.publicUrl,
        recovered:    true,
      },
    });

  } catch (error) {
    return Response.json(
      { error: { code: "RECOVER_ERROR", message: error instanceof Error ? error.message : "Recovery failed" } },
      { status: 500 }
    );
  }
}
