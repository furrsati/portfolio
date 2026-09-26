"use client";

import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Project } from "@/lib/content/projects";
import { highlightIcons } from "./icons";

type Highlight = Project["highlights"][number];

function Icon({ h, a, size = "md" }: { h: Highlight; a: string; size?: "md" | "sm" }) {
  const I = highlightIcons[h.icon];
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${size === "md" ? "h-9 w-9 rounded-[12px]" : "h-8 w-8 rounded-[10px]"}`}
      style={{
        background: `color-mix(in oklab, ${a} 16%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${a} 22%, transparent)`,
        color: a,
      }}
    >
      <I className={size === "md" ? "h-[18px] w-[18px]" : "h-4 w-4"} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

/**
 * Where the three cards sit when the stage is on the right (mirrored on the
 * left). The device and its pedestal are framed to the middle ~80% of the
 * stage, so the cards live in the bands above and below it: one on the near
 * top corner, one on the far side a little lower, one under the pedestal.
 */
const spots: CSSProperties[] = [
  { top: "2.5%", left: "0%" },
  { top: "7%", right: "0%" },
  { bottom: "0.5%", left: "13%" },
];
/** Screens, laptops and windows reach higher than a fan of phones: keep the far card up top. */
const wideSpots: CSSProperties[] = [spots[0], { top: "3.5%", right: "0%" }, spots[2]];

function mirror(s: CSSProperties): CSSProperties {
  const { left, right, ...rest } = s;
  return { ...rest, ...(left !== undefined ? { right: left } : {}), ...(right !== undefined ? { left: right } : {}) };
}

/** Pointer position in -1..1, softened by a spring; listens only while `active`. */
function usePointer(active: boolean) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  useEffect(() => {
    if (!active) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [active, mx, my]);
  const spring = { stiffness: 42, damping: 16, mass: 1 };
  return [useSpring(mx, spring), useSpring(my, spring)] as const;
}

const depths = [
  { pointer: 12, scroll: 18 },
  { pointer: 22, scroll: 34 },
  { pointer: 16, scroll: 26 },
];

function FloatCard({
  h,
  a,
  i,
  place,
  px,
  py,
  progress,
  enter,
  reduced,
  compact,
}: {
  h: Highlight;
  a: string;
  i: number;
  place: CSSProperties;
  px: MotionValue<number>;
  py: MotionValue<number>;
  progress: MotionValue<number>;
  enter: boolean;
  reduced: boolean;
  /** Short stage: show icon and title, and open the sentence on hover or tap. */
  compact: boolean;
}) {
  const [open, setOpen] = useState(false);
  const shut = compact && !open;
  const d = reduced ? { pointer: 0, scroll: 0 } : depths[i];
  const x = useTransform(px, (v) => -v * d.pointer);
  const drift = useTransform(progress, [0, 1], [d.scroll, -d.scroll]);
  const y = useTransform([py, drift], ([p, s]: number[]) => -p * d.pointer * 0.7 + s);

  return (
    <motion.li className={`absolute ${compact ? "w-[min(224px,47%)]" : "w-[min(246px,41%)]"}`} style={{ ...place, x, y }}>
      {/* Entrance, once. Kept apart from the hover lift so leaving a card never replays its delay. */}
      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.94 }}
        animate={enter || reduced ? { opacity: 1, y: 0, scale: 1 } : undefined}
        transition={reduced ? { duration: 0 } : { duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.55 + i * 0.14 }}
      >
        <motion.div
          whileHover={reduced ? undefined : { y: -6 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          onHoverStart={() => setOpen(true)}
          onHoverEnd={() => setOpen(false)}
          onTap={() => compact && setOpen((o) => !o)}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
            e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
          }}
          onPointerLeave={(e) => {
            e.currentTarget.style.setProperty("--mx", "-999px");
            e.currentTarget.style.setProperty("--my", "-999px");
          }}
          style={{ ["--tile-glow" as string]: a }}
          className="spot pointer-events-auto rounded-[22px] border border-white/[0.1] bg-[rgba(16,17,20,0.5)] p-3.5 shadow-[0_30px_70px_-28px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl backdrop-saturate-150 xl:p-4"
        >
          <div className="flex items-center gap-3">
            <Icon h={h} a={a} />
            <h3 className="text-[14.5px] font-medium leading-[1.25] tracking-[-0.005em] text-text">{h.title}</h3>
          </div>
          <div
            className="grid"
            style={{ gridTemplateRows: shut ? "0fr" : "1fr", transition: "grid-template-rows 520ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          >
            <div className="min-h-0 overflow-hidden">
              <p
                className="pt-2.5 text-[13px] leading-[1.5] text-text-2 transition-opacity duration-500"
                style={{ opacity: shut ? 0 : 1 }}
              >
                {h.body}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.li>
  );
}

/** Desktop: three glass cards floating around the device, each at its own depth. */
export function FloatingHighlights({
  project,
  flip,
  enter,
  reduced,
  live,
  progress,
}: {
  project: Project;
  flip: boolean;
  enter: boolean;
  reduced: boolean;
  /** The chapter is on screen: only then does it follow the pointer. */
  live: boolean;
  progress: MotionValue<number>;
}) {
  const [px, py] = usePointer(live && !reduced);
  const a = project.glow[0];
  const layout = project.device === "phone" ? spots : wideSpots;
  // Full cards need a tall stage; on a short one (small laptops, tablets in
  // landscape) they fold to icon + title so they never sit on the device.
  const box = useRef<HTMLUListElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCompact(e.contentRect.height > 0 && e.contentRect.height < 600));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <ul ref={box} aria-label={`${project.name} highlights`} className="pointer-events-none absolute inset-0 z-10 hidden lg:block">
      {project.highlights.map((h, i) => (
        <FloatCard
          key={h.title}
          h={h}
          a={a}
          i={i}
          place={flip ? mirror(layout[i]) : layout[i]}
          px={px}
          py={py}
          progress={progress}
          enter={enter}
          reduced={reduced}
          compact={compact}
        />
      ))}
    </ul>
  );
}

/** Below lg: the same cards as a horizontal snap row. */
export function HighlightRow({ project }: { project: Project }) {
  const a = project.glow[0];
  return (
    <ul
      aria-label={`${project.name} highlights`}
      className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:-mx-10 md:scroll-px-10 md:px-10 lg:hidden [&::-webkit-scrollbar]:hidden"
    >
      {project.highlights.map((h) => (
        <li
          key={h.title}
          className="w-[76%] max-w-[300px] shrink-0 snap-start rounded-[20px] border border-line bg-white/[0.025] p-4 sm:w-[46%]"
        >
          <div className="flex items-center gap-3">
            <Icon h={h} a={a} size="sm" />
            <h3 className="text-[14.5px] font-medium leading-[1.25] text-text">{h.title}</h3>
          </div>
          <p className="mt-2.5 text-[13px] leading-[1.5] text-text-2">{h.body}</p>
        </li>
      ))}
    </ul>
  );
}
