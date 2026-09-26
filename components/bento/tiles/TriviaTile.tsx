"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useAnimate,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import Tile from "../Tile";
import { useAutoDemo, useDemoScript, type DemoStep } from "../useAutoDemo";

/* Yalla Trivia's 1930s cartoon-arcade palette */
const RED = "#B61F24";
const BLUE = "#326DB1";
const MUSTARD = "#D4A03B";
const CARD = "#F2EDD0";
const INK = "#1F1A14";
/** Ink softened for secondary text on the cardstock (about 6:1). */
const INK_SOFT = "#5E584B";
/** Warm white for labels on the red and blue buttons. */
const BUTTON_TEXT = "#FFFDF4";

const SPRING = { type: "spring", stiffness: 400, damping: 30 } as const;
const FLIP = { type: "spring", stiffness: 260, damping: 21 } as const;
const POP = { type: "spring", stiffness: 520, damping: 22 } as const;
const DEAL = { type: "spring", stiffness: 300, damping: 27 } as const;
const INSTANT = { duration: 0 } as const;

/** Condensed display cut of the page font (Bricolage Grotesque). */
const CONDENSED: CSSProperties = { fontWeight: 800, fontVariationSettings: "'wdth' 75, 'opsz' 96" };

/** Filled cartoon lettering: ink outline plus a flat ink drop. */
function cartoon(fill: string): CSSProperties {
  return {
    ...CONDENSED,
    color: fill,
    WebkitTextStroke: `3px ${INK}`,
    paintOrder: "stroke fill",
    textShadow: `3px 3px 0 ${INK}`,
  };
}

/** Approved-question count, as of 28 Aug 2026 (Yalla Trivia decision log). */
const APPROVED_COUNT = "7,516";

/* -------------------------------------------------------------------------- */
/* Pipeline                                                                   */
/* -------------------------------------------------------------------------- */

/** Automated checks, in the order the pipeline runs them. A person comes last. */
const GATES = ["Same fact?", "Fact-check", "Lebanese?", "Culture"] as const;

type Candidate = {
  id: "original" | "formal";
  lang: "en" | "ar";
  question: string;
  /** Word the dialect check objects to, if any. */
  flag?: string;
  gloss?: string;
  answer: string;
  answerGloss?: string;
  /** Index into GATES of the check that rejects it; null when every check passes. */
  failAt: number | null;
};

const ORIGINAL: Candidate = {
  id: "original",
  lang: "en",
  question: "Does the UK observe daylight saving time?",
  answer: "Yes",
  failAt: null,
};

const FORMAL: Candidate = {
  id: "formal",
  lang: "ar",
  question: "ماذا تفعل بريطانيا بساعاتها كل ربيع؟",
  flag: "ماذا",
  gloss: "What does Britain do with its clocks every spring?",
  answer: "تقدّمها ساعة",
  answerGloss: "Forward one hour",
  failAt: GATES.indexOf("Lebanese?"),
};

type Face = "front" | "back";
/** Things the self-playing demo does, each the same thing a button does. */
type Move = "reveal" | "approve" | "startOver" | "formalOn" | "formalOff";
type Phase = "idle" | "checking" | "waiting" | "approved" | "rejected";
type GateStatus = "pending" | "checking" | "passed" | "rejected" | "skipped" | "waiting" | "approved";

const FIRST_STEP_MS = 720; // lets the flip land before the first tick
const STEP_MS = 480;

function gateStatus(i: number, phase: Phase, resolved: number, failAt: number | null): GateStatus {
  if (phase === "idle") return "pending";
  if (i < resolved) return failAt === i ? "rejected" : "passed";
  if (phase === "checking" && i === resolved) return "checking";
  if (phase === "rejected") return "skipped";
  return "pending";
}

function personStatus(phase: Phase): GateStatus {
  if (phase === "waiting") return "waiting";
  if (phase === "approved") return "approved";
  if (phase === "rejected") return "skipped";
  return "pending";
}

const STATUS_WORD: Record<GateStatus, string> = {
  pending: "",
  checking: "checking",
  passed: "passed",
  rejected: "rejected",
  skipped: "not reached",
  waiting: "",
  approved: "approved",
};

/* -------------------------------------------------------------------------- */
/* Gate rows                                                                  */
/* -------------------------------------------------------------------------- */

type GlyphKind = Exclude<GateStatus, "approved">;

