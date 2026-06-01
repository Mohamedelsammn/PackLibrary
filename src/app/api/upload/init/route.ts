/**
 * POST /api/upload/init
 *
 * Creates a Google Drive resumable upload session and returns the session URI
 * to the browser. The browser then PUTs the file bytes directly to that URI
 * — no file bytes pass through Vercel, so there is no 4.5 MB body-size limit.
 *
 * The session URI is a pre-authorised URL valid for 1 week. It grants write
 * access only to that specific upload slot, so it is safe to hand to the
 * browser.
 */

import { z } from "zod";
import { requireAdmin, unauthorizedResponse } from "@/app/api/_lib/auth-guard";
import { getOAuthClient } from "@/lib/google-drive/client";
import { ensureFolder } from "@/lib/google-drive/upload";

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

  const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!ROOT_FOLDER_ID) {
    return Response.json(
      { error: { code: "CONFIG_ERROR", message: "GOOGLE_DRIVE_FOLDER_ID not configured" } },
      { status: 500 }
    );
  }

  try {
    // ── 1. Ensure folder hierarchy exists ────────────────────────────────────
    let parentId = ROOT_FOLDER_ID;
    for (const segment of [brandSlug, packSlug, assetType]) {
      parentId = await ensureFolder(segment, parentId);
    }

    // ── 2. Get a fresh OAuth access token ─────────────────────────────────────
    const auth = getOAuthClient();
    const { token } = await auth.getAccessToken();

    if (!token) {
      return Response.json(
        { error: { code: "AUTH_ERROR", message: "Could not obtain Google access token" } },
        { status: 500 }
      );
    }

    // ── 3. Create a resumable upload session with Google Drive ────────────────
    const initResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
      {
        method: "POST",
        headers: {
          "Authorization":          `Bearer ${token}`,
          "Content-Type":           "application/json",
          "X-Upload-Content-Type":  mimeType,
          "X-Upload-Content-Length": fileSize.toString(),
        },
        body: JSON.stringify({
          name:    filename,
          parents: [parentId],
        }),
      }
    );

    if (!initResponse.ok) {
      const text = await initResponse.text().catch(() => "");
      return Response.json(
        {
          error: {
            code: "DRIVE_INIT_ERROR",
            message: `Google Drive returned ${initResponse.status}: ${text.slice(0, 200)}`,
          },
        },
        { status: 502 }
      );
    }

    const uploadUrl = initResponse.headers.get("Location");
    if (!uploadUrl) {
      return Response.json(
        { error: { code: "DRIVE_INIT_ERROR", message: "Google Drive did not return a session URI" } },
        { status: 502 }
      );
    }

    return Response.json({ data: { uploadUrl } }, { status: 200 });

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
