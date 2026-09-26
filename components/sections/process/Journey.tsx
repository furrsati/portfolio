"use client";

import { motion, useInView, useMotionValueEvent, useScroll } from "framer-motion";
import { Mouse } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EASE, GUTTER, stepAt, stepStarts, steps } from "./data";
import Rail, { Node } from "./Rail";
import Stage from "./Stage";
import { useReducedSafe } from "./usePhases";

/**
 * Below lg: one step at a time, each with its own stage that plays as it
 * scrolls into view. Visibility is measured against a band of the viewport
 * rather than a share of the step, so a step taller than the screen (a phone
 * held sideways) still plays.
 */
function MobileStep({ i, reduced }: { i: number; reduced: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -30% 0px" });
  const play = useInView(stage, { margin: "-20% 0px -20% 0px" });
  const s = steps[i];
  return (
    <li ref={ref} className="relative">
      <div className="flex items-center gap-3.5">
        <Node i={i} state={play ? "now" : seen ? "done" : "todo"} reduced={reduced} />
        <h3 className="text-[26px] font-medium leading-none tracking-[-0.02em] text-text">{s.name}</h3>
      </div>
      <p className="mt-3 max-w-[52ch] text-pretty text-[16px] leading-[1.6] text-text-2">{s.body}</p>
      <div ref={stage} className="mt-6">
        <Stage step={i} play={play} reduced={reduced} single />
      </div>
    </li>
  );
}

/**
 * "How I work" as a journey. On desktop the section pins for about three
 * screens: scrolling walks the rail through Scope, Build, Ship and Hand over,
 * and the stage on the right morphs into a small live picture of each step.
 * Clicking a step scrolls to it, so the rail, the stage and the scroll never
 * disagree. Below lg the steps simply stack.
 */
export default function Journey() {
  const reduced = useReducedSafe();
  const track = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const entered = useInView(frame, { amount: 0.3, once: true });
  const stageLive = useInView(stage, { amount: 0.35 });

  const { scrollYProgress: pin } = useScroll({ target: track, offset: ["start start", "end end"] });
  const [auto, setAuto] = useState(0);
  // A step picked on the rail holds the stage while the page glides there.
  const [picked, setPicked] = useState<number | null>(null);
  const release = useRef<ReturnType<typeof setTimeout>>(undefined);
  useMotionValueEvent(pin, "change", (v) => {
    const s = stepAt(v);
    if (s !== auto) setAuto(s);
    if (picked !== null && s === picked) setPicked(null);
  });
  useEffect(() => () => clearTimeout(release.current), []);
  const step = picked ?? auto;

  const pick = (i: number) => {
    const el = track.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const range = el.offsetHeight - window.innerHeight;
    const y = Math.round(top + range * (i === 0 ? 0 : stepStarts[i] + 0.05));
    if (Math.abs(window.scrollY - y) < 2) return;
    setPicked(i);
    clearTimeout(release.current);
    release.current = setTimeout(() => setPicked(null), 1800);
    window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <>
      {/* Pulled up by the nav's anchor offset, so "How I work" lands exactly where the pin starts */}
      <div ref={track} className="relative lg:-mt-20 lg:h-[330vh]">
        <div ref={frame} className="relative lg:sticky lg:top-0 lg:h-svh lg:min-h-[640px]">
          <div className={`mx-auto grid h-full max-w-[1500px] grid-cols-1 pt-28 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:items-center lg:gap-12 lg:pb-7 lg:pt-[92px] xl:gap-16 ${GUTTER}`}>
            <div className="flex min-w-0 flex-col lg:max-w-[520px]">
              <div className="overflow-hidden pb-1">
                <motion.h2
                  id="process-title"
                  initial={{ y: "105%" }}
                  animate={entered || reduced ? { y: 0 } : undefined}
                  transition={reduced ? { duration: 0 } : { duration: 0.9, ease: EASE }}
                  className="text-[clamp(2.75rem,min(5.4vw,8.6svh),5.75rem)] font-semibold leading-[0.95] tracking-[-0.035em] [font-variation-settings:'wdth'_80,'opsz'_96]"
                >
                  How I work
                </motion.h2>
              </div>
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={entered || reduced ? { opacity: 1, y: 0 } : undefined}
                transition={reduced ? { duration: 0 } : { duration: 0.9, ease: EASE, delay: 0.12 }}
                className="mt-[clamp(0.9rem,2svh,1.4rem)] max-w-[44ch] text-pretty text-[clamp(1.05rem,min(1.4vw,2.3svh),1.25rem)] leading-[1.45] text-text-2"
              >
                One accountable person from the first call to launch day. You always know what’s done, what’s next and what it costs.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={entered || reduced ? { opacity: 1, y: 0 } : undefined}
                transition={reduced ? { duration: 0 } : { duration: 1, ease: EASE, delay: 0.24 }}
                className="mt-[clamp(1.5rem,4.2svh,2.75rem)] hidden lg:block"
              >
                <Rail step={step} onPick={pick} pin={pin} reduced={reduced} />
                <p className="mt-[clamp(0.75rem,2svh,1.5rem)] flex items-center gap-2 text-[13px] text-text-3">
                  <Mouse className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                  Scroll to walk through it, or pick a step.
                </p>
              </motion.div>
            </div>

            <motion.div
              ref={stage}
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={entered || reduced ? { opacity: 1, y: 0, scale: 1 } : undefined}
              transition={reduced ? { duration: 0 } : { duration: 1.1, ease: EASE, delay: 0.18 }}
              className="relative hidden h-[clamp(470px,calc(100svh-150px),680px)] lg:block"
            >
              <Stage step={step} play={stageLive} reduced={reduced} />
            </motion.div>
          </div>
        </div>
      </div>

      <ol aria-label="How a project runs" className={`mx-auto mt-12 flex max-w-[1500px] flex-col gap-16 lg:hidden ${GUTTER}`}>
        {steps.map((s, i) => (
          <MobileStep key={s.key} i={i} reduced={reduced} />
        ))}
      </ol>
    </>
  );
}
