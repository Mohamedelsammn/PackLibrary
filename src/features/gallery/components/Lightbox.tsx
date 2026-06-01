"use client";

import { useEffect, useCallback, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PackImage } from "@/features/packs/types";

interface LightboxProps {
  images: PackImage[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  packName: string;
}

export function Lightbox({
  images,
  initialIndex,
  isOpen,
  onClose,
  packName,
}: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, prev, next]);

  if (!isOpen) return null;

  const current = images[index];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-muted">
          <Image
            src={current.url}
            alt={`${packName} — ${current.label ?? `view ${index + 1}`}`}
            fill
            className="object-contain p-8"
            sizes="90vw"
          />
        </div>

        {current.label && (
          <p className="text-center text-sm text-white/70 mt-3">{current.label}</p>
        )}

        {/* Controls */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 text-white hover:bg-white/10"
          onClick={onClose}
          aria-label="Close lightbox"
        >
          <X className="w-5 h-5" />
        </Button>

        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
              onClick={prev}
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
              onClick={next}
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
