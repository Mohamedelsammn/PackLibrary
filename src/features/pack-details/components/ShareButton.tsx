"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareButton() {
  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success("Link copied to clipboard");
    });
  }

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleShare}>
      <Share2 className="w-4 h-4" />
      Share
    </Button>
  );
}
