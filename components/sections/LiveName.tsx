"use client";

import { useEffect, useRef } from "react";

/**
 * The name as live type: each letter's weight and width respond to the
 * pointer through Bricolage Grotesque's variable axes. Letters near the
 * cursor swell; the rest settle back. Static under reduced motion.
 *
 * Touch screens have no hover, so there a finger does the same: tap the name
 * or drag sideways across it (vertical drags still scroll the page), and the
 * letters under it swell, then relax when the finger lifts. Once the letters
 * have risen, a single slow sweep runs across the name to show it is alive.
 */
export default function LiveName({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const letters = Array.from(el.querySelectorAll<HTMLSpanElement>("[data-l]"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const state = letters.map(() => ({ w: 700, d: 100 }));
    const apply = () =>
      letters.forEach((l, i) => {
        l.style.fontVariationSettings = `"wght" ${state[i].w.toFixed(0)}, "wdth" ${state[i].d.toFixed(1)}, "opsz" 96`;
      });
    apply();
    if (reduce) return;

    // The desktop reach (420px) is tuned for the big desktop name; on touch
    // screens it scales with the type so a fingertip only swells nearby letters.
    let reach = 420;
    const measure = () => {
      reach = coarse ? parseFloat(getComputedStyle(el).fontSize) * 3.2 : 420;
    };
    measure();

    let px = -9999;
    let py = -9999;
    let raf = 0;
    let running = false;
    let sweep: { t0: number; dur: number } | null = null;
    let touching = false;
    const kick = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    const tick = (t: number) => {
      if (sweep) {
        // Left to right across the name, eased, then let go.
        const k = (t - sweep.t0) / sweep.dur;
        if (k >= 1) {
          sweep = null;
          px = -9999;
        } else if (k >= 0) {
          const box = el.getBoundingClientRect();
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          const first = letters[0].getBoundingClientRect();
          const last = letters[letters.length - 1].getBoundingClientRect();
          px = first.left - reach * 0.35 + e * (last.right - first.left + reach * 0.7);
          py = box.top + first.height / 2;
        }
      }
      let moving = sweep !== null;
      letters.forEach((l, i) => {
        const r = l.getBoundingClientRect();
        const dx = px - (r.left + r.width / 2);
        const dy = py - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy);
        const pull = Math.max(0, 1 - dist / reach);
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
    const onMove = (e: PointerEvent) => {
      // A touch only counts while it is on the name (see onDown / onUp).
      if (e.pointerType !== "mouse" && !touching) return;
      sweep = null;
      px = e.clientX;
      py = e.clientY;
      kick();
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      touching = true;
      onMove(e);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || !touching) return;
      touching = false;
      px = -9999;
      py = -9999;
      kick();
    };

    // settle into the resting "idle" shape once
    px = -9999;
    kick();
    // On touch screens, one sweep after the letters have risen.
    const hint = coarse ? window.setTimeout(() => {
      if (touching) return;
      sweep = { t0: performance.now() + 16, dur: 1500 };
      kick();
    }, 1700) : 0;

    window.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      window.clearTimeout(hint);
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    // touch-pan-y: a sideways drag plays with the letters, an up/down drag still scrolls.
    <h1 ref={ref} className={`touch-pan-y ${className}`} aria-label={text}>
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
          {w < words.length - 1 && <span aria-hidden="true">{" "}</span>}
        </span>
      ))}
    </h1>
  );
}
