/**
 * POST /api/upload/init
 *
 * Creates an upload session with the configured storage provider and returns
 * the session URL to the browser. The browser then PUTs the file bytes
 * directly to that URL.
 *
 * For Google Drive, this is a resumable upload session URI on Google's
 * servers — no file bytes pass through Vercel, so there is no 4.5 MB
 * body-size limit. For Box, this is a same-origin relay route
 * (`/api/upload/relay`) that streams the bytes on to Box.
 */

import { z } from "zod";
import { requireAdmin, unauthorizedResponse } from "@/app/api/_lib/auth-guard";
import { getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";

const ASSET_TYPES = ["glb", "image", "dieline"] as const;
type AssetType = (typeof ASSET_TYPES)[number];

const MIME_WHITELIST: Record<string, AssetType> = {
  "model/gltf-binary":    "glb",
  "model/gltf+json":      "glb",
  "application/octet-stream": "glb", // .fbx and unknown binaries treated as 3D
  "model/vnd.fbx":        "glb",
  "image/png":            "image",
  "image/jpeg":           "image",
  "image/webp":           "image",
  "application/pdf":      "dieline",
  "image/svg+xml":        "dieline",
};

const bodySchema = z.object({
  filename:  z.string().min(1).max(255),
  mimeType:  z.string().min(1).max(120),
  fileSize:  z.number().int().positive().max(1_000_000_000), // 1 GB hard cap
  brandSlug: z.string().min(1).max(80),
  packSlug:  z.string().min(1).max(80),
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

  const { filename, mimeType, fileSize, brandSlug, packSlug } = parsed.data;

  // Determine folder category from MIME type; default to "image" for unknowns
  const assetType: AssetType = MIME_WHITELIST[mimeType] ?? "image";
  const folderPath = [brandSlug, packSlug, assetType];

  try {
    const storage = getStorageProvider();
    const session = await storage.createUploadSession({
      filename,
      mimeType,
      fileSize,
      folderPath,
    });

    return Response.json({ data: session }, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error: {
          code: "INIT_ERROR",
          message: error instanceof Error ? error.message : "Failed to create upload session",
        },
      },
      { status: 500 }
    );
  }
}
