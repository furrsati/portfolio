"use client";

import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { useState } from "react";

/**
 * One WebGL canvas for the whole page. Every 3D scene is a <View> that
 * tracks a DOM element and renders into this canvas through View.Port.
 * Frames are driven by SmoothScroll's loop (frameloop="never") so scroll and
 * render happen in the same animation frame.
 *
 * Always rendered at the screen's full density (capped at 2x) so the product
 * screenshots on the devices stay pin-sharp; the scenes are light enough that
 * dropping resolution is never worth the blur.
 *
 * Loaded with ssr: false, so `document` and `window` exist on first render.
 */
export default function Stage() {
  const [source] = useState(() => document.body);
  const [dpr] = useState(() => Math.min(window.devicePixelRatio || 1, 2));
  return (
    <Canvas
      frameloop="never"
      eventSource={source}
      eventPrefix="client"
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1 }}
    >
      <View.Port />
    </Canvas>
  );
}
