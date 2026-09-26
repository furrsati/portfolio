"use client";

import { motion } from "framer-motion";
import { BookOpen, Check, KeyRound, LayoutDashboard, Lock, Mail } from "lucide-react";
import { usePhases } from "../usePhases";
import { glass, glassSurface, IconTile, Swap, Wipe } from "../ui";
import type { VisualProps } from "./types";

const times = [650, 1500, 2200, 2500, 3000, 3450, 3900];

const handed = [
  { icon: KeyRound, title: "Access", sub: "Every account and key" },
  { icon: LayoutDashboard, title: "Admin", sub: "Your team runs it daily" },
  { icon: BookOpen, title: "Docs", sub: "Written down, not in my head" },
];

/** Step 4: your team signs in to its own admin, and everything gets stamped "Yours". */
export default function HandoverVisual({ play, reduced, accent }: VisualProps) {
  const phase = usePhases(play, times, reduced);
  const email = phase >= 1;
  const pw = phase >= 2;
  const press = phase >= 3;
  const signedIn = phase >= 4;

  return (
    <div className="mx-auto grid w-full max-w-[590px] grid-cols-1 gap-2.5 @lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @lg:items-center @lg:gap-3">
      {/* The admin login */}
      <div
        className={`p-3.5 transition-[border-color] duration-700 @md:p-4 ${glass}`}
        style={signedIn ? { borderColor: `color-mix(in oklab, ${accent} 40%, transparent)` } : undefined}
      >
        <div className="flex items-center gap-2.5">
          <span className="h-7 w-7 shrink-0 rounded-[9px]" style={{ background: `linear-gradient(135deg, ${accent}, #FAA21B)` }} aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-[13.5px] font-medium leading-tight text-text">Your admin</div>
            <div className="mt-0.5 truncate text-[12px] leading-tight text-text-3">admin.your-app.com</div>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 @md:mt-3.5">
          <div className="flex h-[34px] items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.03] px-2.5">
            <Mail className="h-3.5 w-3.5 shrink-0 text-text-3" strokeWidth={1.9} aria-hidden="true" />
            <Wipe on={email} reduced={reduced} duration={0.7} className="min-w-0 text-[12.5px] text-text">
              owner@your-company.com
            </Wipe>
          </div>
          <div className="flex h-[34px] items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.03] px-2.5">
            <Lock className="h-3.5 w-3.5 shrink-0 text-text-3" strokeWidth={1.9} aria-hidden="true" />
            <span className="flex items-center gap-[5px]">
              {Array.from({ length: 10 }, (_, i) => (
                <motion.span
                  key={i}
                  className="h-[6px] w-[6px] rounded-full bg-text"
                  initial={false}
                  animate={pw ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.3 }}
                  transition={reduced ? { duration: 0 } : { delay: pw ? i * 0.05 : 0, type: "spring", stiffness: 600, damping: 26 }}
                />
              ))}
            </span>
          </div>
          <motion.div
            initial={false}
            animate={press && !reduced ? { scale: [1, 0.96, 1] } : { scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mt-1 flex h-[34px] items-center justify-center rounded-[10px] text-[12.5px] font-medium transition-[background-color,color,box-shadow] duration-500"
            style={
              signedIn
                ? { background: `color-mix(in oklab, ${accent} 20%, transparent)`, color: accent, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 45%, transparent)` }
                : { background: "var(--text)", color: "#000" }
            }
          >
            <Swap on={signedIn} off="Sign in" onNode={<><Check className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />Signed in as owner</>} />
          </motion.div>
        </div>
      </div>

      {/* What changes hands */}
      <ul className="grid grid-cols-3 gap-2 @lg:grid-cols-1 @lg:gap-2.5">
        {handed.map(({ icon: I, title, sub }, i) => {
          const stamped = phase >= 5 + i;
          return (
            <motion.li
              key={title}
              initial={false}
              animate={stamped && !reduced ? { y: [0, 2.5, 0] } : { y: 0 }}
              transition={{ duration: 0.28, delay: 0.12, ease: "easeOut" }}
              className={`relative flex flex-col items-center gap-1.5 px-2 pb-2.5 pt-3 text-center @lg:flex-row @lg:gap-3 @lg:py-3 @lg:pl-3 @lg:pr-6 @lg:text-left rounded-[16px] ${glassSurface}`}
            >
              <IconTile accent={accent} size={32}>
                <I className="h-4 w-4" strokeWidth={1.8} />
              </IconTile>
              <div className="min-w-0 @lg:flex-1">
                <div className="text-[13px] font-medium leading-tight text-text @lg:text-[13.5px]">{title}</div>
                <div className="mt-0.5 hidden text-[12px] leading-tight text-text-3 @lg:block">{sub}</div>
              </div>
              <motion.span
                initial={false}
                animate={stamped ? { opacity: 1, scale: 1, rotate: -9 } : { opacity: 0, scale: 1.9, rotate: -2 }}
                transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 19, mass: 0.8 }}
                className="mt-0.5 inline-flex shrink-0 items-center rounded-[6px] border-[1.5px] bg-[rgba(14,15,18,0.85)] px-1.5 py-[1px] text-[11px] font-semibold uppercase tracking-[0.14em] @lg:absolute @lg:-right-2 @lg:-top-2.5 @lg:mt-0"
                style={{ color: accent, borderColor: accent, boxShadow: `0 0 18px -6px ${accent}` }}
              >
                Yours
              </motion.span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
