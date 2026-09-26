"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, type ReactNode, type Ref } from "react";

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

/** Below the desktop grid, tiles size to their content (one per row on phones). */
const STACKED = "(max-width: 1023.98px)";

/**
 * Glass bento tile with a pointer-following spotlight border (see .spot in
 * globals.css). Every tile hosts one live mini-demo taken from a real product,
 * which plays by itself when scrolled into view until someone takes over.
 *
 * Phones and tablets: when the header is too narrow for one line, the source
 * drops to its own line and the demo pill shortens to "Tap to try", so the
 * header keeps one height whether or not a demo is playing.
 */
export default function Tile({ glow, skill, from, title, className = "", ref, demo = false, children }: TileProps) {
  const own = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      own.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as { current: HTMLDivElement | null }).current = el;
    },
    [ref],
  );

  // Stacked layouts: a demo swapping a one-line message for a three-line one
  // would resize the tile and shove the rest of the page up and down on every
  // loop. The body keeps the tallest height it has needed at this width
  // instead (spacers inside the demo take up the slack), so it only ever grows.
  useEffect(() => {
    const el = body.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const stacked = window.matchMedia(STACKED);
    let width = -1;
    let floor = 0;
    const clear = () => {
      floor = 0;
      el.style.minHeight = "";
    };
    const ro = new ResizeObserver(() => {
      if (!stacked.matches) {
        if (floor) clear();
        return;
      }
      const w = el.clientWidth;
      if (w !== width) {
        width = w;
        clear();
      }
      const h = el.getBoundingClientRect().height;
      if (h > floor + 0.5) {
        floor = h;
        el.style.minHeight = `${h}px`;
      }
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      clear();
    };
  }, []);

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
      className={`spot flex touch-manipulation flex-col overflow-hidden rounded-[28px] border border-line bg-[#0a0b0d]/80 p-6 backdrop-blur-sm [-webkit-tap-highlight-color:transparent] max-lg:backdrop-blur-none md:p-7 ${className}`}
    >
      <div className="@container/head">
        <div className="flex items-center gap-2 text-[13px] text-text-2 max-lg:min-h-6 max-lg:@max-[34rem]/head:flex-wrap max-lg:@max-[34rem]/head:gap-y-0.5">
          <span
            className="h-2 w-2 rounded-full max-lg:@max-[34rem]/head:shrink-0"
            style={{ background: glow, boxShadow: `0 0 10px ${glow}` }}
            aria-hidden="true"
          />
          <span className="text-text max-lg:@max-[34rem]/head:flex max-lg:@max-[34rem]/head:min-h-6 max-lg:@max-[34rem]/head:min-w-0 max-lg:@max-[34rem]/head:flex-1 max-lg:@max-[34rem]/head:items-center">
            {skill}
          </span>
          <span className="text-text-3 max-lg:@max-[34rem]/head:order-last max-lg:@max-[34rem]/head:basis-full max-lg:@max-[34rem]/head:pl-4">
            from {from}
          </span>
          <AnimatePresence>
            {demo && (
              <motion.span
                key="demo"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11.5px] text-text-3 max-lg:h-6 max-lg:shrink-0 max-lg:py-0 max-lg:text-[12px] max-lg:leading-none max-lg:text-text-2 max-lg:@max-[34rem]/head:px-2"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full opacity-70" style={{ background: glow }} />
                  <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: glow }} />
                </span>
                <span className="max-lg:@max-[34rem]/head:hidden">Playing a demo · tap to try</span>
                <span className="hidden max-lg:@max-[34rem]/head:inline">
                  <span className="sr-only">Playing a demo. </span>Tap to try
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
      <h3 className="mt-3 max-w-[40ch] text-[clamp(1.15rem,1.5vw,1.4rem)] font-medium leading-[1.3] tracking-[-0.01em] text-text max-lg:text-balance">
        {title}
      </h3>
      <div ref={body} className="relative mt-5 flex min-h-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
