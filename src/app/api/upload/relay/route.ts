/**
 * PUT /api/upload/relay?filename=...&mimeType=...&folder=brand/pack/asset
 *
 * Same-origin relay used by storage providers (e.g. Box) that do not support
 * pre-authorised direct-from-browser upload URLs. The browser PUTs the raw
 * file bytes here; this route streams them on to the configured storage
 * provider and returns `{ id }`, matching the shape the admin upload UI
 * expects from a direct provider upload.
 */

import { requireAdmin, unauthorizedResponse } from "@/app/api/_lib/auth-guard";
import { getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) return unauthorizedResponse();

  const url = new URL(req.url);
  const filename = url.searchParams.get("filename");
  const mimeType = url.searchParams.get("mimeType");
  const folder = url.searchParams.get("folder");

  if (!filename || !mimeType || !folder) {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: "filename, mimeType and folder are required" } },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await req.arrayBuffer());
    const folderPath = folder.split("/").filter(Boolean);

    const storage = getStorageProvider();
    const result = await storage.uploadFile(buffer, filename, mimeType, folderPath);

    return Response.json({ id: result.fileId }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error: {
          code: "RELAY_UPLOAD_ERROR",
          message: error instanceof Error ? error.message : "Upload failed",
        },
      },
      { status: 500 }
    );
  }
}
