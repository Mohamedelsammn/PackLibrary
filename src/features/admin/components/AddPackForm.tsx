"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Box, Info, Ruler, Save, Loader2, UploadCloud } from "lucide-react";
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
import { TwoDAssetsManager, newAssetEntry } from "./TwoDAssetsManager";
import type { Asset2DEntry } from "./TwoDAssetsManager";
import { addPackSchema } from "../schemas/add-pack.schema";
import { REGIONS, COLORS, PACK_SIZES } from "@/features/search/constants";
import type { Brand } from "@/features/brands/types";
import type { PackRow, PackImageRow } from "@/lib/supabase/types";

// Accept either plain PackRow or PackRow + images (for edit mode)
type InitialData = (PackRow & { pack_images?: PackImageRow[] }) | null | undefined;

interface AddPackFormProps {
  brands:       Brand[];
  initialData?: InitialData;
  packId?:      string;
}

interface UploadResult {
  driveId:      string;
  viewLink:     string;
  downloadLink: string;
  publicUrl:    string;
}

interface UploadState {
  status:    "idle" | "uploading" | "done" | "error";
  progress:  number;
  error?:    string;
}

// ── Upload helpers (reused from existing architecture) ────────────────────────

function detectAssetType(mimeType: string): "glb" | "image" | "dieline" {
  if (["model/gltf-binary","model/gltf+json","model/vnd.fbx","application/octet-stream"].includes(mimeType)) return "glb";
  if (["image/png","image/jpeg","image/webp"].includes(mimeType)) return "image";
  return "dieline";
}

function uploadFileBytes(file: File, uploadUrl: string, onProgress: (p: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100))); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText) as { id?: string };
          if (!json.id) return reject(new Error("Storage provider did not return a file ID"));
          onProgress(100); resolve(json.id);
        } catch { reject(new Error("Invalid response from storage provider")); }
      } else { reject(new Error(`Upload failed: HTTP ${xhr.status}`)); }
    };
    xhr.onerror   = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });
}

