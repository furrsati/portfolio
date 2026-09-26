"use client";

import { useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type RefObject } from "react";

/** A finger that travels this far without the page scrolling is dragging a control, not passing by. */
const TOUCH_DRAG_PX = 24;

/**
 * True while an element taller than the screen covers at least `amount` of
 * the viewport's height. Such a tile (a phone on its side, a long tile on a
 * small phone) shows `amount` of itself late or never, but filling most of
 * the screen means just as surely that someone is looking at it. Tiles that
 * fit on screen are left to the usual `amount` of themselves.
 */
function useFillsViewport(ref: RefObject<HTMLElement | null>, amount: number) {
  const [fills, setFills] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        const vh = e.rootBounds?.height || window.innerHeight;
        const tall = e.boundingClientRect.height > vh;
        setFills(tall && e.isIntersecting && e.intersectionRect.height >= vh * amount);
      },
      { threshold: Array.from({ length: 51 }, (_, i) => i / 50) },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, amount]);
  return fills;
}

/**
 * Attract mode for a bento tile: when the tile is well inside the viewport
 * it plays its own demo, as if someone were using it. The moment a real
 * person presses, taps, types or tabs into the tile, the demo stops for good
 * and the tile is theirs. Reduced motion: no demo.
 *
 * Touch: a finger that lands on a tile may only be scrolling the page past
 * it, so a touch hands the tile over when it lifts (a tap) or when it drags a
 * control, never when the browser turns it into a scroll.
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
  const fills = useFillsViewport(ref, amount);
  const [takenOver, setTakenOver] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || takenOver) return;
    /** A finger that is down on the tile and hasn't been claimed by a scroll yet. */
    let touch: { id: number; x: number; y: number } | null = null;
    const take = (e: Event) => {
      if (e.isTrusted) setTakenOver(true);
    };
    const down = (e: PointerEvent) => {
      if (!e.isTrusted) return;
      if (e.pointerType === "touch") touch = { id: e.pointerId, x: e.clientX, y: e.clientY };
      else setTakenOver(true);
    };
    const move = (e: PointerEvent) => {
      if (!touch || e.pointerId !== touch.id) return;
      if (Math.hypot(e.clientX - touch.x, e.clientY - touch.y) < TOUCH_DRAG_PX) return;
      touch = null;
      setTakenOver(true);
    };
    const up = (e: PointerEvent) => {
      if (!touch || e.pointerId !== touch.id) return;
      touch = null;
      setTakenOver(true);
    };
    // The browser took the finger for a scroll or a zoom.
    const cancel = (e: PointerEvent) => {
      if (touch?.id === e.pointerId) touch = null;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("keydown", take);
    el.addEventListener("input", take);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
      el.removeEventListener("keydown", take);
      el.removeEventListener("input", take);
    };
  }, [takenOver]);

  return { ref, active: (inView || fills) && !reduced && !takenOver, takenOver, reduced };
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
