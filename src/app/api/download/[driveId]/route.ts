import { getStorageProvider } from "@/lib/storage";
import path from "path";

export const runtime = "nodejs";

const MIME_MAP: Record<string, string> = {
  ".glb":  "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg":  "image/svg+xml",
  ".pdf":  "application/pdf",
};

function mimeFromName(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase();
  return MIME_MAP[ext] ?? null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ driveId: string }> }
) {
  const { driveId } = await params;
  const url = new URL(req.url);
  // ?name=filename.jpg  — caller supplies the desired download filename
  const rawName = url.searchParams.get("name") ?? driveId;
  // Sanitise: strip path traversal chars
  const filename = rawName.replace(/[/\\:*?"<>|]/g, "_");

  try {
    const storage = getStorageProvider();
    const { buffer, mimeType } = await storage.downloadFile(driveId);
    const contentType = mimeFromName(filename) ?? mimeType ?? "application/octet-stream";

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: {
          code: "DOWNLOAD_ERROR",
          message: error instanceof Error ? error.message : "Failed to download file",
        },
      },
      { status: 500 }
    );
  }
}
