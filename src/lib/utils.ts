import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

/**
 * Validates asset URLs returned by storage providers. Google Drive returns
 * absolute URLs; Box-backed assets are served through our own same-origin
 * `/api/download/...` proxy as a relative path.
 */
export const assetUrlSchema = z.string().refine(
  (v) => /^https?:\/\//.test(v) || v.startsWith("/"),
  { message: "Must be an absolute URL or a path starting with /" }
);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatMm(value: number | string): string {
  return `${Number(value)} mm`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Proxied through Next.js API to avoid CORS issues with Drive */
export function getDriveGlbUrl(driveId: string): string {
  return `/api/proxy/glb/${driveId}`;
}

/** Download URL for a Drive-hosted GLB — includes filename hint for browser */
export function getGlbDownloadUrl(driveId: string, packName: string): string {
  const slug = packName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return `/api/download/${driveId}?name=${encodeURIComponent(`${slug}.glb`)}`;
}

/** Download URL for a Drive-hosted image */
export function getImageDownloadUrl(driveId: string, label: string, ext = "jpg"): string {
  const safe = label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return `/api/download/${driveId}?name=${encodeURIComponent(`${safe}.${ext}`)}`;
}

/** Download URL for a Drive-hosted dieline */
export function getDielineDownloadUrl(driveId: string, packName: string, ext = "pdf"): string {
  const slug = packName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return `/api/download/${driveId}?name=${encodeURIComponent(`${slug}-dieline.${ext}`)}`;
}

/** lh3 direct image URL — works in browsers and with next/image */
export function getDriveImageUrl(driveId: string): string {
  return `https://lh3.googleusercontent.com/d/${driveId}`;
}
