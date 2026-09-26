"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import Tile from "../Tile";
import { useAutoDemo, useDemoScript } from "../useAutoDemo";

/* Altamira Village brand: brass light, deep green for "allowed". */
const AMBER = "#C88A3D";
/** Lighter brass for small text on near-black. */
const AMBER_TEXT = "#E2AE66";
/** Darker brass for marks printed on the light plate. */
const AMBER_ON_PLATE = "#8F5A1C";
const GREEN = "#2E6B55";
/** Lighter tint of the brand green, readable as small text on near-black. */
const GREEN_TEXT = "#7FCBA8";
const PLATE_INK = "#17191C";

const SPRING = { type: "spring", stiffness: 400, damping: 30 } as const;
const ARM_UP = { type: "spring", stiffness: 260, damping: 15 } as const;
const ARM_DOWN = { type: "spring", stiffness: 420, damping: 26 } as const;

/* -------------------------------------------------------------------------- */
/* Ported from the hotel codebase: src/lib/parking/plate.ts                   */
/* -------------------------------------------------------------------------- */

/** Uppercase, strip everything that is not a letter or digit. */
function normalizePlate(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .toUpperCase()
    .normalize("NFD")
    .replace(/[^A-Z0-9]/g, "");
}

/** Characters an LPR camera routinely confuses with one another. */
const CONFUSABLE: Record<string, string[]> = {
  "0": ["O", "D", "Q"],
  O: ["0", "D", "Q"],
  "1": ["I", "L"],
  I: ["1", "L"],
  "5": ["S"],
  S: ["5"],
  "8": ["B"],
  B: ["8"],
  "2": ["Z"],
  Z: ["2"],
  "6": ["G"],
  G: ["6"],
};

/**
 * Plate spellings worth searching for, the original first. SEARCH ONLY.
 * Capped at one substitution and 24 results, exactly like the source.
 */
function plateCandidates(plate: string, limit = 24): string[] {
  const normalized = normalizePlate(plate);
  if (!normalized) return [];

  const out = [normalized];
  for (let i = 0; i < normalized.length && out.length < limit; i += 1) {
    for (const swap of CONFUSABLE[normalized[i]] ?? []) {
      if (out.length >= limit) break;
      out.push(normalized.slice(0, i) + swap + normalized.slice(i + 1));
    }
  }
  return out;
}

/** Entitlement always matches the exact normalised string, never a candidate. */
function opensGate(cameraRead: string, entitled: string): boolean {
  const read = normalizePlate(cameraRead);
  return read !== "" && read === normalizePlate(entitled);
}

/* -------------------------------------------------------------------------- */
/* Demo data: synthetic, Venezuelan formats (AB123CD current, ABC123 legacy)  */
/* -------------------------------------------------------------------------- */

/** What the cameras filed. Several are misreads of a plate a guest would report. */
const REGISTER = [
  "AB123CD",
  "A8123CD", // B read as 8
  "XS517EV",
  "X5517EV", // S read as 5
  "MZ28OKL", // MZ280KL, 0 read as O
  "LTZ10WA", // LT210WA, 2 read as Z
  "DV77IHJ", // DV771HJ, 1 read as I
  "PG604NR",
  "FNR482",
  "302KTE",
] as const;

/** Plates a guest might report at the desk; each one finds a camera misread. */
const EXAMPLES = ["AB123CD", "MZ280KL", "XS517EV", "LT210WA", "DV771HJ"] as const;

/**
 * Plates the attract-mode demo types, one per loop. Each has both an exact row
 * and a camera look-alike, so the demo can show the gate refusing the
 * look-alike and then opening for the real plate.
 */
const DEMO_PLATES = ["AB123CD", "XS517EV"] as const;

/** The parking vendor's own input cap. */
const MAX_LEN = 8;
const ROW_H = 40;
const ROW_GAP = 4;
const VISIBLE_ROWS = 4;
const LIST_H = ROW_H * VISIBLE_ROWS + ROW_GAP * (VISIBLE_ROWS - 1);

