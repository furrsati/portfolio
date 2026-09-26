"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Frosted surface used by every stage visual (no radius, so it can be shaped). */
export const glassSurface =
  "border border-white/[0.09] bg-[rgba(20,21,25,0.72)] shadow-[0_28px_60px_-30px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl";
/** The same surface as an 18px card. */
export const glass = `rounded-[18px] ${glassSurface}`;

/** Text that writes itself left to right over a faint placeholder bar. */
export function Wipe({ on, children, className = "", reduced, duration = 0.46 }: { on: boolean; children: ReactNode; className?: string; reduced: boolean; duration?: number }) {
  return (
    <span className={`relative inline-block max-w-full ${className}`}>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-1/2 h-[0.62em] -translate-y-1/2 rounded-full bg-white/[0.06] transition-opacity duration-500"
        style={{ opacity: on ? 0 : 1 }}
      />
      <motion.span
        className="relative block truncate"
        initial={false}
        animate={{ clipPath: on ? "inset(-20% 0% -20% 0%)" : "inset(-20% 100% -20% 0%)" }}
        transition={reduced ? { duration: 0 } : { duration, ease: [0.65, 0, 0.35, 1] }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** A checkbox that ticks with a drawn stroke. */
export function Tick({ on, accent, reduced, size = 18 }: { on: boolean; accent: string; reduced: boolean; size?: number }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-[6px] border transition-[background-color,border-color,box-shadow] duration-300"
      style={{
        width: size,
        height: size,
        borderColor: on ? accent : "rgba(255,255,255,0.2)",
        background: on ? accent : "transparent",
        boxShadow: on ? `0 0 16px -2px color-mix(in oklab, ${accent} 70%, transparent)` : "none",
      }}
    >
      <svg viewBox="0 0 16 16" className="h-[70%] w-[70%]" fill="none" aria-hidden="true">
        <motion.path
          d="M3.2 8.4 6.5 11.5 12.8 4.6"
          stroke="#0b0b0c"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
          transition={reduced ? { duration: 0 } : { pathLength: { duration: 0.32, ease: "easeOut", delay: 0.06 }, opacity: { duration: 0.1 } }}
        />
      </svg>
    </span>
  );
}

/** Two labels sharing one box: the box is as wide as the longer one, so swapping never shifts anything. */
export function Swap({ on, off, onNode, className = "" }: { on: boolean; off: ReactNode; onNode: ReactNode; className?: string }) {
  return (
    <span className={`grid ${className}`}>
      <span
        className="col-start-1 row-start-1 flex items-center justify-center gap-1.5 transition-[opacity,transform,filter] duration-500"
        style={{ opacity: on ? 0 : 1, transform: on ? "translateY(-40%)" : "none", filter: on ? "blur(3px)" : "none" }}
      >
        {off}
      </span>
      <span
        className="col-start-1 row-start-1 flex items-center justify-center gap-1.5 transition-[opacity,transform,filter] duration-500"
        style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateY(40%)", filter: on ? "none" : "blur(3px)" }}
      >
        {onNode}
      </span>
    </span>
  );
}

/** Small brand-tinted icon tile, as on the chapter cards. */
export function IconTile({ accent, children, size = 34 }: { accent: string; children: ReactNode; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[11px]"
      style={{
        width: size,
        height: size,
        background: `color-mix(in oklab, ${accent} 16%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 24%, transparent)`,
        color: accent,
      }}
    >
      {children}
    </span>
  );
}
