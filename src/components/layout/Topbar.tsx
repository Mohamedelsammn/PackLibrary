"use client";

import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useAdminStore } from "@/features/admin/store";

interface TopbarProps {
  brandName?: string;
  /** Set to false to hide Add New Pack (details page, edit page) */
  showAddButton?: boolean;
  /** When provided, renders the global search bar */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function Topbar({
  brandName,
  showAddButton = true,
  searchValue,
  onSearchChange,
}: TopbarProps) {
  const { isAuthenticated, openModal, setOnAuthSuccess } = useAdminStore();
  const router = useRouter();

  const showSearch = searchValue !== undefined && onSearchChange !== undefined;

  function handleAddNewPack() {
    if (isAuthenticated) {
      router.push("/admin/add");
    } else {
      setOnAuthSuccess(() => () => router.push("/admin/add"));
      openModal();
    }
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-6 h-14 bg-background/95 backdrop-blur border-b border-[#e5e2e1]">
      {/* Left — brand / page name */}
      <div className="shrink-0 min-w-0">
        {brandName && (
          <span className="font-semibold text-base text-[#1c1b1b] truncate">
            {brandName}
          </span>
        )}
      </div>

      {/* Centre — global search bar */}
      {showSearch && (
        <div className="flex-1 flex justify-center px-2">
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 520,
            }}
          >
            {/* Search icon */}
            <Search
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: 14,
                height: 14,
                color: "#9ca3af",
                pointerEvents: "none",
              }}
            />

            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search packs, brands, regions, colors…"
              aria-label="Search packs"
              style={{
                width: "100%",
                height: 36,
                paddingLeft: 36,
                paddingRight: 12,
                borderRadius: 10,
                border: "1.5px solid #e5e2e1",
                backgroundColor: "#ffffff",
                fontSize: 13,
                color: "#1c1b1b",
                outline: "none",
                transition: "border-color 0.15s, box-shadow 0.15s",
                fontFamily: "inherit",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#1c1b1b";
                e.currentTarget.style.boxShadow  = "0 0 0 3px rgba(28,27,27,0.06)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e5e2e1";
                e.currentTarget.style.boxShadow  = "none";
              }}
            />
          </div>
        </div>
      )}

      {/* Right — spacer (when no search) + Add New Pack */}
      {!showSearch && <div className="flex-1" />}

      {showAddButton && (
        <button
          onClick={handleAddNewPack}
          className="flex items-center gap-2 h-9 px-4 bg-[#1c1b1b] text-white text-sm font-medium rounded-lg hover:bg-black transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add New Pack</span>
          <span className="sm:hidden">New</span>
        </button>
      )}
    </header>
  );
}
