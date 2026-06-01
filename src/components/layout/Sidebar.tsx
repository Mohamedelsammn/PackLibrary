import { Suspense } from "react";
import { BrandSidebar } from "@/features/brands/components/BrandSidebar";

interface SidebarProps {
  activeBrandSlug?: string;
}

export function Sidebar({ activeBrandSlug }: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-[280px] min-h-screen bg-[#000000] text-white shrink-0 sticky top-0 h-screen">
      {/* Logo area */}
      <div className="px-6 pt-6 pb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-white"
          >
            <rect x="1" y="2" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="3" y="5" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.6" />
            <rect x="9" y="5" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.6" />
          </svg>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-sm text-white leading-tight truncate">
            Pack Library
          </span>
          <span className="text-xs text-white/40 leading-tight truncate">
            Imperial Brands
          </span>
        </div>
      </div>

      {/* Brand list */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Suspense
          fallback={
            <div className="px-3 space-y-1 mt-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 rounded-lg bg-white/5 animate-pulse"
                />
              ))}
            </div>
          }
        >
          <BrandSidebar activeBrandSlug={activeBrandSlug} />
        </Suspense>
      </div>
    </aside>
  );
}
