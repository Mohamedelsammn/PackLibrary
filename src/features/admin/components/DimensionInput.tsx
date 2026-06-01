"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DimensionInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function DimensionInput({
  label,
  value,
  onChange,
  error,
}: DimensionInputProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-label-md text-muted-foreground">{label.toUpperCase()}</span>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min="0.1"
          max="500"
          step="0.1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-20 text-center font-mono text-base font-medium",
            error && "border-destructive"
          )}
          aria-label={label}
        />
        <span className="text-xs text-muted-foreground font-mono">mm</span>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
