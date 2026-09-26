"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import Tile from "../Tile";
import { useAutoDemo, useDemoScript, type DemoStep } from "../useAutoDemo";

/* -------------------------------------------------------------------------- */
/* HQ's own dark palette                                                       */
/* -------------------------------------------------------------------------- */

const TERRA = "#D4714E";
/** Lighter terracotta for small text on the warm dark board (AA contrast). */
const TERRA_TEXT = "#E8906F";
const ASK = "#D9A441";
const OK = "#7FA37A";
const THINK = "#9A8FB8";
const HQ_BG = "#1F1D1A";
const CREAM = "#F1ECE2";
const DARK = "#2A2724";
const DIM = "rgba(241,236,226,0.64)";

const SPRING = { type: "spring", stiffness: 400, damping: 30 } as const;
/** Cards travelling between lanes: a touch softer so the flight reads. */
const FLY = { type: "spring", stiffness: 300, damping: 30, mass: 0.9 } as const;
const STEP_MS = 1400;

/* Attract-mode pacing (see the plan in AgentsTile). */
/** First beat after the board comes into view, or after it resumes. */
const FIRST_BEAT = 800;
/** Fade out before the board rewinds to 01:00 between loops. */
const REWIND_MS = 380;
/** A demo press shows its ripple this long before the button acts. */
const TAP_MS = 180;
/** How long the finished night stays on screen before it plays again. */
const DEMO_LOOP_DELAY = 4000;

type AgentId = "supervisor" | "debugger" | "scout";
type TaskId = "triage" | "deps" | "schema" | "notes" | "briefing";
type LaneId = "attention" | "working" | "next" | "done";
type Tone = "idle" | "think" | "ask" | "ok" | "alert";
type Note = { text: string; tone: Tone };
type Who = AgentId | "cron" | "dani";

const TONE: Record<Tone, string> = {
  idle: DIM,
  think: THINK,
  ask: ASK,
  ok: OK,
  alert: TERRA_TEXT,
};

/* -------------------------------------------------------------------------- */
/* 8x8 pixel critters, drawn the way HQ draws its agents                       */
/* 0 body tint, 1 cream, 2 ink, 3 amber                                        */
/* -------------------------------------------------------------------------- */

type Cell = { x: number; y: number; c: number };

const pixels = (rows: string[]): Cell[] =>
  rows.flatMap((row, y) => Array.from(row).flatMap((ch, x) => (ch === "." ? [] : [{ x, y, c: Number(ch) }])));

const AGENTS: Record<AgentId, { name: string; tint: string; cells: Cell[] }> = {
  // A fox: pointed ears, narrow muzzle.
  supervisor: {
    name: "Supervisor",
    tint: TERRA,
    cells: pixels(["0......0", "00....00", "00000000", "00200200", "00000000", ".011110.", "..1221..", "...00..."]),
  },
  // A beetle: antennae, spotted shell, legs.
  debugger: {
    name: "Debugger",
    tint: ASK,
    cells: pixels([".0....0.", "..0..0..", "..0000..", ".010010.", "00000000", ".020020.", "00000000", ".0....0."]),
  },
  // An owl: round, big eyes, amber beak and feet. Sees in the dark.
  scout: {
    name: "Scout",
    tint: THINK,
    cells: pixels(["..0000..", ".000000.", "01100110", "01200210", "00033000", ".000000.", ".000000.", "..3..3.."]),
  },
};