function Glyph({ kind, reduced }: { kind: GlyphKind; reduced: boolean }) {
  const draw = {
    initial: reduced ? false : ({ pathLength: 0 } as const),
    animate: { pathLength: 1 },
    transition: reduced ? INSTANT : { delay: 0.08, duration: 0.24, ease: "easeOut" as const },
  };
  switch (kind) {
    case "pending":
      return (
        <circle cx="9" cy="9" r="7.25" fill="none" stroke={INK} strokeOpacity={0.4} strokeWidth={1.5} strokeDasharray="2.3 2.4" />
      );
    case "checking":
      return (
        <>
          <circle cx="9" cy="9" r="7.25" fill="none" stroke={INK} strokeOpacity={0.14} strokeWidth={2} />
          <motion.circle
            cx="9"
            cy="9"
            r="7.25"
            fill="none"
            stroke={INK}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="12 40"
            animate={reduced ? undefined : { rotate: 360 }}
            transition={{ repeat: Infinity, ease: "linear", duration: 0.75 }}
          />
        </>
      );
    case "passed":
      return (
        <>
          <circle cx="9" cy="9" r="8" fill={BLUE} stroke={INK} strokeWidth={1.5} />
          <motion.path
            d="M5.4 9.3 7.9 11.7 12.7 6.7"
            fill="none"
            stroke={CARD}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            {...draw}
          />
        </>
      );
    case "rejected":
      return (
        <>
          <circle cx="9" cy="9" r="8" fill={RED} stroke={INK} strokeWidth={1.5} />
          <motion.path
            d="M6.3 6.3 11.7 11.7 M11.7 6.3 6.3 11.7"
            fill="none"
            stroke={CARD}
            strokeWidth={2.2}
            strokeLinecap="round"
            {...draw}
          />
        </>
      );
    case "waiting":
      return (
        <>
          {!reduced && (
            <motion.circle
              cx="9"
              cy="9"
              r="8"
              fill="none"
              stroke={MUSTARD}
              strokeWidth={2}
              initial={{ scale: 1, opacity: 0.9 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 1.1, repeat: 2, repeatDelay: 0.25, ease: "easeOut" }}
            />
          )}
          <circle cx="9" cy="9" r="8" fill={MUSTARD} stroke={INK} strokeWidth={1.5} />
          <circle cx="9" cy="6.9" r="1.9" fill={INK} />
          <path d="M5.6 13.1a3.4 3.1 0 0 1 6.8 0z" fill={INK} />
        </>
      );
    case "skipped":
      return (
        <>
          <circle cx="9" cy="9" r="7.25" fill="none" stroke={INK} strokeOpacity={0.3} strokeWidth={1.5} />
          <path d="M6 9h6" stroke={INK} strokeOpacity={0.45} strokeWidth={1.6} strokeLinecap="round" />
        </>
      );
  }
}

function GateIcon({ status, reduced }: { status: GateStatus; reduced: boolean }) {
  const kind: GlyphKind = status === "approved" ? "passed" : status;
  return (
    <span aria-hidden="true" className="relative h-[18px] w-[18px] shrink-0">
      <AnimatePresence initial={false}>
        <motion.svg
          key={kind}
          viewBox="0 0 18 18"
          className="absolute inset-0 h-full w-full overflow-visible"
          initial={reduced ? false : { scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0, transition: reduced ? INSTANT : { duration: 0.12 } }}
          transition={reduced ? INSTANT : POP}
        >
          <Glyph kind={kind} reduced={reduced} />
        </motion.svg>
      </AnimatePresence>
    </span>
  );
}

