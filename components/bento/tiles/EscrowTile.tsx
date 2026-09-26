"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  animate,
  motion,
  useAnimate,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Tile from "../Tile";
import { useAutoDemo, useDemoScript, type DemoStep } from "../useAutoDemo";

/* Furrsati brand light (lib/content/projects.ts): orange primary, teal secondary. */
const ORANGE = "#FAA21B";
const TEAL = "#05696B";
/** Lighter tint of the brand teal, for small text on near-black (AA contrast). */
const TEAL_TEXT = "#3CC4BE";
const RED = "#E11D48";
/** Lighter tint of the red, for small text on near-black. */
const RED_TEXT = "#FB7185";
const TEXT = "#F4F4F2";
const MUTED = "#6D7078";

const SPRING = { type: "spring", stiffness: 400, damping: 30 } as const;
const NUMBER_SPRING = { stiffness: 200, damping: 30, mass: 0.9 };
const BAR_SPRING = { stiffness: 400, damping: 30 };

type Controls = ReturnType<typeof animate>;

/* -------------------------------------------------------------------------- */
/* Money: every value is an integer number of cents                           */
/* -------------------------------------------------------------------------- */

const MIN = 1_000; // 10.00
const MAX = 500_000; // 5,000.00
const START = 40_000; // 400.00
/** Round amounts the handle clicks into while dragging. */
const DETENTS = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000];
const RATES = [5, 10, 15] as const;
type Rate = (typeof RATES)[number];
const METHODS = ["OMT", "Whish", "Crypto"] as const;
type Method = (typeof METHODS)[number];
const STEPS = ["Fund", "Hold", "Approve", "Release"] as const;

/** Width of the grab zone at the end of the fill, in px. */
const HANDLE = 44;
const LOG_SPAN = Math.log(MAX / MIN);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** The track is logarithmic so 10.00 and 5,000.00 are both easy to reach. */
const toPos = (cents: number) => Math.log(cents / MIN) / LOG_SPAN;
const fromPos = (p: number) => clamp(Math.round(MIN * Math.exp(p * LOG_SPAN)), MIN, MAX);
/** The only split rule: the fee is rounded once, the payout is whatever is left. */
const feeFor = (amount: number, rate: number) => Math.round((amount * rate) / 100);

const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function fmt(cents: number) {
  const c = Math.max(0, Math.round(cents));
  return `${group(Math.floor(c / 100))}.${String(c % 100).padStart(2, "0")}`;
}

/** Plain form for the text field: no thousands separators. */
function plain(cents: number) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/** rate% of amount before rounding, printed exactly (amount × rate is in 1/10,000 of a dollar). */
function exactFee(amount: number, rate: number) {
  const n = amount * rate;
  const frac = String(n % 10_000)
    .padStart(4, "0")
    .replace(/0+$/, "")
    .padEnd(2, "0");
  return `${group(Math.floor(n / 10_000))}.${frac}`;
}

/** Parses "1,234.5" or "$99" into cents without floating point. Rounds half up past two decimals. */
function parseCents(raw: string): number | null {
  const s = raw.replace(/[\s,$]/g, "");
  const m = /^(\d{0,7})(?:\.(\d*))?$/.exec(s);
  if (!m) return null;
  const whole = m[1] ?? "";
  const dec = m[2] ?? "";
  if (whole === "" && dec === "") return null;
  let cents = Number(whole || "0") * 100 + Number(dec.slice(0, 2).padEnd(2, "0"));
  if (Number(dec[2] ?? "0") >= 5) cents += 1;
  return cents;
}

/* -------------------------------------------------------------------------- */
/* State                                                                      */
/* -------------------------------------------------------------------------- */

type Phase = "held" | "approving" | "releasing" | "crashed" | "rollingBack" | "released";

const isBusy = (p: Phase) => p === "approving" || p === "releasing" || p === "crashed" || p === "rollingBack";

/** Index of the milestone step each phase sits on (4 = all done). */
const STEP_AT: Record<Phase, number> = {
  held: 1,
  approving: 2,
  releasing: 3,
  crashed: 3,
  rollingBack: 1,
  released: 4,
};

type PillTone = "hold" | "move" | "done" | "bad";

const STATUS: Record<Phase, { label: string; tone: PillTone; note: string }> = {
  held: { label: "Held", tone: "hold", note: "Held until the client approves." },
  approving: { label: "Approved", tone: "move", note: "Fee and payout go in one transaction." },
  releasing: { label: "Releasing", tone: "move", note: "Fee and payout go in one transaction." },
  crashed: { label: "Crashed", tone: "bad", note: "Nothing was committed." },
  rollingBack: { label: "Rolling back", tone: "bad", note: "Nothing was committed." },
  released: { label: "Released", tone: "done", note: "Empty. Every cent reached a box." },
};

const PILL: Record<PillTone, { color: string; bg: string; ring: string }> = {
  hold: { color: ORANGE, bg: "rgba(250,162,27,0.12)", ring: "rgba(250,162,27,0.4)" },
  move: { color: TEXT, bg: "rgba(255,255,255,0.08)", ring: "rgba(255,255,255,0.22)" },
  done: { color: TEAL_TEXT, bg: "rgba(60,196,190,0.12)", ring: "rgba(60,196,190,0.42)" },
  bad: { color: RED_TEXT, bg: "rgba(225,29,72,0.14)", ring: "rgba(225,29,72,0.55)" },
};

type Tone = "idle" | "busy" | "ok" | "bad" | "safe";
type Message = { id: number; tone: Tone; text: string };

const IDLE_TEXT = "Drag the bar or type an amount. Then release it, or try to break it.";
const REFUSED_TEXT = "Refused. The split has to equal the amount, to the cent.";
const ROLLBACK_TEXT = "Rolled back. No event sent: nobody is told about money that didn't move.";

const TONE_COLOR: Record<Tone, string> = {
  idle: "var(--text-3)",
  busy: "var(--text-2)",
  ok: "var(--text)",
  bad: RED_TEXT,
  safe: "var(--text)",
};

/** What the auto demo does on each loop: drag to an amount whose fee has to round, then change the terms. */
const SCENES: { amount: number; rate: Rate; method: Method }[] = [
  { amount: 128_645, rate: 15, method: "Whish" }, // 15% of 1,286.45 is 192.9675
  { amount: 249_999, rate: 5, method: "Crypto" }, // 5% of 2,499.99 is 124.9995
  { amount: 8_888, rate: 15, method: "Crypto" }, // 15% of 88.88 is 13.332
];

/** A hand on a slider: eases in and out, runs a hair past the mark, settles back onto it. */
function dragCurve(k: number) {
  const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
  const past = k > 0.55 ? Math.sin(((k - 0.55) / 0.45) * Math.PI) : 0;
  return { e, past };
}

type DemoApi = {
  amount: number;
  changeAmount: (cents: number) => void;
  changeRate: (r: Rate) => void;
  changeMethod: (m: Method) => void;
  release: () => void;
  forceBadSplit: () => void;
  crash: () => void;
  reset: () => void;
};

