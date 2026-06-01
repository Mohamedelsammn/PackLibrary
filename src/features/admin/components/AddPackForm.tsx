"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Box, Info, Ruler, Camera, Save, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDropzone } from "./FileDropzone";
import { DimensionInput } from "./DimensionInput";
import { addPackSchema } from "../schemas/add-pack.schema";
import type { Brand } from "@/features/brands/types";
import type { PackRow } from "@/lib/supabase/types";

interface AddPackFormProps {
  brands: Brand[];
  initialData?: PackRow | null;
  packId?: string;
}

interface UploadResult {
  driveId: string;
  viewLink: string;
  downloadLink: string;
}

// ── Per-file upload progress ──────────────────────────────────────────────────

interface UploadState {
  status: "idle" | "uploading" | "done" | "error";
  progress: number;   // 0-100
  error?: string;
}

// ── Direct upload helpers ─────────────────────────────────────────────────────

function detectAssetType(mimeType: string): "glb" | "image" | "dieline" {
  if (
    mimeType === "model/gltf-binary" ||
    mimeType === "model/gltf+json"   ||
    mimeType === "model/vnd.fbx"     ||
    mimeType === "application/octet-stream"
  ) return "glb";
  if (["image/png","image/jpeg","image/webp"].includes(mimeType)) return "image";
  return "dieline";
}

/**
 * Uploads a single file directly to Google Drive using a resumable session URI.
 * Returns the Drive file ID.
 * Throws on failure so the caller can retry.
 */
function uploadToGoogleDrive(
  file: File,
  uploadUrl: string,
  onProgress: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText) as { id?: string };
          if (!json.id) return reject(new Error("Google Drive did not return a file ID"));
          onProgress(100);
          resolve(json.id);
        } catch {
          reject(new Error("Invalid response from Google Drive"));
        }
      } else {
        reject(new Error(`Upload failed: HTTP ${xhr.status}`));
      }
    };

    xhr.onerror   = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });
}

/**
 * Full pipeline for a single file:
 *   1. GET resumable session URI from /api/upload/init
 *   2. PUT file bytes directly to Google Drive
 *   3. POST to /api/upload/complete to set permissions + get public links
 */
