"use client";

import { Suspense, useEffect, useRef } from "react";
import { LoopRepeat } from "three";
import {
  OrbitControls,
  useGLTF,
  Environment,
  Bounds,
  useBounds,
  Html,
  useAnimations,
} from "@react-three/drei";

// ── Public interface for animation imperative controls ─────────────────────────
export interface AnimControls {
  /** True when the loaded model contains ≥1 animation clip */
  hasAnimations: boolean;
  toggle: () => void;
  play: () => void;
  pause: () => void;
}

// ── Auto-fit + animate model ──────────────────────────────────────────────────
function FittedModel({
  url,
  animRef,
  onAnimationsLoaded,
}: {
  url: string;
  animRef?: React.MutableRefObject<AnimControls | null>;
  onAnimationsLoaded?: (hasAnimations: boolean) => void;
}) {
  const { scene, animations } = useGLTF(url);
  const { actions, names, mixer } = useAnimations(animations, scene);
  const bounds = useBounds();

  // Stable ref so the callback never needs to be a dep
  const onAnimLoadedRef = useRef(onAnimationsLoaded);
  onAnimLoadedRef.current = onAnimationsLoaded;

  // Fit camera once the model geometry is available
  useEffect(() => {
    bounds.refresh().fit();
  }, [scene, bounds]);

  // Set up AnimationMixer when clips change (fires once after load)
  useEffect(() => {
    const hasAnim = animations.length > 0;

    if (hasAnim) {
      names.forEach((name) => {
        const action = actions[name];
        if (!action) return;
        action.setLoop(LoopRepeat, Infinity);
        action.clampWhenFinished = false;
        action.reset().play();
      });
    }

    // Expose imperative handles to the parent (outside Canvas)
    if (animRef) {
      animRef.current = {
        hasAnimations: hasAnim,
        toggle: () => {
          mixer.timeScale = mixer.timeScale === 0 ? 1 : 0;
        },
        play: () => {
          mixer.timeScale = 1;
        },
        pause: () => {
          mixer.timeScale = 0;
        },
      };
    }

    onAnimLoadedRef.current?.(hasAnim);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animations, names, actions, mixer, animRef]);

  return <primitive object={scene} />;
}

// ── Exposes bounds.fit() outside the canvas ───────────────────────────────────
export function BoundsController({
  fitRef,
}: {
  fitRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const bounds = useBounds();
  if (fitRef) fitRef.current = () => bounds.refresh().fit();
  return null;
}

// ── Minimal loading indicator (works inside R3F Html) ─────────────────────────
export function LoadingHtml() {
  return (
    <Html center>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          color: "#888",
          fontFamily: "sans-serif",
          fontSize: 13,
          whiteSpace: "nowrap",
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
        Loading model…
      </div>
    </Html>
  );
}

// ── The canonical scene — identical for BOTH viewers ─────────────────────────
interface SharedSceneProps {
  url: string;
  bgColor?: string;
  /** Pass a ref to get an external reset-camera handle */
  fitRef?: React.MutableRefObject<(() => void) | null>;
  /** Pass a ref to get play/pause/toggle handles for animation controls */
  animRef?: React.MutableRefObject<AnimControls | null>;
  /** Called once after the model loads; reports whether it has animations */
  onAnimationsLoaded?: (hasAnimations: boolean) => void;
}

export function SharedScene({
  url,
  bgColor = "#eae6e1",
  fitRef,
  animRef,
  onAnimationsLoaded,
}: SharedSceneProps) {
  return (
    <>
      {/* WebGL background — prevents black canvas when alpha:false */}
      <color attach="background" args={[bgColor]} />

      {/* Lighting */}
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <directionalLight position={[-4, -2, -4]} intensity={0.3} />
      <Environment preset="studio" />

      {/* Bounds: fits camera to bounding box on load.
          observe is intentionally OFF — it re-fires on every resize which
          causes camera jumps while the user scrolls the page. */}
      <Bounds fit clip margin={1.25}>
        <BoundsController fitRef={fitRef} />
        <Suspense fallback={<LoadingHtml />}>
          <FittedModel
            url={url}
            animRef={animRef}
            onAnimationsLoaded={onAnimationsLoaded}
          />
        </Suspense>
      </Bounds>

      {/* OrbitControls:
          - autoRotate: camera slowly orbits the model
          - enableZoom OFF: scroll-wheel should scroll the page, not zoom
          - enablePan OFF: pivot stays centered
          - makeDefault: lets Bounds update the controls' target after fit */}
      <OrbitControls
        makeDefault
        autoRotate
        autoRotateSpeed={1.5}
        enableZoom={false}
        enablePan={false}
        dampingFactor={0.08}
        enableDamping
      />
    </>
  );
}
