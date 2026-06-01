"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useAdminStore } from "@/features/admin/store";

interface TopbarProps {
  brandName?: string;
  /** Set to false to hide the Add New Pack button (details page, edit page) */
  showAddButton?: boolean;
}

export function Topbar({ brandName, showAddButton = true }: TopbarProps) {
  const { isAuthenticated, openModal, setOnAuthSuccess } = useAdminStore();
  const router = useRouter();

  function handleAddNewPack() {
    if (isAuthenticated) {
      router.push("/admin/add");
    } else {
      setOnAuthSuccess(() => () => router.push("/admin/add"));
      openModal();
    }
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 h-14 bg-background/95 backdrop-blur border-b border-[#e5e2e1]">
      {/* Left — brand name */}
      <div className="flex items-center gap-3 min-w-0">
        {brandName && (
          <span className="font-semibold text-base text-[#1c1b1b] truncate">
            {brandName}
          </span>
        )}
      </div>

      {/* Right — CTA (hidden on detail/edit pages) */}
      {showAddButton && (
        <button
          onClick={handleAddNewPack}
          className="flex items-center gap-2 h-9 px-4 bg-[#1c1b1b] text-white text-sm font-medium rounded-lg hover:bg-black transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add New Pack
        </button>
      )}
    </header>
  );
}
