import { Download, Box, FileText, Images } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getDriveGlbUrl } from "@/lib/utils";
import type { PackDetails } from "@/features/packs/types";

interface TechnicalAssetsProps {
  pack: PackDetails;
}

export function TechnicalAssets({ pack }: TechnicalAssetsProps) {
  const assets = [
    {
      key: "glb",
      icon: Box,
      label: "GLB Model",
      sublabel: "3D Asset",
      href: pack.glb_drive_id ? getDriveGlbUrl(pack.glb_drive_id) : null,
    },
    {
      key: "dieline",
      icon: FileText,
      label: "PDF Blueprint",
      sublabel: "Vector Dieline",
      href: pack.dieline_url,
    },
    {
      key: "images",
      icon: Images,
      label: "Reference Images",
      sublabel: "ZIP Archive",
      href:
        pack.images.length > 0
          ? `https://drive.google.com/uc?export=download&id=${pack.images[0].drive_id}`
          : null,
    },
  ].filter((a) => a.href);

  if (assets.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3">
      <h3 className="font-semibold text-sm text-foreground">Technical Assets</h3>
      <div className="space-y-2">
        {assets.map(({ key, icon: Icon, label, sublabel, href }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-muted/50 border border-border/50"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{label}</p>
                <p className="text-xs text-muted-foreground">{sublabel}</p>
              </div>
            </div>
            <a
              href={href!}
              download
              aria-label={`Download ${label}`}
              className={buttonVariants({ variant: "ghost", size: "icon" }) + " w-7 h-7 shrink-0"}
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
