"use client";

import { useRouter, useParams } from "next/navigation";
import { GitCompare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompareStore } from "../store";

export function CompareBar() {
  const { selectedIds, clear } = useCompareStore();
  const router = useRouter();
  const params = useParams();
  const brandSlug = (params?.brandSlug as string) ?? "";

  if (selectedIds.length === 0) return null;

  function handleCompare() {
    if (selectedIds.length < 2) return;
    router.push(
      `/brands/${brandSlug}/compare?a=${selectedIds[0]}&b=${selectedIds[1]}`
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-foreground text-background rounded-full px-5 py-3 shadow-lg">
      <GitCompare className="w-4 h-4" />
      <span className="text-sm font-medium">
        {selectedIds.length === 1
          ? "Select 1 more pack to compare"
          : "2 packs selected"}
      </span>
      {selectedIds.length === 2 && (
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full h-7 px-3 bg-background text-foreground hover:bg-background/90"
          onClick={handleCompare}
        >
          Compare
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="w-6 h-6 rounded-full text-background/70 hover:text-background hover:bg-white/10"
        onClick={clear}
        aria-label="Clear comparison"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
