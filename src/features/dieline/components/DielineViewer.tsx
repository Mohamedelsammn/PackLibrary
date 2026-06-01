"use client";

import { useState } from "react";
import Image from "next/image";
import { Maximize2, X, Download } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

interface DielineViewerProps {
  dielineUrl: string;
  driveId?: string | null;
  /** Proxied download URL that returns a proper filename (optional override) */
  downloadUrl?: string;
}

export function DielineViewer({ dielineUrl, driveId, downloadUrl }: DielineViewerProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const isPdf =
    dielineUrl.toLowerCase().includes(".pdf") ||
    dielineUrl.includes("application/pdf") ||
    dielineUrl.includes("export=download");

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">
            Technical Dieline
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            onClick={() => setFullscreen(true)}
            aria-label="Expand dieline"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Preview */}
        <div
          className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted cursor-pointer border border-border/50"
          onClick={() => setFullscreen(true)}
        >
          {isPdf ? (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-1">
                <div className="text-2xl">📐</div>
                <p className="text-xs">PDF Dieline</p>
                <p className="text-xs text-muted-foreground/60">
                  Click to expand
                </p>
              </div>
            </div>
          ) : (
            <Image
              src={dielineUrl}
              alt="Technical dieline"
              fill
              className="object-contain p-3"
              sizes="300px"
              loading="lazy"
            />
          )}
        </div>
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-white font-medium">Technical Dieline</h2>
            <div className="flex gap-2">
              {(downloadUrl ?? driveId) && (
                <a
                  href={downloadUrl ?? `https://drive.google.com/uc?export=download&id=${driveId}`}
                  download
                  className={
                    buttonVariants({ variant: "outline", size: "sm" }) +
                    " gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  }
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => setFullscreen(false)}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto px-6 pb-6">
            {isPdf ? (
              <iframe
                src={`${dielineUrl}#view=FitH`}
                className="w-full h-full rounded-lg"
                title="PDF Dieline"
              />
            ) : (
              <div className="relative w-full h-full">
                <Image
                  src={dielineUrl}
                  alt="Technical dieline"
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
