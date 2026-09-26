"use client";

import { motion } from "framer-motion";
import { CalendarCheck, Check, CornerDownRight, FileText } from "lucide-react";
import { usePhases } from "../usePhases";
import { glass, IconTile, Swap, Tick, Wipe } from "../ui";
import type { VisualProps } from "./types";

type Kind = "must" | "later" | "done";
const sections: { title: string; kind: Kind; items: { text: string; k: number }[] }[] = [
  { title: "What has to work", kind: "must", items: [{ text: "Sign up and pay in the app", k: 0 }, { text: "Refunds from the admin", k: 1 }] },
  { title: "What can wait", kind: "later", items: [{ text: "Dark mode", k: 2 }, { text: "Referral codes", k: 3 }] },
  { title: "What done means", kind: "done", items: [{ text: "Live on both stores", k: 4 }, { text: "Your team runs it day to day", k: 5 }] },
];

const LINE = 470;
const FIRST = 650;
// For every line: when it starts writing, then when it's ticked. Then the milestone, then "Agreed".
const times = [
  ...Array.from({ length: 6 }, (_, k) => [FIRST + k * LINE, FIRST + k * LINE + 400]).flat(),
  FIRST + 6 * LINE + 150,
  FIRST + 6 * LINE + 650,
];

/** Step 1: a written scope that fills itself in, line by line, then gets its first milestone. */
export default function ScopeVisual({ play, reduced, accent }: VisualProps) {
  const phase = usePhases(play, times, reduced);
  const milestone = phase > 12;
  const agreed = phase > 13;

  return (
    <div className="relative mx-auto w-full max-w-[450px]">
      {/* The previous draft, peeking out behind */}
      <div aria-hidden="true" className={`absolute inset-0 translate-x-3 translate-y-3 rotate-[2.2deg] opacity-45 ${glass}`} />

      <div className={`relative px-4 pb-4 pt-3.5 @md:px-5 @md:pb-5 @md:pt-4 ${glass}`}>
        <div className="flex items-center gap-2.5 @sm:gap-3">
          <IconTile accent={accent} size={32}>
            <FileText className="h-4 w-4" strokeWidth={1.8} />
          </IconTile>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-medium leading-tight text-text">Scope · your project</div>
            <div className="mt-0.5 text-[12px] leading-tight text-text-3">
              <span className="hidden @min-[340px]:inline">Written down, shared with you</span>
              <span className="@min-[340px]:hidden">Shared with you</span>
            </div>
          </div>
          <span
            className="inline-flex h-7 shrink-0 items-center rounded-full border px-2 text-[12px] transition-[border-color,background-color,color] duration-500 @sm:px-2.5"
            style={{
              borderColor: agreed ? `color-mix(in oklab, ${accent} 45%, transparent)` : "var(--line-strong)",
              background: agreed ? `color-mix(in oklab, ${accent} 14%, transparent)` : "transparent",
              color: agreed ? accent : "var(--text-2)",
            }}
          >
            <Swap on={agreed} off="Draft" onNode={<><Check className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />Agreed</>} />
          </span>
        </div>

        <div className="mt-3.5 flex flex-col gap-3 border-t border-white/[0.07] pt-3.5 @md:mt-4 @md:gap-3.5 @md:pt-4">
          {sections.map((s) => (
            <div key={s.title}>
              <div className="text-[12px] font-medium tracking-[0.01em] text-text-3">{s.title}</div>
              <ul className="mt-1">
                {s.items.map(({ text, k }) => {
                  const written = phase > k * 2;
                  const done = phase > k * 2 + 1;
                  return (
                    <li key={text} className="flex h-[28px] items-center gap-2.5 @md:h-[30px]">
                      {s.kind === "later" ? (
                        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-text-3">
                          <CornerDownRight className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                        </span>
                      ) : (
                        <Tick on={done} accent={accent} reduced={reduced} />
                      )}
                      <Wipe on={written} reduced={reduced} className={`min-w-0 text-[13.5px] @md:text-[14px] ${s.kind === "later" ? "text-text-2" : "text-text"}`}>
                        {text}
                      </Wipe>
                      {s.kind === "later" && (
                        <motion.span
                          initial={false}
                          animate={done ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: -6, scale: 0.9 }}
                          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 24 }}
                          className="ml-auto shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-text-3"
                        >
                          Later
                        </motion.span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Space is reserved from the start, the chip only lands in it */}
        <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3.5 @md:mt-4 @md:pt-4">
          <span className="text-[12px] text-text-3">First milestone</span>
          <motion.span
            initial={false}
            animate={milestone ? { opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" } : { opacity: 0, scale: 1.35, rotate: -6, filter: "blur(4px)" }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 20, mass: 0.9 }}
            className="inline-flex h-8 items-center gap-2 rounded-full pl-2 pr-3 text-[13px] font-medium"
            style={{
              color: accent,
              background: `color-mix(in oklab, ${accent} 14%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 40%, transparent), 0 10px 30px -12px color-mix(in oklab, ${accent} 60%, transparent)`,
            }}
          >
            <CalendarCheck className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
            Milestone 1 · week 2
          </motion.span>
        </div>
      </div>
    </div>
  );
}