function Critter({
  agent,
  scale = 2,
  framed = false,
  bob = false,
}: {
  agent: AgentId;
  /** Screen pixels per art pixel. */
  scale?: number;
  framed?: boolean;
  /** Two-frame idle hop while the agent is busy. */
  bob?: boolean;
}) {
  const { tint, cells } = AGENTS[agent];
  const palette = [tint, CREAM, DARK, ASK];
  const art = scale * 8;
  const svg = (
    <motion.svg
      width={art}
      height={art}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="block shrink-0"
      initial={false}
      animate={bob ? { y: [0, 0, -scale, -scale] } : { y: 0 }}
      transition={
        bob ? { duration: 0.8, times: [0, 0.499, 0.5, 1], repeat: Infinity, ease: "linear" } : { duration: 0 }
      }
    >
      {cells.map((p) => (
        <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width={1} height={1} fill={palette[p.c]} />
      ))}
    </motion.svg>
  );
  if (!framed) return svg;
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-[7px]"
      style={{
        width: art + 8,
        height: art + 8,
        background: `${tint}24`,
        boxShadow: `inset 0 0 0 1px ${tint}38`,
      }}
    >
      {svg}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* The scripted night                                                          */
/* -------------------------------------------------------------------------- */

const TASKS: Record<TaskId, { agent: AgentId; title: string; short: string; tag: string }> = {
  triage: { agent: "debugger", title: "Triage overnight errors", short: "Triage errors", tag: "Triage" },
  deps: { agent: "scout", title: "Scan dependency updates", short: "Dependency scan", tag: "Dep scan" },
  schema: { agent: "debugger", title: "Clean up the orders schema", short: "Orders schema", tag: "Schema" },
  notes: { agent: "scout", title: "Draft release notes", short: "Release notes", tag: "Notes" },
  briefing: { agent: "supervisor", title: "Write the morning briefing", short: "Morning briefing", tag: "Briefing" },
};

/** Step at which each task first appears on the board (it pops in there). */
const ENTRY: Record<TaskId, number> = { triage: 0, deps: 0, schema: 0, notes: 7, briefing: 12 };

type Step = {
  time: string;
  who: Who;
  actor: string;
  text: string;
  moves?: Partial<Record<TaskId, LaneId>>;
  notes?: Partial<Record<TaskId, Note>>;
  sup: Note;
  /** How long this beat stays on screen, if not STEP_MS. */
  hold?: number;
};

const WATCH: Note = { text: "Watching the queue", tone: "idle" };

const STEPS: Step[] = [
  {
    time: "01:00",
    who: "cron",
    actor: "cron",
    text: "night shift started",
    moves: { triage: "next", deps: "next", schema: "next" },
    sup: WATCH,
  },
  {
    time: "01:02",
    who: "debugger",
    actor: "debugger",
    text: "picked up triage overnight errors",
    moves: { triage: "working" },
    notes: { triage: { text: "Reading logs", tone: "think" } },
    sup: WATCH,
  },
  {
    time: "01:05",
    who: "scout",
    actor: "scout",
    text: "picked up scan dependency updates",
    moves: { deps: "working" },
    notes: { deps: { text: "Checking deps", tone: "think" } },
    sup: WATCH,
  },
  {
    time: "01:38",
    who: "debugger",
    actor: "debugger",
    text: "fix pushed to a branch, noted in shared memory",
    moves: { triage: "done" },
    sup: { text: "Fix noted in shared memory", tone: "ok" },
  },
  {
    time: "01:40",
    who: "debugger",
    actor: "debugger",
    text: "picked up clean up the orders schema",
    moves: { schema: "working" },
    notes: { schema: { text: "Writing SQL", tone: "think" } },
    sup: WATCH,
  },
  {
    time: "02:14",
    who: "scout",
    actor: "scout → supervisor",
    text: "which branch has tonight's fix?",
    notes: { deps: { text: "Has a question", tone: "ask" } },
    sup: { text: "Checking shared memory", tone: "think" },
  },
  {
    time: "02:14",
    who: "supervisor",
    actor: "supervisor → scout",
    text: "answered from shared memory",
    notes: { deps: { text: "Unblocked", tone: "ok" } },
    sup: { text: "Answered from shared memory", tone: "ok" },
    hold: 2000,
  },
  {
    time: "02:51",
    who: "scout",
    actor: "scout",
    text: "scan done, queued draft release notes",
    moves: { deps: "done", notes: "next" },
    sup: WATCH,
  },
  {
    time: "02:58",
    who: "debugger",
    actor: "debugger → supervisor",
    text: "a migration drops a column. Run it?",
    notes: { schema: { text: "Has a question", tone: "ask" } },
    sup: { text: "Not in memory, waiting 10 min", tone: "ask" },
  },
  {
    time: "03:03",
    who: "scout",
    actor: "scout",
    text: "picked up draft release notes",
    moves: { notes: "working" },
    notes: { notes: { text: "Drafting", tone: "think" }, schema: { text: "Still waiting", tone: "ask" } },
    sup: { text: "Escalating in 5 min", tone: "ask" },
  },
  {
    time: "03:08",
    who: "supervisor",
    actor: "supervisor → dani",
    text: "no rule for this, escalated after 10 min",
    moves: { schema: "attention" },
    sup: { text: "Escalated to Dani", tone: "alert" },
    hold: 2800,
  },
  {
    time: "04:25",
    who: "scout",
    actor: "scout",
    text: "release notes drafted",
    moves: { notes: "done" },
    sup: WATCH,
  },
  {
    time: "08:00",
    who: "cron",
    actor: "cron",
    text: "morning briefing started",
    moves: { briefing: "working" },
    notes: { briefing: { text: "Summing up", tone: "think" } },
    sup: { text: "Writing the briefing", tone: "think" },
  },
  {
    time: "08:02",
    who: "supervisor",
    actor: "supervisor → dani",
    text: "", // depends on what the visitor decided, see briefingText()
    moves: { briefing: "done" },
    sup: { text: "Briefing sent", tone: "ok" },
  },
];

const LAST = STEPS.length - 1;
const ESC = 10;
const BRIEF = 13;
const DAWN = 12;

/** What the visitor did with the escalated migration, pinned to the replay step it happened on. */
type Act = { id: number; kind: "hold" | "release" | "approve"; at: number };

type Board = {
  lane: Record<TaskId, LaneId | null>;
  /** Arrival order; each lane lists its tasks in this order. */
  order: TaskId[];
  notes: Partial<Record<TaskId, Note>>;
};

function boardAt(step: number, acts: Act[], ran: boolean): Board {
  const lane: Record<TaskId, LaneId | null> = { triage: null, deps: null, schema: null, notes: null, briefing: null };
  const notes: Partial<Record<TaskId, Note>> = {};
  let order: TaskId[] = [];
  const move = (t: TaskId, l: LaneId) => {
    lane[t] = l;
    order = [...order.filter((x) => x !== t), t];
  };
  for (let s = 0; s <= step; s++) {
    const st = STEPS[s];
    if (st.moves) {
      for (const t of Object.keys(st.moves) as TaskId[]) {
        const l = st.moves[t];
        if (l) move(t, l);
      }
    }
    if (st.notes) Object.assign(notes, st.notes);
    if (acts.some((a) => a.kind === "approve" && a.at === s)) {
      move("schema", ran ? "done" : "working");
      notes.schema = { text: "Backup first", tone: "ok" };
    }
  }
  return { lane, order, notes };
}

function briefingText(acts: Act[]) {
  const before = acts.filter((a) => a.at < BRIEF);
  if (before.some((a) => a.kind === "approve")) return "briefing sent, the migration ran after a backup";
  if (before[before.length - 1]?.kind === "hold") return "briefing sent, the migration is on hold";
  return "briefing sent, 1 decision waiting";
}

type Line = { key: string; time: string; who: Who; actor: string; text: string };

function logAt(step: number, acts: Act[], ran: boolean): Line[] {
  const out: Line[] = [];
  for (let s = 0; s <= step; s++) {
    const st = STEPS[s];
    out.push({ key: `s${s}`, time: st.time, who: st.who, actor: st.actor, text: s === BRIEF ? briefingText(acts) : st.text });
    for (const a of acts) {
      if (a.at !== s) continue;
      if (a.kind === "hold") {
        out.push({ key: `a${a.id}`, time: st.time, who: "dani", actor: "dani", text: "held the migration" });
      } else if (a.kind === "release") {
        out.push({ key: `a${a.id}`, time: st.time, who: "dani", actor: "dani", text: "released the hold" });
      } else {
        out.push({ key: `a${a.id}`, time: st.time, who: "dani", actor: "dani → debugger", text: "approved, backup first" });
        if (ran) {
          out.push({ key: `a${a.id}r`, time: st.time, who: "debugger", actor: "debugger", text: "backup taken, migration ran" });
        }
      }
    }
  }
  return out;
}

const WHO_COLOR: Record<Who, string> = {
  cron: DIM,
  dani: CREAM,
  supervisor: TERRA_TEXT,
  debugger: ASK,
  scout: THINK,
};

/* -------------------------------------------------------------------------- */
/* Small glyphs                                                                */
/* -------------------------------------------------------------------------- */

function Glyph({ children, size = 14 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      {children}
    </svg>
  );
}

const MoonGlyph = ({ color }: { color: string }) => (
  <Glyph>
    <path d="M12.8 10.4A5.6 5.6 0 0 1 5.6 3.2a5.6 5.6 0 1 0 7.2 7.2Z" fill={color} />
  </Glyph>
);

const SunGlyph = ({ color }: { color: string }) => (
  <Glyph>
    <circle cx="8" cy="8" r="3" fill={color} />
    <path
      d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </Glyph>
);

/* -------------------------------------------------------------------------- */
/* Board pieces                                                                */
/* -------------------------------------------------------------------------- */

function NoteLine({ note }: { note?: Note }) {
  return (
    <span className="relative mt-0.5 flex h-4 items-center overflow-hidden text-[11px] leading-4">
      <AnimatePresence mode="popLayout" initial={false}>
        {note && (
          <motion.span
            key={note.text}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={SPRING}
            className="flex min-w-0 items-center gap-1.5"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TONE[note.tone] }} />
            <span className="truncate" style={{ color: TONE[note.tone] }}>
              {note.text}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function WorkCard({ id, note, running, fresh }: { id: TaskId; note?: Note; running: boolean; fresh: boolean }) {
  const t = TASKS[id];
  const tint = AGENTS[t.agent].tint;
  const busy = note?.tone === "think";
  const edge =
    note?.tone === "ask"
      ? "rgba(217,164,65,0.55)"
      : note?.tone === "ok"
        ? "rgba(127,163,122,0.45)"
        : "rgba(241,236,226,0.1)";
  return (
    <motion.li
      layoutId={`task-${id}`}
      layout
      transition={FLY}
      initial={fresh ? { opacity: 0, scale: 0.9 } : false}
      animate={{ opacity: 1, scale: 1 }}
      className="relative z-10 flex h-12 min-w-0 items-center gap-2.5 overflow-hidden px-2"
      style={{
        borderRadius: 12,
        background: "rgba(241,236,226,0.05)",
        boxShadow: `inset 0 0 0 1px ${edge}`,
      }}
    >
      <motion.span layout="position" className="shrink-0">
        <Critter agent={t.agent} framed bob={busy && running} />
      </motion.span>
      <motion.span layout="position" className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[12.5px] font-medium leading-4" style={{ color: CREAM }}>
          <span className="sr-only">{AGENTS[t.agent].name}: </span>
          <span className="@min-[22rem]:hidden">{t.tag}</span>
          <span className="hidden @min-[22rem]:inline @min-[34rem]:hidden">{t.short}</span>
          <span className="hidden @min-[34rem]:inline">{t.title}</span>
        </span>
        <NoteLine note={note} />
      </motion.span>
      {busy && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden">
          <motion.span
            className="absolute inset-y-0 left-0 w-1/3"
            style={{ background: `linear-gradient(90deg, transparent, ${tint}, transparent)` }}
            initial={false}
            animate={running ? { x: ["-100%", "300%"] } : { x: "-100%" }}
            transition={running ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
          />
        </span>
      )}
    </motion.li>
  );
}

/** Queue and history: the focus task shows its name, the rest stack as avatars. */
function Chip({
  id,
  expanded,
  done,
  fresh,
  gap,
}: {
  id: TaskId;
  expanded: boolean;
  done: boolean;
  fresh: boolean;
  gap: "none" | "tight" | "overlap";
}) {
  const t = TASKS[id];
  const margin = gap === "overlap" ? "-ml-2" : gap === "tight" ? "ml-1.5" : "";
  return (
    <motion.li
      layoutId={`task-${id}`}
      layout
      transition={FLY}
      initial={fresh ? { opacity: 0, scale: 0.6 } : false}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative z-10 flex h-7 shrink-0 items-center ${expanded ? "gap-1.5 pl-1.5 pr-2.5" : "w-7 justify-center"} ${margin}`}
      style={{
        borderRadius: 999,
        background: expanded ? "rgba(241,236,226,0.06)" : "#292621",
        boxShadow: `inset 0 0 0 1px rgba(241,236,226,${expanded ? 0.1 : 0.14}), 0 0 0 2px ${HQ_BG}`,
      }}
    >
      <motion.span layout="position" className="shrink-0">
        <Critter agent={t.agent} />
      </motion.span>
      <span className="sr-only">
        {AGENTS[t.agent].name}: {t.title}
      </span>
      {expanded && (
        <motion.span
          layout="position"
          aria-hidden="true"
          className="whitespace-nowrap text-[11.5px] leading-none"
          style={{ color: "rgba(241,236,226,0.82)" }}
        >
          {t.tag}
        </motion.span>
      )}
      {done && expanded && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 grid h-3 w-3 place-items-center rounded-full"
          style={{ background: OK, boxShadow: `0 0 0 1.5px ${HQ_BG}` }}
        >
          <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4.2 3.2 5.8 6.5 2.4" stroke={HQ_BG} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </motion.li>
  );
}

function Pile({
  ids,
  focus,
  done,
  step,
  labelledBy,
  empty,
}: {
  ids: TaskId[];
  focus: TaskId | undefined;
  done: boolean;
  step: number;
  labelledBy: string;
  empty: string;
}) {
  return (
    <ul aria-labelledby={labelledBy} className="flex h-7 items-center pl-0.5">
      {ids.map((id, i) => {
        const expanded = id === focus;
        const prevExpanded = i > 0 && ids[i - 1] === focus;
        const gap = i === 0 ? "none" : expanded || prevExpanded ? "tight" : "overlap";
        return <Chip key={id} id={id} expanded={expanded} done={done} fresh={ENTRY[id] === step} gap={gap} />;
      })}
      {ids.length === 0 && (
        <li className="text-[11.5px]" style={{ color: DIM }}>
          {empty}
        </li>
      )}
    </ul>
  );
}

/**
 * Soft press ripple, played when the demo presses a button. It only plays
 * for presses after the button mounted, never on mount.
 */
function DemoTap({ n, color }: { n: number; color: string }) {
  const [born] = useState(n);
  if (n === born) return null;
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
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

type Taps = { hold: number; approve: number };

function DecisionCard({
  held,
  taps,
  onApprove,
  onHold,
}: {
  held: boolean;
  /** Demo presses per button, for the press ripple. */
  taps: Taps;
  onApprove: () => void;
  onHold: () => void;
}) {
  const qId = useId();
  return (
    <motion.div
      layoutId="task-schema"
      layout
      transition={FLY}
      role="group"
      aria-labelledby={qId}
      className="relative z-20 flex h-full flex-col overflow-hidden px-3 py-2.5"
      style={{
        borderRadius: 14,
        background: "linear-gradient(180deg, rgba(212,113,78,0.17), rgba(212,113,78,0.06) 75%)",
        boxShadow: "inset 0 0 0 1px rgba(212,113,78,0.5), 0 18px 40px -24px rgba(212,113,78,0.9)",
      }}
    >
      <motion.div layout="position" className="flex items-center gap-2">
        <Critter agent="debugger" framed />
        <span
          className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-medium"
          style={{ color: TERRA_TEXT, background: "rgba(212,113,78,0.16)" }}
        >
          <Glyph size={12}>
            <circle cx="8" cy="8" r="6" stroke={TERRA_TEXT} strokeWidth="1.6" />
            <path d="M8 4.6V8l2.2 1.4" stroke={TERRA_TEXT} strokeWidth="1.6" strokeLinecap="round" />
          </Glyph>
          Escalated to Dani after 10 min
        </span>
      </motion.div>
      <motion.p
        layout="position"
        id={qId}
        className="mt-1.5 text-pretty text-[14px] font-medium leading-[18px]"
        style={{ color: CREAM }}
      >
        A migration drops a column. Run it?
      </motion.p>
      <motion.div layout="position" className="relative mt-1 min-h-4 overflow-hidden text-[12px] leading-4">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={held ? "held" : "why"}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={SPRING}
            className="text-pretty"
            style={{ color: held ? CREAM : DIM }}
          >
            {held ? "Held. The task waits in Needs attention." : "Not in shared memory, so a person decides."}
          </motion.p>
        </AnimatePresence>
      </motion.div>
      <motion.div layout="position" className="mt-auto flex gap-2 pt-2">
        <motion.button
          type="button"
          onClick={onApprove}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.95 }}
          transition={SPRING}
          className="relative inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium"
          style={{
            background: `linear-gradient(180deg, #E0845F, ${TERRA})`,
            color: HQ_BG,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 8px 22px -10px rgba(212,113,78,0.95)",
          }}
        >
          <DemoTap n={taps.approve} color="rgba(255,236,220,0.75)" />
          <span className="hidden @min-[22rem]:block">
            <Glyph>
              <path d="M8 1.8 13 3.7v3.9c0 3-2.1 5.5-5 6.6-2.9-1.1-5-3.6-5-6.6V3.7l5-1.9Z" fill={HQ_BG} fillOpacity="0.2" stroke={HQ_BG} strokeWidth="1.4" strokeLinejoin="round" />
              <path d="m5.7 8 1.6 1.6 3-3.2" stroke={HQ_BG} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </Glyph>
          </span>
          Approve with backup
        </motion.button>
        <motion.button
          type="button"
          aria-pressed={held}
          onClick={onHold}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.95 }}
          transition={SPRING}
          className="relative inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-[background-color,box-shadow] duration-200"
          style={{
            color: CREAM,
            background: held ? "rgba(241,236,226,0.16)" : "rgba(241,236,226,0.05)",
            boxShadow: held ? "inset 0 0 0 1px rgba(241,236,226,0.55)" : "inset 0 0 0 1px rgba(241,236,226,0.18)",
          }}
        >
          <DemoTap n={taps.hold} color="rgba(241,236,226,0.4)" />
          <AnimatePresence initial={false}>
            {held && (
              <motion.span
                key="bars"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 10, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={SPRING}
                className="flex h-3 items-center justify-between overflow-hidden"
                aria-hidden="true"
              >
                <span className="h-3 w-[3px] rounded-[1px]" style={{ background: CREAM }} />
                <span className="h-3 w-[3px] rounded-[1px]" style={{ background: CREAM }} />
              </motion.span>
            )}
          </AnimatePresence>
          Hold
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function Quiet({ approved, ran }: { approved: boolean; ran: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[14px] px-4 text-center"
      style={{ border: `1px dashed ${approved ? "rgba(127,163,122,0.4)" : "rgba(241,236,226,0.13)"}` }}
    >
      {approved ? (
        <>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="10" fill="rgba(127,163,122,0.16)" />
            <motion.path
              d="m6.8 11.2 2.9 2.9 5.6-6"
              stroke={OK}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            />
          </svg>
          <p className="mt-1 text-[12.5px] font-medium" style={{ color: CREAM }}>
            Backup first, then migrate. Logged.
          </p>
          <p className="text-[11.5px]" style={{ color: DIM }}>
            {ran ? "The migration ran after its backup." : "The debugger is taking the backup."}
          </p>
        </>
      ) : (
        <>
          <MoonGlyph color="rgba(241,236,226,0.4)" />
          <p className="mt-1 text-[12.5px] font-medium" style={{ color: CREAM }}>
            Nothing needs you.
          </p>
          <p className="text-[11.5px]" style={{ color: DIM }}>
            The supervisor answers what it can.
          </p>
        </>
      )}
    </motion.div>
  );
}

function SupervisorGate({ sup, running }: { sup: Note; running: boolean }) {
  const color = TONE[sup.tone];
  const line = "rgba(241,236,226,0.12)";
  return (
    <div className="flex items-center gap-2 py-1">
      <span aria-hidden="true" className="h-px min-w-3 flex-1" style={{ background: `linear-gradient(90deg, transparent, ${line})` }} />
      <motion.div
        layout
        transition={SPRING}
        className="flex h-9 min-w-0 max-w-[calc(100%-2rem)] items-center gap-2 py-1 pl-1 pr-3"
        style={{
          borderRadius: 999,
          background: "rgba(241,236,226,0.05)",
          boxShadow: `inset 0 0 0 1px ${sup.tone === "idle" ? "rgba(241,236,226,0.12)" : `${color}66`}, 0 6px 24px -14px ${sup.tone === "idle" ? "transparent" : color}`,
        }}
      >
        <motion.span
          key={sup.text}
          layout="position"
          initial={{ y: sup.tone === "idle" ? 0 : -4 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 14 }}
          className="shrink-0"
        >
          <Critter agent="supervisor" framed bob={running && sup.tone === "think"} />
        </motion.span>
        <motion.span
          layout="position"
          className="sr-only whitespace-nowrap text-[12px] font-medium @min-[22rem]:not-sr-only"
          style={{ color: CREAM }}
        >
          Supervisor
        </motion.span>
        <motion.span layout="position" className="relative flex h-4 min-w-0 items-center overflow-hidden text-[12px] leading-4">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={sup.text}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={SPRING}
              className="flex min-w-0 items-center gap-1.5"
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                {running && (sup.tone === "think" || sup.tone === "ask" || sup.tone === "alert") && (
                  <motion.span
                    className="absolute inset-0 rounded-full"
                    style={{ background: color }}
                    initial={{ scale: 1, opacity: 0.7 }}
                    animate={{ scale: 2.6, opacity: 0 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              </span>
              <span className="truncate whitespace-nowrap" style={{ color }}>
                {sup.text}
              </span>
            </motion.span>
          </AnimatePresence>
        </motion.span>
      </motion.div>
      <span aria-hidden="true" className="h-px min-w-3 flex-1" style={{ background: `linear-gradient(270deg, transparent, ${line})` }} />
    </div>
  );
}

function LaneLabel({ id, label, count, accent, children }: { id: string; label: string; count: number; accent?: boolean; children?: ReactNode }) {
  return (
    <div className="flex h-5 items-center gap-1.5 text-[11.5px]">
      <span id={id} style={{ color: accent ? TERRA_TEXT : DIM }}>
        {label}
      </span>
      <span
        aria-hidden="true"
        className="grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] tabular-nums"
        style={{
          color: accent ? HQ_BG : DIM,
          background: accent ? TERRA_TEXT : "rgba(241,236,226,0.07)",
        }}
      >
        {count}
      </span>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Log                                                                         */
/* -------------------------------------------------------------------------- */

function Typed({ text, typing }: { text: string; typing: boolean }) {
  const count = useMotionValue(typing ? 0 : text.length);
  const shown = useTransform(count, (v) => text.slice(0, Math.round(v)));
  useEffect(() => {
    if (!typing) {
      count.set(text.length);
      return;
    }
    const controls = animate(count, text.length, { duration: Math.min(0.9, text.length * 0.022), ease: "linear" });
    return () => controls.stop();
  }, [typing, text, count]);
  return <motion.span>{shown}</motion.span>;
}

function LogRow({ line, last, typing, blink }: { line: Line; last: boolean; typing: boolean; blink: boolean }) {
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="whitespace-pre-wrap break-words"
    >
      <span className="sr-only">
        {line.time} {line.actor}: {line.text}
      </span>
      <span aria-hidden="true">
        <span style={{ color: "rgba(241,236,226,0.42)" }}>{line.time}</span>
        {"  "}
        <span style={{ color: WHO_COLOR[line.who] }}>{line.actor}</span>
        {"  "}
        <span style={{ color: "rgba(241,236,226,0.86)" }}>
          <Typed key={line.text} text={line.text} typing={typing} />
        </span>
        {last && (
          <motion.span
            className="ml-1 inline-block h-[11px] w-[6px] translate-y-[2px] rounded-[1px]"
            style={{ background: TERRA }}
            initial={false}
            animate={blink ? { opacity: [1, 1, 0, 0] } : { opacity: 1 }}
            transition={blink ? { duration: 1, times: [0, 0.5, 0.5, 1], repeat: Infinity, ease: "linear" } : { duration: 0 }}
          />
        )}
      </span>
    </motion.li>
  );
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                    */
/* -------------------------------------------------------------------------- */

function Clock({ time, dawn }: { time: string; dawn: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium tabular-nums" style={{ color: CREAM }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={dawn ? "sun" : "moon"}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={SPRING}
          className="flex"
        >
          {dawn ? <SunGlyph color={ASK} /> : <MoonGlyph color={THINK} />}
        </motion.span>
      </AnimatePresence>
      <span className="flex overflow-hidden" aria-hidden="true">
        {Array.from(time).map((ch, i) => (
          <span key={i} className="relative inline-flex overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={ch}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={SPRING}
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          </span>
        ))}
      </span>
      <span className="sr-only">{time}</span>
    </span>
  );
}

function RoundButton({
  label,
  pressed,
  primary,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  primary?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.9 }}
      transition={SPRING}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
      style={{
        color: CREAM,
        background: primary ? "rgba(212,113,78,0.2)" : "rgba(255,255,255,0.05)",
        boxShadow: primary
          ? "inset 0 0 0 1px rgba(212,113,78,0.6), 0 8px 24px -12px rgba(212,113,78,0.9)"
          : "inset 0 0 0 1px rgba(255,255,255,0.12)",
      }}
    >
      {children}
    </motion.button>
  );
}

function Scrubber({
  step,
  valueText,
  onScrub,
}: {
  step: number;
  valueText: string;
  onScrub: (v: number) => void;
}) {
  const pct = (step / LAST) * 100;
  return (
    <div className="relative mt-1 h-5">
      <input
        type="range"
        min={0}
        max={LAST}
        step={1}
        value={step}
        aria-label="Replay position"
        aria-valuetext={valueText}
        onChange={(e) => onScrub(Number(e.target.value))}
        className="peer absolute inset-x-0 -top-2.5 z-10 h-10 w-full cursor-pointer appearance-none opacity-0"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-2 top-1/2 h-[3px] -translate-y-1/2 rounded-full peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[6px] peer-focus-visible:outline-[#F1ECE2]"
        style={{ background: "rgba(255,255,255,0.1)" }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: `linear-gradient(90deg, rgba(212,113,78,0.35), ${TERRA})` }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={SPRING}
        />
        {STEPS.map((_, i) => (
          <span
            key={i}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${(i / LAST) * 100}%`,
              width: i === ESC ? 5 : 2,
              height: i === ESC ? 5 : 5,
              background: i === ESC ? TERRA_TEXT : i <= step ? "rgba(241,236,226,0.55)" : "rgba(241,236,226,0.2)",
            }}
          />
        ))}
        <motion.span
          className="absolute top-1/2 h-3.5 w-3.5 rounded-full"
          style={{
            x: "-50%",
            y: "-50%",
            background: CREAM,
            boxShadow: `0 0 0 4px rgba(212,113,78,0.25), 0 0 16px ${TERRA}`,
          }}
          initial={false}
          animate={{ left: `${pct}%` }}
          transition={SPRING}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tile                                                                        */
/* -------------------------------------------------------------------------- */

const noopSubscribe = () => () => {};

export default function AgentsTile({ className }: { className?: string }) {
  // Reduced motion only once hydrated: the server renders the log mid-typing,
  // so the first client render has to as well (framer reads the setting at once).
  const prefersReduced = useReducedMotion() ?? false;
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const reduced = hydrated && prefersReduced;
  const { ref: demoRef, active: demoActive, takenOver } = useAutoDemo<HTMLDivElement>();
  const rootRef = useRef<HTMLDivElement>(null);
  /** Once someone has taken over, their replay only runs while it is on screen. */
  const inView = useInView(rootRef, { amount: 0.3 });
  const groupId = useId();
  const ids = {
    attention: useId(),
    working: useId(),
    next: useId(),
    done: useId(),
  };

  const [step, setStep] = useState(0);
  /** null until the visitor touches play, pause, restart or the scrubber. */
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const [acts, setActs] = useState<Act[]>([]);
  const [ran, setRan] = useState(false);
  const [spins, setSpins] = useState(0);
  /** True while the board fades out to rewind between demo loops. */
  const [rewind, setRewind] = useState(false);
  const [taps, setTaps] = useState<Taps>({ hold: 0, approve: 0 });

  const atEnd = step >= LAST;
  /** Until someone touches the tile, the attract-mode plan below owns the clock. */
  const scripted = userPlaying === null && !takenOver;
  const demoing = demoActive && scripted;
  const isPlaying = !atEnd && (scripted ? demoing : (userPlaying ?? !reduced));
  const running = isPlaying && (scripted || inView);
  const dimmed = rewind && demoing;

  // Once a person has taken over, the replay advances itself one beat at a
  // time, only while it is on screen.
  useEffect(() => {
    if (!running || scripted) return;
    const id = window.setTimeout(() => setStep((s) => Math.min(s + 1, LAST)), STEPS[step].hold ?? STEP_MS);
    return () => window.clearTimeout(id);
  }, [running, scripted, step]);

  const approved = acts.some((a) => a.kind === "approve");

  // After an approval the debugger takes the backup, then runs the migration.
  useEffect(() => {
    if (!approved || ran) return;
    const id = window.setTimeout(() => setRan(true), STEP_MS);
    return () => window.clearTimeout(id);
  }, [approved, ran]);

  const board = boardAt(step, acts, ran);
  const lines = logAt(step, acts, ran);
  const inLane = (l: LaneId) => board.order.filter((t) => board.lane[t] === l);
  const working = inLane("working");
  const next = inLane("next");
  const done = inLane("done");
  const escalated = board.lane.schema === "attention";
  const lastAct = acts[acts.length - 1];
  const held = escalated && lastAct?.kind === "hold";
  const dawn = step >= DAWN;

  let sup = STEPS[step].sup;
  if (lastAct && lastAct.at === step) {
    if (lastAct.kind === "approve") {
      sup = { text: ran ? "Migration ran after a backup" : "Dani approved, backup first", tone: "ok" };
    } else if (lastAct.kind === "hold") {
      sup = { text: "Dani is holding it", tone: "idle" };
    } else {
      sup = { text: "Waiting on Dani", tone: "alert" };
    }
  }

  const announce = approved
    ? "Backup first, then migrate. Logged."
    : held
      ? "Held. The task waits in Needs attention."
      : escalated
        ? "Escalated to Dani after 10 min: a migration drops a column. Run it? Approve with backup, or hold."
        : "";

  const addAct = (kind: Act["kind"], at: number) =>
    setActs((a) => [...a, { id: a.reduce((m, x) => Math.max(m, x.id), 0) + 1, kind, at }]);

  const reset = () => {
    setStep(0);
    setActs([]);
    setRan(false);
    setRewind(false);
  };

  // Attract mode: the night plays as if someone were demoing it. When the
  // supervisor escalates the migration, they hold it, let the night go on,
  // then approve it with a backup. Between loops the board fades, rewinds to
  // 01:00 and plays again. The plan is rebuilt from wherever the board is, so
  // scrolling away and back picks up where it paused.
  const tapButton = (kind: keyof Taps) => setTaps((n) => ({ ...n, [kind]: n[kind] + 1 }));
  const plan: DemoStep[] = [];
  const from = atEnd ? 0 : step;
  let t = 0;
  if (from === 0 && (step > 0 || acts.length > 0)) {
    plan.push({ at: 0, run: () => setRewind(true) }, { at: REWIND_MS, run: reset });
    t = REWIND_MS;
  }
  const had = from === 0 ? [] : acts;
  for (let s = from; s < LAST; s++) {
    let wait = s === from ? FIRST_BEAT : (STEPS[s].hold ?? STEP_MS);
    if (s === ESC && had.length === 0) {
      // Read the escalation, then hold it: the rest of the night carries on.
      plan.push(
        { at: t + 1500, run: () => tapButton("hold") },
        { at: t + 1500 + TAP_MS, run: () => addAct("hold", ESC) },
      );
      wait = 2900;
    } else if (s === ESC + 1 && !had.some((a) => a.kind === "approve")) {
      // Then approve it, with a backup first.
      plan.push(
        { at: t + 1100, run: () => tapButton("approve") },
        { at: t + 1100 + TAP_MS, run: () => addAct("approve", ESC + 1) },
      );
      wait = 3300;
    }
    t += wait;
    const to = s + 1;
    plan.push({ at: t, run: () => setStep(to) });
  }
  useDemoScript(demoing, plan, { loop: true, loopDelay: DEMO_LOOP_DELAY });

  const togglePlay = () => {
    if (atEnd) {
      reset();
      setUserPlaying(true);
      return;
    }
    setUserPlaying(!isPlaying);
  };

  const restart = () => {
    reset();
    setUserPlaying(true);
    setSpins((n) => n + 1);
  };

  const scrub = (v: number) => {
    setUserPlaying(false);
    setStep(v);
    const keep = acts.filter((a) => a.at <= v);
    if (keep.length !== acts.length) {
      setActs(keep);
      if (!keep.some((a) => a.kind === "approve")) setRan(false);
    }
  };

  const current = lines[lines.length - 1];

  return (
    <Tile
      glow={TERRA}
      skill="AI agents"
      from="HQ"
      title="Agents work the night shift. A supervisor decides what reaches me."
      className={className}
      ref={demoRef}
      demo={demoing}
    >
      <MotionConfig reducedMotion="user" transition={SPRING}>
        <div ref={rootRef} className="@container flex min-h-0 flex-1 flex-col gap-2.5">
          {/* The HQ board */}
          <LayoutGroup id={groupId}>
            <div
              role="group"
              aria-label="HQ board, a replay of one night"
              className="relative rounded-[20px] p-3"
              style={{
                background: `linear-gradient(180deg, #23201C, ${HQ_BG} 40%, #1B1916)`,
                boxShadow:
                  "inset 0 0 0 1px rgba(241,236,226,0.08), inset 0 1px 0 rgba(241,236,226,0.06), 0 30px 60px -34px rgba(0,0,0,0.9)",
              }}
            >
              {/* Dawn creeps in at 08:00 */}
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[20px]"
                style={{ background: "radial-gradient(120% 60% at 50% 100%, rgba(217,164,65,0.13), transparent 70%)" }}
                initial={false}
                animate={{ opacity: dawn ? 1 : 0 }}
                transition={{ duration: reduced ? 0 : 1.2 }}
              />

              {/* Fades out while the demo rewinds the night between loops */}
              <motion.div
                initial={false}
                animate={{ opacity: dimmed ? 0 : 1 }}
                transition={{ duration: dimmed ? 0.3 : 0.55, ease: [0.22, 1, 0.36, 1], delay: dimmed ? 0 : 0.08 }}
              >
                {/* Needs attention: the only lane that reaches Dani */}
                <div className="relative">
                  <LaneLabel id={ids.attention} label="Needs attention" count={escalated ? 1 : 0} accent={escalated}>
                    <span className="ml-auto font-serif text-[14px] leading-none" style={{ color: TERRA_TEXT }} aria-hidden="true">
                      HQ
                    </span>
                  </LaneLabel>
                  <div className="relative mt-1 h-[178px] @min-[19rem]:h-[136px]">
                    <motion.div
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-3 rounded-[24px]"
                      style={{ background: "radial-gradient(closest-side, rgba(212,113,78,0.22), transparent)" }}
                      initial={false}
                      animate={{ opacity: escalated ? 1 : 0 }}
                      transition={{ duration: reduced ? 0 : 0.6 }}
                    />
                    <AnimatePresence initial={false}>
                      {escalated && step === ESC && acts.length === 0 && !reduced && (
                        <motion.span
                          key="ping"
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 rounded-[14px]"
                          style={{ boxShadow: `0 0 0 2px ${TERRA}` }}
                          initial={{ opacity: 0.8, scale: 1 }}
                          animate={{ opacity: 0, scale: 1.05 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.1, ease: "easeOut", delay: 0.35 }}
                        />
                      )}
                    </AnimatePresence>
                    <AnimatePresence initial={false}>
                      {!escalated && <Quiet key={approved ? "logged" : "quiet"} approved={approved} ran={ran} />}
                    </AnimatePresence>
                    {escalated && (
                      <DecisionCard
                        held={held}
                        taps={taps}
                        onApprove={() => addAct("approve", step)}
                        onHold={() => addAct(held ? "release" : "hold", step)}
                      />
                    )}
                  </div>
                </div>

                <SupervisorGate sup={sup} running={running} />

                {/* Working now */}
                <div className="relative pb-2">
                  <LaneLabel id={ids.working} label="Working now" count={working.length} />
                  <ul
                    aria-labelledby={ids.working}
                    className="mt-1 grid h-[102px] grid-cols-1 content-start gap-1.5 @min-[18.5rem]:h-12 @min-[18.5rem]:grid-cols-2"
                  >
                    {working.map((id) => (
                      <WorkCard key={id} id={id} note={board.notes[id]} running={running} fresh={ENTRY[id] === step} />
                    ))}
                    {working.length === 0 && (
                      <li
                        className="flex h-12 items-center justify-center rounded-[12px] text-[11.5px] @min-[18.5rem]:col-span-2"
                        style={{ color: DIM, border: "1px dashed rgba(241,236,226,0.1)" }}
                      >
                        No agent on a task
                      </li>
                    )}
                  </ul>
                </div>

                {/* Up next and Completed */}
                <div
                  className="relative grid grid-cols-1 gap-2 border-t pt-2 @min-[24rem]:grid-cols-2 @min-[24rem]:gap-3"
                  style={{ borderColor: "rgba(241,236,226,0.07)" }}
                >
                  <div>
                    <LaneLabel id={ids.next} label="Up next" count={next.length} />
                    <div className="mt-1">
                      <Pile ids={next} focus={next[0]} done={false} step={step} labelledBy={ids.next} empty="Queue is empty" />
                    </div>
                  </div>
                  <div>
                    <LaneLabel id={ids.done} label="Completed" count={done.length} />
                    <div className="mt-1">
                      <Pile
                        ids={done}
                        focus={done[done.length - 1]}
                        done
                        step={step}
                        labelledBy={ids.done}
                        empty="Nothing yet"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </LayoutGroup>

          {/* Streaming log */}
          <div
            className="relative min-h-[58px] flex-1 overflow-hidden rounded-[14px]"
            style={{
              background: "rgba(0,0,0,0.4)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
              maskImage: "linear-gradient(to bottom, transparent 0, #000 22px)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 22px)",
            }}
          >
            <motion.ol
              aria-label="Night log"
              className="absolute inset-x-3 bottom-2 flex flex-col gap-0.5 font-code text-[11px] leading-[16px]"
              initial={false}
              animate={{ opacity: dimmed ? 0 : 1 }}
              transition={{ duration: dimmed ? 0.3 : 0.55, ease: [0.22, 1, 0.36, 1], delay: dimmed ? 0 : 0.08 }}
            >
              {lines.map((line, i) => {
                const last = i === lines.length - 1;
                return <LogRow key={line.key} line={line} last={last} typing={last && !reduced} blink={last && running && !reduced} />;
              })}
            </motion.ol>
          </div>

          {/* Replay controls */}
          <div className="flex items-center gap-2">
            <RoundButton label={atEnd ? "Play again" : "Play"} pressed={isPlaying} primary onClick={togglePlay}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={isPlaying ? "pause" : "play"}
                  initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.4, opacity: 0, rotate: 30 }}
                  transition={SPRING}
                  className="flex"
                >
                  {isPlaying ? (
                    <Glyph size={16}>
                      <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill={CREAM} />
                      <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill={CREAM} />
                    </Glyph>
                  ) : (
                    <Glyph size={16}>
                      <path d="M5 2.9v10.2c0 .6.7 1 1.2.7l8-5.1c.5-.3.5-1 0-1.3l-8-5.1C5.7 2 5 2.3 5 2.9Z" fill={CREAM} />
                    </Glyph>
                  )}
                </motion.span>
              </AnimatePresence>
            </RoundButton>
            <RoundButton label="Restart" onClick={restart}>
              <motion.span className="flex" initial={false} animate={{ rotate: -360 * spins }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
                <Glyph size={16}>
                  <path d="M3.2 8a4.8 4.8 0 1 0 1.5-3.5" stroke={CREAM} strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M4.4 1.9v2.9h2.9" stroke={CREAM} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </Glyph>
              </motion.span>
            </RoundButton>
            <div className="min-w-0 flex-1 pl-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[12px] text-text-2">Replay, 60× speed</span>
                <Clock time={STEPS[step].time} dawn={dawn} />
              </div>
              <Scrubber step={step} valueText={`${current.time}, ${current.actor}: ${current.text}`} onScrub={scrub} />
            </div>
          </div>

          <p aria-live={demoing ? "off" : "polite"} className="sr-only">
            {announce}
          </p>
        </div>
      </MotionConfig>
    </Tile>
  );
}
