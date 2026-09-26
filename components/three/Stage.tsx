"use client";

import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor, View } from "@react-three/drei";
import { useState } from "react";

/**
 * One WebGL canvas for the whole page. Every 3D scene is a <View> that
 * tracks a DOM element and renders into this canvas through View.Port.
 * Frames are driven by SmoothScroll's loop (frameloop="never") so scroll and
 * render happen in the same animation frame.
 *
 * Pixel density adapts: it starts sharp (up to 2x on desktop) and steps down
 * only if the device can't hold its refresh rate, then steps back up.
 *
 * Loaded with ssr: false, so `document` and `window` exist on first render.
 */
export default function Stage() {
  const [source] = useState(() => document.body);
  const [max] = useState(() => {
    const small = window.matchMedia("(max-width: 768px)").matches;
    return Math.min(window.devicePixelRatio || 1, small ? 1.75 : 2);
  });
  const [dpr, setDpr] = useState(max);
  return (
    <Canvas
      frameloop="never"
      eventSource={source}
      eventPrefix="client"
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1 }}
    >
      <PerformanceMonitor
        bounds={(refresh) => (refresh > 90 ? [80, 110] : [48, 58])}
        onDecline={() => setDpr((d) => Math.max(1, +(d - 0.25).toFixed(2)))}
        onIncline={() => setDpr((d) => Math.min(max, +(d + 0.25).toFixed(2)))}
        flipflops={4}
        onFallback={() => setDpr(1)}
      />
      <View.Port />
    </Canvas>
  );
}
