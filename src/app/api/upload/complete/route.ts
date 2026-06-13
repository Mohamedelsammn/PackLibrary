/**
 * POST /api/upload/complete
 *
 * Called by the browser after it finishes uploading a file directly via the
 * session URI returned by /api/upload/init. Finalises the upload with the
 * storage provider (e.g. making a Google Drive file publicly readable) and
 * returns the file ID and URLs to the browser so it can be stored in the
 * Supabase database.
 */

import { z } from "zod";
import { requireAdmin, unauthorizedResponse } from "@/app/api/_lib/auth-guard";
import { getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";

const bodySchema = z.object({
  driveId: z.string().min(1),
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      { status: 400 }
    );
  }

  const { driveId: fileId } = parsed.data;

  try {
    const storage = getStorageProvider();
    const result = await storage.completeUpload(fileId);

    return Response.json({
      data: {
        driveId:      result.fileId,
        viewLink:     result.viewUrl,
        downloadLink: result.downloadUrl,
        publicUrl:    result.publicUrl,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: {
          code:    "COMPLETE_ERROR",
          message: error instanceof Error ? error.message : "Failed to finalise upload",
        },
      },
      { status: 500 }
    );
  }
}
