"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Upload, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadState {
  status: "idle" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

interface FileDropzoneProps {
  accept: Record<string, string[]>;
  maxSize: number;
  value?: File | null;
  onChange: (file: File | null) => void;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  error?: string;
  /** Upload progress state from the parent form */
  uploadState?: UploadState;
  /** Show compact inline row style instead of large drop zone */
  compact?: boolean;
}

export function FileDropzone({
  accept,
  maxSize,
  value,
  onChange,
  label,
  sublabel,
  icon,
  error,
  uploadState,
  compact = false,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (files: File[]) => {
      if (files[0]) onChange(files[0]);
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept,
      maxSize,
      multiple: false,
    });

  const rejectionMessage = fileRejections[0]?.errors[0]?.message;
  const displayError = error ?? rejectionMessage;

  const isUploading = uploadState?.status === "uploading";
  const isDone      = uploadState?.status === "done";
  const isError     = uploadState?.status === "error";

  if (compact) {
    return (
      <div className="space-y-1">
        <div
          {...getRootProps()}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer",
            "hover:border-foreground/30 hover:bg-muted/50 transition-all",
            isDragActive   && "border-foreground bg-muted",
            isUploading    && "opacity-70 pointer-events-none",
            displayError   && "border-destructive"
          )}
        >
          <input {...getInputProps()} />
          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            {isDone ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : value ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              icon ?? <Upload className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {value ? value.name : label}
            </p>
            <p className="text-xs text-muted-foreground">
              {isUploading
                ? `Uploading… ${uploadState.progress}%`
                : isError
                ? uploadState.error ?? "Upload failed"
                : value
                ? `${(value.size / 1024).toFixed(0)} KB`
                : sublabel}
            </p>
          </div>
          {value && !isUploading && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-6 h-6 shrink-0"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        {/* Progress bar */}
        {isUploading && (
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-200"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center gap-3 p-8 rounded-xl",
          "border-2 border-dashed border-border cursor-pointer",
          "hover:border-foreground/40 hover:bg-muted/30 transition-all",
          isDragActive  && "border-foreground bg-muted/50",
          value         && "border-green-500/40 bg-green-50/50",
          isUploading   && "opacity-70 pointer-events-none",
          displayError  && "border-destructive"
        )}
      >
        <input {...getInputProps()} />
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
          {isDone || value ? (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          ) : (
            icon ?? <Upload className="w-6 h-6" />
          )}
        </div>
        <div className="text-center">
          <p className="font-medium text-sm text-foreground">
            {value ? value.name : label}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isUploading
              ? `Uploading… ${uploadState?.progress ?? 0}%`
              : isError
              ? uploadState?.error ?? "Upload failed"
              : value
              ? `${(value.size / 1024 / 1024).toFixed(2)} MB`
              : isDragActive
              ? "Drop the file here"
              : sublabel}
          </p>
        </div>
        {!value && !isUploading && (
          <Button type="button" variant="outline" size="sm">Browse Files</Button>
        )}
        {value && !isUploading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
          >
            Remove
          </Button>
        )}
      </div>

      {/* Progress bar (large variant) */}
      {isUploading && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-foreground transition-all duration-200"
            style={{ width: `${uploadState?.progress ?? 0}%` }}
          />
        </div>
      )}

      {displayError && (
        <p className="text-xs text-destructive mt-1 px-1">{displayError}</p>
      )}
    </div>
  );
}
