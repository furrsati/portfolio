"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * A little timeline for a stage visual. Returns how many of `times` (ms from
 * the start, ascending) have been reached. It only runs while `play` is true:
 * leave the step and the clock pauses, come back and it resumes where it was,
 * so nothing ever replays or jumps. Reduced motion: everything is reached.
 */
export function usePhases(play: boolean, times: readonly number[], reduced: boolean) {
  const [phase, setPhase] = useState(0);
  const elapsed = useRef(0);

  useEffect(() => {
    if (!play || reduced) return;
    const start = performance.now() - elapsed.current;
    const timers: ReturnType<typeof setTimeout>[] = [];
    times.forEach((t, i) => {
      const wait = t - elapsed.current;
      if (wait <= 0) return;
      timers.push(setTimeout(() => setPhase((p) => Math.max(p, i + 1)), wait));
    });
    // Anything already due (a resume after a long pause) lands on the next tick, never in this body.
    const due = times.filter((t) => t <= elapsed.current).length;
    if (due) timers.push(setTimeout(() => setPhase((p) => Math.max(p, due)), 0));
    return () => {
      timers.forEach(clearTimeout);
      elapsed.current = performance.now() - start;
    };
  }, [play, reduced, times]);

  return reduced ? times.length : phase;
}

const noop = () => () => {};
/**
 * Reduced motion, but only once hydrated: the server can't know the setting,
 * so the first client render has to match it (framer reads it immediately).
 */
export function useReducedSafe() {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const reduced = useReducedMotion() ?? false;
  return hydrated && reduced;
}
