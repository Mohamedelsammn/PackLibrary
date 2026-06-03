import { Badge } from "@/components/ui/badge";
import type { PackDetails } from "@/features/packs/types";

interface SpecificationsPanelProps {
  pack: PackDetails;
}

export function SpecificationsPanel({ pack }: SpecificationsPanelProps) {
  // Build badge list from all set spec fields
  const badges: { label: string; value: string }[] = [
    pack.format   ? { label: "Format",   value: pack.format }   : null,
    pack.material ? { label: "Material", value: pack.material } : null,
    pack.size     ? { label: "Size",     value: pack.size }     : null,
    pack.color    ? { label: "Color",    value: pack.color }    : null,
    pack.region   ? { label: "Region",   value: pack.region }   : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <h2 className="font-semibold text-base text-foreground">Specifications</h2>

      {/* Spec chips */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges.map(({ label, value }) => (
            <Badge key={label} variant="secondary" className="text-xs font-medium">
              {label}: {value}
            </Badge>
          ))}
        </div>
      )}

      {/* Description */}
      {pack.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {pack.description}
        </p>
      )}

      {/* Dimensions */}
      <div>
        <p className="text-label-md text-muted-foreground mb-3">Dimensions</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Height", value: pack.height_mm },
            { label: "Width",  value: pack.width_mm  },
            { label: "Depth",  value: pack.depth_mm  },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="font-mono text-sm font-medium text-foreground">
                {value}
                <span className="text-xs text-muted-foreground ml-1">mm</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
