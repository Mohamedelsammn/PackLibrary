"use client";

import { useState, useRef, useEffect } from "react";
import { Lock, KeyRound, ArrowRight } from "lucide-react";
import { useAdminStore } from "../store";

export function AdminPasswordModal() {
  const { showModal, closeModal, setAuthenticated, onAuthSuccess } =
    useAdminStore();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showModal) {
      setPassword("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showModal]);

  useEffect(() => {
    if (!showModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal, closeModal]);

  async function handleSubmit() {
    if (!password.trim()) {
      setError("Please enter a password");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAuthenticated(true);
        closeModal();
        onAuthSuccess?.();
      } else if (res.status === 429) {
        setError(
          `Too many attempts. Try again in ${data.retryAfterMinutes ?? 15} minutes.`
        );
        setAttemptsLeft(0);
      } else {
        const remaining = data.attemptsLeft ?? attemptsLeft - 1;
        setAttemptsLeft(remaining);
        setError(
          `Incorrect password. ${remaining > 0 ? `${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.` : "Account locked."}`
        );
        setPassword("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!showModal) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={closeModal}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />

      {/* Modal box — explicit pixel values, no Tailwind radius tokens */}
      <div
        style={{
          position: "relative",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.18)",
          width: "100%",
          maxWidth: "440px",
          padding: "40px 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: "#f1edec",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Lock style={{ width: 24, height: 24, color: "#1c1b1b" }} />
        </div>

        {/* Title + subtitle */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
          <h2
            id="admin-modal-title"
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              color: "#1c1b1b",
              margin: 0,
            }}
          >
            Admin Access Required
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#747878", margin: 0 }}>
            Enter your password to add or edit packaging assets.
          </p>
        </div>

        {/* Password field */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ position: "relative" }}>
            <KeyRound
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                width: 16,
                height: 16,
                color: "#747878",
                pointerEvents: "none",
              }}
            />
            <input
              ref={inputRef}
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              disabled={isLoading || attemptsLeft === 0}
              aria-label="Admin password"
              style={{
                width: "100%",
                height: 44,
                paddingLeft: 42,
                paddingRight: 14,
                border: error ? "1.5px solid #ba1a1a" : "1.5px solid #e5e2e1",
                borderRadius: 10,
                fontSize: "0.875rem",
                backgroundColor: "#fdf8f8",
                color: "#1c1b1b",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          {error && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#ba1a1a",
                margin: "0 2px",
              }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <button
            onClick={closeModal}
            disabled={isLoading}
            style={{
              flex: 1,
              height: 44,
              border: "1.5px solid #e5e2e1",
              borderRadius: 10,
              backgroundColor: "transparent",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#1c1b1b",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || attemptsLeft === 0}
            style={{
              flex: 1,
              height: 44,
              border: "none",
              borderRadius: 10,
              backgroundColor:
                isLoading || attemptsLeft === 0 ? "#9ca3af" : "#1c1b1b",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor:
                isLoading || attemptsLeft === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {isLoading ? "Verifying…" : "Continue"}
            {!isLoading && (
              <ArrowRight style={{ width: 16, height: 16 }} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
