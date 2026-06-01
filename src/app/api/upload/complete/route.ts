/**
 * POST /api/upload/complete
 *
 * Called by the browser after it finishes uploading a file directly to Google
 * Drive via the resumable session URI. This route:
 *   1. Makes the newly-created file publicly readable (anyone with the link).
 *   2. Returns the Drive ID, view link, and download link to the browser so it
 *      can be stored in the Supabase database.
 */

import { z } from "zod";
import { requireAdmin, unauthorizedResponse } from "@/app/api/_lib/auth-guard";
import { getDriveClient } from "@/lib/google-drive/client";

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

  const { driveId } = parsed.data;

  try {
    const drive = getDriveClient();

    // ── 1. Make the file publicly readable ────────────────────────────────────
    await drive.permissions.create({
      fileId: driveId,
      requestBody: { role: "reader", type: "anyone" },
    });

    // ── 2. Fetch public metadata ───────────────────────────────────────────────
    const file = await drive.files.get({
      fileId: driveId,
      fields: "id,webViewLink,webContentLink",
    });

    return Response.json({
      data: {
        driveId,
        viewLink:     file.data.webViewLink     ?? "",
        downloadLink: file.data.webContentLink  ?? "",
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
