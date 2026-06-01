import Image from "next/image";
import Link from "next/link";
import { PackBadge } from "@/features/packs/components/PackBadge";
import type { PackRow } from "@/lib/supabase/types";

interface CompareTableProps {
  packA: PackRow;
  packB: PackRow;
}

const SPEC_ROWS = [
  {
    label: "Format",
    getValue: (p: PackRow) => p.format,
  },
  {
    label: "Material",
    getValue: (p: PackRow) => p.material ?? "—",
  },
  {
    label: "Height",
    getValue: (p: PackRow) => `${p.height_mm} mm`,
  },
  {
    label: "Width",
    getValue: (p: PackRow) => `${p.width_mm} mm`,
  },
  {
    label: "Depth",
    getValue: (p: PackRow) => `${p.depth_mm} mm`,
  },
];

export function CompareTable({ packA, packB }: CompareTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header row */}
      <div className="grid grid-cols-3 border-b border-border">
        <div className="p-4 bg-muted/30" />
        {[packA, packB].map((pack) => (
          <div key={pack.id} className="p-4 border-l border-border">
            <PackBadge format={pack.format} />
            <Link
              href={`/packs/${pack.id}`}
              className="block mt-1 font-semibold text-foreground hover:underline"
            >
              {pack.name}
            </Link>
            {pack.thumbnail_url && (
              <div className="relative mt-3 aspect-[4/3] w-full rounded-lg overflow-hidden bg-muted">
                <Image
                  src={pack.thumbnail_url}
                  alt={pack.name}
                  fill
                  className="object-contain p-3"
                  sizes="30vw"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Spec rows */}
      {SPEC_ROWS.map(({ label, getValue }) => {
        const valA = getValue(packA);
        const valB = getValue(packB);
        const differ = valA !== valB;
        return (
          <div
            key={label}
            className="grid grid-cols-3 border-b border-border last:border-0"
          >
            <div className="p-4 bg-muted/20">
              <span className="text-label-md text-muted-foreground">
                {label}
              </span>
            </div>
            {[valA, valB].map((val, i) => (
              <div
                key={i}
                className={`p-4 border-l border-border font-mono text-sm ${
                  differ ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                {val}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