function GateRow({ label, status, reduced }: { label: string; status: GateStatus; reduced: boolean }) {
  const word = STATUS_WORD[status];
  const resolved = status === "passed" || status === "approved" || status === "rejected";
  const quiet = status === "pending" || status === "skipped";
  const wordColor = status === "rejected" ? RED : status === "passed" || status === "approved" ? BLUE : INK_SOFT;
  return (
    <li className="relative flex min-h-[25px] items-center gap-2.5">
      {resolved && !reduced && (
        <motion.span
          key={status}
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-1.5 inset-y-0 rounded-md"
          style={{ background: status === "rejected" ? RED : BLUE }}
          initial={{ opacity: 0.2 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      )}
      <GateIcon status={status} reduced={reduced} />
      <span
        className="relative text-[13.5px] leading-tight tracking-[-0.005em] transition-colors duration-200"
        style={{ color: quiet ? INK_SOFT : INK, fontWeight: quiet ? 500 : 650 }}
      >
        {label}
      </span>
      {word ? (
        <>
          <span
            aria-hidden="true"
            className="mb-[4px] h-0 min-w-2 flex-1 self-end border-b-[1.5px] border-dotted"
            style={{ borderColor: "rgba(31,26,20,0.24)" }}
          />
          <span className="relative text-[12.5px] font-semibold" style={{ color: wordColor }}>
            <span className="sr-only">: </span>
            {word}
          </span>
        </>
      ) : null}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

function Stamp({ kind, reduced }: { kind: "approved" | "rejected"; reduced: boolean }) {
  const color = kind === "approved" ? BLUE : RED;
  return (
    <motion.div
      className="pointer-events-none absolute right-2 top-2.5 z-10 select-none rounded-[9px] px-2.5 pb-[4px] pt-[6px] text-[21px] leading-none @min-[24rem]:right-3 @min-[24rem]:top-4 @min-[24rem]:rounded-[10px] @min-[24rem]:px-3 @min-[24rem]:pb-[5px] @min-[24rem]:pt-[7px] @min-[24rem]:text-[27px]"
      style={{
        ...CONDENSED,
        color,
        border: `3px solid ${color}`,
        outline: `1.5px solid ${color}`,
        outlineOffset: "-6px",
        letterSpacing: "0.02em",
        mixBlendMode: "multiply",
      }}
      initial={reduced ? false : { scale: 2.3, opacity: 0, rotate: -2 }}
      animate={{ scale: 1, opacity: 0.92, rotate: -11 }}
      exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.12 } }}
      transition={reduced ? INSTANT : { type: "spring", stiffness: 560, damping: 24, mass: 0.9 }}
    >
      {kind === "approved" ? "Approved" : "Rejected"}
    </motion.div>
  );
}

function faceStyle(shadow: string, transform: string): CSSProperties {
  return {
    background: CARD,
    color: INK,
    border: `3px solid ${INK}`,
    boxShadow: `6px 6px 0 ${shadow}`,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    transform,
  };
}

function InnerFrame() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-[5px] rounded-[13px]"
      style={{ border: "1.5px solid rgba(31,26,20,0.13)" }}
    />
  );
}

function FlipIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 6.5a5.5 5.5 0 0 1 10-2.3" />
      <path d="M12.9 1.8v2.7h-2.7" />
      <path d="M13.5 9.5a5.5 5.5 0 0 1-10 2.3" />
      <path d="M3.1 14.2v-2.7h2.7" />
    </svg>
  );
}

function Question({ cand, flagged }: { cand: Candidate; flagged: boolean }) {
  if (cand.lang === "en") {
    return (
      <p className="text-[18px] font-semibold leading-[1.22] tracking-[-0.012em] @min-[24rem]:text-[21px]">{cand.question}</p>
    );
  }
  const flag = flagged ? cand.flag : undefined;
  return (
    <>
      <p lang="ar" dir="rtl" className="font-arabic text-[21px] font-bold leading-[1.4] @min-[24rem]:text-[24px]">
        {flag && cand.question.startsWith(flag) ? (
          <>
            <span
              style={{
                textDecorationLine: "underline",
                textDecorationStyle: "wavy",
                textDecorationColor: RED,
                textDecorationThickness: "2px",
                textUnderlineOffset: "7px",
              }}
            >
              {flag}
            </span>
            {cand.question.slice(flag.length)}
          </>
        ) : (
          cand.question
        )}
      </p>
      {cand.gloss && (
        <p className="mt-1 text-[12.5px] leading-snug" style={{ color: INK_SOFT }}>
          {cand.gloss}
        </p>
      )}
    </>
  );
}

function footerFor(phase: Phase): ReactNode {
  switch (phase) {
    case "idle":
      return null;
    case "checking":
      return <span style={{ color: INK_SOFT }}>Running the checks…</span>;
    case "waiting":
      return (
        <>
          Every check passed. <span className="font-semibold">Your call.</span>
        </>
      );
    case "approved":
      return (
        <>
          <span className="font-bold" style={{ color: RED }}>
            {APPROVED_COUNT}
          </span>{" "}
          cards made it this far.
        </>
      );
    case "rejected":
      return (
        <>
          A Lebanese host would say{" "}
          <span lang="ar" className="font-arabic rounded-[5px] px-1.5 font-bold" style={{ background: MUSTARD }}>
            شو
          </span>
          .
        </>
      );
  }
}

