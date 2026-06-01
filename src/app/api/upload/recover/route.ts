/**
 * POST /api/upload/recover
 *
 * Called when the browser's XHR upload to Google Drive succeeds in sending all
 * bytes but fails to READ the response (typically a CORS policy error on the
 * response headers). In this case the file IS on Drive — we just couldn't get
 * its ID back in the browser.
 *
 * This route finds the file by name in the expected Drive folder, makes it
 * public, and returns the same payload that /api/upload/complete would return.
 */

import { z } from "zod";
import { requireAdmin, unauthorizedResponse } from "@/app/api/_lib/auth-guard";
import { getDriveClient } from "@/lib/google-drive/client";
import { ensureFolder } from "@/lib/google-drive/upload";

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

  const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!ROOT_FOLDER_ID) {
    return Response.json({ error: { code: "CONFIG_ERROR", message: "GOOGLE_DRIVE_FOLDER_ID not set" } }, { status: 500 });
  }

  try {
    const drive = getDriveClient();

    // Resolve the same folder path the upload used
    let parentId = ROOT_FOLDER_ID;
    for (const segment of [brandSlug, packSlug, assetType]) {
      parentId = await ensureFolder(segment, parentId);
    }

    // Search for the file by name in that folder, most-recently-created first.
    // The upload happened moments ago, so this will always return it quickly.
    const listRes = await drive.files.list({
      q: `name='${filename.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`,
      fields: "files(id,webViewLink,webContentLink,mimeType)",
      orderBy: "createdTime desc",
      pageSize: 1,
    });

    const file = listRes.data.files?.[0];

    if (!file?.id) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Upload did not reach Google Drive — please try again" } },
        { status: 404 }
      );
    }

    // Make the recovered file publicly readable (in case permissions weren't set)
    try {
      await drive.permissions.create({
        fileId: file.id,
        requestBody: { role: "reader", type: "anyone" },
      });
    } catch {
      // Permissions may already be set — not fatal
    }

    // Re-fetch full metadata to get accurate links
    const meta = await drive.files.get({
      fileId: file.id,
      fields: "id,webViewLink,webContentLink",
    });

    return Response.json({
      data: {
        driveId:      meta.data.id!,
        viewLink:     meta.data.webViewLink     ?? "",
        downloadLink: meta.data.webContentLink  ?? "",
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
