"use client";

import dynamic from "next/dynamic";

const ModelViewerCanvas = dynamic(
  () =>
    import("./ModelViewerCanvas").then((m) => ({
      default: m.ModelViewerCanvas,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "clamp(400px, 55vw, 620px)",
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "#eae6e1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
          color: "#888",
          fontSize: 13,
          fontFamily: "sans-serif",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ animation: "spin 1s linear infinite" }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        Loading 3D viewer…
      </div>
    ),
  }
);

interface ModelViewerProps {
  glbUrl: string;
  packName: string;
}

export function ModelViewer({ glbUrl, packName }: ModelViewerProps) {
  return <ModelViewerCanvas glbUrl={glbUrl} packName={packName} />;
}
