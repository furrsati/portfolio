"use client";

import { useId, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useAnimate,
  useInView,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";
import Tile from "../Tile";
import { useAutoDemo, useDemoScript, type DemoStep } from "../useAutoDemo";

const INDIGO = "#5656FF";
const LIME = "#C0FF2E";
const NAVY = "#15172F";
/** Soft coral for "the wrong way"; readable on near-black. */
const WRONG = "#FF8A8A";

const SPRING = { type: "spring", stiffness: 400, damping: 30 } as const;
const INSTANT: Transition = { duration: 0 };

type Mode = "en" | "ar" | "mirror";
type Lang = "en" | "ar";
type Dir = "ltr" | "rtl";
type Copy = { en: string; ar: string };

const COPY = {
  back: { en: "Back", ar: "رجوع" },
  title: { en: "Summer launch campaign", ar: "حملة إطلاق صيفية" },
  paid: { en: "Paid", ar: "مدفوع" },
  barter: { en: "Barter", ar: "مقايضة" },
  apply: { en: "Apply now", ar: "قدّم الآن" },
} satisfies Record<string, Copy>;

const CREATORS = [
  { bg: "linear-gradient(150deg, #8C8CFF, #5656FF)", fg: "rgba(255,255,255,0.55)" },
  { bg: "linear-gradient(150deg, #E4FF9C, #C0FF2E)", fg: "rgba(21,23,47,0.45)" },
  { bg: "linear-gradient(150deg, #FFD9B8, #F2A36B)", fg: "rgba(21,23,47,0.35)" },
  { bg: "linear-gradient(150deg, #3B3F78, #262950)", fg: "rgba(255,255,255,0.42)" },
];

const CARD_BG = `radial-gradient(120% 70% at 50% -12%, rgba(86,86,255,0.3), transparent 62%), linear-gradient(165deg, #1C1F45 0%, ${NAVY} 55%, #0F1124 100%)`;
const CARD_SHADOW =
  "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 0 rgba(255,255,255,0.1), 0 24px 50px -28px rgba(86,86,255,0.75)";
const CARD_SHADOW_WRONG =
  "inset 0 0 0 1px rgba(255,138,138,0.5), inset 0 1px 0 0 rgba(255,255,255,0.06), 0 24px 50px -28px rgba(255,138,138,0.55)";

const CARD_LABEL: Record<Mode, string> = {
  en: "Campaign card in English, laid out left to right.",
  ar: "The same campaign card in Arabic, laid out right to left. The price still reads $250.",
  mirror:
    "The campaign card flipped like a mirror image: the text reads backwards and the back arrow points the wrong way.",
};

const CAPTION: Record<Mode, ReactNode> = {
  en: "English runs left to right.",
  ar: (
    <>
      Everything turns around, but <bdi dir="ltr">$250</bdi> stays <bdi dir="ltr">$250</bdi>.
    </>
  ),
  mirror: "Mirrored: text backwards, arrow wrong.",
};

/* -------------------------------------------------------------------------- */
/* Copy that crossfades between English and Arabic                            */
/* -------------------------------------------------------------------------- */

/**
 * Both languages sit in the same grid cell, so the slot keeps one size in
 * either language and layout animations only ever translate (no text squash).
 */
function Swap({
  lang,
  copy,
  reduced,
  layout = false,
  layoutTransition,
  className = "",
  arClassName = "",
}: {
  lang: Lang;
  copy: Copy;
  reduced: boolean;
  layout?: boolean;
  layoutTransition?: Transition;
  className?: string;
  arClassName?: string;
}) {
  return (
    <motion.span
      layout={layout}
      transition={layoutTransition ? { layout: layoutTransition } : undefined}
      className={`grid ${className}`}
    >
      {(["en", "ar"] as const).map((l) => {
        const on = l === lang;
        return (
          <motion.span
            key={l}
            lang={l}
            dir={l === "ar" ? "rtl" : "ltr"}
            className={`col-start-1 row-start-1 justify-self-start ${l === "ar" ? `font-arabic ${arClassName}` : ""}`}
            initial={false}
            animate={
              on
                ? { opacity: 1, y: 0, filter: "blur(0px)" }
                : { opacity: 0, y: l === "ar" ? 5 : -5, filter: "blur(4px)" }
            }
            transition={reduced ? INSTANT : { duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: on ? 0.1 : 0 }}
          >
            {copy[l]}
          </motion.span>
        );
      })}
    </motion.span>
  );
}

/* -------------------------------------------------------------------------- */
/* The campaign card                                                          */
/* -------------------------------------------------------------------------- */

function BrandMark() {
  // Deliberately asymmetric, so a naive mirror visibly flips the logo too.
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M13.4 6.3A5 5 0 1 0 13.4 13.7" stroke={NAVY} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="15.2" cy="10" r="1.7" fill={NAVY} />
    </svg>
  );
}

