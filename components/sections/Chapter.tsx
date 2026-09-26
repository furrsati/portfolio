"use client";

import { View } from "@react-three/drei";
import { motion, useInView, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { useRef, useState } from "react";
import DeviceScene from "@/components/three/DeviceScene";
import type { Project } from "@/lib/content/projects";
import Backdrop from "./chapter/Backdrop";
import { FloatingHighlights, HighlightRow } from "./chapter/Highlights";
import { Craft, Links, MetaRow } from "./chapter/parts";
import StoryRail, { beatAt, beats } from "./chapter/StoryRail";

export default function Chapter({ project, n, total, flip }: { project: Project; n: number; total: number; flip: boolean }) {
  const reduced = useReducedMotion() ?? false;
  const section = useRef<HTMLElement>(null);
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
  const [auto, setAuto] = useState(0);
  const [manual, setManual] = useState<number | null>(null);
  useMotionValueEvent(pin, "change", (v) => {
    const step = beatAt(v);
    if (step !== auto) {
      setAuto(step);
      setManual(null);
    }
  });
  const beat = manual ?? auto;
  // Spread the screens across the three beats: first screen on the challenge, last on the result.
  const screen = Math.round((beat * (project.screens.length - 1)) / (beats.length - 1));
  const a = project.glow[0];

  return (
    <section ref={section} id={project.slug} aria-labelledby={`${project.slug}-name`} className="relative lg:h-[190vh]">
      {near && <Backdrop section={section} project={project} flip={flip} progress={scrollYProgress} reduced={reduced} />}

      <div className="relative lg:sticky lg:top-0 lg:h-screen">
        <div
          className={`mx-auto grid h-full max-w-[1500px] grid-cols-1 gap-7 px-5 pb-16 pt-14 md:px-10 lg:grid-rows-[minmax(0,1fr)] lg:gap-10 lg:px-12 lg:pb-6 lg:pt-[88px] xl:gap-14 2xl:px-16 ${
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
                  <span lang="ar" dir="rtl" className="font-arabic text-[0.4em] font-medium tracking-normal text-text-3">
                    {project.nameAr}
                  </span>
                )}
              </motion.h2>
            </div>
            <p className="mt-[clamp(0.6rem,1.4vh,1rem)] max-w-[40ch] text-[clamp(1.08rem,min(1.4vw,2.3vh),1.3rem)] leading-[1.38] text-text">
              {project.headline}
            </p>

            <div className="mt-[clamp(1.25rem,3.2vh,2.4rem)]">
              <StoryRail project={project} beat={beat} onPick={setManual} pin={pin} />
            </div>

            <div className="mt-5 lg:hidden">
              <HighlightRow project={project} />
            </div>

            <div className="mt-[clamp(1.1rem,2.6vh,2rem)] flex flex-col gap-[clamp(0.85rem,1.8vh,1.25rem)] border-t border-line pt-[clamp(0.9rem,2vh,1.5rem)]">
              <Craft project={project} />
              <Links project={project} color={a} />
            </div>
          </div>

          {/* Stage: the device, with the highlights floating around it on desktop */}
          <div
            className={`relative order-1 h-[52svh] min-h-[340px] lg:h-auto lg:max-h-full lg:min-h-0 lg:w-full lg:self-center lg:aspect-[0.86] ${
              flip ? "lg:order-1" : "lg:order-2"
            }`}
          >
            {near && (
              <View className="absolute inset-0">
                <DeviceScene
                  device={project.device}
                  screens={project.screens}
                  index={screen}
                  glow={project.glow}
                  progress={scrollYProgress}
                  pin={pin}
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