type LogKind = "sent" | "refused" | "rolledBack";
type LogEntry = { id: number; kind: LogKind; detail: string };

function boxGlow(rgb: string, p: number) {
  const k = clamp(p, 0, 1);
  return `inset 0 0 0 1px rgba(${rgb},${(0.08 + 0.42 * k).toFixed(3)}), 0 18px 44px -26px rgba(${rgb},${(0.9 * k).toFixed(3)})`;
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                     */
/* -------------------------------------------------------------------------- */

function Term({
  op,
  opBad = false,
  value,
  caption,
  captionColor,
  color,
  dot,
  minCh,
  className = "",
}: {
  op?: string;
  opBad?: boolean;
  value: MotionValue<string> | string;
  caption: string;
  captionColor?: string;
  color: string;
  dot?: string;
  minCh: number;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 items-start gap-2 ${className}`}>
      {op !== undefined && (
        <span
          className="relative inline-flex w-[0.62em] justify-center font-normal transition-colors duration-200"
          style={{ color: opBad ? RED_TEXT : MUTED }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={op}
              initial={{ scale: 0.3, opacity: 0, rotate: -40 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={SPRING}
            >
              {op}
            </motion.span>
          </AnimatePresence>
        </span>
      )}
      <div className="flex flex-col">
        <motion.span className="whitespace-nowrap transition-colors duration-200" style={{ minWidth: `${minCh}ch`, color }}>
          {value}
        </motion.span>
        <span
          className="mt-2.5 flex items-center gap-1.5 whitespace-nowrap text-[12px] font-normal leading-none tracking-normal text-text-3 transition-colors duration-200"
          style={captionColor ? { color: captionColor } : undefined}
        >
          {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
          {caption}
        </span>
      </div>
    </div>
  );
}

function AmountBar({
  amount,
  onChange,
  pos,
  feeShare,
  disabled,
  refused,
  reduced,
  labelId,
  describedBy,
  demoGrab = false,
}: {
  amount: number;
  onChange: (cents: number) => void;
  pos: MotionValue<number>;
  feeShare: MotionValue<number>;
  disabled: boolean;
  refused: boolean;
  reduced: boolean;
  labelId: string;
  describedBy: string;
  /** The auto demo is dragging the bar: look held, exactly like a real press. */
  demoGrab?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; live: boolean } | null>(null);
  const detent = useRef<number | null>(null);
  const [pressed, setPressed] = useState(false);
  const [gripScope, animateGrip] = useAnimate<HTMLSpanElement>();
  const held = pressed || demoGrab;

  // Fill runs from the left edge to the end of the grab zone; the grip sits in the middle of that zone.
  const fillWidth = useTransform(pos, (p) => `calc(${HANDLE - 8}px + (100% - ${HANDLE}px) * ${clamp(p, 0, 1).toFixed(5)})`);
  const feeWidth = useTransform(feeShare, (s) => `${(clamp(s, 0, 1) * 100).toFixed(3)}%`);

  const setFromX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const span = Math.max(1, r.width - HANDLE);
    const p = clamp((clientX - r.left - HANDLE / 2) / span, 0, 1);
    const hit = DETENTS.find((d) => Math.abs(toPos(d) - p) * span < 6);
    if (hit !== undefined && hit !== detent.current && !reduced && gripScope.current) {
      animateGrip(gripScope.current, { scaleY: [1, 1.5, 1] }, { duration: 0.28, ease: "easeOut" });
    }
    detent.current = hit ?? null;
    onChange(hit ?? fromPos(p));
  };

  const end = () => {
    drag.current = null;
    setPressed(false);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    // Mouse drags at once. Touch waits for a sideways move so a vertical swipe still scrolls the page.
    const live = e.pointerType === "mouse";
    drag.current = { id: e.pointerId, x: e.clientX, live };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (live) {
      e.preventDefault();
      e.currentTarget.focus();
      setPressed(true);
      setFromX(e.clientX);
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.live) {
      if (Math.abs(e.clientX - d.x) < 4) return;
      d.live = true;
      setPressed(true);
    }
    setFromX(e.clientX);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.live) setFromX(e.clientX); // a tap sets the amount where it landed
    end();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const step = e.shiftKey ? 1_000 : 100;
    let next: number;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = amount + step;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = amount - step;
        break;
      case "PageUp":
        next = amount + 10_000;
        break;
      case "PageDown":
        next = amount - 10_000;
        break;
      case "Home":
        next = MIN;
        break;
      case "End":
        next = MAX;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(clamp(next, MIN, MAX));
  };

  const ring = refused
    ? "inset 0 0 0 1px rgba(225,29,72,0.7), 0 0 0 4px rgba(225,29,72,0.12)"
    : "inset 0 0 0 1px rgba(255,255,255,0.09), inset 0 2px 8px rgba(0,0,0,0.55)";

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      aria-valuemin={MIN / 100}
      aria-valuemax={MAX / 100}
      aria-valuenow={amount / 100}
      aria-valuetext={`${fmt(amount)} US dollars`}
      aria-orientation="horizontal"
      aria-disabled={disabled || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onKeyDown={onKeyDown}
      className={`relative h-14 select-none bg-white/[0.035] transition-[background-color,box-shadow,opacity] duration-200 hover:bg-white/[0.05] ${
        disabled ? "cursor-not-allowed opacity-80" : pressed ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{ borderRadius: 18, touchAction: "pan-y", boxShadow: ring, WebkitTapHighlightColor: "transparent" }}
    >
      {DETENTS.slice(1, -1).map((d) => (
        <span
          key={d}
          aria-hidden="true"
          className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white/[0.14]"
          style={{ left: `calc(${HANDLE / 2}px + (100% - ${HANDLE}px) * ${toPos(d).toFixed(5)})` }}
        />
      ))}

      <motion.div
        aria-hidden="true"
        className="absolute inset-y-1 left-1 flex overflow-hidden"
        style={{ width: fillWidth, borderRadius: 14 }}
        initial={false}
        animate={{
          boxShadow: held
            ? "0 0 36px -4px rgba(250,162,27,0.75), inset 0 1px 0 rgba(255,255,255,0.4)"
            : "0 0 26px -8px rgba(250,162,27,0.55), inset 0 1px 0 rgba(255,255,255,0.3)",
        }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="h-full shrink-0"
          style={{
            width: feeWidth,
            background: `linear-gradient(180deg, #0C9396, ${TEAL})`,
            boxShadow: "inset -1px 0 0 rgba(0,0,0,0.45)",
          }}
        />
        <div className="h-full min-w-0 flex-1" style={{ background: `linear-gradient(180deg, #FFC15A, ${ORANGE} 55%, #EC8C0C)` }} />
        <span
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.24), transparent 50%)" }}
        />
        <span ref={gripScope} className="absolute top-1/2 -mt-[13px] block h-[26px] w-1" style={{ right: HANDLE / 2 - 6 }}>
          <motion.span
            className="block h-full w-full rounded-full bg-white"
            style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.22), 0 0 12px rgba(255,255,255,0.75)" }}
            initial={false}
            animate={{ scaleY: held ? 1.25 : 1, opacity: disabled ? 0.55 : 1 }}
            transition={SPRING}
          />
        </span>
      </motion.div>
    </div>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  labelledBy,
  layoutId,
  disabled,
  tone,
  render,
  dense = false,
  className = "",
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labelledBy: string;
  layoutId: string;
  disabled: boolean;
  tone: "teal" | "orange";
  render: (v: T) => ReactNode;
  dense?: boolean;
  className?: string;
}) {
  const pill =
    tone === "teal"
      ? {
          background: `linear-gradient(180deg, #0C9396, ${TEAL})`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 18px -8px rgba(12,147,150,0.9)",
        }
      : {
          background: `linear-gradient(180deg, #FFC15A, ${ORANGE})`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), 0 6px 18px -8px rgba(250,162,27,0.9)",
        };
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      data-seg={layoutId}
      className={`flex rounded-full bg-white/[0.04] p-[3px] ring-1 ring-inset ring-white/[0.09] ${className}`}
    >
      {options.map((opt) => {
        const on = opt === value;
        return (
          <motion.button
            key={String(opt)}
            type="button"
            data-opt={String(opt)}
            aria-pressed={on}
            aria-disabled={disabled || undefined}
            onClick={() => {
              if (!disabled && !on) onChange(opt);
            }}
            whileTap={disabled ? undefined : { scale: 0.92 }}
            transition={SPRING}
            className={`relative h-10 min-w-10 flex-1 whitespace-nowrap text-[13px] font-medium transition-colors duration-200 pointer-coarse:h-11 ${
              dense ? "px-1.5" : "px-3.5"
            } ${on ? (tone === "orange" ? "text-black" : "text-white") : "text-text-2 hover:text-text"} ${
              disabled ? "cursor-not-allowed" : ""
            }`}
            style={{ borderRadius: 9999 }}
          >
            {on && (
              <motion.span
                layoutId={layoutId}
                aria-hidden="true"
                className="absolute inset-0"
                style={{ borderRadius: 9999, ...pill }}
                transition={SPRING}
              />
            )}
            <span className="relative">{render(opt)}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function StepMark({ done, active, bad }: { done: boolean; active: boolean; bad: boolean }) {
  let mark: ReactNode;
  if (bad) {
    mark = <circle cx="7" cy="7" r="3.5" fill={RED} />;
  } else if (done) {
    mark = (
      <>
        <circle cx="7" cy="7" r="7" fill={ORANGE} />
        <path d="M4.1 7.2 6.1 9.2 10 5" fill="none" stroke="#000" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </>
    );
  } else if (active) {
    mark = (
      <>
        <circle cx="7" cy="7" r="6.25" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
        <circle cx="7" cy="7" r="3" fill={TEXT} />
      </>
    );
  } else {
    mark = <circle cx="7" cy="7" r="6.25" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />;
  }
  return (
    <span aria-hidden="true" className="relative hidden h-3.5 w-3.5 shrink-0 @min-[440px]:block">
      <AnimatePresence initial={false}>
        <motion.svg
          key={bad ? "bad" : done ? "done" : active ? "active" : "todo"}
          viewBox="0 0 14 14"
          className="absolute inset-0 h-full w-full"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={SPRING}
        >
          {mark}
        </motion.svg>
      </AnimatePresence>
    </span>
  );
}

function Stepper({ phase }: { phase: Phase }) {
  const current = STEP_AT[phase];
  const active = Math.min(current, STEPS.length - 1);
  const crashed = phase === "crashed";
  return (
    <ol aria-label="Milestone" className="flex w-full items-center">
      {STEPS.map((label, i) => {
        const done = i < current;
        const isActive = i === active;
        const bad = crashed && isActive;
        const color = bad ? RED_TEXT : done ? ORANGE : isActive ? TEXT : MUTED;
        return (
          <li
            key={label}
            aria-current={isActive && current < STEPS.length ? "step" : undefined}
            className={`flex min-w-0 items-center ${i === 0 ? "" : "flex-1"}`}
          >
            {i > 0 && (
              <span aria-hidden="true" className="relative mx-1 h-px min-w-2 flex-1 overflow-hidden bg-white/[0.12] @min-[440px]:mx-2">
                <motion.span
                  className="absolute inset-0"
                  style={{ background: ORANGE, originX: 0 }}
                  initial={false}
                  animate={{ scaleX: i <= current ? 1 : 0 }}
                  transition={SPRING}
                />
              </span>
            )}
            <span className="relative inline-flex h-8 shrink-0 items-center gap-1.5 px-2 text-[12.5px] @min-[440px]:px-3">
              {isActive && (
                <motion.span
                  layoutId="escrow-step"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: bad ? "rgba(225,29,72,0.14)" : done ? "rgba(250,162,27,0.1)" : "rgba(255,255,255,0.07)",
                    boxShadow: `inset 0 0 0 1px ${
                      bad ? "rgba(225,29,72,0.55)" : done ? "rgba(250,162,27,0.4)" : "rgba(255,255,255,0.18)"
                    }`,
                  }}
                  transition={SPRING}
                />
              )}
              <StepMark done={done} active={isActive} bad={bad} />
              <span className="relative transition-colors duration-200" style={{ color }}>
                {label}
              </span>
              <span className="sr-only">{bad ? ", failed" : done ? ", done" : isActive ? ", in progress" : ", not yet"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function LockIcon({ open, color }: { open: boolean; color: string }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 transition-colors duration-200" fill="none" aria-hidden="true" style={{ color }}>
      <motion.path
        d="M5.2 7.2V5.4a2.8 2.8 0 0 1 5.6 0v1.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        initial={false}
        animate={{ y: open ? -2.4 : 0 }}
        transition={SPRING}
      />
      <rect x="3.4" y="7.2" width="9.2" height="6.6" rx="2" fill="currentColor" />
    </svg>
  );
}

function StatusPill({ phase }: { phase: Phase }) {
  const s = STATUS[phase];
  const c = PILL[s.tone];
  return (
    <motion.span
      layout
      className="relative inline-flex h-6 shrink-0 items-center overflow-hidden rounded-full px-2.5 text-[11.5px] font-medium max-lg:text-[12px]"
      initial={false}
      animate={{ backgroundColor: c.bg, boxShadow: `inset 0 0 0 1px ${c.ring}`, color: c.color }}
      transition={{ ...SPRING, backgroundColor: { duration: 0.2 }, boxShadow: { duration: 0.2 }, color: { duration: 0.2 } }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={s.label}
          className="whitespace-nowrap"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={SPRING}
        >
          {s.label}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

function Pipe({ flow, color, bad, className }: { flow: MotionValue<number>; color: string; bad: boolean; className: string }) {
  const head = useTransform(flow, (p) => `${(clamp(p, 0, 1) * 100).toFixed(3)}%`);
  const headOpacity = useTransform(flow, [0, 0.03, 0.97, 1], [0, 1, 1, 0]);
  const c = bad ? RED : color;
  const fill = { backgroundColor: c, boxShadow: `0 0 10px ${c}` };
  const dot = { boxShadow: `0 0 12px 3px ${c}`, opacity: headOpacity };
  return (
    <div aria-hidden="true" className={`relative ${className}`}>
      {/* Side by side: horizontal pipe */}
      <div className="absolute inset-x-0 top-1/2 hidden h-[3px] -translate-y-1/2 @min-[440px]:block">
        <span className="absolute inset-0 rounded-full bg-white/[0.08]" />
        <motion.span
          className="absolute inset-0 rounded-full transition-[background-color,box-shadow] duration-200"
          style={{ ...fill, scaleX: flow, originX: 0 }}
        />
        <motion.span className="absolute top-1/2 -ml-1 -mt-1 h-2 w-2 rounded-full bg-white" style={{ ...dot, left: head }} />
      </div>
      {/* Stacked: vertical pipe */}
      <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 @min-[440px]:hidden">
        <span className="absolute inset-0 rounded-full bg-white/[0.08]" />
        <motion.span
          className="absolute inset-0 rounded-full transition-[background-color,box-shadow] duration-200"
          style={{ ...fill, scaleY: flow, originY: 0 }}
        />
        <motion.span className="absolute left-1/2 -ml-1 -mt-1 h-2 w-2 rounded-full bg-white" style={{ ...dot, top: head }} />
      </div>
    </div>
  );
}

function ToneIcon({ tone }: { tone: Tone }) {
  if (tone === "idle") return null;
  let icon: ReactNode;
  switch (tone) {
    case "ok":
      icon = (
        <>
          <circle cx="8" cy="8" r="8" fill={ORANGE} />
          <path d="M4.6 8.2 7 10.6 11.5 5.7" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
      break;
    case "bad":
      icon = (
        <>
          <circle cx="8" cy="8" r="8" fill={RED} />
          <path d="M5.4 5.4 10.6 10.6M10.6 5.4 5.4 10.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
      break;
    case "safe":
      icon = (
        <>
          <circle cx="8" cy="8" r="7.25" fill="none" stroke={TEAL_TEXT} strokeWidth="1.5" />
          <path
            d="M5.2 6.6h4.3a2 2 0 0 1 0 4H7.2M6.8 4.9 5.1 6.6l1.7 1.7"
            fill="none"
            stroke={TEAL_TEXT}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
      break;
    default:
      icon = <circle cx="8" cy="8" r="3" fill="currentColor" />;
  }
  return (
    <svg viewBox="0 0 16 16" className="mt-[2px] h-4 w-4 shrink-0" aria-hidden="true">
      {icon}
    </svg>
  );
}

function EventLog({ entries, reduced }: { entries: LogEntry[]; reduced: boolean }) {
  const labelId = useId();
  return (
    <div className="rounded-2xl bg-black/40 px-3.5 py-2.5 ring-1 ring-inset ring-white/[0.06] @min-[520px]:flex @min-[520px]:gap-4">
      <p id={labelId} className="text-[12px] leading-[18px] text-text-3 @min-[520px]:w-[4.5rem] @min-[520px]:shrink-0">
        Event log
      </p>
      <ol
        aria-labelledby={labelId}
        className="mt-1 flex min-h-[58px] min-w-0 flex-1 flex-col gap-[2px] font-code text-[11.5px] leading-[18px] @min-[520px]:mt-0 max-lg:@max-[300px]:min-h-[76px]"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {entries.length === 0 ? (
            <motion.li
              key="empty"
              className="font-sans text-[12.5px] text-text-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Nothing sent yet.
            </motion.li>
          ) : (
            entries.map((e) => (
              <motion.li
                key={e.id}
                layout
                className="flex min-w-0 flex-wrap items-baseline gap-x-2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ ...SPRING, delay: e.kind === "sent" && !reduced ? 0.25 : 0 }}
              >
                <span className="hidden text-text-3 @min-[400px]:inline">#{e.id}</span>
                {e.kind === "sent" ? (
                  <>
                    <span className="text-text">escrow.released</span>
                    <span style={{ color: ORANGE }}>sent after commit</span>
                  </>
                ) : (
                  <>
                    <span className="text-text-3 line-through decoration-white/40">escrow.released</span>
                    <span style={{ color: RED_TEXT }}>
                      not sent: {e.kind === "refused" ? "split refused" : "rolled back"}
                    </span>
                  </>
                )}
                <span className="hidden text-text-3 @min-[520px]:inline">{e.detail}</span>
              </motion.li>
            ))
          )}
        </AnimatePresence>
      </ol>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tile                                                                       */
/* -------------------------------------------------------------------------- */

export default function EscrowTile({ className }: { className?: string }) {
  const reduced = useReducedMotion() ?? false;
  const { ref: demoRef, active: demoActive } = useAutoDemo<HTMLDivElement>();
  const [rootScope, animateRoot] = useAnimate<HTMLDivElement>();
  const inView = useInView(rootScope, { once: true, amount: 0.3 });

  const amountLabelId = useId();
  const inputId = useId();
  const hintId = useId();
  const feeLabelId = useId();
  const methodLabelId = useId();
  const methodLabelStackedId = useId();

  const [amount, setAmount] = useState(START);
  const [rate, setRate] = useState<Rate>(10);
  const [method, setMethod] = useState<Method>("OMT");
  const [phase, setPhase] = useState<Phase>("held");
  const [refused, setRefused] = useState(false);
  const [message, setMessage] = useState<Message>({ id: 0, tone: "idle", text: IDLE_TEXT });
  const [log, setLog] = useState<LogEntry[]>([]);
  const [draft, setDraft] = useState<string | null>(null);
  const [demoGrab, setDemoGrab] = useState(false);

  const fee = feeFor(amount, rate);
  const payout = amount - fee;
  const busy = isBusy(phase);

  /* Motion values. Displayed numbers are derived from one amount and one rate,
     so the equation balances on every single frame, even mid-spring. */
  const amountMV = useSpring(START, NUMBER_SPRING);
  const rateMV = useSpring(10, NUMBER_SPRING);
  const pos = useSpring(0, BAR_SPRING);
  const flow = useMotionValue(0);

  useEffect(() => {
    if (reduced) amountMV.jump(amount);
    else amountMV.set(amount);
  }, [amount, reduced, amountMV]);

  useEffect(() => {
    if (reduced) rateMV.jump(rate);
    else rateMV.set(rate);
  }, [rate, reduced, rateMV]);

  useEffect(() => {
    if (reduced) pos.jump(toPos(amount));
    else if (inView) pos.set(toPos(amount));
  }, [amount, inView, reduced, pos]);

  const feeMV = useTransform([amountMV, rateMV], ([a, r]: number[]) => feeFor(Math.round(a), r));
  const amountText = useTransform(amountMV, fmt);
  const feeText = useTransform(feeMV, fmt);
  const payoutText = useTransform([amountMV, feeMV], ([a, f]: number[]) => fmt(Math.round(a) - f));
  const feeShare = useTransform([amountMV, feeMV], ([a, f]: number[]) => f / Math.max(1, Math.round(a)));

  const feeIn = useTransform([feeMV, flow], ([f, p]: number[]) => Math.round(f * clamp(p, 0, 1)));
  const payIn = useTransform([amountMV, feeMV, flow], ([a, f, p]: number[]) =>
    Math.round((Math.round(a) - f) * clamp(p, 0, 1)),
  );
  const heldText = useTransform([amountMV, feeIn, payIn], ([a, fi, pi]: number[]) => fmt(Math.round(a) - fi - pi));
  const feeInText = useTransform(feeIn, fmt);
  const payInText = useTransform(payIn, fmt);
  const heldColor = useTransform(flow, [0.9, 1], [TEXT, MUTED]);
  const feeInColor = useTransform(flow, [0, 0.05], [MUTED, TEAL_TEXT]);
  const payInColor = useTransform(flow, [0, 0.05], [MUTED, ORANGE]);
  const escrowGlow = useTransform(flow, (p) => {
    const k = 1 - clamp(p, 0, 1);
    return `inset 0 0 0 1px rgba(250,162,27,${(0.1 + 0.3 * k).toFixed(3)}), 0 24px 60px -34px rgba(250,162,27,${(0.75 * k).toFixed(3)})`;
  });
  const feeGlow = useTransform(flow, (p) => boxGlow("60,196,190", p));
  const payGlow = useTransform(flow, (p) => boxGlow("250,162,27", p));
  const progressWidth = useTransform(flow, (p) => `${(clamp(p, 0, 1) * 100).toFixed(2)}%`);

  const [eqScope, animateEq] = useAnimate<HTMLDivElement>();
  const [flowScope, animateFlow] = useAnimate<HTMLDivElement>();

  /* Async choreography, cancelled on unmount */
  const runRef = useRef(0);
  const timers = useRef(new Set<number>());
  const ctrl = useRef<Controls | null>(null);
  const refuseTimer = useRef<number | undefined>(undefined);
  const logSeq = useRef(0);
  const msgSeq = useRef(0);

  useEffect(() => {
    const pending = timers.current;
    const run = runRef;
    const anim = ctrl;
    const refuse = refuseTimer;
    return () => {
      run.current += 1;
      pending.forEach((t) => window.clearTimeout(t));
      pending.clear();
      anim.current?.stop();
      window.clearTimeout(refuse.current);
    };
  }, []);

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = window.setTimeout(() => {
        timers.current.delete(t);
        resolve();
      }, ms);
      timers.current.add(t);
    });

  const say = (tone: Tone, text: string) => {
    msgSeq.current += 1;
    setMessage({ id: msgSeq.current, tone, text });
  };

  const pushLog = (kind: LogKind, detail: string) => {
    logSeq.current += 1;
    const entry = { id: logSeq.current, kind, detail };
    setLog((l) => [entry, ...l].slice(0, 3));
  };

  const clearRefused = () => {
    window.clearTimeout(refuseTimer.current);
    setRefused(false);
  };

  /** Empties the destinations and puts a fresh milestone in escrow. */
  const refund = (announce: boolean) => {
    runRef.current += 1;
    ctrl.current?.stop();
    flow.jump(0);
    setPhase("held");
    if (!reduced && flowScope.current) {
      animateFlow("[data-escrow]", { scale: [0.96, 1] }, { type: "spring", stiffness: 400, damping: 18 });
    }
    if (announce) say("safe", `New milestone funded. ${fmt(amount)} is held in escrow.`);
    else say("idle", IDLE_TEXT);
  };

  /** Any edit to the terms. After a release it starts a new milestone. */
  const canEdit = () => {
    if (busy) return false;
    if (phase === "released") refund(false);
    if (refused) clearRefused();
    return true;
  };

  const changeAmount = (cents: number) => {
    const next = clamp(cents, MIN, MAX);
    if (next === amount || !canEdit()) return;
    setAmount(next);
  };

  const changeRate = (r: Rate) => {
    if (!canEdit()) return;
    setRate(r);
  };

  const changeMethod = (m: Method) => {
    if (!canEdit()) return;
    setMethod(m);
  };

  const commitDraft = () => {
    if (draft === null) return;
    const c = parseCents(draft);
    if (c !== null) changeAmount(c);
    setDraft(null);
  };

  const release = async () => {
    if (busy) return;
    if (phase === "released") {
      refund(true);
      return;
    }
    clearRefused();
    const id = ++runRef.current;
    const alive = () => runRef.current === id;
    const done = () => {
      setPhase("released");
      pushLog("sent", `${fmt(payout)} via ${method}`);
      say("ok", `Released. ${fmt(fee)} to the platform and ${fmt(payout)} to the freelancer via ${method}. Committed first, then the event went out.`);
    };

    if (reduced) {
      flow.jump(1);
      done();
      return;
    }

    setPhase("approving");
    say("busy", "Approved. Writing the fee and the payout in one transaction…");
    await wait(420);
    if (!alive()) return;

    setPhase("releasing");
    ctrl.current = animate(flow, 1, { duration: 1.15, ease: [0.65, 0, 0.35, 1] });
    await ctrl.current;
    if (!alive()) return;

    // Commit. Only now does anything get told.
    done();
    if (flowScope.current) animateFlow("[data-dest]", { scale: [1, 1.045, 1] }, { duration: 0.42, ease: "easeOut" });
  };

  const crash = async () => {
    if (busy) return;
    if (phase === "released") refund(false);
    clearRefused();
    const id = ++runRef.current;
    const alive = () => runRef.current === id;
    const rolledBack = () => {
      setPhase("held");
      pushLog("rolledBack", "crashed before commit");
      say("safe", ROLLBACK_TEXT);
    };

    if (reduced) {
      flow.jump(0);
      rolledBack();
      return;
    }

    setPhase("approving");
    say("busy", "Approved. Writing the fee and the payout in one transaction…");
    await wait(420);
    if (!alive()) return;

    setPhase("releasing");
    ctrl.current = animate(flow, 1, { duration: 1.15, ease: [0.65, 0, 0.35, 1] });
    await wait(620);
    if (!alive()) return;

    // The process dies mid-transaction.
    ctrl.current.stop();
    setPhase("crashed");
    say("bad", "The server crashed before the commit.");
    if (flowScope.current) animateFlow("[data-escrow]", { x: [0, -8, 7, -5, 3, 0] }, { duration: 0.45, ease: "easeOut" });
    await wait(750);
    if (!alive()) return;

    setPhase("rollingBack");
    ctrl.current = animate(flow, 0, { duration: 0.8, ease: [0.22, 1, 0.36, 1] });
    await ctrl.current;
    if (!alive()) return;

    rolledBack();
  };

  const forceBadSplit = () => {
    if (busy) return;
    if (phase === "released") refund(false);
    window.clearTimeout(refuseTimer.current);
    setRefused(true);
    pushLog("refused", `${fmt(fee + 1)} + ${fmt(payout)} is not ${fmt(amount)}`);
    say("bad", REFUSED_TEXT);
    if (!reduced && eqScope.current) {
      animateEq(eqScope.current, { x: [0, -11, 10, -7, 5, -2, 0] }, { duration: 0.5, ease: "easeOut" });
    }
    refuseTimer.current = window.setTimeout(() => setRefused(false), 2800);
  };

  /** Back to a fresh milestone of 400.00 at 10% via OMT, gliding there on the tile's own springs. */
  const resetTerms = () => {
    if (phase !== "held") refund(false);
    else if (message.tone !== "idle") say("idle", IDLE_TEXT);
    clearRefused();
    setDraft(null);
    setAmount(START);
    setRate(10);
    setMethod("OMT");
    logSeq.current = 0;
    setLog([]);
  };

  /* ---------------------------------------------------------------------- */
  /* Auto demo: plays the tile like a person would, until someone takes over */
  /* ---------------------------------------------------------------------- */

  const api = useRef<DemoApi | null>(null);
  useEffect(() => {
    api.current = {
      amount,
      changeAmount,
      changeRate,
      changeMethod,
      release: () => void release(),
      forceBadSplit,
      crash: () => void crash(),
      reset: resetTerms,
    };
  });

  const scene = useRef(0);
  const dirty = useRef(false);
  const tween = useRef(0);

  const stopTween = () => {
    cancelAnimationFrame(tween.current);
    tween.current = 0;
  };

  // A person scrolling away or taking over stops the hand mid-drag; the amount stays where it was.
  useEffect(() => {
    if (!demoActive) return;
    return stopTween;
  }, [demoActive]);

  /** Drags the bar to `target` along the log track, one frame at a time, through the slider's own onChange. */
  const dragTo = (target: number, ms: number) => {
    stopTween();
    const p0 = toPos(api.current?.amount ?? START);
    const p1 = toPos(target);
    const dir = Math.sign(p1 - p0);
    const t0 = performance.now();
    setDemoGrab(true);
    const frame = (now: number) => {
      const k = clamp((now - t0) / ms, 0, 1);
      if (k >= 1) {
        tween.current = 0;
        api.current?.changeAmount(target);
        setDemoGrab(false);
        return;
      }
      const { e, past } = dragCurve(k);
      api.current?.changeAmount(fromPos(p0 + (p1 - p0) * e + dir * 0.018 * past));
      tween.current = requestAnimationFrame(frame);
    };
    tween.current = requestAnimationFrame(frame);
  };

  /** The little dip a real press gives a button. */
  const press = (selector: string, scale = 0.95) => {
    if (!rootScope.current) return;
    animateRoot(selector, { scale: [1, scale, 1] }, { duration: 0.32, ease: [0.22, 1, 0.36, 1] });
  };

  /** Start of every play: if an earlier run was interrupted (scrolled away), glide back to a fresh milestone. */
  const prepare = () => {
    stopTween();
    setDemoGrab(false);
    if (!dirty.current) return;
    dirty.current = false;
    scene.current = (scene.current + 1) % SCENES.length;
    api.current?.reset();
  };

  const demoSteps: DemoStep[] = [
    { at: 0, run: prepare },
    {
      at: 850,
      run: () => {
        dirty.current = true;
        dragTo(SCENES[scene.current].amount, 1100);
      },
    },
    {
      at: 2800,
      run: () => {
        const { rate: r } = SCENES[scene.current];
        press(`[data-seg="escrow-rate"] [data-opt="${r}"]`, 0.92);
        api.current?.changeRate(r);
      },
    },
    {
      at: 3800,
      run: () => {
        const { method: m } = SCENES[scene.current];
        press(`[data-seg^="escrow-method"] [data-opt="${m}"]`, 0.92);
        api.current?.changeMethod(m);
      },
    },
    // The happy path: approve and release. Fee and payout land together, then the event goes out.
    {
      at: 5000,
      run: () => {
        press(`[data-act="release"]`);
        api.current?.release();
      },
    },
    // "Fund again": a new milestone is held.
    {
      at: 8000,
      run: () => {
        press(`[data-act="release"]`);
        api.current?.release();
      },
    },
    // Now try to break it: a split that is off by one cent is refused.
    {
      at: 9200,
      run: () => {
        press(`[data-act="split"]`);
        api.current?.forceBadSplit();
      },
    },
    // The server dies mid-transaction: nothing commits, nothing is announced.
    {
      at: 12600,
      run: () => {
        press(`[data-act="crash"]`);
        api.current?.crash();
      },
    },
    // The rollback lands about here; the loop pauses on it before starting over.
    { at: 15300, run: () => {} },
  ];

  useDemoScript(demoActive, demoSteps, { loop: true, loopDelay: 3400, reset: prepare });

  const exact = (amount * rate) % 100 === 0;
  const primaryLabel =
    phase === "released"
      ? "Fund again"
      : phase === "crashed" || phase === "rollingBack"
        ? "Rolling back…"
        : busy
          ? "Releasing…"
          : "Release payment";
  const pipesBad = phase === "crashed" || phase === "rollingBack";
  const lockOpen = phase === "releasing" || phase === "crashed" || phase === "released";
  const bad = message.tone === "bad";

  return (
    <Tile
      glow={ORANGE}
      skill="Payments"
      from="Furrsati"
      title="Money waits in escrow and splits to the cent. It can't split any other way."
      className={className}
      ref={demoRef}
      demo={demoActive}
    >
      <MotionConfig reducedMotion="user">
        <LayoutGroup id="escrow-tile">
          <div ref={rootScope} className="@container/escrow flex flex-1 flex-col">
            {/* 1. The equation */}
            <p className="sr-only">
              {refused
                ? `Attempted split: ${fmt(fee + 1)} plus ${fmt(payout)}, which is ${fmt(amount + 1)}, not ${fmt(amount)}.`
                : `${fmt(amount)} equals ${fmt(fee)} platform fee plus ${fmt(payout)} to the freelancer.`}
            </p>
            <div
              ref={eqScope}
              aria-hidden="true"
              className="flex flex-wrap items-start gap-x-3 gap-y-3 text-[clamp(1.6rem,6cqi,2.35rem)] font-medium leading-none tracking-[-0.03em] tabular-nums"
            >
              <Term value={amountText} caption="Amount" color={TEXT} minCh={6.6} className="basis-full @min-[440px]:basis-auto" />
              <Term
                op={refused ? "≠" : "="}
                opBad={refused}
                value={refused ? fmt(fee + 1) : feeText}
                caption={refused ? "Off by 0.01" : "Platform fee"}
                captionColor={refused ? RED_TEXT : undefined}
                color={refused ? RED_TEXT : TEAL_TEXT}
                dot={refused ? RED : TEAL_TEXT}
                minCh={5.6}
              />
              <Term op="+" value={payoutText} caption="To freelancer" color={ORANGE} dot={ORANGE} minCh={6.6} />
            </div>
            <p
              className="mt-3 min-h-[2.8em] text-[12.5px] leading-[1.4] text-text-2 transition-colors duration-200 @min-[600px]:min-h-[1.4em]"
              style={refused ? { color: RED_TEXT } : undefined}
            >
              {refused ? (
                <>
                  {fmt(fee + 1)} + {fmt(payout)} = {fmt(amount + 1)}, not {fmt(amount)}. Nothing was written.
                </>
              ) : exact ? (
                <>
                  {rate}% of {fmt(amount)} is exactly <span style={{ color: TEAL_TEXT }}>{fmt(fee)}</span>. The payout is the
                  rest, so the sum always holds.
                </>
              ) : (
                <>
                  {rate}% of {fmt(amount)} is {exactFee(amount, rate)}, so the fee rounds to{" "}
                  <span style={{ color: TEAL_TEXT }}>{fmt(fee)}</span>. The payout is the rest.
                </>
              )}
            </p>

            {/* 2. Terms: amount and fee rate */}
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <div className="flex items-center gap-3">
                <label id={amountLabelId} htmlFor={inputId} className="text-[13px] text-text-2">
                  Amount
                </label>
                <div className="flex h-11 items-center rounded-full bg-white/[0.04] pl-4 pr-1.5 ring-1 ring-inset ring-white/10 transition-shadow duration-200 focus-within:ring-[#FAA21B]/70">
                  <span aria-hidden="true" className="text-[12.5px] text-text-3">
                    USD
                  </span>
                  <input
                    id={inputId}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    spellCheck={false}
                    enterKeyHint="done"
                    aria-describedby={hintId}
                    readOnly={busy}
                    value={draft ?? plain(amount)}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft(v);
                      const c = parseCents(v);
                      if (c !== null && c >= MIN && c <= MAX) changeAmount(c);
                    }}
                    onBlur={commitDraft}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        commitDraft();
                      } else if (e.key === "Escape") {
                        setDraft(null);
                      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                        e.preventDefault();
                        setDraft(null);
                        changeAmount(amount + (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 1_000 : 100));
                      }
                    }}
                    className="h-full w-[5.75rem] bg-transparent pl-2 pr-1 text-[15px] font-medium tabular-nums text-text pointer-coarse:text-[16px]"
                    style={{ outline: "none" }}
                  />
                </div>
                <span id={hintId} className="sr-only">
                  From 10.00 to 5,000.00 US dollars.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span id={feeLabelId} className="flex flex-col text-[13px] leading-tight text-text-2">
                  Fee rate
                  <span className="text-[11.5px] text-text-3 max-lg:text-[12px]">illustrative</span>
                </span>
                <Segmented
                  options={RATES}
                  value={rate}
                  onChange={changeRate}
                  labelledBy={feeLabelId}
                  layoutId="escrow-rate"
                  disabled={busy}
                  tone="teal"
                  render={(r) => `${r}%`}
                />
              </div>
            </div>

            {/* 3. The split bar is the slider */}
            <div className="mt-3">
              <AmountBar
                amount={amount}
                onChange={changeAmount}
                pos={pos}
                feeShare={feeShare}
                disabled={busy}
                refused={refused}
                reduced={reduced}
                labelId={amountLabelId}
                describedBy={hintId}
                demoGrab={demoGrab && demoActive}
              />
            </div>

            {/* 4. Milestone */}
            <div className="mt-4">
              <Stepper phase={phase} />
            </div>

            {/* 5. Where the money goes */}
            <div
              ref={flowScope}
              className="mt-3 grid grid-cols-2 grid-rows-[auto_28px_auto] gap-x-2 @min-[440px]:grid-cols-[minmax(0,1fr)_52px_minmax(0,1.4fr)] @min-[440px]:grid-rows-[auto_auto] @min-[440px]:gap-x-0 @min-[440px]:gap-y-2"
            >
              <motion.div
                data-escrow=""
                className="relative col-span-2 col-start-1 row-start-1 flex flex-col justify-between gap-2 overflow-hidden rounded-[20px] bg-white/[0.035] p-3.5 @min-[440px]:col-span-1 @min-[440px]:row-span-2 @min-[440px]:p-4"
                style={{ boxShadow: escrowGlow }}
              >
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(225,29,72,0.34), transparent 70%)" }}
                  initial={false}
                  animate={{ opacity: pipesBad ? 1 : 0 }}
                  transition={{ duration: 0.25 }}
                />
                <div className="relative flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[13px] text-text">
                    <LockIcon open={lockOpen} color={pipesBad ? RED_TEXT : phase === "released" ? MUTED : ORANGE} />
                    Escrow
                  </span>
                  <StatusPill phase={phase} />
                </div>
                <div className="relative">
                  <motion.p
                    className="text-[24px] font-medium leading-none tracking-[-0.02em] tabular-nums @min-[440px]:text-[30px]"
                    style={{ color: heldColor }}
                  >
                    {heldText}
                  </motion.p>
                  <p className="mt-2 hidden text-[12px] leading-snug text-text-3 @min-[440px]:block">{STATUS[phase].note}</p>
                </div>
              </motion.div>

              <Pipe
                flow={flow}
                color={TEAL_TEXT}
                bad={pipesBad}
                className="col-start-1 row-start-2 @min-[440px]:col-start-2 @min-[440px]:row-start-1"
              />
              <Pipe
                flow={flow}
                color={ORANGE}
                bad={pipesBad}
                className="col-start-2 row-start-2 @min-[440px]:col-start-2 @min-[440px]:row-start-2"
              />

              <motion.div
                data-dest=""
                className="relative col-start-1 row-start-3 rounded-[18px] bg-white/[0.03] p-3 @min-[440px]:col-start-3 @min-[440px]:row-start-1 @min-[440px]:flex @min-[440px]:flex-col @min-[440px]:justify-center @min-[440px]:px-4"
                style={{ boxShadow: feeGlow }}
              >
                <p className="text-[12px] leading-tight text-text-2">
                  Platform fee
                  <span className="block text-text-3 @min-[440px]:inline">
                    <span className="hidden @min-[440px]:inline">{" · "}</span>
                    {rate}%
                  </span>
                </p>
                <motion.p
                  className="mt-1.5 text-[20px] font-medium leading-none tracking-[-0.01em] tabular-nums @min-[440px]:text-[22px]"
                  style={{ color: feeInColor }}
                >
                  {feeInText}
                </motion.p>
              </motion.div>

              <motion.div
                data-dest=""
                className="@container/pay relative col-start-2 row-start-3 rounded-[18px] bg-white/[0.03] p-2.5 @min-[440px]:col-start-3 @min-[440px]:row-start-2 @min-[440px]:py-3 @min-[440px]:pl-4 @min-[440px]:pr-3"
                style={{ boxShadow: payGlow }}
              >
                <div className="flex flex-col gap-2.5 @min-[290px]/pay:flex-row @min-[290px]/pay:items-center @min-[290px]/pay:justify-between">
                  <div className="min-w-0 px-0.5">
                    <p className="text-[12px] leading-tight text-text-2">
                      To freelancer
                      <span className="hidden @min-[440px]/escrow:inline">{" · "}</span>
                      <span className="relative flex overflow-hidden @min-[440px]/escrow:inline-flex @min-[440px]/escrow:align-bottom">
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={method}
                            className="text-text"
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: "0%", opacity: 1 }}
                            exit={{ y: "-100%", opacity: 0 }}
                            transition={SPRING}
                          >
                            {method}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                    </p>
                    <motion.p
                      className="mt-1.5 text-[20px] font-medium leading-none tracking-[-0.01em] tabular-nums @min-[440px]/escrow:text-[22px]"
                      style={{ color: payInColor }}
                    >
                      {payInText}
                    </motion.p>
                  </div>
                  {/* Side by side, the picker lives in the box. Stacked, it gets its own row below. */}
                  <div className="hidden shrink-0 @min-[440px]/escrow:block">
                    <span id={methodLabelId} className="sr-only">
                      Pay the freelancer with
                    </span>
                    <Segmented
                      options={METHODS}
                      value={method}
                      onChange={changeMethod}
                      labelledBy={methodLabelId}
                      layoutId="escrow-method"
                      disabled={busy}
                      tone="orange"
                      render={(m) => m}
                      dense
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-3 @min-[440px]:hidden">
              <span id={methodLabelStackedId} className="text-[13px] text-text-2">
                Pay out with
              </span>
              <Segmented
                options={METHODS}
                value={method}
                onChange={changeMethod}
                labelledBy={methodLabelStackedId}
                layoutId="escrow-method-stacked"
                disabled={busy}
                tone="orange"
                render={(m) => m}
                dense
                className="min-w-0 max-w-[15rem] flex-1"
              />
            </div>

            {/* 6. Actions */}
            <div className="mt-3.5 grid grid-cols-2 gap-2 max-lg:flex max-lg:flex-wrap @min-[520px]:flex @min-[520px]:flex-wrap @min-[520px]:items-center">
              <motion.button
                type="button"
                onClick={release}
                data-act="release"
                aria-disabled={busy || undefined}
                whileHover={busy ? undefined : { y: -1 }}
                whileTap={busy ? undefined : { scale: 0.96 }}
                transition={SPRING}
                className={`relative col-span-2 inline-flex h-11 items-center justify-center overflow-hidden px-5 text-[14px] font-semibold text-black max-lg:basis-full @min-[520px]:min-w-[10.5rem] max-lg:@min-[520px]:basis-auto ${
                  busy ? "cursor-progress" : ""
                }`}
                style={{
                  borderRadius: 9999,
                  background: `linear-gradient(180deg, #FFC860, ${ORANGE})`,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 10px 28px -10px rgba(250,162,27,0.85)",
                }}
              >
                {busy && (
                  <motion.span aria-hidden="true" className="absolute inset-y-0 left-0 bg-black/15" style={{ width: progressWidth }} />
                )}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={primaryLabel}
                    className="relative whitespace-nowrap"
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -16, opacity: 0 }}
                    transition={SPRING}
                  >
                    {primaryLabel}
                  </motion.span>
                </AnimatePresence>
              </motion.button>

              <motion.button
                type="button"
                onClick={forceBadSplit}
                data-act="split"
                aria-disabled={busy || undefined}
                whileHover={busy ? undefined : { y: -1 }}
                whileTap={busy ? undefined : { scale: 0.96 }}
                transition={SPRING}
                className={`inline-flex min-h-11 items-center justify-center gap-2 bg-white/[0.04] px-3 py-1.5 text-center text-[13px] leading-tight text-text-2 ring-1 ring-inset ring-white/10 transition-[color,box-shadow] duration-200 hover:text-text hover:ring-[#E11D48]/50 max-lg:grow max-lg:@max-[400px]:px-2.5 @min-[520px]:px-4 max-lg:@min-[520px]:grow-0 ${
                  busy ? "cursor-not-allowed opacity-60" : ""
                }`}
                style={{ borderRadius: 9999 }}
              >
                <svg viewBox="0 0 16 16" className="hidden h-4 w-4 shrink-0 @min-[400px]:block" fill="none" aria-hidden="true">
                  <path d="M3 6.3h10M3 9.7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M10.4 3 5.6 13" stroke={RED_TEXT} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Force a bad split
              </motion.button>

              <motion.button
                type="button"
                onClick={crash}
                data-act="crash"
                aria-disabled={busy || undefined}
                whileHover={busy ? undefined : { y: -1 }}
                whileTap={busy ? undefined : { scale: 0.96 }}
                transition={SPRING}
                className={`inline-flex min-h-11 items-center justify-center gap-2 bg-white/[0.04] px-3 py-1.5 text-center text-[13px] leading-tight text-text-2 ring-1 ring-inset ring-white/10 transition-[color,box-shadow] duration-200 hover:text-text hover:ring-[#E11D48]/50 max-lg:grow max-lg:@max-[400px]:px-2.5 @min-[520px]:px-4 max-lg:@min-[520px]:grow-0 ${
                  busy ? "cursor-not-allowed opacity-60" : ""
                }`}
                style={{ borderRadius: 9999 }}
              >
                <svg viewBox="0 0 16 16" className="hidden h-4 w-4 shrink-0 @min-[400px]:block" fill="none" aria-hidden="true">
                  <path
                    d="M9.2 1.8 3.6 9h4.1l-1 5.2L12.4 7H8.3l.9-5.2Z"
                    stroke={RED_TEXT}
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                </svg>
                Crash before commit
              </motion.button>
            </div>

            {/* 7. Result */}
            <p
              aria-live={demoActive ? "off" : "polite"}
              className="mt-2 min-h-[36px] text-[13px] leading-[1.45] max-lg:min-h-[3.4rem] max-lg:@max-[520px]:min-h-[4.6rem]"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={message.id}
                  className={`flex items-start gap-2 rounded-xl py-2 ${bad ? "px-3" : "px-0"}`}
                  style={{
                    color: TONE_COLOR[message.tone],
                    background: bad ? "rgba(225,29,72,0.1)" : "transparent",
                    boxShadow: bad ? "inset 0 0 0 1px rgba(225,29,72,0.38)" : "none",
                  }}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: reduced ? 0 : 0.18 }}
                >
                  <ToneIcon tone={message.tone} />
                  <span className="min-w-0">{message.text}</span>
                </motion.span>
              </AnimatePresence>
            </p>

            <div className="min-h-2 flex-1" />

            {/* 8. What the rest of the system hears */}
            <EventLog entries={log} reduced={reduced} />
          </div>
        </LayoutGroup>
      </MotionConfig>
    </Tile>
  );
}