type Kind = "exact" | "lookalike" | "register";
type Hit = { plate: string; kind: Kind; swap: number };
type Gate = "idle" | "open" | "closed";

/**
 * Candidates are matched as prefixes so results arrive while typing; a finished
 * plate is a full-string match, which is what the source does.
 */
function search(query: string): Hit[] {
  if (!query) return REGISTER.map((plate) => ({ plate, kind: "register", swap: -1 }));
  const alternates = new Set(plateCandidates(query).slice(1));
  const exact: Hit[] = [];
  const lookalike: Hit[] = [];
  for (const plate of REGISTER) {
    if (plate.startsWith(query)) {
      exact.push({ plate, kind: "exact", swap: -1 });
    } else if (plate.length >= query.length && alternates.has(plate.slice(0, query.length))) {
      let swap = -1;
      for (let i = 0; i < query.length; i += 1) {
        if (plate.charAt(i) !== query.charAt(i)) {
          swap = i;
          break;
        }
      }
      lookalike.push({ plate, kind: "lookalike", swap });
    }
  }
  return [...exact, ...lookalike];
}

const spell = (plate: string) => plate.split("").join(" ");
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* -------------------------------------------------------------------------- */
/* Gate barrier                                                               */
/* -------------------------------------------------------------------------- */

const LIGHT: Record<Gate, { bg: string; glow: string }> = {
  idle: { bg: "#2B2E34", glow: "0px 0px 0px 0px rgba(0,0,0,0)" },
  open: { bg: GREEN_TEXT, glow: "0px 0px 10px 1px rgba(127,203,168,0.85)" },
  closed: { bg: AMBER, glow: "0px 0px 10px 1px rgba(200,138,61,0.85)" },
};

