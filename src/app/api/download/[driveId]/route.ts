import { getDriveClient } from "@/lib/google-drive/client";
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

function mimeFromName(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_MAP[ext] ?? "application/octet-stream";
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
  const contentType = mimeFromName(filename);

  try {
    const drive = getDriveClient();
    const res = await drive.files.get(
      { fileId: driveId, alt: "media" },
      { responseType: "stream" }
    );

    const stream = res.data as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (c: Buffer) => chunks.push(c));
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    const buffer = Buffer.concat(chunks);

    return new Response(buffer, {
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
