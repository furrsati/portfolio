"use client";

import { useEffect, useRef } from "react";

/**
 * The name as live type: each letter's weight and width respond to the
 * pointer through Bricolage Grotesque's variable axes. Letters near the
 * cursor swell; the rest settle back. Static under reduced motion.
 */
export default function LiveName({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const letters = Array.from(el.querySelectorAll<HTMLSpanElement>("[data-l]"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const state = letters.map(() => ({ w: 700, d: 100 }));
    const apply = () =>
      letters.forEach((l, i) => {
        l.style.fontVariationSettings = `"wght" ${state[i].w.toFixed(0)}, "wdth" ${state[i].d.toFixed(1)}, "opsz" 96`;
      });
    apply();
    if (reduce) return;

    let px = -9999;
    let py = -9999;
    let raf = 0;
    let running = false;
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    const tick = () => {
      let moving = false;
      letters.forEach((l, i) => {
        const r = l.getBoundingClientRect();
        const dx = px - (r.left + r.width / 2);
        const dy = py - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy);
        const pull = Math.max(0, 1 - dist / 420);
        const tw = 380 + pull * 420;
        const td = 76 + pull * 24;
        state[i].w += (tw - state[i].w) * 0.14;
        state[i].d += (td - state[i].d) * 0.14;
        if (Math.abs(tw - state[i].w) > 0.5 || Math.abs(td - state[i].d) > 0.05) moving = true;
      });
      apply();
      if (moving) raf = requestAnimationFrame(tick);
      else running = false;
    };
    // settle into the resting "idle" shape once
    px = -9999;
    running = true;
    raf = requestAnimationFrame(tick);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <h1 ref={ref} className={className} aria-label={text}>
      {text.split(" ").map((word, w, words) => (
        <span key={w} className="inline-block whitespace-nowrap">
          {word.split("").map((ch, i) => (
            <span
              key={i}
              data-l
              aria-hidden="true"
              className="rise inline-block"
              style={{ animationDelay: `${120 + (words.slice(0, w).join("").length + i) * 55}ms` }}
            >
              {ch}
            </span>
          ))}
          {w < words.length - 1 && <span aria-hidden="true">{"\u00a0"}</span>}
        </span>
      ))}
    </h1>
  );
}
