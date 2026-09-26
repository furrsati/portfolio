"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { Project } from "@/lib/content/projects";

/**
 * Everything that sits BEHIND the 3D device: the brand glow and the giant
 * project name. The WebGL canvas is a fixed layer under the page content, so
 * a backdrop inside the section would paint over the device. Instead this
 * layer is portalled to <body> below the canvas and laid over the section's
 * box in document coordinates. It scrolls natively with the page (no JS on
 * scroll), and its sticky frame pins in step with the chapter's own.
 */
export default function Backdrop({
  section,
  project,
  flip,
  progress,
  reduced,
}: {
  section: RefObject<HTMLElement | null>;
  project: Project;
  flip: boolean;
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const [a, b] = project.glow;

  useEffect(() => {
    const s = section.current;
    const l = layer.current;
    if (!s || !l) return;
    const place = () => {
      const r = s.getBoundingClientRect();
      l.style.top = `${Math.round(r.top + window.scrollY)}px`;
      l.style.height = `${Math.round(r.height)}px`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(s);
    ro.observe(document.body);
    window.addEventListener("resize", place);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [section]);

  const glow = useTransform(progress, [0.1, 0.33, 0.72, 0.95], [0, 1, 1, 0]);
  const shown = useTransform(progress, [0.08, 0.3, 0.75, 0.97], [0, 1, 1, 0]);
  // The name drifts with the chapter, never on its own.
  const x = useTransform(progress, [0, 1], reduced ? ["0vw", "0vw"] : ["7vw", "-7vw"]);

  // Fade the lettering out behind the text column so it never touches legibility.
  const fade = flip
    ? "linear-gradient(90deg, #000 0%, #000 42%, transparent 66%)"
    : "linear-gradient(270deg, #000 0%, #000 42%, transparent 66%)";

  const stroke = `color-mix(in oklab, ${a} 46%, rgba(255,255,255,0.2))`;
  const word = (className: string) => (
    <span
      className={`block font-extrabold leading-[0.8] tracking-[-0.045em] text-transparent [font-variation-settings:'wdth'_75,'opsz'_96] ${className}`}
      style={{ WebkitTextStroke: `1.25px ${stroke}` }}
    >
      {project.name}
    </span>
  );

  return createPortal(
    <div ref={layer} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 select-none [overflow:clip]">
      {/* Desktop: pinned with the chapter, drifting with its progress */}
      <div className="sticky top-0 hidden h-screen [overflow:clip] lg:block">
        <motion.div
          className="absolute inset-0"
          style={{
            opacity: glow,
            background: `radial-gradient(46% 58% at ${flip ? "30%" : "70%"} 54%, color-mix(in oklab, ${a} 16%, transparent), transparent 72%), radial-gradient(30% 36% at ${flip ? "16%" : "84%"} 88%, color-mix(in oklab, ${b} 13%, transparent), transparent 70%)`,
          }}
        />
        <motion.div
          className="absolute inset-0 flex flex-col justify-center pt-[9vh]"
          style={{ opacity: shown, maskImage: `${fade}, linear-gradient(180deg, #000 0%, #000 44%, transparent 80%)`, maskComposite: "intersect" }}
        >
          <div className={`relative flex whitespace-nowrap ${flip ? "justify-start pl-[3vw]" : "justify-end pr-[3vw]"}`}>
            <motion.div style={{ x }}>{word("text-[clamp(7rem,21vw,26rem)]")}</motion.div>
          </div>
        </motion.div>
      </div>
      {/* Below lg: the glow and a smaller, still word behind the device (same box as the stage) */}
      <div
        className="absolute inset-x-0 top-14 h-[max(min(52svh,100vw),min(340px,100svh_-_6rem))] lg:hidden"
        style={{ background: `radial-gradient(52% 50% at 50% 50%, color-mix(in oklab, ${a} 20%, transparent), transparent 72%)` }}
      />
      <div className="absolute inset-x-0 top-[calc(3.5rem+max(min(26svh,50vw),min(170px,50svh_-_3rem)))] flex -translate-y-1/2 justify-center whitespace-nowrap lg:hidden">
        {word("text-[min(30vw,40svh)]")}
      </div>
    </div>,
    document.body,
  );
}
