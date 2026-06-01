import { Badge } from "@/components/ui/badge";
import type { PackDetails } from "@/features/packs/types";

interface SpecificationsPanelProps {
  pack: PackDetails;
}

export function SpecificationsPanel({ pack }: SpecificationsPanelProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <h2 className="font-semibold text-base text-foreground">Specifications</h2>

      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        {pack.format && (
          <Badge variant="secondary" className="text-xs font-medium">
            Format: {pack.format}
          </Badge>
        )}
        {pack.material && (
          <Badge variant="secondary" className="text-xs font-medium">
            Material: {pack.material}
          </Badge>
        )}
      </div>

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
            { label: "Width", value: pack.width_mm },
            { label: "Depth", value: pack.depth_mm },
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
