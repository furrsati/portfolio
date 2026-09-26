"use client";

import { motion } from "framer-motion";
import { Check, Globe, LoaderCircle, RotateCcw, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppleMark, PlayMark } from "../../chapter/logos";
import { usePhases } from "../usePhases";
import { glass, IconTile, Swap } from "../ui";
import type { VisualProps } from "./types";

const LIVE = "#6EE7A8";
const times = [650, 950, 1800, 2150, 2950, 3350, 3850];

/** Several labels sharing one box, so a status can change without anything around it moving. */
function States({ i, states }: { i: number; states: ReactNode[] }) {
  return (
    <span className="grid">
      {states.map((s, k) => (
        <span
          key={k}
          className="col-start-1 row-start-1 flex items-center gap-1.5 whitespace-nowrap transition-[opacity,transform,filter] duration-500"
          style={{ opacity: k === i ? 1 : 0, transform: k === i ? "none" : k < i ? "translateY(-45%)" : "translateY(45%)", filter: k === i ? "none" : "blur(3px)" }}
        >
          {s}
        </span>
      ))}
    </span>
  );
}

function Store({ mark, name, state, accent, reduced }: { mark: ReactNode; name: string; state: number; accent: string; reduced: boolean }) {
  return (
    <div className={`relative overflow-hidden p-3 @md:p-3.5 ${glass}`}>
      <div className="flex items-center gap-2.5 @md:gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-white/[0.07] text-text ring-1 ring-white/10">{mark}</span>
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-medium leading-tight text-text">{name}</div>
          <div className="mt-1 text-[12px] leading-tight">
            <States
              i={state}
              states={[
                <span key="0" className="flex items-center gap-1.5 text-text-3">
                  <Upload className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                  Build uploaded
                </span>,
                <span key="1" className="flex items-center gap-1.5 text-text-2">
                  <LoaderCircle className={`h-3 w-3 ${reduced ? "" : "animate-spin"}`} strokeWidth={2.2} aria-hidden="true" />
                  In review
                </span>,
                <span key="2" className="flex items-center gap-1.5" style={{ color: accent }}>
                  <Check className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />
                  Approved
                </span>,
                <span key="3" className="flex items-center gap-1.5" style={{ color: LIVE }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: LIVE, boxShadow: `0 0 8px ${LIVE}` }} />
                  Live
                </span>,
              ]}
            />
          </div>
        </div>
      </div>
      <span className="absolute inset-x-0 bottom-0 h-[2px] bg-white/[0.05]" aria-hidden="true">
        <motion.span
          className="absolute inset-0 origin-left"
          style={{ background: state >= 3 ? LIVE : accent }}
          initial={false}
          animate={{ scaleX: state / 3 }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 70, damping: 18 }}
        />
      </span>
    </div>
  );
}

/**
 * Traffic lines from the domain to whichever build is serving. Drawn in real
 * pixels (the box is measured), so strokes stay even and "draw on" works.
 */
function Routes({ flipped, accent, flow, reduced }: { flipped: boolean; accent: string; flow: boolean; reduced: boolean }) {
  const box = useRef<SVGSVGElement>(null);
  const [w, setW] = useState(160);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(40, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 92;
  const d = (y: number) => `M0 ${H / 2} C ${w * 0.55} ${H / 2}, ${w * 0.45} ${y}, ${w} ${y}`;
  const routes = [
    { key: "new", d: d(18), on: flipped, color: accent },
    { key: "old", d: d(H - 18), on: !flipped, color: "rgba(255,255,255,0.6)" },
  ];
  return (
    <svg ref={box} viewBox={`0 0 ${w} ${H}`} className="h-[92px] w-full overflow-visible" aria-hidden="true">
      {routes.map((r) => (
        <g key={r.key}>
          <path d={r.d} stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" fill="none" />
          <motion.path
            d={r.d}
            stroke={r.color}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            initial={false}
            animate={{ pathLength: r.on ? 1 : 0, opacity: r.on ? 1 : 0 }}
            transition={reduced ? { duration: 0 } : { pathLength: { duration: 0.75, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 0.3 } }}
          />
          {r.on && flow && (
            <motion.path
              d={r.d}
              stroke="#fff"
              strokeOpacity={0.9}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0.08, pathOffset: 0, opacity: 0 }}
              animate={{ pathOffset: 0.92, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.4, ease: "linear", repeat: Infinity, repeatDelay: 0.25, delay: 0.8 }}
            />
          )}
        </g>
      ))}
    </svg>
  );
}

