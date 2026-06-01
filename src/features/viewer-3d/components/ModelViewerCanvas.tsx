"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Maximize2, RotateCcw, Play, Pause } from "lucide-react";
import { SharedScene } from "./SharedScene";
import type { AnimControls } from "./SharedScene";

interface ModelViewerCanvasProps {
  glbUrl: string;
  packName: string;
}

export function ModelViewerCanvas({ glbUrl, packName }: ModelViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<(() => void) | null>(null);
  const animRef = useRef<AnimControls | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasAnimations, setHasAnimations] = useState(false);
  // Animations auto-play on load; start in "playing" state
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const handleAnimationsLoaded = useCallback((has: boolean) => {
    setHasAnimations(has);
    // If no animations, reset playing state so button doesn't flash
    if (!has) setIsPlaying(false);
  }, []);

  const handleReset = useCallback(() => fitRef.current?.(), []);

  const handleFullscreen = useCallback(() => {
    if (!isFullscreen) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }, [isFullscreen]);

  const handlePlayPause = useCallback(() => {
    if (!animRef.current) return;
    animRef.current.toggle();
    setIsPlaying((p) => !p);
  }, []);

  const containerStyle: React.CSSProperties = isFullscreen
    ? { position: "fixed", inset: 0, zIndex: 50, borderRadius: 0 }
    : {
        position: "relative",
        width: "100%",
        height: "clamp(420px, 52vw, 620px)",
        borderRadius: 16,
        overflow: "hidden",
      };

  return (
    <div ref={containerRef} style={containerStyle}>

      {/* ── Top-right badges ── */}
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {/* Animated badge — shown only when model has animation clips */}
        {hasAnimations && (
          <div style={{ ...badgeStyle, gap: 5 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: isPlaying ? "#f59e0b" : "#94a3b8",
                transition: "background-color 0.2s",
              }}
            />
            {isPlaying ? "Animated" : "Paused"}
          </div>
        )}

        {/* Live 3D badge */}
        <div style={{ ...badgeStyle, gap: 6 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: "#22c55e",
            }}
          />
          Live 3D View
        </div>
      </div>

      {/* ── Bottom-left controls ── */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 14,
          zIndex: 10,
          display: "flex",
          gap: 8,
        }}
      >
        {/* Play / Pause — only visible when model has animations */}
        {hasAnimations && (
          <ControlButton
            onClick={handlePlayPause}
            label={isPlaying ? "Pause animation" : "Play animation"}
            active={isPlaying}
          >
            {isPlaying ? (
              <Pause style={{ width: 15, height: 15 }} />
            ) : (
              <Play style={{ width: 15, height: 15 }} />
            )}
          </ControlButton>
        )}

        {/* Reset camera */}
        <ControlButton onClick={handleReset} label="Reset camera">
          <RotateCcw style={{ width: 15, height: 15 }} />
        </ControlButton>

        {/* Fullscreen */}
        <ControlButton onClick={handleFullscreen} label="Toggle fullscreen">
          <Maximize2 style={{ width: 15, height: 15 }} />
        </ControlButton>
      </div>

      {/* Canvas — same config as PackCardViewer */}
      <Canvas
        camera={{ position: [0, 0, 3], fov: 42 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        style={{ width: "100%", height: "100%", display: "block" }}
        aria-label={`3D model of ${packName}`}
      >
        <SharedScene
          url={glbUrl}
          bgColor="#eae6e1"
          fitRef={fitRef}
          animRef={animRef}
          onAnimationsLoaded={handleAnimationsLoaded}
        />
      </Canvas>
    </div>
  );
}

// ── Shared badge style ─────────────────────────────────────────────────────────
const badgeStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  backgroundColor: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(6px)",
  borderRadius: 99,
  padding: "5px 11px",
  fontSize: 11,
  fontWeight: 600,
  pointerEvents: "none",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

// ── Icon control button ────────────────────────────────────────────────────────
function ControlButton({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        border: active ? "1.5px solid #1c1b1b" : "none",
        backgroundColor: active
          ? "rgba(28,27,27,0.08)"
          : "rgba(255,255,255,0.92)",
        backdropFilter: "blur(6px)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#1c1b1b",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        transition: "background-color 0.15s, border-color 0.15s",
      }}
    >
      {children}
    </button>
  );
}
