"use client";

import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import { Check, Lock } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { usePhases } from "../usePhases";
import { glass, Swap } from "../ui";
import type { VisualProps } from "./types";

const WEEK = 1550;
const START = 700;
const CLICK = 1150;
// Per week: the new build lands on staging, then "you" click through it. Then the cursor steps away.
const times = [...[0, 1, 2, 3].flatMap((w) => [START + w * WEEK, START + w * WEEK + CLICK]), START + 3 * WEEK + CLICK + 1500];

const features = ["Sign in", "Browse", "Checkout", "Admin"] as const;

function Bar({ w, className = "" }: { w: string; className?: string }) {
  return <span className={`block h-[7px] rounded-full bg-white/[0.08] ${className}`} style={{ width: w }} />;
}

/** The thing the cursor clicks each week, with a press when it lands. */
function Target({ n, clicked, reduced, className, style, children }: { n: number; clicked: boolean; reduced: boolean; className: string; style?: React.CSSProperties; children: ReactNode }) {
  return (
    <motion.span
      data-target={n}
      initial={false}
      animate={clicked && !reduced ? { scale: [1, 0.93, 1] } : { scale: 1 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className={className}
      style={style}
    >
      {children}
    </motion.span>
  );
}

function SignIn({ accent, clicked, reduced }: { accent: string; clicked: boolean; reduced: boolean }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-[230px] flex-col justify-center gap-2">
      <div className="text-[13px] font-medium text-text">Welcome back</div>
      <div className="flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-[11.5px] text-text-2">you@company.com</div>
      <div className="flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-text-2" />
        ))}
      </div>
      <Target n={1} clicked={clicked} reduced={reduced} className="flex h-8 items-center justify-center rounded-lg text-[12px] font-medium text-black" style={{ background: accent }}>
        <Swap on={clicked} off="Sign in" onNode={<><Check className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />Signed in</>} />
      </Target>
    </div>
  );
}

