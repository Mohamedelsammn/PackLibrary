import { requireAdmin, unauthorizedResponse } from "@/app/api/_lib/auth-guard";
import { getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";

const MIME_WHITELIST: Record<string, string[]> = {
  // GLB (binary) and GLTF (JSON+embedded) are both accepted.
  // FBX is not supported — convert to GLB before upload.
  glb: ["model/gltf-binary", "model/gltf+json", "application/octet-stream"],
  image: ["image/png", "image/jpeg", "image/webp"],
  dieline: ["application/pdf", "image/svg+xml"],
};

const SIZE_LIMITS: Record<string, number> = {
  glb: 50 * 1024 * 1024,
  image: 10 * 1024 * 1024,
  dieline: 20 * 1024 * 1024,
};

function detectAssetType(
  mimeType: string
): "glb" | "image" | "dieline" | null {
  if (MIME_WHITELIST.glb.includes(mimeType)) return "glb";
  if (MIME_WHITELIST.image.includes(mimeType)) return "image";
  if (MIME_WHITELIST.dieline.includes(mimeType)) return "dieline";
  return null;
}

export async function POST(req: Request) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) return unauthorizedResponse();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json(
      { error: { code: "INVALID_FORM", message: "Invalid form data" } },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const brandSlug = formData.get("brandSlug")?.toString() ?? "unknown";
  const packSlug = formData.get("packSlug")?.toString() ?? "pack";

  if (!file || !(file instanceof Blob)) {
    return Response.json(
      { error: { code: "NO_FILE", message: "No file provided" } },
      { status: 400 }
    );
  }

  const mimeType = file.type;
  const assetType = detectAssetType(mimeType);

  if (!assetType) {
    return Response.json(
      { error: { code: "INVALID_MIME", message: `File type '${mimeType}' is not allowed` } },
      { status: 400 }
    );
  }

  const maxSize = SIZE_LIMITS[assetType];
  if (file.size > maxSize) {
    return Response.json(
      {
        error: {
          code: "FILE_TOO_LARGE",
          message: `File exceeds maximum size of ${maxSize / 1024 / 1024}MB`,
        },
      },
      { status: 413 }
    );
  }

  const fileName =
    file instanceof File ? file.name : `${assetType}-${Date.now()}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const folderPath = [brandSlug, packSlug, assetType];

  try {
    const storage = getStorageProvider();
    const result = await storage.uploadFile(buffer, fileName, mimeType, folderPath);
    return Response.json({ data: result }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error: {
          code: "UPLOAD_ERROR",
          message: error instanceof Error ? error.message : "Upload failed",
        },
      },
      { status: 500 }
    );
  }
}
