"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { PackBadge } from "./PackBadge";
import type { PackListRow } from "@/lib/supabase/queries/packs";

const PackCardViewer = dynamic(
  () =>
    import("@/features/viewer-3d/components/PackCardViewer").then(
      (m) => ({ default: m.PackCardViewer })
    ),
  { ssr: false, loading: () => <div className="w-full h-full bg-[#eeebe7]" /> }
);

interface PackCardProps {
  pack: PackListRow;
}

export function PackCard({ pack }: PackCardProps) {
  const hasGlb = !!pack.glb_drive_id;

  return (
    <article
      className="bg-white rounded-xl border border-[#e5e2e1] overflow-hidden flex flex-col"
      style={{ boxShadow: "0px 4px 20px rgba(0,0,0,0.04)" }}
    >
      {/* ── Preview area ── */}
      <div
        className="relative w-full overflow-hidden bg-[#eeebe7]"
        style={{ aspectRatio: "4 / 3" }}
      >
        {hasGlb ? (
          <div className="absolute inset-0">
            <PackCardViewer glbDriveId={pack.glb_drive_id!} />
          </div>
        ) : pack.thumbnail_url ? (
          <Image
            src={pack.thumbnail_url}
            alt={pack.name}
            fill
            className="object-contain p-8"
            sizes="(max-width: 768px) 100vw, 50vw"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#747878] text-sm">
            No preview
          </div>
        )}

        {/* Format badge */}
        <div className="absolute top-3 left-3 z-10">
          <PackBadge format={pack.format} />
        </div>

        {/* Live 3D indicator */}
        {hasGlb && (
          <div
            className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 pointer-events-none"
            style={{
              backgroundColor: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(4px)",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <span
              className="rounded-full"
              style={{ width: 6, height: 6, backgroundColor: "#22c55e" }}
            />
            Live 3D
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="p-5 flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-[#1c1b1b] leading-snug">
          {pack.name}
        </h2>

        {/* Dimensions */}
        <div
          className="grid grid-cols-3 gap-1 pt-3"
          style={{ borderTop: "1px solid #e5e2e1" }}
        >
          {[
            { label: "HEIGHT", value: pack.height_mm },
            { label: "WIDTH", value: pack.width_mm },
            { label: "DEPTH", value: pack.depth_mm },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: "#747878",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </span>
              <span className="text-sm font-medium text-[#1c1b1b]">
                <span className="font-mono">{value}</span>
                <span style={{ fontSize: 11, color: "#747878", marginLeft: 2 }}>
                  mm
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href={`/packs/${pack.id}`}
          className="block w-full text-center text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
          style={{ backgroundColor: "#1c1b1b" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.backgroundColor =
              "#000")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.backgroundColor =
              "#1c1b1b")
          }
        >
          View More Details
        </Link>
      </div>
    </article>
  );
}