async function uploadFileDirect(
  file: File,
  brandSlug: string,
  packSlug: string,
  onProgress: (pct: number) => void
): Promise<UploadResult> {
  const mimeType = file.type || "application/octet-stream";

  // Step 1 — init session
  const initRes = await fetch("/api/upload/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename:  file.name,
      mimeType,
      fileSize:  file.size,
      brandSlug,
      packSlug,
      assetType: detectAssetType(mimeType),
    }),
  });

  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? "Failed to initialise upload");
  }

  const { data: initData } = await initRes.json() as { data: { uploadUrl: string } };

  // Step 2 — upload directly to Drive (no Vercel body limit)
  const driveId = await uploadToGoogleDrive(file, initData.uploadUrl, onProgress);

  // Step 3 — finalise permissions + get public links
  const completeRes = await fetch("/api/upload/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ driveId }),
  });

  if (!completeRes.ok) {
    const err = await completeRes.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? "Failed to finalise upload");
  }

  const { data } = await completeRes.json() as { data: UploadResult };
  return data;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddPackForm({ brands, initialData, packId }: AddPackFormProps) {
  const router = useRouter();
  const isEdit = !!packId;

  // Form fields
  const [brandId,      setBrandId]      = useState(initialData?.brand_id  ?? "");
  const [format,       setFormat]       = useState(initialData?.format     ?? "");
  const [name,         setName]         = useState(initialData?.name       ?? "");
  const [internalName, setInternalName] = useState(initialData?.internal_name ?? "");
  const [material,     setMaterial]     = useState(initialData?.material   ?? "");
  const [description,  setDescription]  = useState(initialData?.description ?? "");
  const [heightMm,     setHeightMm]     = useState(initialData?.height_mm?.toString() ?? "84");
  const [widthMm,      setWidthMm]      = useState(initialData?.width_mm?.toString()  ?? "55");
  const [depthMm,      setDepthMm]      = useState(initialData?.depth_mm?.toString()  ?? "22");

  // File picks
  const [glbFile,       setGlbFile]       = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [dielineFile,   setDielineFile]   = useState<File | null>(null);

  // Per-file upload progress
  const [glbUpload,       setGlbUpload]       = useState<UploadState>({ status: "idle", progress: 0 });
  const [thumbUpload,     setThumbUpload]     = useState<UploadState>({ status: "idle", progress: 0 });
  const [imagesUpload,    setImagesUpload]    = useState<UploadState>({ status: "idle", progress: 0 });
  const [dielineUpload,   setDielineUpload]   = useState<UploadState>({ status: "idle", progress: 0 });

  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedBrand = brands.find((b) => b.id === brandId);

  function validate() {
    const result = addPackSchema.safeParse({
      brandId,
      format,
      name,
      internalName: internalName || undefined,
      material:     material     || undefined,
      description:  description  || undefined,
      heightMm: parseFloat(heightMm),
      widthMm:  parseFloat(widthMm),
      depthMm:  parseFloat(depthMm),
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        const field = e.path[0]?.toString() ?? "form";
        fieldErrors[field] = e.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  /**
   * Upload a file with retry support.
   * Retries up to `maxRetries` times on failure before throwing.
   */
  const uploadWithRetry = useCallback(
    async (
      file: File,
      brandSlug: string,
      packSlug: string,
      setUpload: React.Dispatch<React.SetStateAction<UploadState>>,
      maxRetries = 2
    ): Promise<UploadResult> => {
      let lastError: Error = new Error("Unknown error");

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          setUpload({ status: "uploading", progress: 0 });
          const result = await uploadFileDirect(
            file,
            brandSlug,
            packSlug,
            (pct) => setUpload((prev) => ({ ...prev, progress: pct }))
          );
          setUpload({ status: "done", progress: 100 });
          return result;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Upload failed");
          if (attempt < maxRetries) {
            // Brief pause before retry
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            setUpload({ status: "uploading", progress: 0 });
          }
        }
      }

      setUpload({ status: "error", progress: 0, error: lastError.message });
      throw lastError;
    },
    []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const brandSlug = selectedBrand?.slug ?? "unknown";
      const packSlug  = name.toLowerCase().replace(/\s+/g, "-");

      let glbDriveId:    string | undefined;
      let glbUrl:        string | undefined;
      let thumbnailUrl:  string | undefined;
      let dielineDriveId: string | undefined;
      let dielineUrl:    string | undefined;
      const uploadedImages: { driveId: string; url: string; label?: string }[] = [];

      // Upload files concurrently where possible (glb + thumbnail in parallel)
      const uploadTasks: Promise<void>[] = [];

      if (glbFile) {
        uploadTasks.push(
          uploadWithRetry(glbFile, brandSlug, packSlug, setGlbUpload).then((r) => {
            glbDriveId = r.driveId;
            glbUrl     = r.viewLink;
          })
        );
      }

      if (thumbnailFile) {
        uploadTasks.push(
          uploadWithRetry(thumbnailFile, brandSlug, packSlug, setThumbUpload).then((r) => {
            thumbnailUrl = `https://lh3.googleusercontent.com/d/${r.driveId}`;
          })
        );
      }

      if (dielineFile) {
        uploadTasks.push(
          uploadWithRetry(dielineFile, brandSlug, packSlug, setDielineUpload).then((r) => {
            dielineDriveId = r.driveId;
            dielineUrl     = r.viewLink;
          })
        );
      }

      // Wait for GLB + thumbnail + dieline concurrently
      await Promise.all(uploadTasks);

      // Product images sequentially (label order matters)
      if (productImages.length > 0) {
        const labels = ["Front", "Back", "Side", "Perspective"];
        for (let i = 0; i < productImages.length; i++) {
          const r = await uploadWithRetry(
            productImages[i],
            brandSlug,
            packSlug,
            setImagesUpload
          );
          uploadedImages.push({
            driveId: r.driveId,
            url:     `https://lh3.googleusercontent.com/d/${r.driveId}`,
            label:   labels[i] ?? `View ${i + 1}`,
          });
        }
      }

      const payload = {
        brandId,
        name,
        internalName: internalName || undefined,
        format,
        material:     material     || undefined,
        description:  description  || undefined,
        heightMm: parseFloat(heightMm),
        widthMm:  parseFloat(widthMm),
        depthMm:  parseFloat(depthMm),
        glbDriveId,
        glbUrl,
        thumbnailUrl,
        dielineDriveId,
        dielineUrl,
        images: uploadedImages,
      };

      const url    = isEdit ? `/api/packs/${packId}` : "/api/packs";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: { message?: string } })?.error?.message ?? "Save failed");
      }

      const json = await res.json() as { data: { id: string } };
      toast.success(isEdit ? "Pack updated" : "Pack added successfully");
      router.push(`/packs/${json.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isUploading =
    glbUpload.status     === "uploading" ||
    thumbUpload.status   === "uploading" ||
    imagesUpload.status  === "uploading" ||
    dielineUpload.status === "uploading";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* General Information */}
      <section className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-base">General Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="brand">Brand</Label>
            <Select value={brandId} onValueChange={(v) => setBrandId(v ?? "")}>
              <SelectTrigger id="brand" className={errors.brandId ? "border-destructive" : ""}>
                <SelectValue placeholder="Select brand…" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.brandId && <p className="text-xs text-destructive">{errors.brandId}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="format">Pack Type / Format</Label>
            <Input
              id="format"
              placeholder="e.g., King Size Box, Nano Slim"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className={errors.format ? "border-destructive" : ""}
            />
            {errors.format && <p className="text-xs text-destructive">{errors.format}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">Pack Internal Name</Label>
          <Input
            id="name"
            placeholder="Enter internal designation"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="material">Material</Label>
            <Input
              id="material"
              placeholder="e.g., Cardboard"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="internalName">Internal Designation</Label>
            <Input
              id="internalName"
              placeholder="Optional internal SKU"
              value={internalName}
              onChange={(e) => setInternalName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description / Notes</Label>
          <Textarea
            id="description"
            placeholder="Additional details, edge case notes…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Ruler className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-base">Technical Specifications</h2>
        </div>
        <div className="bg-muted/40 rounded-xl p-6 flex items-center justify-center gap-6">
          <DimensionInput label="Height" value={heightMm} onChange={setHeightMm} error={errors.heightMm} />
          <span className="text-muted-foreground font-mono">×</span>
          <DimensionInput label="Width"  value={widthMm}  onChange={setWidthMm}  error={errors.widthMm} />
          <span className="text-muted-foreground font-mono">×</span>
          <DimensionInput label="Depth"  value={depthMm}  onChange={setDepthMm}  error={errors.depthMm} />
        </div>
      </section>

      {/* Assets */}
      <section className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Camera className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-base">Assets</h2>
          <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
            <UploadCloud className="w-3.5 h-3.5" />
            Direct upload — no file size limit
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 3D Asset */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">3D Asset</p>
            <FileDropzone
              label="Drag & Drop 3D Model"
              sublabel="GLB / GLTF / FBX — any size supported"
              icon={<Box className="w-6 h-6" />}
              accept={{
                "model/gltf-binary":         [".glb"],
                "model/gltf+json":           [".gltf"],
                "model/vnd.fbx":             [".fbx"],
                "application/octet-stream":  [".fbx", ".glb"],
              }}
              maxSize={500 * 1024 * 1024}
              value={glbFile}
              onChange={setGlbFile}
              uploadState={glbUpload}
            />
          </div>

          {/* 2D Assets */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">2D Assets</p>
            <div className="space-y-3">
              <FileDropzone
                compact
                label="Thumbnail Image"
                sublabel="Primary library view (PNG/JPG/WEBP)"
                accept={{
                  "image/png":  [".png"],
                  "image/jpeg": [".jpg", ".jpeg"],
                  "image/webp": [".webp"],
                }}
                maxSize={50 * 1024 * 1024}
                value={thumbnailFile}
                onChange={setThumbnailFile}
                uploadState={thumbUpload}
              />
              <FileDropzone
                compact
                label="Product Images"
                sublabel="PNG/JPG/WEBP — multiple views"
                accept={{
                  "image/png":  [".png"],
                  "image/jpeg": [".jpg", ".jpeg"],
                  "image/webp": [".webp"],
                }}
                maxSize={50 * 1024 * 1024}
                value={productImages[0] ?? null}
                onChange={(f) => { if (f) setProductImages([f]); else setProductImages([]); }}
                uploadState={imagesUpload}
              />
              <FileDropzone
                compact
                label="Dieline / Blueprint"
                sublabel="PDF or SVG"
                accept={{
                  "application/pdf": [".pdf"],
                  "image/svg+xml":   [".svg"],
                }}
                maxSize={50 * 1024 * 1024}
                value={dielineFile}
                onChange={setDielineFile}
                uploadState={dielineUpload}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" className="gap-2" disabled={isSubmitting || isUploading}>
          {isSubmitting || isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSubmitting
            ? isUploading ? "Uploading…" : "Saving…"
            : isEdit
            ? "Update Pack"
            : "Save Asset"}
        </Button>
      </div>
    </form>
  );
}
