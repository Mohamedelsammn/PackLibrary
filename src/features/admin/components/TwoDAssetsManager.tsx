"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, CheckCircle2, X, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Asset2DEntry {
  /** Client-side only — stable list key */
  tempId: string;
  /** Set for assets that already exist in the database */
  existingId?: string;
  name: string;
  /** New file picked by the user (null if existing) */
  file: File | null;
  /** Existing asset URL (for preview when editing) */
  existingUrl?: string;
  /** Existing Drive ID (used for deletion if needed) */
  existingDriveId?: string;
  /** Whether the user has flagged this existing asset for deletion */
  markedForDeletion: boolean;
  uploadProgress: number;
  uploadStatus: "idle" | "uploading" | "done" | "error";
}

export interface TwoDAssetsManagerProps {
  assets: Asset2DEntry[];
  onChange: (assets: Asset2DEntry[]) => void;
  /** If true, existing assets show delete controls */
  allowDeleteExisting?: boolean;
}

let _nextTempId = 1;
export function newAssetEntry(partial?: Partial<Asset2DEntry>): Asset2DEntry {
  return {
    tempId: `a${_nextTempId++}`,
    name: "",
    file: null,
    markedForDeletion: false,
    uploadProgress: 0,
    uploadStatus: "idle",
    ...partial,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TwoDAssetsManager({ assets, onChange, allowDeleteExisting = true }: TwoDAssetsManagerProps) {
  const addEntry = useCallback(() => {
    onChange([...assets, newAssetEntry()]);
  }, [assets, onChange]);

  const remove = useCallback(
    (tempId: string) => {
      onChange(
        assets.map((a) =>
          a.tempId === tempId
            ? a.existingId
              ? { ...a, markedForDeletion: true } // soft-mark for existing
              : null                               // drop new entry entirely
            : a
        ).filter(Boolean) as Asset2DEntry[]
      );
    },
    [assets, onChange]
  );

  const undoDelete = useCallback(
    (tempId: string) => {
      onChange(assets.map((a) => a.tempId === tempId ? { ...a, markedForDeletion: false } : a));
    },
    [assets, onChange]
  );

  const update = useCallback(
    (tempId: string, patch: Partial<Asset2DEntry>) => {
      onChange(assets.map((a) => a.tempId === tempId ? { ...a, ...patch } : a));
    },
    [assets, onChange]
  );

  const moveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const next = [...assets];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      onChange(next);
    },
    [assets, onChange]
  );

  const moveDown = useCallback(
    (index: number) => {
      if (index === assets.length - 1) return;
      const next = [...assets];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      onChange(next);
    },
    [assets, onChange]
  );

  const visible = assets.filter((a) => !a.markedForDeletion);
  const deleted = assets.filter((a) => a.markedForDeletion);

  return (
    <div className="space-y-3">
      {/* Asset list */}
      {visible.map((asset, idx) => (
        <AssetRow
          key={asset.tempId}
          asset={asset}
          index={idx}
          total={visible.length}
          onUpdate={(patch) => update(asset.tempId, patch)}
          onRemove={() => remove(asset.tempId)}
          onMoveUp={() => moveUp(assets.indexOf(asset))}
          onMoveDown={() => moveDown(assets.indexOf(asset))}
          allowDeleteExisting={allowDeleteExisting}
        />
      ))}

      {/* Tombstoned (pending delete) */}
      {deleted.map((asset) => (
        <div
          key={asset.tempId}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1.5px dashed #fca5a5",
            backgroundColor: "#fff5f5",
            opacity: 0.8,
          }}
        >
          <span style={{ fontSize: 12, color: "#dc2626", flex: 1 }}>
            "{asset.name || "Untitled"}" will be deleted on save
          </span>
          <button
            type="button"
            onClick={() => undoDelete(asset.tempId)}
            style={{
              fontSize: 12,
              color: "#1c1b1b",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Undo
          </button>
        </div>
      ))}

      {/* Add button */}
      <button
        type="button"
        onClick={addEntry}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          height: 44,
          borderRadius: 10,
          border: "1.5px dashed #e5e2e1",
          backgroundColor: "transparent",
          color: "#747878",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#1c1b1b";
          e.currentTarget.style.color = "#1c1b1b";
          e.currentTarget.style.backgroundColor = "#f5f3f1";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#e5e2e1";
          e.currentTarget.style.color = "#747878";
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <Plus style={{ width: 15, height: 15 }} />
        Add 2D Asset
      </button>
    </div>
  );
}

// ── Single asset row ──────────────────────────────────────────────────────────