async function uploadFileDirect(file: File, brandSlug: string, packSlug: string, onProgress: (p: number) => void): Promise<UploadResult> {
  const mimeType  = file.type || "application/octet-stream";
  const assetType = detectAssetType(mimeType);

  const initRes = await fetch("/api/upload/init", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, mimeType, fileSize: file.size, brandSlug, packSlug, assetType }),
  });
  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    throw new Error((err as {error?:{message?:string}})?.error?.message ?? "Failed to initialise upload");
  }
  const { data: initData } = await initRes.json() as { data: { uploadUrl: string } };

  let driveId: string | null = null;
  let uploadError: Error | null = null;
  try { driveId = await uploadFileBytes(file, initData.uploadUrl, onProgress); }
  catch (err) { uploadError = err instanceof Error ? err : new Error("Upload failed"); }

  if (driveId) {
    const completeRes = await fetch("/api/upload/complete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driveId }),
    });
    if (!completeRes.ok) {
      const err = await completeRes.json().catch(() => ({}));
      throw new Error((err as {error?:{message?:string}})?.error?.message ?? "Failed to finalise upload");
    }
    const { data } = await completeRes.json() as { data: UploadResult };
    return data;
  }

  if (uploadError?.message.includes("Network error") || uploadError?.message.includes("timed out")) {
    onProgress(99);
    const recoverRes = await fetch("/api/upload/recover", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, mimeType, brandSlug, packSlug, assetType }),
    });
    if (recoverRes.ok) {
      const { data } = await recoverRes.json() as { data: UploadResult };
      onProgress(100); return data;
    }
    throw new Error("Upload failed and recovery found no file. Please try again.");
  }
  throw uploadError ?? new Error("Upload failed");
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddPackForm({ brands, initialData, packId }: AddPackFormProps) {
  const router  = useRouter();
  const isEdit  = !!packId;

  // ── General info ──────────────────────────────────────────────────────────
  const [brandId,      setBrandId]      = useState(initialData?.brand_id       ?? "");
  const [format,       setFormat]       = useState(initialData?.format          ?? "");
  const [name,         setName]         = useState(initialData?.name            ?? "");
  const [internalName, setInternalName] = useState(initialData?.internal_name   ?? "");
  const [material,     setMaterial]     = useState(initialData?.material        ?? "");
  const [description,  setDescription]  = useState(initialData?.description     ?? "");
  const [region,       setRegion]       = useState(initialData?.region          ?? "");
  const [color,        setColor]        = useState(initialData?.color           ?? "");
  const [size,         setSize]         = useState(initialData?.size            ?? "");

  // ── Dimensions ────────────────────────────────────────────────────────────
  const [heightMm, setHeightMm] = useState(initialData?.height_mm?.toString() ?? "84");
  const [widthMm,  setWidthMm]  = useState(initialData?.width_mm?.toString()  ?? "55");
  const [depthMm,  setDepthMm]  = useState(initialData?.depth_mm?.toString()  ?? "22");

  // ── 3D + dieline files ────────────────────────────────────────────────────
  const [glbFile,       setGlbFile]       = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [dielineFile,   setDielineFile]   = useState<File | null>(null);

  const [glbUpload,     setGlbUpload]     = useState<UploadState>({ status: "idle", progress: 0 });
  const [thumbUpload,   setThumbUpload]   = useState<UploadState>({ status: "idle", progress: 0 });
  const [dielineUpload, setDielineUpload] = useState<UploadState>({ status: "idle", progress: 0 });

  // ── 2D assets (TwoDAssetsManager) ─────────────────────────────────────────
  const [assets2d, setAssets2d] = useState<Asset2DEntry[]>(() => {
    const existing = initialData?.pack_images ?? [];
    if (existing.length === 0) return [];
    return existing
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) =>
        newAssetEntry({
          existingId:       img.id,
          name:             img.label ?? "",
          existingUrl:      img.url,
          existingDriveId:  img.drive_id,
        })
      );
  });

  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedBrand = brands.find((b) => b.id === brandId);

  // ── Validation ────────────────────────────────────────────────────────────
  function validate() {
    const result = addPackSchema.safeParse({
      brandId, format, name,
      internalName: internalName || undefined,
      material:     material     || undefined,
      description:  description  || undefined,
      heightMm: parseFloat(heightMm),
      widthMm:  parseFloat(widthMm),
      depthMm:  parseFloat(depthMm),
      region: (region || undefined) as typeof REGIONS[number] | undefined,
      color:  (color  || undefined) as typeof COLORS[number]  | undefined,
      size:   (size   || undefined) as typeof PACK_SIZES[number] | undefined,
    });
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach((e) => { fe[e.path[0]?.toString() ?? "form"] = e.message; });
      setErrors(fe); return false;
    }
    setErrors({}); return true;
  }

  // ── Upload with retry ─────────────────────────────────────────────────────
  const uploadWithRetry = useCallback(async (
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
        const result = await uploadFileDirect(file, brandSlug, packSlug, (pct) =>
          setUpload((p) => ({ ...p, progress: pct }))
        );
        setUpload({ status: "done", progress: 100 });
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error("Upload failed");
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          setUpload({ status: "uploading", progress: 0 });
        }
      }
    }
    setUpload({ status: "error", progress: 0, error: lastError.message });
    throw lastError;
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
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

      // ── GLB + thumbnail + dieline concurrently ──────────────────────────
      const coreTasks: Promise<void>[] = [];

      if (glbFile) {
        coreTasks.push(uploadWithRetry(glbFile, brandSlug, packSlug, setGlbUpload).then((r) => {
          glbDriveId = r.driveId; glbUrl = r.viewLink;
        }));
      }
      if (thumbnailFile) {
        coreTasks.push(uploadWithRetry(thumbnailFile, brandSlug, packSlug, setThumbUpload).then((r) => {
          thumbnailUrl = r.publicUrl;
        }));
      }
      if (dielineFile) {
        coreTasks.push(uploadWithRetry(dielineFile, brandSlug, packSlug, setDielineUpload).then((r) => {
          dielineDriveId = r.driveId; dielineUrl = r.viewLink;
        }));
      }
      await Promise.all(coreTasks);

      // ── 2D assets: upload new ones ────────────────────────────────────────
      const newAssets = assets2d.filter((a) => a.file && !a.existingId && !a.markedForDeletion);
      const uploadedImages: { driveId: string; url: string; label?: string }[] = [];

      for (const asset of newAssets) {
        // Update this asset's progress in the list
        const setProgress = (patch: Partial<Asset2DEntry>) =>
          setAssets2d((prev) => prev.map((a) => a.tempId === asset.tempId ? { ...a, ...patch } : a));

        setProgress({ uploadStatus: "uploading", uploadProgress: 0 });
        try {
          const result = await uploadFileDirect(
            asset.file!,
            brandSlug,
            packSlug,
            (pct) => setProgress({ uploadProgress: pct })
          );
          setProgress({ uploadStatus: "done", uploadProgress: 100 });
          uploadedImages.push({
            driveId: result.driveId,
            url:     result.publicUrl,
            label:   asset.name || undefined,
          });
        } catch (err) {
          setProgress({ uploadStatus: "error", uploadProgress: 0 });
          throw err;
        }
      }

      // ── 2D assets: delete removed existing ones ────────────────────────────
      const toDelete = assets2d.filter((a) => a.markedForDeletion && a.existingId);
      await Promise.allSettled(
        toDelete.map((a) => fetch(`/api/pack-images/${a.existingId}`, { method: "DELETE" }))
      );

      // ── Save pack ─────────────────────────────────────────────────────────
      const payload = {
        brandId, name,
        internalName: internalName || undefined,
        format,
        material:    material    || undefined,
        description: description || undefined,
        heightMm: parseFloat(heightMm),
        widthMm:  parseFloat(widthMm),
        depthMm:  parseFloat(depthMm),
        region: region || undefined,
        color:  color  || undefined,
        size:   size   || undefined,
        glbDriveId, glbUrl, thumbnailUrl, dielineDriveId, dielineUrl,
        images: uploadedImages,
      };

      const res = await fetch(isEdit ? `/api/packs/${packId}` : "/api/packs", {
        method:  isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as {error?:{message?:string}})?.error?.message ?? "Save failed");
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

  const anyUploading =
    glbUpload.status === "uploading" || thumbUpload.status === "uploading" || dielineUpload.status === "uploading" ||
    assets2d.some((a) => a.uploadStatus === "uploading");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── General Information ───────────────────────────────────────────── */}
      <section className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-base">General Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Brand */}
          <div className="space-y-1.5">
            <Label htmlFor="brand">Brand</Label>
            <Select value={brandId} onValueChange={(v) => setBrandId(v ?? "")}>
              <SelectTrigger id="brand" className={errors.brandId ? "border-destructive" : ""}>
                <SelectValue placeholder="Select brand…" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.brandId && <p className="text-xs text-destructive">{errors.brandId}</p>}
          </div>

          {/* Format */}
          <div className="space-y-1.5">
            <Label htmlFor="format">Pack Type / Format</Label>
            <Input id="format" placeholder="e.g., King Size Box, Nano Slim" value={format}
              onChange={(e) => setFormat(e.target.value)} className={errors.format ? "border-destructive" : ""} />
            {errors.format && <p className="text-xs text-destructive">{errors.format}</p>}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Pack Name</Label>
          <Input id="name" placeholder="Enter pack name" value={name}
            onChange={(e) => setName(e.target.value)} className={errors.name ? "border-destructive" : ""} />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Material */}
          <div className="space-y-1.5">
            <Label htmlFor="material">Material</Label>
            <Input id="material" placeholder="e.g., Cardboard" value={material}
              onChange={(e) => setMaterial(e.target.value)} />
          </div>
          {/* Internal name */}
          <div className="space-y-1.5">
            <Label htmlFor="internalName">Internal Designation</Label>
            <Input id="internalName" placeholder="Optional internal SKU" value={internalName}
              onChange={(e) => setInternalName(e.target.value)} />
          </div>
        </div>

        {/* Region / Color / Size */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="region">Region</Label>
            <Select value={region} onValueChange={(v) => setRegion(v ?? "")}>
              <SelectTrigger id="region">
                <SelectValue placeholder="Select region…" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="color">Color</Label>
            <Select value={color} onValueChange={(v) => setColor(v ?? "")}>
              <SelectTrigger id="color">
                <SelectValue placeholder="Select color…" />
              </SelectTrigger>
              <SelectContent>
                {COLORS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="size">Size</Label>
            <Select value={size} onValueChange={(v) => setSize(v ?? "")}>
              <SelectTrigger id="size">
                <SelectValue placeholder="Select size…" />
              </SelectTrigger>
              <SelectContent>
                {PACK_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description">Description / Notes</Label>
          <Textarea id="description" placeholder="Additional details…" value={description}
            onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
      </section>

      {/* ── Technical Specifications ──────────────────────────────────────── */}
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

      {/* ── 3D Asset ─────────────────────────────────────────────────────── */}
      <section className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Box className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-base">3D Asset</h2>
          <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
            <UploadCloud className="w-3.5 h-3.5" />
            Direct upload — no file size limit
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FileDropzone
            label="Drag & Drop 3D Model"
            sublabel="GLB / GLTF / FBX — any size supported"
            icon={<Box className="w-6 h-6" />}
            accept={{ "model/gltf-binary": [".glb"], "model/gltf+json": [".gltf"], "model/vnd.fbx": [".fbx"], "application/octet-stream": [".fbx",".glb"] }}
            maxSize={500 * 1024 * 1024}
            value={glbFile}
            onChange={setGlbFile}
            uploadState={glbUpload}
          />
          <div className="space-y-3">
            <FileDropzone compact label="Thumbnail Image" sublabel="Primary library view (PNG/JPG/WEBP)"
              accept={{ "image/png": [".png"], "image/jpeg": [".jpg",".jpeg"], "image/webp": [".webp"] }}
              maxSize={50 * 1024 * 1024} value={thumbnailFile} onChange={setThumbnailFile} uploadState={thumbUpload} />
            <FileDropzone compact label="Dieline / Blueprint" sublabel="PDF or SVG"
              accept={{ "application/pdf": [".pdf"], "image/svg+xml": [".svg"] }}
              maxSize={50 * 1024 * 1024} value={dielineFile} onChange={setDielineFile} uploadState={dielineUpload} />
          </div>
        </div>
      </section>

      {/* ── 2D Assets ────────────────────────────────────────────────────── */}
      <section className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="font-semibold text-base">2D Assets</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Artwork, flat layouts, reference images — unlimited assets
            </p>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <UploadCloud className="w-3.5 h-3.5" />
            Direct upload
          </span>
        </div>
        <TwoDAssetsManager
          assets={assets2d}
          onChange={setAssets2d}
          allowDeleteExisting
        />
      </section>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" className="gap-2" disabled={isSubmitting || anyUploading}>
          {isSubmitting || anyUploading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Save className="w-4 h-4" />}
          {isSubmitting
            ? anyUploading ? "Uploading…" : "Saving…"
            : isEdit ? "Update Pack" : "Save Asset"}
        </Button>
      </div>
    </form>
  );
}