/** Step 3: store review, then the switch to the new build, with the old one kept one step behind. */
export default function ShipVisual({ play, reduced, accent }: VisualProps) {
  const phase = usePhases(play, times, reduced);
  const app = phase >= 6 ? 3 : phase >= 3 ? 2 : phase >= 1 ? 1 : 0;
  const gp = phase >= 6 ? 3 : phase >= 4 ? 2 : phase >= 2 ? 1 : 0;
  const flipped = phase >= 5;
  const live = phase >= 6;
  const rollback = phase >= 7;
  const flow = play && !reduced;

  const target = (label: string, on: boolean, tag: ReactNode) => (
    <div
      className="flex h-9 items-center justify-between gap-2 rounded-[11px] border px-2.5 text-[12.5px] transition-[border-color,background-color,color] duration-500"
      style={{
        borderColor: on ? `color-mix(in oklab, ${accent} 45%, transparent)` : "rgba(255,255,255,0.08)",
        background: on ? `color-mix(in oklab, ${accent} 10%, transparent)` : "rgba(255,255,255,0.02)",
        color: on ? "var(--text)" : "var(--text-2)",
      }}
    >
      <span className="truncate">{label}</span>
      <span className="hidden shrink-0 text-[11px] @md:block">{tag}</span>
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full transition-[background-color,box-shadow] duration-500 @md:hidden"
        style={{ background: on ? accent : "rgba(255,255,255,0.2)", boxShadow: on ? `0 0 8px ${accent}` : "none" }}
      />
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-2.5 @md:gap-3">
      <div className="grid grid-cols-2 gap-2.5 @md:gap-3">
        <Store mark={<AppleMark className="h-[17px] w-[17px]" />} name="App Store" state={app} accent={accent} reduced={reduced} />
        <Store mark={<PlayMark className="h-[15px] w-[15px]" />} name="Google Play" state={gp} accent={accent} reduced={reduced} />
      </div>

      <div className={`p-3.5 @md:p-4 ${glass}`}>
        <div className="flex items-center gap-3">
          <IconTile accent={accent} size={32}>
            <Globe className="h-4 w-4" strokeWidth={1.8} />
          </IconTile>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-medium leading-tight text-text">your-app.com</div>
            <div className="mt-0.5 truncate text-[12px] leading-tight text-text-3">
              <span className="@md:hidden">One DNS change</span>
              <span className="hidden @md:inline">Launch day, one DNS change</span>
            </div>
          </div>
          <span className="text-[12px]">
            <Swap
              on={live}
              off={<span className="text-text-3">Staging</span>}
              onNode={
                <span className="flex items-center gap-1.5 font-medium" style={{ color: LIVE }}>
                  <span className="relative flex h-1.5 w-1.5">
                    {!reduced && <span className="absolute inset-0 animate-ping rounded-full opacity-70" style={{ background: LIVE, animationDuration: "2s" }} />}
                    <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: LIVE }} />
                  </span>
                  Live
                </span>
              }
            />
          </span>
          {/* The switch */}
          <span
            className="relative h-[26px] w-[46px] shrink-0 rounded-full border transition-[background-color,border-color,box-shadow] duration-500"
            style={{
              background: flipped ? accent : "rgba(255,255,255,0.06)",
              borderColor: flipped ? accent : "rgba(255,255,255,0.14)",
              boxShadow: flipped ? `0 0 22px -4px ${accent}` : "none",
            }}
          >
            <motion.span
              className="absolute left-[2px] top-[2px] h-5 w-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
              initial={false}
              animate={{ x: flipped ? 20 : 0 }}
              transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 30 }}
            />
          </span>
        </div>

        <div className="relative mt-3.5 grid h-[92px] grid-cols-[auto_minmax(0,1fr)_minmax(0,1.25fr)] items-center @md:mt-4">
          <span className="z-[1] inline-flex h-8 items-center rounded-full border border-white/12 bg-[#141519] px-3 text-[12px] text-text-2">Traffic</span>
          <Routes flipped={flipped} accent={accent} flow={flow} reduced={reduced} />
          <div className="flex h-full flex-col justify-between py-0">
            {target("New build", flipped, <States i={flipped ? 1 : 0} states={[<span key="a" className="text-text-3">Ready</span>, <span key="b" style={{ color: accent }}>Serving</span>]} />)}
            {target("Old version", !flipped, <States i={flipped ? 1 : 0} states={[<span key="a" className="text-text">Serving</span>, <span key="b" className="text-text-3">Standing by</span>]} />)}
          </div>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={rollback ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26 }}
        className="flex h-11 items-center justify-between gap-3 rounded-[14px] border border-white/[0.08] bg-[rgba(20,21,25,0.6)] px-3.5 backdrop-blur-xl"
      >
        <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-text-2">
          <RotateCcw className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span className="truncate">Old version kept as the rollback</span>
        </span>
        <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-white/[0.06] px-2 text-[11px] text-text">
          <Check className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />
          Ready
        </span>
      </motion.div>
    </div>
  );
}