const thumbs = ["#FAA21B", "#7B7BFF", "#4FB39A"];
function Browse({ accent, clicked, reduced }: { accent: string; clicked: boolean; reduced: boolean }) {
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      {thumbs.map((c, i) => {
        const hit = i === 1 && clicked;
        return (
          <div
            key={c}
            className="flex h-11 items-center gap-2.5 rounded-xl border px-2.5 transition-[border-color,background-color] duration-500"
            style={{ borderColor: hit ? `color-mix(in oklab, ${accent} 50%, transparent)` : "rgba(255,255,255,0.07)", background: hit ? `color-mix(in oklab, ${accent} 8%, transparent)` : "rgba(255,255,255,0.02)" }}
          >
            <span className="h-7 w-7 shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${c}, color-mix(in oklab, ${c} 30%, #111))` }} />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Bar w={["70%", "56%", "64%"][i]} className="bg-white/[0.14]" />
              <Bar w={["40%", "48%", "34%"][i]} />
            </span>
            {i === 1 ? (
              <Target
                n={2}
                clicked={clicked}
                reduced={reduced}
                className="flex h-6 shrink-0 items-center rounded-full px-2.5 text-[11px] font-medium transition-colors duration-300"
                style={{ background: clicked ? accent : "rgba(255,255,255,0.08)", color: clicked ? "#000" : "var(--text)" }}
              >
                <Swap on={clicked} off="Add" onNode={<><Check className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />Added</>} />
              </Target>
            ) : (
              <span className="flex h-6 shrink-0 items-center rounded-full bg-white/[0.06] px-2.5 text-[11px] text-text-2">Add</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Checkout({ accent, clicked, reduced }: { accent: string; clicked: boolean; reduced: boolean }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-[250px] flex-col justify-center gap-2.5">
      <div className="text-[13px] font-medium text-text">Your order</div>
      <div className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
        <div className="flex items-center justify-between gap-3">
          <Bar w="46%" className="bg-white/[0.14]" />
          <Bar w="18%" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Bar w="32%" />
          <Bar w="14%" />
        </div>
        <div className="mt-0.5 flex items-center justify-between border-t border-white/[0.07] pt-2 text-[11.5px]">
          <span className="text-text-2">Total</span>
          <Bar w="22%" className="bg-white/[0.16]" />
        </div>
      </div>
      <Target n={3} clicked={clicked} reduced={reduced} className="flex h-8 items-center justify-center rounded-lg text-[12px] font-medium text-black" style={{ background: accent }}>
        <Swap on={clicked} off="Pay" onNode={<><Check className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />Paid</>} />
      </Target>
    </div>
  );
}

function Admin({ accent, clicked, reduced }: { accent: string; clicked: boolean; reduced: boolean }) {
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-medium text-text">Orders</span>
        <Bar w="22%" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex h-10 items-center gap-2.5 border-t border-white/[0.06]">
          <span className="h-5 w-5 shrink-0 rounded-full bg-white/[0.08]" />
          <Bar w={["30%", "38%", "26%"][i]} className="bg-white/[0.12]" />
          <span className="ml-auto flex items-center gap-1.5">
            <span
              className="inline-flex h-5 items-center rounded-full px-2 text-[10.5px] transition-colors duration-500"
              style={
                i === 0 && clicked
                  ? { background: `color-mix(in oklab, ${accent} 18%, transparent)`, color: accent }
                  : { background: "rgba(74,222,128,0.12)", color: "#7ee2a4" }
              }
            >
              {i === 0 ? <Swap on={clicked} off="Paid" onNode="Refunded" /> : "Paid"}
            </span>
            {i === 0 && (
              <Target
                n={4}
                clicked={clicked}
                reduced={reduced}
                className="inline-flex h-6 items-center rounded-md border border-white/12 px-2 text-[11px] text-text transition-opacity duration-500"
                style={{ opacity: clicked ? 0.45 : 1 }}
              >
                Refund
              </Target>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

const screens = [SignIn, Browse, Checkout, Admin];

/** Step 2: the staging link, a new working build every week, and you clicking through it. */
export default function BuildVisual({ play, reduced, accent }: VisualProps) {
  const phase = usePhases(play, times, reduced);
  const week = Math.min(4, Math.ceil(phase / 2)); // 0 before the first build
  const clickedUpTo = Math.min(4, Math.floor(phase / 2));
  const cursorGone = phase >= times.length;
  // Where the cursor should be: the newest build's button, from the moment it lands.
  const target = week;

  const root = useRef<HTMLDivElement>(null);
  const cx = useMotionValue(0);
  const cy = useMotionValue(0);

  useEffect(() => {
    const r = root.current;
    if (!r || reduced || !target) return;
    const spot = () => {
      const el = r.querySelector<HTMLElement>(`[data-target="${target}"]`);
      if (!el) return null;
      const a = el.getBoundingClientRect();
      const b = r.getBoundingClientRect();
      // The stage may scale this visual; the cursor moves in unscaled pixels.
      const k = b.width / r.offsetWidth || 1;
      return { x: (a.left - b.left + a.width * 0.6) / k, y: (a.top - b.top + a.height * 0.6) / k };
    };
    const p = spot();
    if (!p) return;
    const ease = [0.65, 0, 0.35, 1] as const;
    const ax = animate(cx, p.x, { duration: 0.75, ease, delay: 0.3 });
    const ay = animate(cy, p.y, { duration: 0.75, ease, delay: 0.3 });
    // If the stage is resized, snap onto the target instead of pointing at empty space.
    let first = true; // the observer also fires once on observe
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      const q = spot();
      if (!q) return;
      ax.stop();
      ay.stop();
      cx.set(q.x);
      cy.set(q.y);
    });
    ro.observe(r);
    return () => {
      ax.stop();
      ay.stop();
      ro.disconnect();
    };
  }, [target, reduced, cx, cy]);

  // Start the cursor low on the right, as if it came in from off the window.
  useEffect(() => {
    const r = root.current;
    if (!r) return;
    cx.set(r.offsetWidth * 0.86);
    cy.set(r.offsetHeight * 0.62);
  }, [cx, cy]);

  return (
    <div ref={root} className="relative mx-auto w-full max-w-[560px]">
      <div className={`overflow-hidden ${glass}`}>
        {/* Window bar */}
        <div className="flex h-10 items-center gap-3 border-b border-white/[0.07] px-3.5">
          <span className="hidden shrink-0 gap-1.5 @md:flex" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-white/[0.14]" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/[0.14]" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/[0.14]" />
          </span>
          <span className="mx-auto flex h-7 min-w-0 max-w-[270px] flex-1 items-center justify-center gap-1.5 rounded-full bg-white/[0.05] px-3 text-[12px]">
            <Lock className="h-3 w-3 shrink-0 text-text-3" strokeWidth={2} aria-hidden="true" />
            <span className="truncate">
              <span className="text-text-3">staging.</span>
              <span className="text-text-2">your-app.com</span>
            </span>
          </span>
          <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-white/10 pl-2 pr-2.5 text-[11.5px] text-text-2">
            <span className="relative flex h-1.5 w-1.5">
              {week > 0 && !reduced && <span className="absolute inset-0 animate-ping rounded-full opacity-70" style={{ background: accent, animationDuration: "2.2s" }} />}
              <span className="relative h-1.5 w-1.5 rounded-full transition-colors duration-500" style={{ background: week > 0 ? accent : "var(--text-3)" }} />
            </span>
            Build
            <span className="relative inline-flex h-4 w-2.5 overflow-hidden tabular-nums text-text">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={week}
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-100%", opacity: 0 }}
                  transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {week || "–"}
                </motion.span>
              </AnimatePresence>
            </span>
          </span>
        </div>

        {/* The app on staging */}
        <div className="flex h-[190px] @md:h-[226px]">
          <aside className="hidden w-[122px] shrink-0 flex-col gap-1 border-r border-white/[0.06] p-2.5 @md:flex" aria-hidden="true">
            <div className="mb-1.5 flex items-center gap-2 px-1.5 pt-0.5">
              <span className="h-4 w-4 rounded-[5px]" style={{ background: `linear-gradient(135deg, ${accent}, #6F7BFF)` }} />
              <Bar w="46%" className="bg-white/[0.12]" />
            </div>
            {features.map((f, i) => {
              const open = i < week;
              const current = i === week - 1;
              return (
                <div
                  key={f}
                  className="relative flex h-7 items-center rounded-lg px-2 text-[12px] transition-colors duration-500"
                  style={{ background: current ? "rgba(255,255,255,0.06)" : "transparent", color: current ? "var(--text)" : "var(--text-2)" }}
                >
                  <span className="grid w-full">
                    <span className="col-start-1 row-start-1 flex items-center transition-opacity duration-500" style={{ opacity: open ? 0 : 1 }}>
                      <Bar w={["62%", "50%", "70%", "44%"][i]} />
                    </span>
                    <span className="col-start-1 row-start-1 transition-[opacity,transform] duration-500" style={{ opacity: open ? 1 : 0, transform: open ? "none" : "translateX(-4px)" }}>
                      {f}
                    </span>
                  </span>
                  {current && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full" style={{ background: accent }} />}
                </div>
              );
            })}
          </aside>
          <div className="relative min-w-0 flex-1">
            {/* Before the first build: an empty page */}
            <div className="absolute inset-0 flex flex-col justify-center gap-2.5 p-4 transition-opacity duration-500" style={{ opacity: week === 0 ? 1 : 0 }}>
              <Bar w="40%" className="bg-white/[0.1]" />
              <Bar w="70%" />
              <Bar w="56%" />
            </div>
            {screens.map((S, i) => {
              const on = week === i + 1;
              return (
                <motion.div
                  key={i}
                  className="absolute inset-0 p-3.5 @md:p-4"
                  initial={false}
                  animate={{ opacity: on ? 1 : 0, filter: on ? "blur(0px)" : "blur(6px)" }}
                  transition={reduced ? { duration: 0 } : { duration: on ? 0.5 : 0.3, ease: "easeOut" }}
                  style={{ pointerEvents: "none" }}
                >
                  <S accent={accent} clicked={clickedUpTo > i} reduced={reduced} />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Weekly builds */}
      <div className="relative mt-4 grid grid-cols-4 @md:mt-5">
        <span className="absolute left-[12.5%] right-[12.5%] top-[10px] h-[2px] rounded-full bg-white/[0.08]" aria-hidden="true">
          <motion.span
            className="absolute inset-0 origin-left rounded-full"
            style={{ background: `linear-gradient(90deg, color-mix(in oklab, ${accent} 50%, transparent), ${accent})` }}
            initial={false}
            animate={{ scaleX: Math.max(0, week - 1) / 3 }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 20 }}
          />
        </span>
        {features.map((f, i) => {
          const lit = i < week;
          const done = i < clickedUpTo;
          return (
            <div key={f} className="relative flex flex-col items-center">
              <span
                className="relative flex h-[22px] w-[22px] items-center justify-center rounded-full border transition-[background-color,border-color,box-shadow] duration-500"
                style={{
                  background: done ? accent : lit ? "#101114" : "#0b0c0e",
                  borderColor: lit ? accent : "rgba(255,255,255,0.14)",
                  boxShadow: lit ? `0 0 18px -3px ${accent}` : "none",
                }}
              >
                <motion.span initial={false} animate={{ scale: done ? 1 : 0, opacity: done ? 1 : 0 }} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 24 }}>
                  <Check className="h-3 w-3 text-black" strokeWidth={3} aria-hidden="true" />
                </motion.span>
              </span>
              <span className="mt-2 text-[11.5px] transition-colors duration-500" style={{ color: lit ? "var(--text)" : "var(--text-3)" }}>
                Week {i + 1}
              </span>
              <motion.span
                initial={false}
                animate={done ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -4, scale: 0.92 }}
                transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 26 }}
                className="mt-1.5 inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full px-2 text-[10.5px] @md:text-[11px]"
                style={{ background: `color-mix(in oklab, ${accent} 14%, #101114)`, color: accent }}
              >
                <span className="@md:hidden">{f}</span>
                <span className="hidden @md:inline">{f} works</span>
              </motion.span>
            </div>
          );
        })}
      </div>

      {/* "You", clicking through staging */}
      {!reduced && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-10"
          style={{ x: cx, y: cy }}
          initial={false}
          animate={{ opacity: week > 0 && !cursorGone ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        >
          <AnimatePresence>
            {clickedUpTo > 0 && (
              <motion.span
                key={clickedUpTo}
                initial={{ scale: 0.2, opacity: 0.7 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="absolute -left-3 -top-3 h-6 w-6 rounded-full border-2"
                style={{ borderColor: accent }}
              />
            )}
          </AnimatePresence>
          <svg width="20" height="22" viewBox="0 0 20 22" className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
            <path d="M2 1.5 17 11.2l-6.6 1.3 3.7 7.1-2.7 1.4-3.7-7.1L3.2 18.5z" fill="#fff" stroke="#000" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        </motion.div>
      )}
    </div>
  );
}
