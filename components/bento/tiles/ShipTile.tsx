"use client";

import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from "framer-motion";
import Tile from "../Tile";
import { useAutoDemo, useDemoScript } from "../useAutoDemo";

const AMBER = "#FFBF3F";
const RED = "#E11D48";
/** Lighter tint of the brand red, for small text on near-black (AA contrast). */
const RED_TEXT = "#FB7185";

const SPRING = { type: "spring", stiffness: 400, damping: 30 } as const;

type Controls = ReturnType<typeof animate>;

/*
 * Attract mode: one shared timeline (ms from the tile coming into view), so
 * the two demos take turns like one person walking through them. Shrink the
 * build, ship an update, break the runtime, watch the preflight refuse the
 * next update, fix it, turn R8 back off, pause, and go again.
 */
const DEMO = {
  shrink: 700,
  ship: 2300,
  breakIt: 7300,
  shipBroken: 8700,
  fix: 12300,
  unshrink: 13500,
  /** Last beat of both scripts, which keeps their loops in step. */
  end: 13500,
  loopDelay: 3600,
};
/** A demo press shows its ripple this long before the control acts. */
const TAP_MS = 170;

/**
 * Soft press ripple, played when the demo presses a control. It only plays
 * for presses after the control mounted, never on mount. `spill` lets it
 * bloom past a small control (the switch) instead of clipping to it.
 */
