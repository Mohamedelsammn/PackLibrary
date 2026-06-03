"use client";

import { useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { REGIONS, COLORS, PACK_SIZES } from "../constants";
import type { BrandRow } from "@/lib/supabase/types";

interface FilterBarProps {
  /** When provided, renders the Brand dropdown */
  brands?: Pick<BrandRow, "slug" | "name">[];
  /** Active filter values (controlled by URL params) */
  activeFilters: {
    brand?: string;
    region?: string;
    color?: string;
    size?: string;
  };
  /** Base path for URL updates — defaults to "/" */
  basePath?: string;
}

export function FilterBar({ brands, activeFilters, basePath = "/" }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(`${basePath}${qs ? `?${qs}` : ""}`, { scroll: false });
      });
    },
    [router, searchParams, basePath]
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.replace(basePath, { scroll: false });
    });
  }, [router, basePath]);

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        padding: "12px 24px",
        borderBottom: "1px solid #e5e2e1",
        backgroundColor: "#fdf8f8",
        position: "sticky",
        top: 56, // below the 56px topbar
        zIndex: 20,
      }}
    >
      {/* Brand filter — only when brands are provided */}
      {brands && brands.length > 0 && (
        <FilterDropdown
          label="Brand"
          value={activeFilters.brand ?? ""}
          options={brands.map((b) => ({ value: b.slug, label: b.name }))}
          onChange={(v) => updateFilter("brand", v)}
          isPending={isPending}
        />
      )}

      <FilterDropdown
        label="Region"
        value={activeFilters.region ?? ""}
        options={REGIONS.map((r) => ({ value: r, label: r }))}
        onChange={(v) => updateFilter("region", v)}
        isPending={isPending}
      />

      <FilterDropdown
        label="Color"
        value={activeFilters.color ?? ""}
        options={COLORS.map((c) => ({ value: c, label: c }))}
        onChange={(v) => updateFilter("color", v)}
        isPending={isPending}
      />

      <FilterDropdown
        label="Size"
        value={activeFilters.size ?? ""}
        options={PACK_SIZES.map((s) => ({ value: s, label: s }))}
        onChange={(v) => updateFilter("size", v)}
        isPending={isPending}
      />

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            height: 34,
            paddingLeft: 12,
            paddingRight: 12,
            borderRadius: 8,
            border: "1px solid #e5e2e1",
            backgroundColor: "transparent",
            color: "#747878",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f5f3f1";
            e.currentTarget.style.color = "#1c1b1b";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#747878";
          }}
        >
          <X style={{ width: 12, height: 12 }} />
          Clear all
        </button>
      )}

      {isPending && (
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "#747878",
            fontStyle: "italic",
          }}
        >
          Filtering…
        </span>
      )}
    </div>
  );
}

// ── Reusable single dropdown ──────────────────────────────────────────────────

interface DropdownOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string | null) => void;
  isPending: boolean;
}

function FilterDropdown({ label, value, options, onChange, isPending }: FilterDropdownProps) {
  const isActive = !!value;

  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={isPending}
        aria-label={`Filter by ${label}`}
        style={{
          appearance: "none",
          height: 34,
          paddingLeft: 12,
          paddingRight: 30,
          borderRadius: 8,
          border: `1.5px solid ${isActive ? "#1c1b1b" : "#e5e2e1"}`,
          backgroundColor: isActive ? "#1c1b1b" : "#ffffff",
          color: isActive ? "#ffffff" : "#1c1b1b",
          fontSize: 12,
          fontWeight: 500,
          cursor: isPending ? "wait" : "pointer",
          outline: "none",
          transition: "all 0.15s",
          fontFamily: "inherit",
          minWidth: 90,
        }}
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Custom chevron icon */}
      <div
        style={{
          position: "absolute",
          right: 9,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: isActive ? "rgba(255,255,255,0.8)" : "#747878",
          display: "flex",
        }}
      >
        <ChevronDown style={{ width: 13, height: 13 }} />
      </div>
    </div>
  );
}
