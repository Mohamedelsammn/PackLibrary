import { z } from "zod";
import { REGIONS, COLORS, PACK_SIZES } from "@/features/search/constants";

export const addPackSchema = z.object({
  brandId: z.string().uuid("Please select a brand"),
  format: z.string().min(1, "Format is required").max(100),
  name: z.string().min(1, "Pack name is required").max(200),
  internalName: z.string().max(200).optional(),
  material: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  heightMm: z
    .number({ invalid_type_error: "Height must be a number" })
    .positive("Height must be positive")
    .max(500),
  widthMm: z
    .number({ invalid_type_error: "Width must be a number" })
    .positive("Width must be positive")
    .max(500),
  depthMm: z
    .number({ invalid_type_error: "Depth must be a number" })
    .positive("Depth must be positive")
    .max(500),
  region: z.enum(REGIONS).optional(),
  color: z.enum(COLORS).optional(),
  size: z.enum(PACK_SIZES).optional(),
});

export type AddPackFormValues = z.infer<typeof addPackSchema>;
