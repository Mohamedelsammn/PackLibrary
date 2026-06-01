"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function BrandSearch({ value, onChange }: BrandSearchProps) {
  return (
    <div className="relative px-3 pb-3">
      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
      <input
        type="search"
        placeholder="Search brand"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full h-9 pl-8 pr-3 rounded-lg text-sm",
          "bg-white/8 border border-white/10",
          "text-white placeholder:text-white/30",
          "focus:outline-none focus:ring-1 focus:ring-white/20",
          "transition-colors"
        )}
      />
    </div>
  );
}
