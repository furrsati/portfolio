"use client";

import { View } from "@react-three/drei";
import { motion, useInView, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useSyncExternalStore } from "react";
import DeviceScene from "@/components/three/DeviceScene";
import { wideLayout } from "@/components/three/framing";
import type { Project } from "@/lib/content/projects";
import Backdrop from "./chapter/Backdrop";
import { FloatingHighlights, HighlightRow } from "./chapter/Highlights";
import { Craft, Links, MetaRow, faint } from "./chapter/parts";
import StoryRail, { beatAt, beats } from "./chapter/StoryRail";

/**
 * prefers-reduced-motion, hydration-safe: the server and the hydrating render
 * both see `false`, then React re-renders with the real preference. (framer's
 * useReducedMotion answers on the first client render, so reduced-motion
 * visitors got a server/client mismatch on every chapter.)
 */
const REDUCE = "(prefers-reduced-motion: reduce)";
const onReduceChange = (cb: () => void) => {
  const m = window.matchMedia(REDUCE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const useReduced = () =>
  useSyncExternalStore(
    onReduceChange,
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );

export default function Chapter({ project, n, total, flip }: { project: Project; n: number; total: number; flip: boolean }) {
  const reduced = useReduced();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const inView = useInView(section, { amount: 0.25, once: true });
  // Mount the 3D scene the first time the chapter comes within a screen of the
  // viewport, then keep it: offscreen Views are skipped by the renderer, and
  // remounting would replay the entrance.
  const near = useInView(section, { margin: "100% 0px 100% 0px", once: true });
  // On screen right now: only then do the floating cards follow the pointer.
  const live = useInView(section);

  // Whole-chapter progress: glow, the giant name's drift, the device turn.
  const { scrollYProgress } = useScroll({ target: section, offset: ["start end", "end start"] });
  // Pinned-range progress: the story beats, the rail and the device choreography.
  const { scrollYProgress: pin } = useScroll({ target: section, offset: ["start 30%", "end end"] });
  // Below lg nothing pins: the device sits in a band above the copy. There the
  // beats follow the rail's own trip up the screen (each opens while it is in
  // easy reading reach), and the device plays out while its stage crosses the
  // viewport (fan opens as it rises into view, the film scrubs through).
  const { scrollYProgress: railPass } = useScroll({ target: rail, offset: ["start 80%", "end 35%"] });
  const { scrollYProgress: stagePass } = useScroll({ target: stage, offset: ["start end", "end start"] });
  const story = useTransform([pin, railPass], ([p, r]: number[]) => (wideLayout() ? p : r));
  const drive = useTransform([pin, stagePass], ([p, s]: number[]) => (wideLayout() ? p : Math.min(1, Math.max(0, (s - 0.15) / 0.7))));
  const [auto, setAuto] = useState(0);
  const [shot, setShot] = useState(0);
  const [manual, setManual] = useState<number | null>(null);
  useMotionValueEvent(story, "change", (v) => {
    const step = beatAt(v);
    if (step !== auto) {
      setAuto(step);
      setManual(null);
    }
  });
  // The device's own beat: the story's on desktop (same progress), its stage's below lg.
  useMotionValueEvent(drive, "change", (v) => {
    const step = beatAt(v);
    if (step !== shot) setShot(step);
  });
  const beat = manual ?? auto;
  // Spread the screens across the three beats: first screen on the challenge, last on the result.
  const screen = Math.round(((manual ?? shot) * (project.screens.length - 1)) / (beats.length - 1));
  const a = project.glow[0];

  return (
    <section ref={section} id={project.slug} aria-labelledby={`${project.slug}-name`} className="relative lg:h-[190vh]">
      {near && <Backdrop section={section} project={project} flip={flip} progress={scrollYProgress} reduced={reduced} />}

      <div className="relative lg:sticky lg:top-0 lg:h-screen">
        {/* Side gutters as variables (the stage and the card row bleed through
            them below lg), clear of the notch on phones held sideways. */}
        <div
          className={`mx-auto grid h-full max-w-[1500px] grid-cols-1 gap-7 pb-16 pl-[var(--gl)] pr-[var(--gr)] pt-14 [--gl:max(1.25rem,env(safe-area-inset-left))] [--gr:max(1.25rem,env(safe-area-inset-right))] md:[--gl:max(2.5rem,env(safe-area-inset-left))] md:[--gr:max(2.5rem,env(safe-area-inset-right))] lg:grid-rows-[minmax(0,1fr)] lg:gap-10 lg:pb-6 lg:pt-[88px] lg:[--gl:3rem] lg:[--gr:3rem] xl:gap-14 2xl:[--gl:4rem] 2xl:[--gr:4rem] ${
            flip
              ? "lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]"
              : "lg:grid-cols-2 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]"
          }`}
        >
          {/* Words */}
          <div
            className={`relative z-10 order-2 flex min-w-0 flex-col lg:max-w-[540px] lg:justify-center ${flip ? "lg:order-2 lg:justify-self-end" : "lg:order-1"}`}
          >
            <MetaRow project={project} n={n} total={total} />

            <div className="mt-[clamp(0.9rem,2vh,1.4rem)] shrink-0 overflow-hidden pb-1">
              <motion.h2
                id={`${project.slug}-name`}
                // Same first render on server and client (reduced motion is only known
                // after hydration); with reduced motion the name simply appears.
                initial={{ y: "105%" }}
                animate={inView || reduced ? { y: 0 } : undefined}
                transition={reduced ? { duration: 0 } : { duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap items-baseline gap-x-4 text-[clamp(2.75rem,min(5.4vw,8.6vh),5.75rem)] font-semibold leading-[0.95] tracking-[-0.035em] [font-variation-settings:'wdth'_80,'opsz'_96]"
              >
                <span className="inline-flex items-center gap-[0.22em]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- tiny static app icon sized in em */}
                  <img
                    src={`/logos/${project.slug}.png`}
                    alt=""
                    aria-hidden="true"
                    width={96}
                    height={96}
                    decoding="async"
                    className="block h-[0.66em] w-[0.66em] max-w-none translate-y-[0.04em] rounded-[22%] shadow-[0_10px_30px_-10px_rgba(0,0,0,.8)] ring-1 ring-white/10"
                  />
                  {project.name}
                </span>
                {project.nameAr && (
                  <span lang="ar" dir="rtl" className={`font-arabic text-[0.4em] font-medium tracking-normal ${faint}`}>
                    {project.nameAr}
                  </span>
                )}
              </motion.h2>
            </div>
            <p className="mt-[clamp(0.6rem,1.4vh,1rem)] max-w-[40ch] text-[clamp(1.08rem,min(1.4vw,2.3vh),1.3rem)] leading-[1.38] text-text max-lg:text-pretty">
              {project.headline}
            </p>

            <div ref={rail} className="mt-[clamp(1.25rem,3.2vh,2.4rem)]">
              <StoryRail project={project} beat={beat} onPick={setManual} pin={story} />
            </div>

            <div className="mt-5 lg:hidden">
              <HighlightRow project={project} />
            </div>

            <div className="mt-[clamp(1.1rem,2.6vh,2rem)] flex flex-col gap-[clamp(0.85rem,1.8vh,1.25rem)] border-t border-line pt-[clamp(0.9rem,2vh,1.5rem)]">
              <Craft project={project} />
              <Links project={project} color={a} />
            </div>
          </div>

          {/* Stage: the device, with the highlights floating around it on desktop.
              Below lg a full-bleed band about as tall as the screen is wide;
              on a phone held sideways, short enough to sit whole under the nav.
              Small viewport units, so it never jumps with the URL bar. */}
          <div
            ref={stage}
            className={`relative order-1 -ml-[var(--gl)] -mr-[var(--gr)] h-[max(min(52svh,100vw),min(340px,100svh_-_6rem))] lg:ml-0 lg:mr-0 lg:h-auto lg:max-h-full lg:min-h-0 lg:w-full lg:self-center lg:aspect-[0.86] ${
              flip ? "lg:order-1" : "lg:order-2"
            }`}
          >
            {near && (
              <View className="absolute inset-0">
                <DeviceScene
                  device={project.device}
                  screens={project.screens}
                  film={project.film}
                  index={screen}
                  glow={project.glow}
                  progress={scrollYProgress}
                  pin={drive}
                  sweep={flip ? -0.45 : 0.45}
                  enter={inView}
                  reduced={reduced}
                  variant="chapter"
                />
              </View>
            )}
            <FloatingHighlights project={project} flip={flip} enter={inView} reduced={reduced} live={live} progress={scrollYProgress} />
          </div>
        </div>
      </div>
    </section>
  );
}
