"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Ban, Check, Clock, Mail, Send } from "lucide-react";
import { useRef, useState } from "react";
import Tile from "../Tile";
import { useAutoDemo, useDemoScript } from "../useAutoDemo";

/* Altamira Village brand */
const GOLD = "#C88A3D";
const GREEN = "#2E6B55";
const CREAM = "#F5F0ED";
const RED = "#E2725B";

type State = "inquiry" | "awaiting" | "review" | "confirmed" | "declined";

const STEPS: { id: Exclude<State, "declined">; label: string }[] = [
  { id: "inquiry", label: "Inquiry" },
  { id: "awaiting", label: "Awaiting payment" },
  { id: "review", label: "Checking payment" },
  { id: "confirmed", label: "Confirmed" },
];

/** The engine only ever offers the next valid step; anything else is refused. */
const NEXT: Record<State, State[]> = {
  inquiry: ["awaiting", "declined"],
  awaiting: ["review", "declined"],
  review: ["confirmed", "declined"],
  confirmed: [],
  declined: [],
};

type Line = { id: number; text: string; tone: "ok" | "info" | "bad" };

const SPRING = { type: "spring", stiffness: 420, damping: 34 } as const;

export default function BookingTile({ className }: { className?: string }) {
  const reduced = useReducedMotion() ?? false;
  const { ref: demoRef, active: demoActive } = useAutoDemo<HTMLDivElement>();
  const [state, setState] = useState<State>("inquiry");
  const [log, setLog] = useState<Line[]>([{ id: 0, text: "Guest requested Suite Ávila, 2 nights", tone: "info" }]);
  const [refused, setRefused] = useState(false);
  // Handlers (and the demo's timers) read the live state from here, never a stale closure.
  const cur = useRef<State>("inquiry");
  const ids = useRef(1);

  const push = (text: string, tone: Line["tone"]) => {
    const id = ids.current++;
    setLog((l) => [{ id, text, tone }, ...l].slice(0, 4));
  };

  const go = (to: State, text: string, tone: Line["tone"] = "ok") => {
    setRefused(false);
    if (!NEXT[cur.current].includes(to)) return;
    cur.current = to;
    setState(to);
    push(text, tone);
  };

  const request = () => go("awaiting", "Payment details sent · Pago Móvil or Zelle", "info");
  const pay = () => go("review", "Zelle landed 36 h later · in review", "info");
  const confirm = () => go("confirmed", "Confirmed by reception · guest emailed");
  const decline = () => go("declined", "Declined · guest emailed", "bad");
  const forceConfirm = () => {
    setRefused(true);
    push("Refused: a declined booking can't be confirmed", "bad");
  };
  const reset = () => {
    cur.current = "inquiry";
    setState("inquiry");
    setRefused(false);
    setLog([{ id: ids.current++, text: "Guest requested Suite Ávila, 2 nights", tone: "info" }]);
  };

  // The demo walks a real booking through, then tries to break the rules.
  useDemoScript(
    demoActive,
    [
      { at: 1500, run: request },
      { at: 3000, run: pay },
      { at: 4600, run: confirm },
      { at: 7000, run: reset },
      { at: 7800, run: request },
      { at: 9200, run: decline },
      { at: 10600, run: forceConfirm },
    ],
    { loop: true, loopDelay: 3200, reset },
  );

  const at = state === "declined" ? -1 : STEPS.findIndex((s) => s.id === state);
  type Act = "request" | "pay" | "confirm" | "decline" | "force" | "reset";
  const actions: { id: Act; label: string; show: boolean; tone?: "bad" }[] = [
    { id: "request", label: "Request booking", show: state === "inquiry" },
    { id: "pay", label: "Guest pays by Zelle", show: state === "awaiting" },
    { id: "confirm", label: "Confirm", show: state === "review" },
    { id: "decline", label: "Decline", show: state === "awaiting" || state === "review", tone: "bad" },
    { id: "force", label: "Try to confirm it anyway", show: state === "declined", tone: "bad" },
    { id: "reset", label: "Start over", show: state === "confirmed" || state === "declined" },
  ];
  const run = (id: Act) => {
    if (id === "request") request();
    else if (id === "pay") pay();
    else if (id === "confirm") confirm();
    else if (id === "decline") decline();
    else if (id === "force") forceConfirm();
    else reset();
  };


  return (
    <Tile
      ref={demoRef}
      demo={demoActive}
      glow={GOLD}
      skill="Booking systems"
      from="Altamira Village"
      title="Bookings that wait for slow payments, and never skip a step."
      className={className}
    >
      <div className="@container flex flex-1 flex-col gap-4">
        {/* The reservation */}
        <div
          className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3 max-lg:@max-[21rem]:flex-col max-lg:@max-[21rem]:items-start max-lg:@max-[21rem]:gap-2"
          style={{ background: `linear-gradient(135deg, ${GREEN}33, transparent 70%)` }}
        >
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium" style={{ color: CREAM }}>
              Suite Ávila · 2 nights
            </div>
            <div className="text-[12px] text-text-3">Demo booking · US$ 360</div>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={state}
              initial={reduced ? false : { opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, y: -6, scale: 0.96 }}
              transition={SPRING}
              className="shrink-0 rounded-full px-3 py-1 text-[12px] font-medium"
              style={{
                color: state === "declined" ? RED : state === "confirmed" ? "#0b1512" : CREAM,
                background: state === "confirmed" ? "#7FD1A8" : state === "declined" ? `${RED}22` : `${GOLD}26`,
                border: `1px solid ${state === "declined" ? `${RED}66` : state === "confirmed" ? "transparent" : `${GOLD}55`}`,
              }}
            >
              {state === "declined" ? "Declined" : STEPS[at].label}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* The state machine */}
        <ol className="grid grid-cols-4 gap-1.5" aria-label="Booking status">
          {STEPS.map((s, i) => {
            const done = at >= 0 && i < at;
            const now = i === at;
            const dead = state === "declined";
            return (
              <li key={s.id} className="flex flex-col gap-1.5">
                <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    initial={false}
                    animate={{ width: done || now ? "100%" : "0%", background: dead ? RED : now && s.id !== "confirmed" ? GOLD : "#7FD1A8" }}
                    transition={reduced ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <span className={`flex items-center gap-1 text-[11.5px] leading-tight max-lg:text-[12px] ${now ? "text-text" : "text-text-3"}`} aria-current={now ? "step" : undefined}>
                  {/* Narrow tile: the bar above already marks the step, and the label needs the whole column. */}
                  {done && <Check className="h-3 w-3 shrink-0 max-lg:@max-[21rem]:hidden" style={{ color: "#7FD1A8" }} aria-hidden="true" />}
                  {now && s.id === "review" && <Clock className="h-3 w-3 shrink-0 max-lg:@max-[21rem]:hidden" style={{ color: GOLD }} aria-hidden="true" />}
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Actions: only valid next steps, plus the one that tries to break it */}
        <div className="flex min-h-11 flex-wrap gap-2">
          <AnimatePresence initial={false} mode="popLayout">
            {actions
              .filter((a) => a.show)
              .map((a) => (
                <motion.button
                  key={a.id}
                  type="button"
                  layout
                  initial={reduced ? false : { opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduced ? undefined : { opacity: 0, scale: 0.94 }}
                  transition={SPRING}
                  onClick={() => run(a.id)}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-medium transition-colors pointer-coarse:h-11 max-lg:@max-[21rem]:grow max-lg:@max-[21rem]:px-3.5"
                  style={
                    a.tone === "bad"
                      ? { color: RED, border: `1px solid ${RED}55`, background: `${RED}10` }
                      : { color: "#161310", background: GOLD }
                  }
                >
                  {/* On a narrow tile the labels need the room: every pair of actions stays on one row. */}
                  {a.tone === "bad" ? (
                    <Ban className="h-3.5 w-3.5 max-lg:@max-[21rem]:hidden" aria-hidden="true" />
                  ) : (
                    <Send className="h-3.5 w-3.5 max-lg:@max-[21rem]:hidden" aria-hidden="true" />
                  )}
                  {a.label}
                </motion.button>
              ))}
          </AnimatePresence>
        </div>

        {/* Audit log */}
        <motion.div
          animate={refused && !reduced ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.45 }}
          className="mt-auto rounded-2xl border border-white/[0.08] bg-black/30 p-3"
        >
          <div className="mb-2 flex items-center gap-1.5 text-[11.5px] text-text-3 max-lg:text-[12px]">
            <Mail className="h-3 w-3" aria-hidden="true" /> Audit log
          </div>
          <ul
            className="flex flex-col gap-1.5 max-lg:min-h-[5.25rem] max-lg:@max-[26rem]:h-28 max-lg:@max-[26rem]:overflow-hidden max-lg:@max-[26rem]:[mask-image:linear-gradient(to_bottom,#000_calc(100%-1.5rem),transparent)]"
            aria-live="polite"
          >
            <AnimatePresence initial={false}>
              {log.map((l) => (
                <motion.li
                  key={l.id}
                  layout
                  initial={reduced ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={SPRING}
                  className="flex items-start gap-2 font-code text-[11.5px] leading-snug max-lg:text-[12px]"
                  style={{ color: l.tone === "bad" ? RED : l.tone === "ok" ? "#9FE0BD" : "var(--text-2)" }}
                >
                  <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "currentColor" }} aria-hidden="true" />
                  {l.text}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </motion.div>
      </div>
    </Tile>
  );
}
