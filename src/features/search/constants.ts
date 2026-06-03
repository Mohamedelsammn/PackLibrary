export const REGIONS = [
  "GCC",
  "Egypt",
  "Europe",
  "Asia",
  "Africa",
] as const;

export const COLORS = [
  "Red",
  "Blue",
  "Black",
  "Gold",
  "Silver",
  "Green",
  "White",
] as const;

export const PACK_SIZES = [
  "Regular",
  "Slim",
  "Super Slim",
  "King Size",
] as const;

export type Region   = (typeof REGIONS)[number];
export type Color    = (typeof COLORS)[number];
export type PackSize = (typeof PACK_SIZES)[number];