function DemoTap({ n, color, spill = false }: { n: number; color: string; spill?: boolean }) {
  const [born] = useState(n);
  if (n === born) return null;
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute ${spill ? "-inset-3 rounded-full" : "inset-0 overflow-hidden rounded-[inherit]"}`}
    >
      <motion.span
        key={n}
        className="absolute left-1/2 top-1/2 aspect-square w-[150%] rounded-full"
        style={{ x: "-50%", y: "-50%", background: `radial-gradient(closest-side, ${color}, transparent)` }}
        initial={{ scale: 0.15, opacity: 1 }}
        animate={{ scale: 1, opacity: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. R8 shrink: two bars drawn to the same scale                             */
/* -------------------------------------------------------------------------- */

const BEFORE_MB = 45;
const AFTER_MB = 17.6;
const AFTER_PCT = (AFTER_MB / BEFORE_MB) * 100;
const SAVED_MB = (BEFORE_MB - AFTER_MB).toFixed(1);
const SAVED_PCT = Math.round((1 - AFTER_MB / BEFORE_MB) * 100);

/** Deterministic "stripped code" shards that fall off as the bar retracts. */
const SHARDS = Array.from({ length: 14 }, (_, i) => {
  const x = AFTER_PCT + 3 + (i * (96 - AFTER_PCT - 3)) / 13;
  return {
    x,
    dx: ((i * 37) % 11) - 5,
    dy: -(9 + ((i * 7) % 13)),
    r: ((i * 53) % 120) - 60,
    delay: ((100 - x) / (100 - AFTER_PCT)) * 0.3,
  };
});

function formatMb(v: number) {
  if (v >= BEFORE_MB - 0.05) return `${BEFORE_MB} MB`;
  if (v <= AFTER_MB + 0.05) return `${AFTER_MB} MB`;
  return `${v.toFixed(1)} MB`;
}

function ShrinkDemo({ reduced, demo }: { reduced: boolean; demo: boolean }) {
  const headingId = useId();
  const [shrunk, setShrunk] = useState(false);
  /** Mirrors `shrunk` for the demo script, whose steps outlive a render. */
  const shrunkRef = useRef(false);
  const [burst, setBurst] = useState(0);
  const [taps, setTaps] = useState(0);
  const [announce, setAnnounce] = useState("");
  const mb = useMotionValue(BEFORE_MB);
  const width = useTransform(mb, (v) => `${(v / BEFORE_MB) * 100}%`);
  const label = useTransform(mb, formatMb);
  const anim = useRef<Controls | null>(null);

  useEffect(() => () => anim.current?.stop(), []);

  const setTo = (next: boolean) => {
    if (next === shrunkRef.current) return;
    shrunkRef.current = next;
    const target = next ? AFTER_MB : BEFORE_MB;
    setShrunk(next);
    setAnnounce(
      next
        ? `Release build shrunk with R8 from ${BEFORE_MB} MB to ${AFTER_MB} MB, ${SAVED_PCT}% smaller.`
        : `Release build back to ${BEFORE_MB} MB without R8.`,
    );
    anim.current?.stop();
    if (reduced) {
      mb.set(target);
      return;
    }
    anim.current = animate(mb, target, { type: "spring", duration: next ? 1.1 : 0.7, bounce: 0 });
    if (next) setBurst((b) => b + 1);
  };
  const toggle = () => setTo(!shrunkRef.current);

  // The demo's half of the shared timeline: press Shrink (ripple first, then
  // the bar retracts), and near the end press it again to turn R8 back off.
  const tapButton = () => setTaps((n) => n + 1);
  useDemoScript(
    demo,
    [
      { at: DEMO.shrink - TAP_MS, run: () => !shrunkRef.current && tapButton() },
      { at: DEMO.shrink, run: () => setTo(true) },
      { at: DEMO.unshrink - TAP_MS, run: () => shrunkRef.current && tapButton() },
      { at: DEMO.unshrink, run: () => setTo(false) },
    ],
    { loop: true, loopDelay: DEMO.loopDelay, reset: () => setTo(false) },
  );

  return (
    <section aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h4 id={headingId} className="text-[13px] text-text-2">
          Android code
        </h4>
        <motion.button
          type="button"
          aria-pressed={shrunk}
          onClick={toggle}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.95 }}
          transition={SPRING}
          className="relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-text transition-colors duration-200 pointer-coarse:h-11"
          style={{
            background: shrunk ? "rgba(255,191,63,0.14)" : "rgba(255,255,255,0.05)",
            boxShadow: shrunk
              ? "inset 0 0 0 1px rgba(255,191,63,0.55), 0 6px 22px -10px rgba(255,191,63,0.7)"
              : "inset 0 0 0 1px rgba(255,255,255,0.14)",
          }}
        >
          <DemoTap n={taps} color="rgba(255,191,63,0.5)" />
          <svg viewBox="0 0 18 18" className="h-4 w-4" fill="none" aria-hidden="true">
            <motion.path
              d="M2 9h5M4.6 6.4 7 9l-2.4 2.6"
              stroke={AMBER}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ x: shrunk ? 1.5 : 0 }}
              transition={SPRING}
            />
            <motion.path
              d="M16 9h-5m2.4-2.6L11 9l2.4 2.6"
              stroke={AMBER}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ x: shrunk ? -1.5 : 0 }}
              transition={SPRING}
            />
          </svg>
          Shrink with R8
        </motion.button>
      </div>

      <div className="mt-3 space-y-3">
        {/* Reference bar: always the full 45 MB */}
        <div>
          <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="text-text-3">Without R8</span>
            <span className="tabular-nums text-text-3">{BEFORE_MB} MB</span>
          </div>
          <div aria-hidden="true" className="mt-1.5 h-2 rounded-full bg-white/[0.13]" />
        </div>

        {/* Live bar: same scale, shrinks to 17.6 MB */}
        <div>
          <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="text-text">
              Release build
              <span className="sr-only">{shrunk ? `, ${SAVED_PCT}% smaller` : ""}</span>
            </span>
            <motion.span className="font-medium tabular-nums text-text">{label}</motion.span>
          </div>

          <div
            aria-hidden="true"
            className="relative mt-1.5 h-5 rounded-full bg-white/[0.04] ring-1 ring-inset ring-white/[0.07]"
          >
            {/* What R8 stripped out */}
            <motion.div
              className="absolute inset-y-0 right-0 rounded-r-full"
              style={{
                left: `${AFTER_PCT}%`,
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgba(255,191,63,0.2) 0 1.5px, transparent 1.5px 6px)",
              }}
              initial={false}
              animate={{ opacity: shrunk ? 1 : 0 }}
              transition={{ duration: reduced ? 0 : 0.4, delay: shrunk && !reduced ? 0.45 : 0 }}
            />
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width,
                background: `linear-gradient(90deg, rgba(255,191,63,0.55), ${AMBER})`,
                boxShadow: "0 0 18px -2px rgba(255,191,63,0.55)",
              }}
            >
              <span className="absolute inset-y-[4px] right-[3px] w-[3px] rounded-full bg-white/85" />
            </motion.div>

            <AnimatePresence>
              {burst > 0 && shrunk && !reduced && (
                <motion.div
                  key={burst}
                  className="pointer-events-none absolute inset-0"
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                >
                  {SHARDS.map((s, i) => (
                    <motion.span
                      key={i}
                      className="absolute top-1/2 h-[3px] w-[5px] -translate-y-1/2 rounded-[1px]"
                      style={{ left: `${s.x}%`, background: AMBER }}
                      initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
                      animate={{ opacity: [0, 1, 0], x: s.dx, y: s.dy, rotate: s.r }}
                      transition={{ duration: 0.75, delay: s.delay, ease: [0.22, 1, 0.36, 1] }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Savings badge sits in the space R8 freed up */}
            <div
              className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center"
              style={{ left: `${AFTER_PCT}%` }}
            >
              <AnimatePresence initial={false}>
                {shrunk && (
                  <motion.span
                    key="saved"
                    initial={{ opacity: 0, scale: 0.6, y: 3 }}
                    animate={{ opacity: 1, scale: 1, y: 0, transition: { ...SPRING, delay: reduced ? 0 : 0.5 } }}
                    exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.12 } }}
                    className="whitespace-nowrap rounded-full bg-[#0a0b0d] px-1.5 py-[3px] text-[11px] font-medium leading-none max-lg:text-[12px]"
                    style={{ color: AMBER, boxShadow: "inset 0 0 0 1px rgba(255,191,63,0.4)" }}
                  >
                    {SAVED_PCT}% smaller
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <p aria-live={demo ? "off" : "polite"} className="sr-only">
        {announce}
        {shrunk ? ` ${SAVED_MB} MB removed.` : ""}
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Over-the-air update behind a preflight gate                             */
/* -------------------------------------------------------------------------- */

type Check = "idle" | "running" | "pass" | "fail" | "skip";
type Phase = "idle" | "checking" | "rolling" | "live" | "blocked";

const CHECKS = ["Bundle builds", "Runtime version matches", "Smoke test passes"] as const;
const IDLE_CHECKS: Check[] = ["idle", "idle", "idle"];
const STEP_MS = 650;
const ROLLOUT_S = 1.6;

const SR_STATE: Record<Check, string> = {
  idle: "not run",
  running: "running",
  pass: "passed",
  fail: "failed",
  skip: "skipped",
};

const PHONE_GLOW = {
  idle: "0 0 0 1px rgba(255,255,255,0.08), 0 14px 30px -14px rgba(0,0,0,0.9)",
  live: "0 0 0 1px rgba(255,191,63,0.6), 0 14px 34px -12px rgba(255,191,63,0.65)",
  blocked: "0 0 0 1px rgba(225,29,72,0.75), 0 14px 34px -12px rgba(225,29,72,0.6)",
};

const SCREEN_LIST: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};
const SCREEN_ITEM: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: SPRING },
};

function RollingNumber({ value }: { value: number }) {
  return (
    <span className="relative inline-flex overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={SPRING}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Phone({
  patch,
  phase,
  progress,
  rx,
  ry,
  reduced,
}: {
  patch: number;
  phase: Phase;
  progress: MotionValue<number>;
  rx: MotionValue<number>;
  ry: MotionValue<number>;
  reduced: boolean;
}) {
  const pct = useTransform(progress, (p) => `${Math.round(p * 100)}%`);
  const glow = phase === "live" ? PHONE_GLOW.live : phase === "blocked" ? PHONE_GLOW.blocked : PHONE_GLOW.idle;

  return (
    <motion.div
      aria-hidden="true"
      className="relative h-[124px] w-[64px] shrink-0 rounded-[17px] p-[3px]"
      style={{
        rotateX: rx,
        rotateY: ry,
        transformPerspective: 520,
        background: "linear-gradient(160deg, #2b2d32, #111215 45%, #1c1d21)",
      }}
      initial={false}
      animate={{ boxShadow: glow }}
      transition={{ duration: reduced ? 0 : 0.5 }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[14px] bg-[#060708]">
        <div className="absolute left-1/2 top-[5px] z-10 h-[5px] w-[18px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/[0.07]" />

        {/* The app itself; remounts (and staggers back in) when a new bundle lands */}
        <motion.div
          key={patch}
          className="absolute inset-0 flex flex-col gap-[5px] px-[6px] pt-[16px]"
          variants={SCREEN_LIST}
          initial={patch === 2 ? false : "hidden"}
          animate="show"
        >
          <motion.div variants={SCREEN_ITEM} className="flex items-center gap-1">
            <span className="h-[5px] w-[5px] rounded-full" style={{ background: AMBER }} />
            <span className="h-[3px] w-5 rounded-full bg-white/30" />
          </motion.div>
          <motion.div variants={SCREEN_ITEM} className="h-[5px] rounded-[2px]" style={{ background: RED }} />
          <motion.div
            variants={SCREEN_ITEM}
            className="h-[26px] rounded-[5px]"
            style={{ background: "linear-gradient(135deg, rgba(255,191,63,0.5), rgba(225,29,72,0.35))" }}
          />
          {[0, 1].map((i) => (
            <motion.div key={i} variants={SCREEN_ITEM} className="flex items-center gap-1">
              <span className="h-[11px] w-[13px] shrink-0 rounded-[3px] bg-white/10" />
              <span className="flex flex-1 flex-col gap-[3px]">
                <span className="h-[2.5px] rounded-full bg-white/20" />
                <span className="h-[2.5px] w-2/3 rounded-full bg-white/10" />
              </span>
            </motion.div>
          ))}
        </motion.div>

        <div className="absolute inset-x-0 bottom-[7px] z-10 flex justify-center">
          <span className="inline-flex rounded-[5px] bg-[#15161a] px-[5px] py-[3px] font-code text-[10px] leading-none text-text ring-1 ring-inset ring-white/10">
            v1.4.
            <RollingNumber value={patch} />
          </span>
        </div>

        {/* Rollout progress ring */}
        <AnimatePresence>
          {phase === "rolling" && (
            <motion.div
              className="absolute inset-0 z-20 grid place-items-center bg-black/65 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="relative h-10 w-10">
                <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="3" />
                  <motion.circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke={AMBER}
                    strokeWidth="3"
                    strokeLinecap="round"
                    style={{ pathLength: progress, filter: "drop-shadow(0 0 3px rgba(255,191,63,0.7))" }}
                  />
                </svg>
                <motion.span className="absolute inset-0 grid place-items-center text-[9px] font-medium tabular-nums text-text">
                  {pct}
                </motion.span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reload sheen when the new bundle goes live */}
        <AnimatePresence>
          {phase === "live" && !reduced && (
            <motion.div
              key={`sheen-${patch}`}
              className="pointer-events-none absolute inset-0 z-30"
              style={{
                background: "linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)",
              }}
              initial={{ x: "-110%" }}
              animate={{ x: "110%" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function StatusIcon({ state, reduced }: { state: Check; reduced: boolean }) {
  let icon: ReactNode;
  switch (state) {
    case "running":
      icon = (
        <motion.svg
          viewBox="0 0 18 18"
          className="h-full w-full"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        >
          <circle cx="9" cy="9" r="7" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
          <path d="M9 2a7 7 0 0 1 7 7" fill="none" stroke={AMBER} strokeWidth="2" strokeLinecap="round" />
        </motion.svg>
      );
      break;
    case "pass":
      icon = (
        <svg viewBox="0 0 18 18" className="h-full w-full">
          <circle cx="9" cy="9" r="9" fill={AMBER} />
          <motion.path
            d="M5.3 9.3 7.8 11.8 12.9 6.4"
            fill="none"
            stroke="#000"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduced ? 0 : 0.28, delay: reduced ? 0 : 0.05, ease: "easeOut" }}
          />
        </svg>
      );
      break;
    case "fail":
      icon = (
        <svg viewBox="0 0 18 18" className="h-full w-full">
          <circle cx="9" cy="9" r="9" fill={RED} />
          <motion.path
            d="M6.2 6.2 11.8 11.8M11.8 6.2 6.2 11.8"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: "easeOut" }}
          />
        </svg>
      );
      break;
    case "skip":
      icon = (
        <svg viewBox="0 0 18 18" className="h-full w-full">
          <circle cx="9" cy="9" r="7.5" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeDasharray="2 2.6" />
        </svg>
      );
      break;
    default:
      icon = (
        <svg viewBox="0 0 18 18" className="h-full w-full">
          <circle cx="9" cy="9" r="7.5" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
        </svg>
      );
  }

  return (
    <span className="relative h-[18px] w-[18px] shrink-0" aria-hidden="true">
      <AnimatePresence initial={false}>
        <motion.span
          key={state}
          className="absolute inset-0"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={SPRING}
        >
          {icon}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function OtaDemo({ reduced, demo }: { reduced: boolean; demo: boolean }) {
  const headingId = useId();
  const [phase, setPhase] = useState<Phase>("idle");
  const [checks, setChecks] = useState<Check[]>(IDLE_CHECKS);
  const [patch, setPatch] = useState(2);
  const [broken, setBroken] = useState(false);
  const [taps, setTaps] = useState({ ship: 0, flip: 0 });
  const brokenRef = useRef(false);
  /** True from the press until the update lands or is blocked. Refs, not
   * state, so the demo script's steps read the live value. */
  const busyRef = useRef(false);
  const runRef = useRef(0);
  const timers = useRef<number[]>([]);
  const rollout = useRef<Controls | null>(null);
  const progress = useMotionValue(0);
  const fill = useTransform(progress, (p) => `${p * 100}%`);
  const rx = useSpring(0, { stiffness: 260, damping: 22 });
  const ry = useSpring(0, { stiffness: 260, damping: 22 });

  useEffect(() => {
    const pending = timers.current;
    const run = runRef;
    const ctrl = rollout;
    return () => {
      run.current += 1;
      pending.forEach((t) => window.clearTimeout(t));
      ctrl.current?.stop();
    };
  }, []);

  const busy = phase === "checking" || phase === "rolling";

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      timers.current.push(window.setTimeout(resolve, ms));
    });

  const ship = async () => {
    if (busyRef.current) return;
    const id = ++runRef.current;
    const alive = () => runRef.current === id;
    timers.current.length = 0;
    rollout.current?.stop();
    progress.set(0);

    if (reduced) {
      if (brokenRef.current) {
        setChecks(["pass", "fail", "skip"]);
        setPhase("blocked");
      } else {
        setChecks(["pass", "pass", "pass"]);
        progress.set(1);
        setPatch((p) => p + 1);
        setPhase("live");
      }
      return;
    }

    busyRef.current = true;
    setPhase("checking");
    setChecks(["running", "idle", "idle"]);
    await wait(STEP_MS);
    if (!alive()) return;

    setChecks(["pass", "running", "idle"]);
    await wait(STEP_MS);
    if (!alive()) return;

    // The gate reads the runtime at the moment it checks it.
    if (brokenRef.current) {
      busyRef.current = false;
      setChecks(["pass", "fail", "skip"]);
      setPhase("blocked");
      return;
    }

    setChecks(["pass", "pass", "running"]);
    await wait(STEP_MS);
    if (!alive()) return;

    setChecks(["pass", "pass", "pass"]);
    setPhase("rolling");
    rollout.current = animate(progress, 1, { duration: ROLLOUT_S, ease: [0.65, 0, 0.35, 1] });
    await rollout.current;
    if (!alive()) return;

    busyRef.current = false;
    setPatch((p) => p + 1);
    setPhase("live");
  };

  const setBreak = (next: boolean) => {
    if (next === brokenRef.current) return;
    brokenRef.current = next;
    setBroken(next);
    if (!busyRef.current) {
      setPhase("idle");
      setChecks(IDLE_CHECKS);
    }
  };
  const toggleBreak = () => setBreak(!brokenRef.current);

  // The demo's half of the shared timeline. Ship a clean update, break the
  // runtime, watch the preflight refuse the next one, then fix it. A press
  // that would do nothing (already shipping, already fixed) is skipped.
  const tapButton = (k: "ship" | "flip") => setTaps((t) => ({ ...t, [k]: t[k] + 1 }));
  useDemoScript(
    demo,
    [
      // Resuming with the runtime still broken: fix it first.
      { at: 300 - TAP_MS, run: () => brokenRef.current && tapButton("flip") },
      { at: 300, run: () => setBreak(false) },
      { at: DEMO.ship - TAP_MS, run: () => !busyRef.current && tapButton("ship") },
      { at: DEMO.ship, run: ship },
      { at: DEMO.breakIt - TAP_MS, run: () => !brokenRef.current && tapButton("flip") },
      { at: DEMO.breakIt, run: () => setBreak(true) },
      { at: DEMO.shipBroken - TAP_MS, run: () => !busyRef.current && tapButton("ship") },
      { at: DEMO.shipBroken, run: ship },
      { at: DEMO.fix - TAP_MS, run: () => brokenRef.current && tapButton("flip") },
      { at: DEMO.fix, run: () => setBreak(false) },
      // Nothing to do here: it keeps this loop in step with the R8 demo's.
      { at: DEMO.end, run: () => {} },
    ],
    { loop: true, loopDelay: DEMO.loopDelay, reset: () => setBreak(false) },
  );

  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (reduced || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 24);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 18);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  const current = `v1.4.${patch}`;
  const upcoming = `v1.4.${patch + 1}`;
  const status: Record<Phase, string> = {
    idle: broken ? `Runtime version broken. Try shipping ${upcoming}.` : `Installed phones run ${current}.`,
    checking: "Running preflight checks…",
    rolling: `Rolling out ${upcoming}…`,
    live: `${current} live on installed phones`,
    blocked: "Blocked by preflight: runtime mismatch. Nothing shipped.",
  };
  const statusColor =
    phase === "blocked" ? RED_TEXT : phase === "live" ? "var(--text)" : "var(--text-2)";

  return (
    <section aria-labelledby={headingId} onPointerMove={onMove} onPointerLeave={onLeave}>
      <h4 id={headingId} className="text-[13px] text-text-2">
        Over-the-air update
      </h4>

      <div className="mt-3 flex flex-col items-center gap-4 @min-[216px]:flex-row @min-[216px]:items-stretch">
        <Phone patch={patch} phase={phase} progress={progress} rx={rx} ry={ry} reduced={reduced} />

        <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
          <ol aria-label="Preflight checks" className="flex flex-col gap-[7px]">
            {CHECKS.map((name, i) => {
              const s = checks[i];
              const text = s === "fail" ? "Runtime mismatch" : name;
              return (
                <motion.li
                  key={name}
                  className="flex min-h-[20px] items-center gap-2 text-[12.5px] leading-[1.2]"
                  initial={false}
                  animate={s === "fail" && !reduced ? { x: [0, -4, 4, -2.5, 2.5, 0] } : { x: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <StatusIcon state={s} reduced={reduced} />
                  <span
                    className={
                      s === "idle"
                        ? "text-text-2"
                        : s === "skip"
                          ? "text-text-3 line-through decoration-white/25"
                          : s === "fail"
                            ? ""
                            : "text-text"
                    }
                    style={s === "fail" ? { color: RED_TEXT } : undefined}
                  >
                    {text}
                  </span>
                  <span className="sr-only">, {SR_STATE[s]}</span>
                </motion.li>
              );
            })}
          </ol>

          <motion.button
            type="button"
            onClick={ship}
            aria-disabled={busy}
            whileHover={busy ? undefined : { y: -1 }}
            whileTap={busy ? undefined : { scale: 0.96 }}
            transition={SPRING}
            className="relative mt-auto inline-flex h-10 w-full items-center justify-center overflow-hidden rounded-full px-4 text-[13px] font-medium text-black aria-disabled:cursor-progress pointer-coarse:h-11"
            style={{
              background: "linear-gradient(180deg, #FFD684, #FFBF3F)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 8px 24px -10px rgba(255,191,63,0.85)",
            }}
          >
            <DemoTap n={taps.ship} color="rgba(255,255,255,0.7)" />
            {phase === "rolling" && (
              <motion.span aria-hidden="true" className="absolute inset-y-0 left-0 bg-black/15" style={{ width: fill }} />
            )}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={busy ? "busy" : "ready"}
                className="relative whitespace-nowrap"
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={SPRING}
              >
                {busy ? "Shipping…" : "Ship an update"}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      <p aria-live={demo ? "off" : "polite"} className="mt-3 min-h-[2.7em] text-[13px] leading-[1.35]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`${phase}-${patch}-${broken}`}
            className="inline-flex items-baseline gap-2"
            style={{ color: statusColor }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
          >
            {phase === "live" && (
              <span
                aria-hidden="true"
                className="relative top-[-1px] h-[7px] w-[7px] shrink-0 rounded-full"
                style={{ background: AMBER, boxShadow: `0 0 10px ${AMBER}` }}
              />
            )}
            {status[phase]}
          </motion.span>
        </AnimatePresence>
      </p>

      <button
        type="button"
        aria-pressed={broken}
        onClick={toggleBreak}
        className="group mt-1 flex min-h-10 w-full items-center justify-between gap-3 rounded-xl text-left text-[13px] pointer-coarse:min-h-11"
      >
        <span
          className={broken ? "" : "text-text-2 transition-colors group-hover:text-text"}
          style={broken ? { color: RED_TEXT } : undefined}
        >
          Break the runtime version
        </span>
        <span
          aria-hidden="true"
          className="relative h-[22px] w-[38px] shrink-0 rounded-full transition-[background-color,box-shadow] duration-200"
          style={{
            background: broken ? "rgba(225,29,72,0.28)" : "rgba(255,255,255,0.07)",
            boxShadow: `inset 0 0 0 1px ${broken ? "rgba(225,29,72,0.75)" : "rgba(255,255,255,0.16)"}`,
          }}
        >
          <DemoTap n={taps.flip} spill color="rgba(255,255,255,0.28)" />
          <motion.span
            className="absolute left-[3px] top-[3px] h-4 w-4 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
            initial={false}
            animate={{ x: broken ? 16 : 0, backgroundColor: broken ? RED : "#d3d5da" }}
            transition={SPRING}
          />
        </span>
      </button>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Where it's live                                                         */
/* -------------------------------------------------------------------------- */

const STORES = [
  { name: "Furrsati", where: "App Store, Google Play", live: true },
  { name: "Collabfront", where: "App Store", live: true },
  { name: "NewsGate", where: "Android release built", live: false },
];

function StoreRow() {
  return (
    <ul
      aria-label="Where the apps are"
      className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-4 text-[12.5px] leading-snug"
    >
      {STORES.map((s) => (
        <li key={s.name} className="min-w-0">
          <span
            aria-hidden="true"
            className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
            style={
              s.live
                ? { background: AMBER, boxShadow: `0 0 6px ${AMBER}` }
                : { boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4)" }
            }
          />
          <span className="text-text">{s.name}:</span> <span className="text-text-2">{s.where}</span>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */

export default function ShipTile({ className }: { className?: string }) {
  const reduced = useReducedMotion() ?? false;
  const { ref: demoRef, active: demoActive } = useAutoDemo<HTMLDivElement>();
  return (
    <Tile
      glow={AMBER}
      skill="Apps that clear the store"
      from="NewsGate & Collabfront"
      title="Shipped to the stores, and updatable after launch."
      className={className}
      ref={demoRef}
      demo={demoActive}
    >
      <MotionConfig reducedMotion="user">
        <div className="@container flex flex-1 flex-col">
          <ShrinkDemo reduced={reduced} demo={demoActive} />
          <div aria-hidden="true" className="my-5 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
          <OtaDemo reduced={reduced} demo={demoActive} />
          <div className="min-h-4 flex-1" />
          <StoreRow />
        </div>
      </MotionConfig>
    </Tile>
  );
}