interface AssetRowProps {
  asset: Asset2DEntry;
  index: number;
  total: number;
  onUpdate: (patch: Partial<Asset2DEntry>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  allowDeleteExisting: boolean;
}

function AssetRow({ asset, index, total, onUpdate, onRemove, onMoveUp, onMoveDown, allowDeleteExisting }: AssetRowProps) {
  const previewUrl = asset.existingUrl ?? (asset.file ? URL.createObjectURL(asset.file) : null);
  const isUploading = asset.uploadStatus === "uploading";
  const isDone = asset.uploadStatus === "done";

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/png":  [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    disabled: isUploading || !!asset.existingUrl,
    onDrop: ([file]) => {
      if (file) onUpdate({ file, existingUrl: undefined });
    },
  });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "28px 1fr 120px 60px",
        gap: 10,
        alignItems: "center",
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #e5e2e1",
        backgroundColor: "#fff",
      }}
    >
      {/* Order controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label="Move up"
          style={orderBtnStyle(index === 0)}
        >
          <ArrowUp style={{ width: 11, height: 11 }} />
        </button>
        <span
          style={{
            textAlign: "center",
            fontSize: 10,
            color: "#b0b0b0",
            lineHeight: 1,
            paddingTop: 1,
          }}
        >
          {index + 1}
        </span>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label="Move down"
          style={orderBtnStyle(index === total - 1)}
        >
          <ArrowDown style={{ width: 11, height: 11 }} />
        </button>
      </div>

      {/* Name input */}
      <input
        type="text"
        placeholder="Asset name (e.g. Front View)"
        value={asset.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        style={{
          height: 36,
          paddingLeft: 10,
          paddingRight: 10,
          borderRadius: 8,
          border: "1px solid #e5e2e1",
          fontSize: 13,
          outline: "none",
          backgroundColor: "#fff",
          width: "100%",
          boxSizing: "border-box",
        }}
      />

      {/* Image dropzone / preview */}
      <div
        {...(asset.existingUrl ? {} : getRootProps())}
        style={{
          position: "relative",
          width: 120,
          height: 80,
          borderRadius: 8,
          border: `1.5px ${isDragActive ? "solid #1c1b1b" : "dashed #e5e2e1"}`,
          backgroundColor: isDragActive ? "#f5f3f1" : "#fafafa",
          overflow: "hidden",
          cursor: asset.existingUrl ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {!asset.existingUrl && <input {...getInputProps()} />}

        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={asset.name || "asset preview"}
            fill
            className="object-contain"
            style={{ padding: 6 }}
            sizes="120px"
            unoptimized={asset.file !== null} // blob URLs skip optimizer
          />
        ) : isUploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <Loader2 style={{ width: 16, height: 16, color: "#747878", animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 10, color: "#747878" }}>{asset.uploadProgress}%</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : isDone ? (
          <CheckCircle2 style={{ width: 20, height: 20, color: "#22c55e" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <Upload style={{ width: 14, height: 14, color: "#b0b0b0" }} />
            <span style={{ fontSize: 10, color: "#b0b0b0", textAlign: "center" }}>
              {isDragActive ? "Drop" : "Image"}
            </span>
          </div>
        )}

        {/* Progress bar overlay */}
        {isUploading && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: `${asset.uploadProgress}%`,
              height: 3,
              backgroundColor: "#1c1b1b",
              transition: "width 0.2s",
            }}
          />
        )}

        {/* Clear new file */}
        {asset.file && !isUploading && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUpdate({ file: null }); }}
            aria-label="Remove image"
            style={{
              position: "absolute",
              top: 3,
              right: 3,
              width: 18,
              height: 18,
              borderRadius: 4,
              border: "none",
              backgroundColor: "rgba(0,0,0,0.5)",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <X style={{ width: 10, height: 10 }} />
          </button>
        )}
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={onRemove}
        disabled={!allowDeleteExisting && !!asset.existingId}
        aria-label="Remove asset"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: "1px solid #fca5a5",
          backgroundColor: "#fff5f5",
          color: "#dc2626",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          opacity: !allowDeleteExisting && !!asset.existingId ? 0.4 : 1,
          transition: "background-color 0.15s",
        }}
        onMouseEnter={(e) => { if (!(!allowDeleteExisting && asset.existingId)) e.currentTarget.style.backgroundColor = "#fee2e2"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff5f5"; }}
      >
        <Trash2 style={{ width: 13, height: 13 }} />
      </button>
    </div>
  );
}

function orderBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: 5,
    border: "1px solid #e5e2e1",
    backgroundColor: disabled ? "#f9f9f9" : "#fff",
    color: disabled ? "#d0d0d0" : "#747878",
    cursor: disabled ? "default" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  };
}
