"use client";

import { advance } from "@react-three/fiber";
import Lenis from "lenis";
import { useEffect } from "react";

/**
 * The page's single frame loop. Lenis moves the page first, then the WebGL
 * canvas renders in the same frame, so 3D devices never trail the DOM they
 * are pinned to. (The canvas runs with frameloop="never".)
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = reduce ? null : new Lenis({ lerp: 0.1, smoothWheel: true, anchors: { offset: -80 } });
    let raf = 0;
    const loop = (t: number) => {
      lenis?.raf(t);
      advance(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);
  return null;
}
