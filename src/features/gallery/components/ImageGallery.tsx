"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Maximize2, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { PackImage } from "@/features/packs/types";

interface ImageGalleryProps {
  images: PackImage[];
  packName: string;
}

export function ImageGallery({ images, packName }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const closeLightbox = () => setLightboxIndex(null);
  const prev = () =>
    setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
  const next = () =>
    setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length));

  // Determine grid columns: 1 image = full width, 2 = two cols, 3+ = three cols
  const cols = images.length === 1 ? 1 : images.length === 2 ? 2 : 3;

  return (
    <>
      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 12,
        }}
      >
        {images.map((img, i) => (
          <AssetCard
            key={img.id}
            img={img}
            packName={packName}
            index={i}
            onFullscreen={() => setLightboxIndex(i)}
          />
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          packName={packName}
          onClose={closeLightbox}
          onPrev={images.length > 1 ? prev : undefined}
          onNext={images.length > 1 ? next : undefined}
        />
      )}
    </>
  );
}

// ── Single image card ─────────────────────────────────────────────────────────
function AssetCard({
  img,
  packName,
  index,
  onFullscreen,
}: {
  img: PackImage;
  packName: string;
  index: number;
  onFullscreen: () => void;
}) {
  const downloadUrl = `/api/download/${img.drive_id}?name=${encodeURIComponent(img.label ?? `${packName}-view-${index + 1}`)}.jpg`;

  return (
    <div
      style={{
        backgroundColor: "#f5f3f1",
        borderRadius: 12,
        border: "1px solid #e5e2e1",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Image area — fixed 4:3 aspect ratio */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4/3",
          backgroundColor: "#eeebe7",
        }}
      >
        <Image
          src={img.url}
          alt={img.label ?? `${packName} view ${index + 1}`}
          fill
          className="object-contain"
          style={{ padding: 16 }}
          sizes="(max-width: 768px) 100vw, 33vw"
          loading="lazy"
        />
      </div>

      {/* Footer row: label + actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderTop: "1px solid #e5e2e1",
          backgroundColor: "#ffffff",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#1c1b1b",
            letterSpacing: "0.02em",
          }}
        >
          {img.label ?? `View ${index + 1}`}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <a
            href={downloadUrl}
            download
            aria-label={`Download ${img.label ?? "image"}`}
            style={iconBtnStyle}
            title="Download"
          >
            <Download style={{ width: 14, height: 14 }} />
          </a>
          <button
            onClick={onFullscreen}
            aria-label="View fullscreen"
            style={iconBtnStyle}
            title="Fullscreen"
          >
            <Maximize2 style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "1px solid #e5e2e1",
  backgroundColor: "#f5f3f1",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#1c1b1b",
  textDecoration: "none",
};

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({
  images,
  index,
  packName,
  onClose,
  onPrev,
  onNext,
}: {
  images: PackImage[];
  index: number;
  packName: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const img = images[index];
  const downloadUrl = `/api/download/${img.drive_id}?name=${encodeURIComponent(img.label ?? `${packName}-view-${index + 1}`)}.jpg`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "rgba(0,0,0,0.92)",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={onClose}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
          {img.label ?? `${packName} — View ${index + 1}`}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href={downloadUrl}
            download
            style={{
              ...lightboxBtnStyle,
              textDecoration: "none",
              fontSize: 13,
              gap: 6,
              paddingLeft: 12,
              paddingRight: 12,
              display: "flex",
              alignItems: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Download style={{ width: 14, height: 14 }} />
            Download
          </a>
          <button onClick={onClose} style={lightboxBtnStyle} aria-label="Close">
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>

      {/* Image + navigation */}
      <div
        style={{ flex: 1, position: "relative", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={img.url}
          alt={img.label ?? `${packName} view ${index + 1}`}
          fill
          className="object-contain"
          style={{ padding: 24 }}
          sizes="100vw"
          priority
        />

        {onPrev && (
          <button
            onClick={onPrev}
            aria-label="Previous"
            style={{ ...navBtnStyle, left: 16 }}
          >
            <ChevronLeft style={{ width: 24, height: 24 }} />
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            aria-label="Next"
            style={{ ...navBtnStyle, right: 16 }}
          >
            <ChevronRight style={{ width: 24, height: 24 }} />
          </button>
        )}
      </div>

      {/* Counter */}
      {images.length > 1 && (
        <div
          style={{
            textAlign: "center",
            padding: "12px 0",
            color: "rgba(255,255,255,0.6)",
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

const lightboxBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.2)",
  backgroundColor: "rgba(255,255,255,0.1)",
  color: "#fff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const navBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: 44,
  height: 44,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.2)",
  backgroundColor: "rgba(0,0,0,0.5)",
  color: "#fff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
