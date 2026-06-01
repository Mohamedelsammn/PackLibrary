export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      brands: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      packs: {
        Row: {
          id: string;
          brand_id: string;
          name: string;
          internal_name: string | null;
          slug: string;
          format: string;
          material: string | null;
          description: string | null;
          height_mm: number;
          width_mm: number;
          depth_mm: number;
          glb_drive_id: string | null;
          glb_url: string | null;
          dieline_drive_id: string | null;
          dieline_url: string | null;
          thumbnail_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          name: string;
          internal_name?: string | null;
          slug: string;
          format: string;
          material?: string | null;
          description?: string | null;
          height_mm: number;
          width_mm: number;
          depth_mm: number;
          glb_drive_id?: string | null;
          glb_url?: string | null;
          dieline_drive_id?: string | null;
          dieline_url?: string | null;
          thumbnail_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          name?: string;
          internal_name?: string | null;
          slug?: string;
          format?: string;
          material?: string | null;
          description?: string | null;
          height_mm?: number;
          width_mm?: number;
          depth_mm?: number;
          glb_drive_id?: string | null;
          glb_url?: string | null;
          dieline_drive_id?: string | null;
          dieline_url?: string | null;
          thumbnail_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "packs_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          }
        ];
      };
      pack_images: {
        Row: {
          id: string;
          pack_id: string;
          drive_id: string;
          url: string;
          label: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          pack_id: string;
          drive_id: string;
          url: string;
          label?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          pack_id?: string;
          drive_id?: string;
          url?: string;
          label?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pack_images_pack_id_fkey";
            columns: ["pack_id"];
            referencedRelation: "packs";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience row types
export type BrandRow = Database["public"]["Tables"]["brands"]["Row"];
export type PackRow = Database["public"]["Tables"]["packs"]["Row"];
export type PackImageRow = Database["public"]["Tables"]["pack_images"]["Row"];

// Pack with brand joined
export interface PackWithBrand extends PackRow {
  brands: Pick<BrandRow, "id" | "name" | "slug">;
}

// Pack with images joined
export interface PackWithImages extends PackRow {
  pack_images: PackImageRow[];
  brands: Pick<BrandRow, "id" | "name" | "slug">;
}
