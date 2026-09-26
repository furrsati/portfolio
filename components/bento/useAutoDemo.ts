"use client";

import { useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Attract mode for a bento tile: when the tile is well inside the viewport
 * it plays its own demo, as if someone were using it. The moment a real
 * person presses, taps, types or tabs into the tile, the demo stops for good
 * and the tile is theirs. Reduced motion: no demo.
 *
 *   const demo = useAutoDemo<HTMLDivElement>();
 *   useDemoScript(demo.active, [
 *     { at: 400, run: () => setAmount(120000) },
 *     { at: 1600, run: () => release() },
 *   ], { loop: true, loopDelay: 3500 });
 *   <Tile ref={demo.ref} demo={demo.active} ...>
 */
export function useAutoDemo<T extends HTMLElement>({ amount = 0.55 }: { amount?: number } = {}) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion() ?? false;
  const inView = useInView(ref, { amount });
  const [takenOver, setTakenOver] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || takenOver) return;
    const take = (e: Event) => {
      if (e.isTrusted) setTakenOver(true);
    };
    el.addEventListener("pointerdown", take);
    el.addEventListener("keydown", take);
    el.addEventListener("input", take);
    return () => {
      el.removeEventListener("pointerdown", take);
      el.removeEventListener("keydown", take);
      el.removeEventListener("input", take);
    };
  }, [takenOver]);

  return { ref, active: inView && !reduced && !takenOver, takenOver, reduced };
}

export type DemoStep = { at: number; run: () => void };

/**
 * Runs timed steps while `active`. Stops (clears every pending step) the
 * instant `active` turns false. With `loop`, restarts `loopDelay` ms after
 * the last step. Steps call the tile's own actions, so the demo exercises
 * exactly what a visitor would.
 */
export function useDemoScript(active: boolean, steps: DemoStep[], { loop = true, loopDelay = 3000, reset }: { loop?: boolean; loopDelay?: number; reset?: () => void } = {}) {
  const stepsRef = useRef(steps);
  const resetRef = useRef(reset);
  useEffect(() => {
    stepsRef.current = steps;
    resetRef.current = reset;
  });

  useEffect(() => {
    if (!active) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;
    const play = () => {
      if (cancelled) return;
      const list = stepsRef.current;
      const end = list.reduce((m, s) => Math.max(m, s.at), 0);
      for (const s of list) timers.push(setTimeout(() => !cancelled && s.run(), s.at));
      if (loop)
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            resetRef.current?.();
            play();
          }, end + loopDelay),
        );
    };
    play();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [active, loop, loopDelay]);
}