function Barrier({ gate, jolt }: { gate: Gate; jolt: number }) {
  return (
    <div aria-hidden="true" className="relative h-10 w-[52px] shrink-0">
      <span className="absolute inset-x-0 bottom-0 h-px bg-line-strong" />
      <motion.div
        className="absolute left-[6px] top-[12px] h-[6px] w-10"
        style={{ originX: 0 }}
        initial={false}
        animate={{ rotate: gate === "open" ? -62 : 0 }}
        transition={gate === "open" ? ARM_UP : ARM_DOWN}
      >
        <motion.div
          key={jolt}
          className="h-full w-full rounded-full"
          style={{
            originX: 0,
            background: `repeating-linear-gradient(90deg, ${AMBER} 0 6px, #EEEAE2 6px 12px)`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.6)",
          }}
          initial={{ rotate: 0 }}
          animate={jolt > 0 ? { rotate: [0, -14, 0, -5, 0] } : { rotate: 0 }}
          transition={{ duration: 0.6, times: [0, 0.22, 0.52, 0.74, 1], ease: "easeOut" }}
        />
      </motion.div>
      <span className="absolute bottom-0 left-0 h-7 w-3 rounded-[3px] border border-line-strong bg-[#1c1e23]" />
      <motion.span
        className="absolute left-[3px] top-[26px] h-1.5 w-1.5 rounded-full"
        initial={false}
        animate={{ backgroundColor: LIGHT[gate].bg, boxShadow: LIGHT[gate].glow }}
        transition={{ duration: 0.25 }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The demo                                                                   */
/* -------------------------------------------------------------------------- */

const PANEL: Record<Gate, { border: string; bg: string; text: string }> = {
  idle: { border: "rgba(255,255,255,0.09)", bg: "rgba(255,255,255,0.02)", text: "#a3a6ad" },
  open: { border: "rgba(127,203,168,0.45)", bg: "rgba(46,107,85,0.18)", text: GREEN_TEXT },
  closed: { border: "rgba(200,138,61,0.45)", bg: "rgba(200,138,61,0.08)", text: AMBER_TEXT },
};

const PLATE_RING: Record<Gate, string> = {
  idle: "0px 0px 0px 0px rgba(0,0,0,0), 0px 0px 0px 0px rgba(0,0,0,0)",
  open: "0px 0px 0px 2px rgba(127,203,168,0.9), 0px 0px 30px 2px rgba(46,107,85,0.6)",
  closed: "0px 0px 0px 2px rgba(200,138,61,0.9), 0px 0px 30px 2px rgba(200,138,61,0.35)",
};

function PlateSearch({ demo }: { demo: boolean }) {
  const reduced = useReducedMotion() ?? false;
  const inputId = useId();
  const selId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const timer = useRef<number | null>(null);
  const exampleIdx = useRef(0);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [peek, setPeek] = useState<string | null>(null);
  const [jolt, setJolt] = useState(0);
  /** Row the demo is "pointing at"; ignored the moment the demo stops. */
  const [demoPeek, setDemoPeek] = useState<string | null>(null);
  const demoRound = useRef(0);

  const hits = useMemo(() => search(query), [query]);
  const exactN = hits.filter((h) => h.kind === "exact").length;
  const lookN = hits.filter((h) => h.kind === "lookalike").length;

  const sel = selected ? hits.find((h) => h.plate === selected && h.kind !== "register") : undefined;
  const gate: Gate = !sel ? "idle" : opensGate(sel.plate, query) ? "open" : "closed";

  const shownPeek = peek ?? (demo ? demoPeek : null);
  const focusHit = hits.find((h) => h.plate === (shownPeek ?? selected));
  const plateSwap = focusHit?.kind === "lookalike" ? focusHit.swap : -1;

  let message: string;
  let srMessage: string;
  if (gate === "open") {
    message = "Exact match: gate opens";
    srMessage = message;
  } else if (gate === "closed" && sel) {
    message = "Look-alike: search only. Gate stays closed.";
    srMessage = `${message} The camera read ${sel.plate.charAt(sel.swap)} where you typed ${query.charAt(sel.swap)}.`;
  } else if (!query) {
    message = "Type a plate, or pick one below to search it.";
    srMessage = `${REGISTER.length} synthetic plates in the register.`;
  } else if (hits.length === 0) {
    message = "No match, so nothing to test.";
    srMessage = "No plate within one look-alike swap.";
  } else {
    srMessage = `${plural(exactN, "exact match", "exact matches")}, ${plural(lookN, "look-alike", "look-alikes")}.`;
    message = `${exactN} exact, ${plural(lookN, "look-alike", "look-alikes")}. Pick one to test the gate.`;
  }

  const stopTyping = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  useEffect(() => stopTyping, [stopTyping]);

  /** Types a plate into the search one character at a time (instant with reduced motion). */
  const typeOut = useCallback(
    (plate: string) => {
      stopTyping();
      setSelected(null);
      setPeek(null);
      if (reduced || plate.length < 2) {
        setQuery(plate);
        return;
      }
      let n = 1;
      setQuery(plate.slice(0, n));
      const step = () => {
        n += 1;
        setQuery(plate.slice(0, n));
        timer.current = n < plate.length ? window.setTimeout(step, 70) : null;
      };
      timer.current = window.setTimeout(step, 70);
    },
    [reduced, stopTyping],
  );

  const tryMisread = () => {
    const plate = EXAMPLES[exampleIdx.current % EXAMPLES.length];
    exampleIdx.current += 1;
    typeOut(plate);
  };

  const pick = (hit: Hit) => {
    if (hit.kind === "register") {
      typeOut(hit.plate);
      return;
    }
    stopTyping();
    if (selected === hit.plate) {
      setSelected(null);
      return;
    }
    setSelected(hit.plate);
    if (hit.kind === "exact") {
      // Picking an exact row completes the plate: the gate compares whole strings.
      setQuery(hit.plate);
    } else if (!reduced) {
      setJolt((j) => j + 1);
    }
  };

  /** Empties the search and shows the whole register again (Escape does this). */
  const clear = () => {
    stopTyping();
    setQuery("");
    setSelected(null);
  };

  /* Attract mode: type a plate a guest reported, try the camera's look-alike
     at the gate (refused), then the exact plate (opens). One plate per loop. */
  const pickRef = useRef(pick);
  useEffect(() => {
    pickRef.current = pick;
  });
  const demoPlate = () => DEMO_PLATES[demoRound.current % DEMO_PLATES.length];
  const demoHit = (kind: Kind) => search(demoPlate()).find((h) => h.kind === kind);
  const point = (kind: Kind) => setDemoPeek(demoHit(kind)?.plate ?? null);
  const press = (kind: Kind) => {
    const hit = demoHit(kind);
    if (hit) pickRef.current(hit);
  };
  useDemoScript(
    demo,
    [
      { at: 700, run: () => typeOut(demoPlate()) },
      { at: 2100, run: () => point("lookalike") },
      { at: 2900, run: () => press("lookalike") },
      { at: 4700, run: () => point("exact") },
      { at: 5400, run: () => press("exact") },
      { at: 6100, run: () => setDemoPeek(null) },
    ],
    {
      loop: true,
      loopDelay: 3200,
      reset: () => {
        demoRound.current += 1;
        setDemoPeek(null);
        clear();
      },
    },
  );

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    stopTyping();
    setQuery(normalizePlate(e.target.value).slice(0, MAX_LEN));
    setSelected(null);
  };

  const rowButtons = () =>
    Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-row]") ?? []);

  const onInputKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const first = hits[0];
      if (query && first && selected !== first.plate) pick(first);
    } else if (e.key === "Escape" && query) {
      e.preventDefault();
      clear();
    } else if (e.key === "ArrowDown") {
      const first = rowButtons()[0];
      if (first) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const onListKey = (e: ReactKeyboardEvent<HTMLUListElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const buttons = rowButtons();
    const i = buttons.findIndex((b) => b === document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    if (e.key === "ArrowDown") buttons[Math.min(i + 1, buttons.length - 1)]?.focus();
    else if (i === 0) inputRef.current?.focus();
    else buttons[i - 1]?.focus();
  };

  const chars = query.split("");
  const scrolling = hits.length > VISIBLE_ROWS;
  const fade = scrolling ? "linear-gradient(to bottom, #000 calc(100% - 26px), transparent)" : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The plate: a real input with an animated character overlay */}
      <div
        className="relative mx-auto h-16 w-full max-w-[320px] shrink-0 rounded-[14px] focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-[#f4f4f2]"
        style={{
          background: "linear-gradient(180deg, #EEEBE4 0%, #D5D0C5 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -2px 0 rgba(0,0,0,0.14), 0 14px 30px -14px rgba(0,0,0,0.95)",
        }}
      >
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[14px]"
          initial={false}
          animate={{ boxShadow: PLATE_RING[gate] }}
          transition={{ duration: 0.3 }}
        />
        <span aria-hidden="true" className="pointer-events-none absolute inset-[4px] rounded-[10px] border border-black/20" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[7px] -translate-x-1/2 text-[9px] font-medium leading-none tracking-[0.2em]"
          style={{ color: GREEN }}
        >
          Venezuela
        </span>
        {["left-[10px]", "right-[10px]"].map((side) => (
          <span
            key={side}
            aria-hidden="true"
            className={`pointer-events-none absolute top-[9px] h-[5px] w-[5px] rounded-full ${side}`}
            style={{
              background: "radial-gradient(circle at 35% 35%, #f7f5f0, #8e897e)",
              boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.35)",
            }}
          />
        ))}

        <label htmlFor={inputId} className="sr-only">
          Search the register by licence plate
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          onChange={onChange}
          onKeyDown={onInputKey}
          placeholder="AB123CD"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          className="absolute inset-0 h-full w-full bg-transparent px-4 pt-[10px] text-center font-code text-[32px] font-semibold leading-none tracking-[0.08em] text-transparent placeholder:text-[#8C877C]"
          style={{ outline: "none", caretColor: AMBER_ON_PLATE }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden px-4 pt-[10px] font-code text-[32px] font-semibold leading-none tracking-[0.08em]"
        >
          {chars.map((ch, i) => {
            const hot = i === plateSwap;
            return (
              <motion.span
                key={`${i}${ch}`}
                className="relative inline-block"
                initial={{ opacity: 0, y: -9, scale: 1.35 }}
                animate={{ opacity: 1, y: 0, scale: 1, color: hot ? AMBER_ON_PLATE : PLATE_INK }}
                transition={SPRING}
              >
                {ch}
                <motion.span
                  className="absolute -bottom-[5px] left-[8%] right-[calc(0.08em+8%)] h-[2.5px] rounded-full"
                  style={{ background: AMBER, originX: 0.5 }}
                  initial={false}
                  animate={{ scaleX: hot ? 1 : 0, opacity: hot ? 1 : 0 }}
                  transition={SPRING}
                />
              </motion.span>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex h-10 shrink-0 items-center justify-between gap-3">
        <p className="min-w-0 text-[12px] leading-tight text-text-3">Synthetic plates, no real vehicles</p>
        <motion.button
          type="button"
          onClick={tryMisread}
          whileTap={{ scale: 0.94 }}
          transition={SPRING}
          className="group -mr-1 flex h-10 shrink-0 items-center px-1"
          style={{ borderRadius: 999 }}
        >
          <span className="flex h-8 items-center rounded-full border border-line bg-white/[0.03] px-3 text-[12.5px] text-text-2 transition-colors group-hover:border-line-strong group-hover:text-text">
            Try a misread
          </span>
        </motion.button>
      </div>

      {/* Results */}
      <div className="relative mt-1 flex-1" style={{ minHeight: LIST_H }}>
        <motion.ul
          ref={listRef}
          layoutScroll
          onKeyDown={onListKey}
          aria-label={query ? "Search results" : "Plate register"}
          className="absolute inset-0 flex flex-col overflow-y-auto overscroll-contain [scrollbar-width:thin]"
          style={{
            gap: ROW_GAP,
            maskImage: fade,
            WebkitMaskImage: fade,
            paddingBottom: scrolling ? 22 : 0,
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {hits.map((hit) => {
              const isSel = hit.plate === selected && hit.kind !== "register";
              const swapRead = hit.plate.charAt(hit.swap);
              const swapTyped = query.charAt(hit.swap);
              const label =
                hit.kind === "register"
                  ? `Search for ${spell(hit.plate)}`
                  : hit.kind === "exact"
                    ? `${spell(hit.plate)}, exact match`
                    : `${spell(hit.plate)}, look-alike: camera read ${swapRead} where you typed ${swapTyped}`;
              return (
                <motion.li
                  key={hit.plate}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.14 } }}
                  transition={SPRING}
                  className="shrink-0"
                >
                  <button
                    type="button"
                    data-row=""
                    onClick={() => pick(hit)}
                    onPointerEnter={() => setPeek(hit.plate)}
                    onPointerLeave={() => setPeek((p) => (p === hit.plate ? null : p))}
                    onFocus={() => setPeek(hit.plate)}
                    onBlur={() => setPeek((p) => (p === hit.plate ? null : p))}
                    aria-pressed={hit.kind === "register" ? undefined : isSel}
                    aria-label={label}
                    className={`group relative flex w-full items-center gap-2.5 px-3 text-left transition-colors hover:bg-white/[0.035] ${
                      shownPeek === hit.plate ? "bg-white/[0.035]" : ""
                    }`}
                    style={{ height: ROW_H, borderRadius: 12 }}
                  >
                    {isSel && (
                      <motion.span
                        layoutId={selId}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-xl border"
                        initial={false}
                        animate={{
                          backgroundColor: hit.kind === "exact" ? "rgba(46,107,85,0.22)" : "rgba(200,138,61,0.1)",
                          borderColor: hit.kind === "exact" ? "rgba(127,203,168,0.4)" : "rgba(200,138,61,0.42)",
                        }}
                        transition={SPRING}
                      />
                    )}

                    <span
                      aria-hidden="true"
                      className="relative h-1.5 w-1.5 shrink-0 rounded-full"
                      style={
                        hit.kind === "exact"
                          ? { background: GREEN_TEXT, boxShadow: `0 0 8px ${GREEN}` }
                          : hit.kind === "lookalike"
                            ? { boxShadow: `inset 0 0 0 1.5px ${AMBER}` }
                            : { background: "#6d7078" }
                      }
                    />

                    <span aria-hidden="true" className="relative font-code text-[15px] tracking-[0.08em]">
                      {hit.plate.split("").map((ch, i) => {
                        if (hit.kind === "register") {
                          return (
                            <span key={i} className="text-text-2">
                              {ch}
                            </span>
                          );
                        }
                        if (hit.kind === "lookalike" && i === hit.swap) {
                          return (
                            <span
                              key={i}
                              className="rounded-[3px]"
                              style={{
                                color: AMBER_TEXT,
                                background: "rgba(200,138,61,0.18)",
                                boxShadow: `inset 0 -1.5px 0 ${AMBER}`,
                              }}
                            >
                              {ch}
                            </span>
                          );
                        }
                        return (
                          <span key={i} className={i < query.length ? "text-text" : "text-text-3"}>
                            {ch}
                          </span>
                        );
                      })}
                    </span>

                    {hit.kind === "lookalike" && (
                      <motion.span
                        aria-hidden="true"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={SPRING}
                        className="relative shrink-0 rounded-md border px-1.5 py-px font-code text-[11px] leading-[1.5]"
                        style={{
                          color: AMBER_TEXT,
                          borderColor: "rgba(200,138,61,0.35)",
                          background: "rgba(200,138,61,0.1)",
                        }}
                      >
                        {swapRead} ↔ {swapTyped}
                      </motion.span>
                    )}

                    <span aria-hidden="true" className="relative ml-auto shrink-0 text-[12px]">
                      {hit.kind === "register" ? (
                        <svg
                          viewBox="0 0 16 16"
                          className="h-3.5 w-3.5 text-text-3 transition-colors group-hover:text-text"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        >
                          <circle cx="7" cy="7" r="4.5" />
                          <path d="M10.5 10.5 14 14" />
                        </svg>
                      ) : (
                        <span style={{ color: hit.kind === "exact" ? GREEN_TEXT : AMBER_TEXT }}>
                          {hit.kind === "exact" ? "Exact" : "Look-alike"}
                        </span>
                      )}
                    </span>
                  </button>
                </motion.li>
              );
            })}
            {hits.length === 0 && (
              <motion.li
                key="__none"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={SPRING}
                className="flex shrink-0 items-center px-3 text-[13px] text-text-3"
                style={{ height: ROW_H }}
              >
                No plate within one look-alike swap.
              </motion.li>
            )}
          </AnimatePresence>
        </motion.ul>
      </div>

      {/* Gate */}
      <motion.div
        className="relative mt-3 flex h-14 shrink-0 items-center gap-3 rounded-2xl border px-3"
        initial={false}
        animate={{ borderColor: PANEL[gate].border, backgroundColor: PANEL[gate].bg }}
        transition={{ duration: 0.25 }}
      >
        <Barrier gate={gate} jolt={jolt} />
        <div className="relative min-w-0 flex-1">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={message}
              aria-hidden="true"
              className="text-[13px] leading-[1.35]"
              style={{ color: PANEL[gate].text }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
              transition={SPRING}
            >
              {message}
            </motion.p>
          </AnimatePresence>
        </div>
        <p aria-live={demo ? "off" : "polite"} className="sr-only">
          {srMessage}
        </p>
      </motion.div>
    </div>
  );
}

export default function PlateTile({ className }: { className?: string }) {
  const { ref: demoRef, active: demoActive } = useAutoDemo<HTMLDivElement>();
  return (
    <Tile
      ref={demoRef}
      demo={demoActive}
      glow={AMBER}
      skill="Systems nobody documented"
      from="Altamira Village"
      title="Cameras misread plates. Staff still find the car, and a look-alike never opens the gate."
      className={className}
    >
      <MotionConfig reducedMotion="user">
        <PlateSearch demo={demoActive} />
      </MotionConfig>
    </Tile>
  );
}
