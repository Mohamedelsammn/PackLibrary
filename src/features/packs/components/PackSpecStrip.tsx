import { cn } from "@/lib/utils";

interface PackSpecStripProps {
  heightMm: number;
  widthMm: number;
  depthMm: number;
  className?: string;
}

const specs = [
  { label: "Height", key: "heightMm" as const },
  { label: "Width", key: "widthMm" as const },
  { label: "Depth", key: "depthMm" as const },
];

export function PackSpecStrip({
  heightMm,
  widthMm,
  depthMm,
  className,
}: PackSpecStripProps) {
  const values = { heightMm, widthMm, depthMm };

  return (
    <div
      className={cn(
        "grid grid-cols-3 divide-x divide-border pt-4 mt-4 border-t border-border",
        className
      )}
    >
      {specs.map(({ label, key }) => (
        <div key={label} className="flex flex-col items-center gap-0.5 px-2">
          <span className="text-label-md text-muted-foreground">{label}</span>
          <span className="text-foreground font-medium">
            <span className="text-technical font-mono text-base">
              {values[key]}
            </span>
            <span className="text-xs text-muted-foreground ml-1">mm</span>
          </span>
        </div>
      ))}
    </div>
  );
}
