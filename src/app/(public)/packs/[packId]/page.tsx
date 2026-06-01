import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { getPackById } from "@/lib/supabase/queries/packs";
import { AppShell } from "@/components/layout/AppShell";
import { Topbar } from "@/components/layout/Topbar";
import { SpecificationsPanel } from "@/features/pack-details/components/SpecificationsPanel";
import { ShareButton } from "@/features/pack-details/components/ShareButton";
import { EditSpecButton } from "@/features/pack-details/components/EditSpecButton";
import { DielineViewer } from "@/features/dieline/components/DielineViewer";
import { ImageGallery } from "@/features/gallery/components/ImageGallery";
import { ModelViewer } from "@/features/viewer-3d/components/ModelViewer";
import { getDriveGlbUrl, getGlbDownloadUrl, getDielineDownloadUrl } from "@/lib/utils";
import type { PackDetails } from "@/features/packs/types";
import type { PackWithImages } from "@/lib/supabase/types";

interface PageProps {
  params: Promise<{ packId: string }>;
}

function mapToPackDetails(data: PackWithImages): PackDetails {
  return {
    id: data.id,
    brand_id: data.brand_id,
    name: data.name,
    internal_name: data.internal_name,
    slug: data.slug,
    format: data.format,
    material: data.material,
    description: data.description,
    height_mm: data.height_mm,
    width_mm: data.width_mm,
    depth_mm: data.depth_mm,
    thumbnail_url: data.thumbnail_url,
    glb_drive_id: data.glb_drive_id,
    glb_url: data.glb_url,
    dieline_drive_id: data.dieline_drive_id,
    dieline_url: data.dieline_url,
    brand: data.brands,
    images: data.pack_images.sort((a, b) => a.sort_order - b.sort_order),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { packId } = await params;
  const data = await getPackById(packId);
  if (!data) return {};
  return {
    title: `${data.name} — ${data.brands.name}`,
    description: data.description ?? `${data.name} packaging specifications`,
    openGraph: data.thumbnail_url ? { images: [data.thumbnail_url] } : undefined,
  };
}

export const revalidate = 600;

export default async function PackDetailsPage({ params }: PageProps) {
  const { packId } = await params;
  const data = await getPackById(packId);
  if (!data) notFound();

  const pack = mapToPackDetails(data);
  const glbUrl = pack.glb_drive_id ? getDriveGlbUrl(pack.glb_drive_id) : null;
  const glbDownloadUrl = pack.glb_drive_id
    ? getGlbDownloadUrl(pack.glb_drive_id, pack.name)
    : null;
  const dielineDownloadUrl =
    pack.dieline_drive_id && pack.dieline_url
      ? getDielineDownloadUrl(
          pack.dieline_drive_id,
          pack.name,
          pack.dieline_url.toLowerCase().includes(".pdf") ? "pdf" : "svg"
        )
      : null;

  return (
    <AppShell activeBrandSlug={pack.brand.slug}>
      {/* Hide "Add New Pack" on the details page */}
      <Topbar brandName={pack.brand.name} showAddButton={false} />

      <div className="px-6 py-6 max-w-[1440px] mx-auto w-full">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href={`/brands/${pack.brand.slug}`}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors shrink-0"
              aria-label="Back to brand"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <p className="text-label-md text-muted-foreground">
                {pack.brand.name.toUpperCase()}
              </p>
              <h1 className="text-headline-lg text-foreground truncate">
                {pack.name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ShareButton />
            <EditSpecButton packId={pack.id} />
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* ── Left column ── */}
          <div className="space-y-6">

            {/* ── 3D Assets section ── */}
            {glbUrl && (
              <section>
                <SectionHeading>3D Assets</SectionHeading>
                <ModelViewer glbUrl={glbUrl} packName={pack.name} />
                {glbDownloadUrl && (
                  <div className="mt-3 flex">
                    <a
                      href={glbDownloadUrl}
                      download
                      className="inline-flex items-center gap-2 h-9 px-4 bg-[#1c1b1b] text-white text-sm font-medium rounded-lg hover:bg-black transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download GLB
                    </a>
                  </div>
                )}
              </section>
            )}

            {/* ── 2D Assets section ── */}
            {pack.images.length > 0 && (
              <section>
                <SectionHeading>2D Assets</SectionHeading>
                <ImageGallery images={pack.images} packName={pack.name} />
              </section>
            )}

            {/* No assets at all */}
            {!glbUrl && pack.images.length === 0 && (
              <div
                style={{
                  width: "100%",
                  height: 320,
                  borderRadius: 16,
                  backgroundColor: "#f5f3f1",
                  border: "1px solid #e5e2e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#a0a0a0",
                  fontSize: 14,
                }}
              >
                No preview available
              </div>
            )}
          </div>

          {/* ── Right column ── */}
          <div className="space-y-4">
            <SpecificationsPanel pack={pack} />

            {pack.dieline_url && (
              <DielineViewer
                dielineUrl={pack.dieline_url}
                driveId={pack.dieline_drive_id}
                downloadUrl={dielineDownloadUrl ?? undefined}
              />
            )}

            {/* Quick download list */}
            {(glbDownloadUrl || dielineDownloadUrl) && (
              <div className="bg-card rounded-xl border border-border p-5 space-y-3">
                <h3 className="font-semibold text-sm text-foreground">
                  Asset Downloads
                </h3>
                <div className="space-y-2">
                  {glbDownloadUrl && (
                    <DownloadRow
                      label="3D Model"
                      sub="GLB file"
                      href={glbDownloadUrl}
                    />
                  )}
                  {dielineDownloadUrl && (
                    <DownloadRow
                      label="Technical Dieline"
                      sub="PDF / SVG blueprint"
                      href={dielineDownloadUrl}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: "#747878",
        marginBottom: 12,
      }}
    >
      {children}
    </h2>
  );
}

function DownloadRow({
  label,
  sub,
  href,
}: {
  label: string;
  sub: string;
  href: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 12px",
        borderRadius: 10,
        backgroundColor: "rgba(0,0,0,0.03)",
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: "#1c1b1b" }}>{label}</p>
        <p style={{ fontSize: 11, color: "#747878" }}>{sub}</p>
      </div>
      <a
        href={href}
        download
        aria-label={`Download ${label}`}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: "1px solid #e5e2e1",
          backgroundColor: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#1c1b1b",
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        <Download style={{ width: 14, height: 14 }} />
      </a>
    </div>
  );
}
