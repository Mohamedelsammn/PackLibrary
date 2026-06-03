export interface Pack {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  format: string;
  material: string | null;
  thumbnail_url: string | null;
  height_mm: number;
  width_mm: number;
  depth_mm: number;
  region: string | null;
  color: string | null;
  size: string | null;
}

export interface PackImage {
  id: string;
  pack_id: string;
  drive_id: string;
  url: string;
  label: string | null;
  sort_order: number;
}

export interface PackDetails extends Pack {
  internal_name: string | null;
  description: string | null;
  glb_drive_id: string | null;
  glb_url: string | null;
  dieline_drive_id: string | null;
  dieline_url: string | null;
  brand: { id: string; name: string; slug: string };
  images: PackImage[];
}
