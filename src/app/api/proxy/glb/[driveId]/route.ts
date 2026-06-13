import { getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ driveId: string }> }
) {
  const { driveId } = await params;
  const url = new URL(req.url);
  // ?name=pack-name.glb — optional download filename hint
  const rawName = url.searchParams.get("name");
  const filename = rawName ? rawName.replace(/[/\\:*?"<>|]/g, "_") : null;

  try {
    const storage = getStorageProvider();
    const { buffer } = await storage.downloadFile(driveId);

    // Detect MIME from filename hint; default to GLB (binary)
    const is_gltf_json = filename?.toLowerCase().endsWith(".gltf");
    const headers: Record<string, string> = {
      "Content-Type": is_gltf_json ? "model/gltf+json" : "model/gltf-binary",
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    };
    if (filename) {
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    }

    return new Response(new Uint8Array(buffer), { headers });
  } catch (error) {
    return Response.json(
      {
        error: {
          code: "GLB_FETCH_ERROR",
          message: error instanceof Error ? error.message : "Failed to fetch GLB",
        },
      },
      { status: 500 }
    );
  }
}
