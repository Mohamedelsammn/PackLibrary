"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DeletePackButtonProps {
  packId: string;
  packName: string;
  brandSlug: string;
}

type Step = "idle" | "confirming" | "deleting";

export function DeletePackButton({ packId, packName, brandSlug }: DeletePackButtonProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [confirmText, setConfirmText] = useState("");

  const openModal  = useCallback(() => { setConfirmText(""); setStep("confirming"); }, []);
  const closeModal = useCallback(() => { setConfirmText(""); setStep("idle"); }, []);

  const handleDelete = useCallback(async () => {
    setStep("deleting");

    try {
      const res = await fetch(`/api/packs/${packId}`, { method: "DELETE" });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `Server error ${res.status}`);
      }

      toast.success(`"${packName}" deleted successfully`);
      // Redirect home — brand page ISR will revalidate in the background
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed — please try again");
      setStep("confirming"); // return to confirmation so user can retry
    }
  }, [packId, packName, router]);

  const canConfirm = confirmText.trim().toLowerCase() === packName.trim().toLowerCase();

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={openModal}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 36,
          paddingLeft: 14,
          paddingRight: 14,
          borderRadius: 8,
          border: "1px solid #fca5a5",
          backgroundColor: "#fff5f5",
          color: "#dc2626",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          transition: "background-color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fee2e2")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fff5f5")}
      >
        <Trash2 style={{ width: 14, height: 14 }} />
        Delete Pack
      </button>

      {/* Modal overlay */}
      {(step === "confirming" || step === "deleting") && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            backgroundColor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && step !== "deleting") closeModal();
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 32,
              maxWidth: 460,
              width: "100%",
              boxShadow: "0 24px 64px rgba(0,0,0,0.16)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <AlertTriangle style={{ width: 24, height: 24, color: "#dc2626" }} />
            </div>

            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#1c1b1b",
                marginBottom: 8,
              }}
            >
              Delete pack permanently?
            </h2>

            <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, marginBottom: 20 }}>
              This will permanently remove{" "}
              <strong style={{ color: "#1c1b1b" }}>{packName}</strong> and{" "}
              <strong>all associated assets</strong> from both the database and
              Google Drive. This action cannot be undone.
            </p>

            {/* What gets deleted */}
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 24,
                fontSize: 13,
                color: "#991b1b",
                lineHeight: 1.7,
              }}
            >
              <strong>Will be permanently deleted:</strong>
              <ul style={{ paddingLeft: 18, marginTop: 4 }}>
                <li>Pack record and all specifications</li>
                <li>All 2D assets (images, artwork, dielines)</li>
                <li>3D model (GLB / GLTF file)</li>
                <li>Google Drive files and folder</li>
              </ul>
            </div>

            {/* Confirmation input */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Type the pack name to confirm:{" "}
                <span style={{ color: "#dc2626", fontFamily: "monospace" }}>
                  {packName}
                </span>
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={step === "deleting"}
                placeholder={packName}
                autoFocus
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: `1.5px solid ${canConfirm ? "#dc2626" : "#e5e7eb"}`,
                  fontSize: 14,
                  outline: "none",
                  backgroundColor: step === "deleting" ? "#f9fafb" : "#fff",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={closeModal}
                disabled={step === "deleting"}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#fff",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: step === "deleting" ? "default" : "pointer",
                  opacity: step === "deleting" ? 0.5 : 1,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={!canConfirm || step === "deleting"}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 8,
                  border: "none",
                  backgroundColor:
                    !canConfirm || step === "deleting" ? "#fca5a5" : "#dc2626",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor:
                    !canConfirm || step === "deleting" ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "background-color 0.15s",
                }}
              >
                {step === "deleting" ? (
                  <>
                    <Loader2
                      style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }}
                    />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 style={{ width: 14, height: 14 }} />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        </div>
      )}
    </>
  );
}
