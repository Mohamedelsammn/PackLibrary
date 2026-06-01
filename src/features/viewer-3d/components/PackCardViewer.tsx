"use client";

import { useRef, useState, useEffect, memo } from "react";
import { Canvas } from "@react-three/fiber";
import { SharedScene } from "./SharedScene";

interface PackCardViewerProps {
  glbDriveId: string;
}

export const PackCardViewer = memo(function PackCardViewer({
  glbDriveId,
}: PackCardViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Lazy-mount: only create the WebGL context when the card enters the viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        backgroundColor: "#eeebe7",
      }}
    >
      {mounted && (
        <Canvas
          camera={{ position: [0, 0, 3], fov: 42 }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 1.5]}
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <SharedScene url={`/api/proxy/glb/${glbDriveId}`} bgColor="#eeebe7" />
        </Canvas>
      )}
    </div>
  );
});
