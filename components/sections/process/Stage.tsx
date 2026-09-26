"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { steps } from "./data";
import BuildVisual from "./visuals/BuildVisual";
import HandoverVisual from "./visuals/HandoverVisual";
import ScopeVisual from "./visuals/ScopeVisual";
import ShipVisual from "./visuals/ShipVisual";
import type { VisualProps } from "./visuals/types";

export const visuals: ComponentType<VisualProps>[] = [ScopeVisual, BuildVisual, ShipVisual, HandoverVisual];

const pad = (n: number) => String(n).padStart(2, "0");

function glow(accent: string) {
  return `radial-gradient(62% 52% at 68% 34%, color-mix(in oklab, ${accent} 17%, transparent), transparent 72%), radial-gradient(46% 40% at 12% 104%, color-mix(in oklab, ${accent} 11%, transparent), transparent 70%)`;
}

function spotlight(e: React.PointerEvent<HTMLDivElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}
function spotlightOff(e: React.PointerEvent<HTMLDivElement>) {
  e.currentTarget.style.setProperty("--mx", "-999px");
  e.currentTarget.style.setProperty("--my", "-999px");
}

/**
 * Scales a visual up to fill the stage (never past `max`, never overflowing).
 * Writes the transform straight to the node, so resizing never re-renders.
 */
function Fit({ children, max = 1.22 }: { children: ReactNode; max?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    const v = i?.firstElementChild as HTMLElement | null;
    if (!o || !i || !v) return;
    const fit = () => {
      if (!v.offsetWidth || !v.offsetHeight) return;
      const k = Math.max(0.7, Math.min(max, o.clientWidth / v.offsetWidth, o.clientHeight / v.offsetHeight));
      i.style.transform = `scale(${k.toFixed(3)})`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o);
    ro.observe(v);
    return () => ro.disconnect();
  }, [max]);
  return (
    <div ref={outer} className="flex h-full w-full items-center justify-center">
      <div ref={inner} className="w-full origin-center">
        {children}
      </div>
    </div>
  );
}

/** The giant outlined step number in the corner, rolling like an odometer. */
function Numerals({ step, reduced, only }: { step: number; reduced: boolean; only?: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-[0.13em] -right-[0.03em] h-[0.84em] w-[1.25em] select-none overflow-hidden text-[clamp(9rem,15vw,15rem)] font-extrabold leading-[0.84] tracking-[-0.05em] [font-variation-settings:'wdth'_75,'opsz'_96]"
      style={{ maskImage: "linear-gradient(180deg, #000 30%, transparent 96%)" }}
    >
      {steps.map((s, i) => {
        if (only !== undefined && i !== only) return null;
        const on = i === step;
        return (
          <motion.span
            key={s.key}
            className="absolute inset-0 block text-right text-transparent"
            style={{ WebkitTextStroke: `1.25px color-mix(in oklab, ${s.accent} 50%, rgba(255,255,255,0.18))` }}
            initial={false}
            animate={{ y: on ? "0%" : i < step ? "-75%" : "75%", opacity: on ? 1 : 0 }}
            transition={reduced ? { duration: 0 } : { y: { type: "spring", stiffness: 120, damping: 22 }, opacity: { duration: on ? 0.6 : 0.35 } }}
          >
            {pad(i + 1)}
          </motion.span>
        );
      })}
    </div>
  );
}

/**
 * The glass stage. On desktop all four visuals live in it, stacked, and the
 * active one morphs in (the stage never changes size). Below lg each step
 * gets its own stage with just its visual (`single`), sized by its content.
 */
export default function Stage({ step, play, reduced, single = false }: { step: number; play: boolean; reduced: boolean; single?: boolean }) {
  const s = steps[step];
  const label = (
    <div className="absolute left-5 top-4 z-[2] flex items-center gap-2.5 text-[13px] md:left-6 md:top-5">
      <span className="h-2 w-2 rounded-full transition-[background-color,box-shadow] duration-700" style={{ background: s.accent, boxShadow: `0 0 10px ${s.accent}` }} />
      <span className="tabular-nums text-text-3">
        Step <span className="text-text-2">{pad(step + 1)}</span> / {pad(steps.length)}
      </span>
      <span className="grid">
        {steps.map((x, i) => (
          <span
            key={x.key}
            className="col-start-1 row-start-1 whitespace-nowrap text-text transition-[opacity,transform] duration-500"
            style={{ opacity: i === step ? 1 : 0, transform: i === step ? "none" : i < step ? "translateY(-60%)" : "translateY(60%)" }}
          >
            {x.name}
          </span>
        ))}
      </span>
    </div>
  );

  return (
    <div
      onPointerMove={spotlight}
      onPointerLeave={spotlightOff}
      style={{ ["--tile-glow" as string]: s.accent }}
      className={`spot relative w-full overflow-hidden rounded-[28px] border border-white/[0.09] bg-[rgba(12,13,16,0.6)] shadow-[0_50px_120px_-60px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl md:rounded-[32px] ${
        single ? "" : "h-full"
      }`}
    >
      {/* Brand light, one per step, crossfading */}
      {steps.map((x, i) =>
        single && i !== step ? null : (
          <div
            key={x.key}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-[900ms]"
            style={{ opacity: i === step ? 1 : 0, background: glow(x.accent) }}
          />
        ),
      )}
      {/* A faint dot grid, like a canvas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(70% 70% at 50% 45%, #000, transparent 85%)",
        }}
      />
      <Numerals step={step} reduced={reduced} only={single ? step : undefined} />
      {label}

      {single ? (
        <div className="@container relative px-4 pb-5 pt-14 sm:px-6 md:pb-7 md:pt-16" aria-hidden="true" inert>
          {(() => {
            const V = visuals[step];
            return <V play={play} reduced={reduced} accent={s.accent} />;
          })()}
        </div>
      ) : (
        <div className="@container absolute inset-x-0 bottom-0 top-12 md:top-14" aria-hidden="true" inert>
          {visuals.map((V, i) => {
            const on = i === step;
            return (
              <motion.div
                key={steps[i].key}
                className="absolute inset-0 flex items-center justify-center px-6 pb-7 xl:px-10"
                initial={false}
                animate={
                  on
                    ? { visibility: "visible", opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }
                    : { opacity: 0, y: i < step ? -26 : 26, scale: 0.965, filter: "blur(8px)", transitionEnd: { visibility: "hidden" } }
                }
                transition={
                  reduced
                    ? { duration: 0 }
                    : on
                      ? { delay: 0.1, opacity: { duration: 0.5, delay: 0.1 }, filter: { duration: 0.5, delay: 0.1 }, default: { type: "spring", stiffness: 150, damping: 23, delay: 0.1 } }
                      : { duration: 0.34, ease: [0.4, 0, 1, 1] }
                }
              >
                <Fit>
                  <V play={play && on} reduced={reduced} accent={steps[i].accent} />
                </Fit>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