function Person({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 28 28" className="h-full w-full" aria-hidden="true">
      <circle cx="14" cy="11" r="4.6" fill={color} />
      <path d="M5 28c0-5.3 4-9.2 9-9.2s9 3.9 9 9.2Z" fill={color} />
    </svg>
  );
}

function CardFace({
  lang,
  dir,
  arrowRight,
  live,
  wrong,
  reduced,
}: {
  lang: Lang;
  /** Direction the layout is built in. */
  dir: Dir;
  /** Back arrow drawn pointing right (the Arabic arrow). */
  arrowRight: boolean;
  /** Elements glide to their new place when the direction changes. */
  live: boolean;
  wrong: boolean;
  reduced: boolean;
}) {
  const move = (step: number): Transition => (reduced || !live ? INSTANT : { ...SPRING, delay: step * 0.04 });
  const fillTo = dir === "rtl" ? `linear-gradient(90deg, ${LIME}, ${INDIGO})` : `linear-gradient(90deg, ${INDIGO}, ${LIME})`;

  return (
    <div
      dir={dir}
      className="relative w-full rounded-[22px] p-3.5"
      style={{ background: CARD_BG, boxShadow: wrong ? CARD_SHADOW_WRONG : CARD_SHADOW }}
    >
      {/* Top bar: back, price */}
      <div className="flex items-center justify-between gap-3">
        <motion.span
          layout={live}
          transition={{ layout: move(0) }}
          className="inline-flex h-7 items-center gap-1.5 rounded-full ps-2 pe-2.5 text-[12px] leading-none text-white/75"
          style={{ background: "rgba(255,255,255,0.06)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09)" }}
        >
          <motion.span
            layout={live}
            className="inline-flex"
            initial={false}
            animate={{ rotate: arrowRight ? 180 : 0 }}
            transition={reduced ? INSTANT : { ...SPRING, layout: move(0) }}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
              <path
                d="M12.5 8h-9M7 4.5 3.5 8 7 11.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.span>
          <Swap
            lang={lang}
            copy={COPY.back}
            reduced={reduced}
            layout={live}
            layoutTransition={move(0)}
            arClassName="text-[12.5px] font-medium"
          />
        </motion.span>

        <motion.span
          layout={live}
          transition={{ layout: move(0) }}
          className="text-[16px] font-semibold tabular-nums tracking-[-0.01em]"
          style={{ color: LIME, textShadow: "0 0 18px rgba(192,255,46,0.35)" }}
        >
          <bdi dir="ltr">$250</bdi>
        </motion.span>
      </div>

      {/* Brand, title, tags */}
      <div className="mt-3 flex items-start gap-2.5">
        <motion.span
          layout={live}
          transition={{ layout: move(1) }}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]"
          style={{
            background: `linear-gradient(145deg, #DDFF85, ${LIME})`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 6px 16px -8px rgba(192,255,46,0.65)",
          }}
        >
          <BrandMark />
        </motion.span>
        <div className="min-w-0 flex-1 pt-px">
          <Swap
            lang={lang}
            copy={COPY.title}
            reduced={reduced}
            layout={live}
            layoutTransition={move(1)}
            className="w-fit max-w-full text-[14.5px] font-medium leading-[1.25] tracking-[-0.005em] text-white"
            arClassName="text-[15px] font-bold leading-[1.3] tracking-normal"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <motion.span
              layout={live}
              transition={{ layout: move(1.5) }}
              className="inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-medium leading-none"
              style={{
                color: LIME,
                background: "rgba(192,255,46,0.1)",
                boxShadow: "inset 0 0 0 1px rgba(192,255,46,0.3)",
              }}
            >
              <Swap lang={lang} copy={COPY.paid} reduced={reduced} arClassName="text-[12px] font-bold" />
            </motion.span>
            <motion.span
              layout={live}
              transition={{ layout: move(2) }}
              className="inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-medium leading-none"
              style={{
                color: "#BDBDFF",
                background: "rgba(86,86,255,0.2)",
                boxShadow: "inset 0 0 0 1px rgba(86,86,255,0.5)",
              }}
            >
              <Swap lang={lang} copy={COPY.barter} reduced={reduced} arClassName="text-[12px] font-bold" />
            </motion.span>
          </div>
        </div>
      </div>

      {/* Progress: fills from the reading start */}
      <div className="mt-3.5 flex h-1.5 rounded-full bg-white/[0.08]">
        <motion.span
          layout={live}
          className="relative block h-full w-[64%] rounded-full"
          style={{ boxShadow: "0 0 12px rgba(192,255,46,0.3)" }}
          initial={false}
          animate={{ backgroundImage: fillTo }}
          transition={{ layout: move(2.5), backgroundImage: reduced ? INSTANT : { duration: 0.45 } }}
        >
          <motion.span
            layout={live}
            transition={{ layout: move(2.5) }}
            className="absolute end-[-2px] top-[-2px] h-2.5 w-2.5 rounded-full bg-white"
            style={{ boxShadow: `0 0 0 2px ${NAVY}, 0 0 10px rgba(192,255,46,0.8)` }}
          />
        </motion.span>
      </div>

      {/* Creators, apply */}
      <div className="mt-3.5 flex items-center justify-between gap-2">
        <div className="flex">
          {CREATORS.map((c, i) => (
            <motion.span
              key={c.bg}
              layout={live}
              transition={{ layout: move(3 + i * 0.5) }}
              className={`relative block h-7 w-7 shrink-0 overflow-hidden rounded-full ${i ? "-ms-2" : ""}`}
              style={{ background: c.bg, boxShadow: `0 0 0 2px ${NAVY}` }}
            >
              <Person color={c.fg} />
            </motion.span>
          ))}
        </div>
        <motion.span
          layout={live}
          transition={{ layout: move(4) }}
          className="inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-[12.5px] font-medium leading-none text-white"
          style={{
            background: `linear-gradient(180deg, #6D6DFF, ${INDIGO})`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 18px -8px rgba(86,86,255,0.95)",
          }}
        >
          <Swap lang={lang} copy={COPY.apply} reduced={reduced} arClassName="text-[13px] font-bold" />
        </motion.span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

function FlipIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M8 1.5v13" stroke="currentColor" strokeWidth="1.3" strokeDasharray="1.6 1.8" strokeLinecap="round" />
      <path d="M6 4 1.8 11.5H6V4Z" fill="currentColor" />
      <path d="M10 4l4.2 7.5H10V4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function CaptionIcon({ mode }: { mode: Mode }) {
  if (mode === "mirror") {
    return (
      <svg viewBox="0 0 16 16" className="mt-[2px] h-4 w-4 shrink-0" aria-hidden="true">
        <circle cx="8" cy="8" r="7.25" fill="none" stroke={WRONG} strokeWidth="1.5" />
        <path d="M5.6 5.6 10.4 10.4M10.4 5.6 5.6 10.4" stroke={WRONG} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (mode === "ar") {
    return (
      <svg viewBox="0 0 16 16" className="mt-[2px] h-4 w-4 shrink-0" aria-hidden="true">
        <circle cx="8" cy="8" r="8" fill={LIME} />
        <path d="M4.8 8.3 7 10.5 11.3 5.9" fill="none" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="mt-[2px] h-4 w-4 shrink-0 text-text-3" fill="none" aria-hidden="true">
      <path d="M2.5 8h10M9 4.5 12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */

export default function RtlTile({ className }: { className?: string }) {
  const reduced = useReducedMotion() ?? false;
  const groupId = useId();
  const [mode, setMode] = useState<Mode>("en");
  const lang: Lang = mode === "en" ? "en" : "ar";
  const mirror = mode === "mirror";
  const spring: Transition = reduced ? INSTANT : SPRING;

  /* ---------------------------------------------------------------- Demo -- */
  // While nobody has touched the tile it demos itself: English, then Arabic,
  // then the lazy "just mirror it" (the wrong way), then back to the real
  // Arabic layout, and home to English so the loop starts where it began.
  const { ref: demoRef, active: demoActive, takenOver, reduced: demoReduced } = useAutoDemo<HTMLDivElement>();
  const [controls, animateControls] = useAnimate<HTMLDivElement>();

  /** Presses a control the way a person would: a visible squeeze, then the change as it lets go. */
  const tap = (at: number, target: "en" | "ar" | "mirror", to: Mode): DemoStep[] => [
    {
      at,
      run: () =>
        animateControls(`[data-demo="${target}"]`, { scale: [1, 0.93, 1] }, { duration: 0.3, ease: "easeInOut" }),
    },
    { at: at + 120, run: () => setMode(to) },
  ];

  useDemoScript(
    demoActive,
    [
      ...tap(650, "ar", "ar"), // everything turns around, $250 stays $250
      ...tap(2750, "mirror", "mirror"), // try to cheat: flip it like a mirror
      ...tap(4950, "mirror", "ar"), // undo: the real right-to-left layout
      ...tap(6850, "en", "en"), // back to English, ready to loop
    ],
    { loop: true, loopDelay: 3200, reset: () => setMode("en") },
  );

  // Once the tile has fully left the screen (and nobody took over), quietly
  // rewind so the next visit starts the story from English.
  const onScreen = useInView(demoRef);
  const [wasOnScreen, setWasOnScreen] = useState(onScreen);
  if (onScreen !== wasOnScreen) {
    setWasOnScreen(onScreen);
    if (!onScreen && !takenOver && !demoReduced) setMode("en");
  }

  // The card turns over on its vertical axis. The mirrored face is the real
  // face continuing past edge-on, so the spin reads as one continuous motion.
  const flip = (edge: number): Variants =>
    reduced
      ? { hidden: { rotateY: 0, scale: 1, transition: INSTANT }, shown: { rotateY: 0, scale: 1, transition: INSTANT } }
      : {
          hidden: { rotateY: edge, scale: 0.94, transition: { duration: 0.17, ease: [0.55, 0, 1, 0.45] } },
          shown: { rotateY: 0, scale: 1, transition: { type: "spring", stiffness: 320, damping: 21 } },
        };

  return (
    <Tile
      glow={INDIGO}
      skill="Arabic & RTL"
      from="Collabfront"
      title="Arabic isn't a translation. The whole interface turns around."
      className={className}
      ref={demoRef}
      demo={demoActive}
    >
      <MotionConfig reducedMotion="user">
        <LayoutGroup id={groupId}>
          <div className="flex flex-1 flex-col gap-4">
            {/* Controls stay put in every mode, so nothing jumps under the pointer */}
            <div ref={controls} dir="ltr" className="flex flex-wrap items-center justify-between gap-2">
              <div
                role="group"
                aria-label="Card language"
                className="relative inline-flex rounded-full p-[3px]"
                style={{ background: "rgba(255,255,255,0.035)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" }}
              >
                {(["en", "ar"] as const).map((l) => {
                  const on = lang === l;
                  return (
                    <motion.button
                      key={l}
                      type="button"
                      aria-pressed={on}
                      data-demo={l}
                      onClick={() => setMode(l)}
                      whileTap={{ scale: 0.94 }}
                      transition={spring}
                      className={`relative h-10 rounded-full px-4 text-[13px] font-medium transition-colors duration-200 pointer-coarse:h-11 ${
                        on ? "" : "text-text-2 hover:text-text"
                      }`}
                      style={on ? { color: mirror ? WRONG : "#fff" } : undefined}
                    >
                      {on && (
                        <motion.span
                          layoutId="rtl-lang-pill"
                          aria-hidden="true"
                          className="absolute inset-0 rounded-full"
                          initial={false}
                          animate={{
                            backgroundColor: mirror ? "rgba(255,138,138,0.12)" : INDIGO,
                            boxShadow: mirror
                              ? "inset 0 0 0 1px rgba(255,138,138,0.55), 0 6px 20px -10px rgba(255,138,138,0.6)"
                              : "inset 0 1px 0 0 rgba(255,255,255,0.28), 0 6px 20px -8px rgba(86,86,255,0.9)",
                          }}
                          transition={spring}
                        />
                      )}
                      <span
                        lang={l}
                        className={`relative ${l === "ar" ? "font-arabic text-[14px] font-bold" : ""}`}
                      >
                        {l === "en" ? "English" : "العربية"}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <motion.button
                type="button"
                aria-pressed={mirror}
                data-demo="mirror"
                onClick={() => setMode(mirror ? "ar" : "mirror")}
                whileTap={{ scale: 0.94 }}
                transition={spring}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full ps-3 pe-3.5 text-[13px] transition-[color,background-color,box-shadow] duration-200 pointer-coarse:h-11 ${
                  mirror ? "" : "text-text-2 hover:text-text"
                }`}
                style={{
                  color: mirror ? WRONG : undefined,
                  background: mirror ? "rgba(255,138,138,0.1)" : "transparent",
                  boxShadow: `inset 0 0 0 1px ${mirror ? "rgba(255,138,138,0.45)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                <motion.span
                  aria-hidden="true"
                  className="inline-flex"
                  initial={false}
                  animate={{ scaleX: mirror ? -1 : 1 }}
                  transition={spring}
                >
                  <FlipIcon />
                </motion.span>
                Just mirror it
              </motion.button>
            </div>

            {/* The card */}
            <div
              role="img"
              aria-label={CARD_LABEL[mode]}
              className="flex flex-1 items-center justify-center"
              style={{ perspective: 1200 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {mirror ? (
                  <motion.div
                    key="mirror"
                    className="w-full max-w-[340px]"
                    variants={flip(-90)}
                    initial="hidden"
                    animate="shown"
                    exit="hidden"
                  >
                    {/* The lazy way: Arabic strings (and an Arabic arrow) in the
                        English layout, then the whole thing flipped. */}
                    <div style={{ transform: "scaleX(-1)" }}>
                      <CardFace lang="ar" dir="ltr" arrowRight live={false} wrong reduced={reduced} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="live"
                    className="w-full max-w-[340px]"
                    variants={flip(90)}
                    initial="hidden"
                    animate="shown"
                    exit="hidden"
                  >
                    <CardFace
                      lang={lang}
                      dir={lang === "ar" ? "rtl" : "ltr"}
                      arrowRight={lang === "ar"}
                      live
                      wrong={false}
                      reduced={reduced}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quiet while the demo plays, so screen readers aren't narrated a loop. */}
            <p aria-live={demoActive ? "off" : "polite"} className="min-h-[2.8em] text-[13px] leading-[1.4]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={mode}
                  className={`flex items-start gap-2 ${mode === "en" ? "text-text-2" : mode === "ar" ? "text-text" : ""}`}
                  style={mode === "mirror" ? { color: WRONG } : undefined}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: reduced ? 0 : 0.18 }}
                >
                  <CaptionIcon mode={mode} />
                  <span>{CAPTION[mode]}</span>
                </motion.span>
              </AnimatePresence>
            </p>
          </div>
        </LayoutGroup>
      </MotionConfig>
    </Tile>
  );
}