type CardProps = {
  cand: Candidate;
  face: Face;
  phase: Phase;
  resolved: number;
  reduced: boolean;
  onActivate: () => void;
};

function Card({ cand, face, phase, resolved, reduced, onActivate }: CardProps) {
  const flipped = face === "back";
  const stamped = phase === "approved" || phase === "rejected";

  // Flip: one rotateY value, springy, with a lift that peaks when the card is edge-on.
  const rot = useMotionValue(flipped ? 180 : 0);
  useEffect(() => {
    const target = flipped ? 180 : 0;
    if (reduced) {
      rot.set(target);
      return;
    }
    const controls = animate(rot, target, FLIP);
    return () => controls.stop();
  }, [flipped, reduced, rot]);
  const lift = useTransform(rot, (r) => 1 + 0.045 * Math.abs(Math.sin((r * Math.PI) / 180)));

  // Pointer tilt and glare (mouse only, never with reduced motion).
  const tiltX = useSpring(0, { stiffness: 260, damping: 24 });
  const tiltY = useSpring(0, { stiffness: 260, damping: 24 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(30);
  const glare = useSpring(0, { stiffness: 200, damping: 30 });
  // Press squash via pointer events (whileTap would make this div a tab stop).
  const press = useSpring(1, { stiffness: 400, damping: 30 });
  const gxBack = useTransform(gx, (v) => 100 - v);
  const glareFront = useMotionTemplate`radial-gradient(220px circle at ${gx}% ${gy}%, rgba(255,255,255,0.55), transparent 70%)`;
  const glareBack = useMotionTemplate`radial-gradient(220px circle at ${gxBack}% ${gy}%, rgba(255,255,255,0.55), transparent 70%)`;

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    tiltY.set((px - 0.5) * 14);
    tiltX.set((0.5 - py) * 10);
    gx.set(px * 100);
    gy.set(py * 100);
    glare.set(1);
  };
  const onPointerLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
    glare.set(0);
    press.set(1);
  };
  const onPointerDown = () => {
    if (!reduced) press.set(0.975);
  };
  const release = () => press.set(1);

  const thud = flipped && stamped && !reduced;
  const actionable = face === "front" || stamped;
  const person = personStatus(phase);

  return (
    <motion.div
      className={`relative select-none pb-1.5 pr-1.5 ${actionable ? "cursor-pointer" : ""}`}
      style={{ perspective: "1000px" }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerUp={release}
      onPointerCancel={release}
      onClick={onActivate}
      animate={thud ? { scale: [1, 0.96, 1.012, 1] } : { scale: 1 }}
      transition={thud ? { duration: 0.42, delay: 0.1, times: [0, 0.3, 0.7, 1], ease: "easeOut" } : SPRING}
    >
      <motion.div style={{ rotateX: tiltX, rotateY: tiltY, scale: press, transformStyle: "preserve-3d" }}>
        <motion.div className="grid" style={{ rotateY: rot, scale: lift, transformStyle: "preserve-3d" }}>
          {/* Front */}
          <div
            aria-hidden={flipped}
            className="relative flex flex-col overflow-hidden rounded-[18px] p-4 [grid-area:1/1] sm:p-[18px]"
            style={faceStyle(RED, "rotateY(0deg)")}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "repeating-conic-gradient(from -4deg at 17% 19%, rgba(31,26,20,0.065) 0deg 6deg, transparent 6deg 15deg)",
                maskImage: "radial-gradient(80% 90% at 17% 19%, #000 12%, transparent 72%)",
                WebkitMaskImage: "radial-gradient(80% 90% at 17% 19%, #000 12%, transparent 72%)",
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 right-0 h-28 w-44"
              style={{
                backgroundImage: `radial-gradient(${INK} 0.9px, transparent 1.3px)`,
                backgroundSize: "7px 7px",
                opacity: 0.15,
                maskImage: "radial-gradient(farthest-side at 100% 100%, #000 5%, transparent)",
                WebkitMaskImage: "radial-gradient(farthest-side at 100% 100%, #000 5%, transparent)",
              }}
            />
            <InnerFrame />

            <div className="relative flex items-start justify-between gap-3">
              <span className="block text-[58px] leading-[0.8] tracking-[-0.01em] @min-[24rem]:text-[74px]" style={cartoon(RED)}>
                600
              </span>
              <span
                className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold"
                style={{ background: MUSTARD, border: `2px solid ${INK}`, boxShadow: `2px 2px 0 ${INK}` }}
              >
                <span>Hard</span>
                <span aria-hidden="true" className="h-1 w-1 rounded-full" style={{ background: INK }} />
                <span lang="ar" dir="rtl" className="font-arabic text-[14px] font-bold leading-none">
                  صعب
                </span>
              </span>
            </div>

            <div className="relative mt-auto pt-5">
              <Question cand={cand} flagged={phase === "rejected"} />
            </div>

            <div className="relative mt-4 flex items-center justify-between gap-2 text-[11.5px] font-medium">
              <span className="rounded-full px-2 py-[3px] leading-none" style={{ border: `1.5px solid ${INK}` }}>
                AI draft
              </span>
              <span className="inline-flex items-center gap-1.5" style={{ color: INK_SOFT }}>
                Tap to reveal
                <FlipIcon />
              </span>
            </div>

            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20"
              style={{ background: glareFront, opacity: glare }}
            />
          </div>

          {/* Back */}
          <div
            aria-hidden={!flipped}
            className="relative flex flex-col overflow-hidden rounded-[18px] p-4 [grid-area:1/1] sm:p-[18px]"
            style={faceStyle(BLUE, "rotateY(180deg)")}
          >
            <InnerFrame />

            <div className="relative min-h-[62px]">
              <p className="text-[11.5px] font-medium" style={{ color: INK_SOFT }}>
                Answer
              </p>
              {cand.lang === "en" ? (
                <p className="mt-1 text-[42px] leading-[0.86]" style={cartoon(BLUE)}>
                  {cand.answer}
                </p>
              ) : (
                <>
                  <p lang="ar" dir="rtl" className="font-arabic mt-0.5 w-fit whitespace-nowrap text-[20px] font-bold leading-[1.25] @min-[24rem]:text-[22px]">
                    {cand.answer}
                  </p>
                  {cand.answerGloss && (
                    <p className="text-[12px] leading-tight" style={{ color: INK_SOFT }}>
                      {cand.answerGloss}
                    </p>
                  )}
                </>
              )}
            </div>

            <ol className="relative mt-2.5 flex flex-col gap-[3px]" aria-label="Checks">
              {GATES.map((g, i) => (
                <GateRow key={g} label={g} status={gateStatus(i, phase, resolved, cand.failAt)} reduced={reduced} />
              ))}
              <GateRow
                label={person === "pending" || person === "waiting" ? "Waiting for a person" : "A person"}
                status={person}
                reduced={reduced}
              />
            </ol>

            <div className="relative mt-auto min-h-[30px] pt-2.5 text-[13px] leading-snug">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={phase}
                  initial={reduced ? false : { y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -6, opacity: 0, transition: reduced ? INSTANT : { duration: 0.12 } }}
                  transition={reduced ? INSTANT : { ...SPRING, delay: phase === "approved" ? 0.18 : 0 }}
                >
                  {footerFor(phase)}
                </motion.p>
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {(phase === "approved" || phase === "rejected") && <Stamp key={phase} kind={phase} reduced={reduced} />}
            </AnimatePresence>

            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20"
              style={{ background: glareBack, opacity: glare }}
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

function Spinner() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth={2} />
      <path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export default function TriviaTile({ className }: { className?: string }) {
  const reduced = useReducedMotion() ?? false;
  const [formal, setFormal] = useState(false);
  const [face, setFace] = useState<Face>("front");
  const [phase, setPhase] = useState<Phase>("idle");
  const [resolved, setResolved] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { amount: 0.35 });
  const [buttonScope, animateButton] = useAnimate<HTMLButtonElement>();
  const cand = formal ? FORMAL : ORIGINAL;

  // Tick the gates one at a time. Pauses while the tile is off-screen.
  useEffect(() => {
    if (phase !== "checking" || !inView) return;
    const t = window.setTimeout(
      () => {
        const next = resolved + 1;
        setResolved(next);
        if (cand.failAt === resolved) setPhase("rejected");
        else if (next >= GATES.length) setPhase("waiting");
      },
      resolved === 0 ? FIRST_STEP_MS : STEP_MS,
    );
    return () => window.clearTimeout(t);
  }, [phase, resolved, inView, cand.failAt]);

  const reveal = () => {
    setFace("back");
    if (reduced) {
      const f = cand.failAt;
      setResolved(f === null ? GATES.length : f + 1);
      setPhase(f === null ? "waiting" : "rejected");
    } else {
      setResolved(0);
      setPhase("checking");
    }
  };

  const flipBack = () => setFace("front"); // back face keeps its last state while turning away

  // Only a card that passed every check can be approved.
  const approve = () => setPhase((p) => (p === "waiting" ? "approved" : p));

  /** Deals the chosen card face up, with a fresh pipeline. */
  const pickCard = (nextFormal: boolean) => {
    setFormal(nextFormal);
    setFace("front");
    setPhase("idle");
    setResolved(0);
  };
  const toggleFormal = () => pickCard(!formal);
  const rewind = () => pickCard(false);

  const nudge = () => {
    if (reduced || !buttonScope.current) return;
    animateButton(buttonScope.current, { rotate: [0, -5, 5, -3, 0] }, { duration: 0.45, ease: "easeInOut" });
  };

  const onCard = () => {
    if (face === "front") reveal();
    else if (phase === "approved" || phase === "rejected") flipBack();
    else if (phase === "waiting") nudge();
  };

  /* ---------------------------------------------------------------- Demo -- */
  // While nobody has touched the tile it demos itself: reveal the English
  // card, watch every check pass, approve it. Then try to sneak the formal
  // Arabic through: it fails "Lebanese?", and flipping it back shows the word
  // that gave it away. Finally the English card is dealt back for the loop.
  const { ref: demoRef, active: demoActive, takenOver, reduced: demoReduced } = useAutoDemo<HTMLDivElement>();
  const [controls, animateControls] = useAnimate<HTMLDivElement>();

  // The demo's timers hold closures from an older render; they read this.
  const live = useRef({ face, phase, formal });
  useEffect(() => {
    live.current = { face, phase, formal };
  });

  /** Is this move what the primary/formal button would do right now? */
  const ready = (move: Move) => {
    const s = live.current;
    switch (move) {
      case "reveal":
        return s.face === "front";
      case "approve":
        return s.face === "back" && s.phase === "waiting";
      case "startOver":
        return s.face === "back" && (s.phase === "approved" || s.phase === "rejected");
      case "formalOn":
        return !s.formal;
      case "formalOff":
        return s.formal;
    }
  };
  const act: Record<Move, () => void> = {
    reveal,
    approve,
    startOver: flipBack,
    formalOn: () => pickCard(true),
    formalOff: () => pickCard(false),
  };

  /** Presses a control the way a person would: a visible squeeze, then the action as it lets go. */
  const tap = (at: number, target: "primary" | "formal", move: Move): DemoStep[] => [
    {
      at,
      run: () => {
        if (ready(move))
          animateControls(`[data-demo="${target}"]`, { scale: [1, 0.94, 1] }, { duration: 0.3, ease: "easeInOut" });
      },
    },
    {
      at: at + 130,
      run: () => {
        if (ready(move)) act[move]();
      },
    },
  ];

  useDemoScript(
    demoActive,
    [
      { at: 0, run: rewind }, // no-op unless a visit was cut short mid-story
      ...tap(650, "primary", "reveal"), // Reveal: the checks tick through
      ...tap(4150, "primary", "approve"), // all passed, a person approves
      ...tap(6400, "formal", "formalOn"), // try to sneak the formal Arabic in
      ...tap(7900, "primary", "reveal"), // rejected at "Lebanese?"
      ...tap(11900, "primary", "startOver"), // the front now marks the word that gave it away
      ...tap(13800, "formal", "formalOff"), // deal the English card back for the loop
    ],
    { loop: true, loopDelay: 3000, reset: rewind },
  );

  // Once the tile has fully left the screen (and nobody took over), quietly
  // rewind so the next visit starts the story from the top.
  const onScreen = useInView(demoRef);
  const [wasOnScreen, setWasOnScreen] = useState(onScreen);
  if (onScreen !== wasOnScreen) {
    setWasOnScreen(onScreen);
    if (!onScreen && !takenOver && !demoReduced) rewind();
  }

  const busy = face === "back" && phase === "checking";
  const primary =
    face === "front"
      ? { label: "Reveal", tone: "red" as const, run: reveal }
      : phase === "waiting"
        ? { label: "Approve", tone: "blue" as const, run: approve }
        : phase === "checking"
          ? { label: "Checking", tone: "red" as const, run: undefined }
          : { label: "Start over", tone: "glass" as const, run: flipBack };

  const primaryStyle: CSSProperties =
    primary.tone === "glass"
      ? { background: "rgba(255,255,255,0.05)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)" }
      : {
          background: primary.tone === "blue" ? BLUE : RED,
          color: BUTTON_TEXT,
          opacity: busy ? 0.6 : 1,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 24px -10px ${primary.tone === "blue" ? BLUE : RED}`,
        };

  const announce =
    face === "front"
      ? ""
      : phase === "checking"
        ? "Running the checks."
        : phase === "waiting"
          ? "Every check passed. Waiting for a person to approve."
          : phase === "approved"
            ? `Approved. ${APPROVED_COUNT} cards made it this far.`
            : phase === "rejected"
              ? "Rejected at the Lebanese? check. A Lebanese host would say شو."
              : "";

  return (
    <Tile
      glow={RED}
      skill="AI with a human check"
      from="Yalla Trivia"
      title="AI drafts the questions. Nothing goes live until it passes every check and a person approves it."
      className={className}
      ref={demoRef}
      demo={demoActive}
    >
      <MotionConfig reducedMotion="user">
        <div className="@container flex flex-1 flex-col">
          <div className="flex flex-1 flex-col justify-center">
            <div ref={stageRef} role="group" aria-label="Question card" className="relative">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={cand.id}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, x: 64, rotate: 7, scale: 0.94 }}
                  animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, x: -72, rotate: -9, scale: 0.92 }}
                  transition={reduced ? INSTANT : DEAL}
                >
                  <Card
                    cand={cand}
                    face={face}
                    phase={phase}
                    resolved={resolved}
                    reduced={reduced}
                    onActivate={onCard}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div
            ref={controls}
            className="mt-4 flex flex-col gap-2 @min-[18.5rem]:flex-row @min-[18.5rem]:flex-wrap @min-[18.5rem]:items-center"
          >
            <motion.button
              ref={buttonScope}
              type="button"
              data-demo="primary"
              onClick={() => primary.run?.()}
              aria-disabled={busy || undefined}
              whileHover={busy ? undefined : { y: -1 }}
              whileTap={busy ? undefined : { scale: 0.95 }}
              transition={SPRING}
              className="relative inline-flex h-10 w-full items-center justify-center overflow-hidden rounded-full px-4 text-[13px] font-semibold @min-[18.5rem]:w-auto @min-[18.5rem]:min-w-[6.75rem] text-text transition-[background-color,box-shadow,opacity] duration-200 aria-disabled:cursor-progress"
              style={primaryStyle}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={primary.label}
                  className="inline-flex items-center gap-2"
                  initial={reduced ? false : { y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={reduced ? INSTANT : SPRING}
                >
                  {busy && <Spinner />}
                  {primary.label}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            <motion.button
              type="button"
              aria-pressed={formal}
              data-demo="formal"
              onClick={toggleFormal}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full px-3.5 text-[13px] font-medium text-text @min-[18.5rem]:w-auto transition-[background-color,box-shadow] duration-200"
              style={{
                background: formal ? "rgba(212,160,59,0.14)" : "rgba(255,255,255,0.05)",
                boxShadow: formal
                  ? "inset 0 0 0 1px rgba(212,160,59,0.6), 0 6px 22px -10px rgba(212,160,59,0.7)"
                  : "inset 0 0 0 1px rgba(255,255,255,0.14)",
              }}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full transition-[background-color,box-shadow] duration-200"
                style={
                  formal
                    ? { background: MUSTARD, boxShadow: `0 0 8px ${MUSTARD}` }
                    : { boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.4)" }
                }
              />
              Try the formal Arabic
            </motion.button>
          </div>

          {/* Quiet while the demo plays, so screen readers aren't narrated a loop. */}
          <p className="sr-only" aria-live={demoActive ? "off" : "polite"}>
            {announce}
          </p>
        </div>
      </MotionConfig>
    </Tile>
  );
}
