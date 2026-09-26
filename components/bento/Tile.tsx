"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef, type ReactNode, type Ref } from "react";

type TileProps = {
  /** Brand color of the project the tile comes from; drives the spotlight. */
  glow: string;
  /** Short skill name shown at the top of the tile, e.g. "Payments". */
  skill: string;
  /** Where it comes from, e.g. "Furrsati". */
  from: string;
  /** One sentence: what the demo proves, in plain words. */
  title: string;
  className?: string;
  /** Ref from useAutoDemo(), so the tile can detect when a person takes over. */
  ref?: Ref<HTMLDivElement>;
  /** True while the tile is playing its own demo. */
  demo?: boolean;
  children: ReactNode;
};

/**
 * Glass bento tile with a pointer-following spotlight border (see .spot in
 * globals.css). Every tile hosts one live mini-demo taken from a real product,
 * which plays by itself when scrolled into view until someone takes over.
 */
export default function Tile({ glow, skill, from, title, className = "", ref, demo = false, children }: TileProps) {
  const own = useRef<HTMLDivElement>(null);
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      own.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as { current: HTMLDivElement | null }).current = el;
    },
    [ref],
  );
  return (
    <div
      ref={setRef}
      onPointerMove={(e) => {
        const el = own.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      onPointerLeave={() => {
        own.current?.style.setProperty("--mx", `-999px`);
        own.current?.style.setProperty("--my", `-999px`);
      }}
      style={{ ["--tile-glow" as string]: glow }}
      className={`spot flex flex-col overflow-hidden rounded-[28px] border border-line bg-[#0a0b0d]/80 p-6 backdrop-blur-sm md:p-7 ${className}`}
    >
      <div className="flex items-center gap-2 text-[13px] text-text-2">
        <span className="h-2 w-2 rounded-full" style={{ background: glow, boxShadow: `0 0 10px ${glow}` }} aria-hidden="true" />
        <span className="text-text">{skill}</span>
        <span className="text-text-3">from {from}</span>
        <AnimatePresence>
          {demo && (
            <motion.span
              key="demo"
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11.5px] text-text-3"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full opacity-70" style={{ background: glow }} />
                <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: glow }} />
              </span>
              Playing a demo · tap to try
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <h3 className="mt-3 max-w-[40ch] text-[clamp(1.15rem,1.5vw,1.4rem)] font-medium leading-[1.3] tracking-[-0.01em] text-text">
        {title}
      </h3>
      <div className="relative mt-5 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
