"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Transition,
  type Variants,
} from "framer-motion";
import Tile from "../Tile";
import { useAutoDemo, useDemoScript } from "../useAutoDemo";

/* Proof of Talk brand */
const GOLD = "#DCB877";
const ORANGE = "#D35400";
const CREAM = "#F5F1EB";
const BLACK = "#0C0B09";
const GREEN = "#4ADE80";

const SPRING = { type: "spring", stiffness: 400, damping: 30 } as const;
const KNOB_SPRING = { type: "spring", stiffness: 520, damping: 26 } as const;
const INSTANT = { duration: 0 } as const;

type Controls = ReturnType<typeof animate>;
type Phase = "wp" | "cutting" | "live";

/* -------------------------------------------------------------------------- */
/* Redirect check                                                              */
/* -------------------------------------------------------------------------- */

const REDIRECTS = 42;
const STAGGER = 0.02;
const LEAD = 0.18;
const CHIPS = Array.from({ length: REDIRECTS }, (_, i) => i);

const GRID: Variants = {
  idle: { transition: { staggerChildren: 0 } },
  pass: (reduced: boolean) => ({
    transition: reduced ? { staggerChildren: 0 } : { delayChildren: LEAD, staggerChildren: STAGGER },
  }),
};

const CHIP: Variants = {
  idle: {
    backgroundColor: "rgba(255, 255, 255, 0.09)",
    boxShadow: "0 0 0px rgba(74, 222, 128, 0)",
    y: 0,
    transition: INSTANT,
  },
  pass: (reduced: boolean) => ({
    backgroundColor: "rgba(74, 222, 128, 1)",
    boxShadow: "0 0 8px rgba(74, 222, 128, 0.5)",
    y: reduced ? 0 : [0, -3, 0],
    transition: reduced ? INSTANT : { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const SLIDE: Variants = {
  enter: (dir: number) => ({ y: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { y: "0%", opacity: 1 },
  exit: (dir: number) => ({ y: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};

/**
 * Text swap that slides on the way to Next.js and snaps on a rollback.
 * `custom` is the snap flag; AnimatePresence hands the current one to exiting text.
 */
function swap(dy: number, transition: Transition): Variants {
  return {
    enter: (snap: boolean) => (snap ? { y: 0, opacity: 1 } : { y: dy, opacity: 0 }),
    center: (snap: boolean) => ({ y: 0, opacity: 1, transition: snap ? INSTANT : transition }),
    exit: (snap: boolean) => ({ y: snap ? 0 : -dy, opacity: 0, transition: snap ? INSTANT : transition }),
  };
}
const SWAP_COUNT = swap(10, SPRING);
const SWAP_STATUS = swap(8, SPRING);
const SWAP_MESSAGE = swap(4, { duration: 0.18 });

/* -------------------------------------------------------------------------- */
/* DNS switch                                                                  */
/* -------------------------------------------------------------------------- */

const TRACK_W = 48;
const TRACK_H = 104;
const KNOB = 38;
const PAD = 5;
/** How far the knob travels from the WordPress detent to the Next.js one. */
const TRAVEL = TRACK_H - KNOB - PAD * 2;
const PORT_TOP = PAD + KNOB / 2;
const PORT_BOTTOM = TRACK_H - PAD - KNOB / 2;

/** Attract mode: how far the demo "hand" drags the knob before letting go. */
const DEMO_DRAG = { to: TRAVEL * 0.8, duration: 0.65, ease: [0.45, 0, 0.2, 1] as const };
const DEMO_RELEASE_VELOCITY = 320;

const KNOB_V: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.06 },
  press: { scale: 0.9 },
};

const SERVERS = [
  { name: "WordPress", sep: "·", detail: "~50 plugins", standby: "Kept as rollback" },
  { name: "Next.js 16", sep: "+", detail: "Supabase", standby: "Built in parallel" },
] as const;

/* -------------------------------------------------------------------------- */
/* Traffic particles: a tiny imperative sim painted straight into the SVG      */
/* -------------------------------------------------------------------------- */

type Pt = { x: number; y: number };
type Route = { pts: Pt[]; cum: number[]; len: number };
type Particle = { alive: boolean; route: 0 | 1; p: number; mul: number; off: number };
type Sim = {
  routes: [Route, Route] | null;
  parts: Particle[];
  nodes: (SVGGElement | null)[];
  ripples: (HTMLSpanElement | null)[];
  target: 0 | 1;
  acc: number;
  n: number;
};
type Geo = { w: number; h: number; trunk: string; branches: [string, string] };

const POOL = 18;
const SEED = 6;
const SPAWN_EVERY = 0.22;
const PARTICLES = Array.from({ length: POOL }, (_, i) => i);

function createSim(): Sim {
  return {
    routes: null,
    parts: PARTICLES.map((): Particle => ({ alive: false, route: 0, p: 0, mul: 1, off: 0 })),
    nodes: PARTICLES.map(() => null),
    ripples: [null, null],
    target: 0,
    acc: 0,
    n: 0,
  };
}

function cubic(a: Pt, b: Pt, c: Pt, d: Pt, t: number): Pt {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return { x: w0 * a.x + w1 * b.x + w2 * c.x + w3 * d.x, y: w0 * a.y + w1 * b.y + w2 * c.y + w3 * d.y };
}

function buildRoute(pts: Pt[]): Route {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return { pts, cum, len: cum[cum.length - 1] };
}

/** Point and unit tangent at distance d along a route. */
function pointAt(r: Route, d: number) {
  const { pts, cum } = r;
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  const a = pts[lo];
  const b = pts[hi];
  const seg = cum[hi] - cum[lo] || 1;
  const t = Math.min(1, Math.max(0, (d - cum[lo]) / seg));
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tx: (b.x - a.x) / seg, ty: (b.y - a.y) / seg };
}

function spawn(sim: Sim, p = 0) {
  const q = sim.parts.find((x) => !x.alive);
  if (!q) return;
  const n = sim.n++;
  q.alive = true;
  q.route = sim.target;
  q.p = p;
  q.mul = 0.85 + ((n * 7) % 5) * 0.075;
  q.off = (((n * 5) % 7) - 3) * 0.9;
}

/** Spread a still stream along the current route (paused or reduced motion). */
function seed(sim: Sim) {
  for (const q of sim.parts) q.alive = false;
  for (let i = 0; i < SEED; i++) spawn(sim, (i + 0.5) / SEED);
  sim.acc = 0;
}

function travelTime(r: Route) {
  return Math.min(2.6, Math.max(1.4, r.len / 170));
}

function ripple(el: HTMLSpanElement | null) {
  if (!el) return;
  animate(el, { scale: [0.8, 2.8], opacity: [0.8, 0] }, { duration: 0.7, ease: "easeOut" });
}

function paint(sim: Sim) {
  const routes = sim.routes;
  sim.parts.forEach((q, i) => {
    const el = sim.nodes[i];
    if (!el) return;
    if (!q.alive || !routes) {
      el.style.opacity = "0";
      return;
    }
    const r = routes[q.route];
    const pt = pointAt(r, q.p * r.len);
    const x = pt.x - pt.ty * q.off;
    const y = pt.y + pt.tx * q.off;
    const fade = Math.max(0, Math.min(1, q.p / 0.08, (1 - q.p) / 0.08));
    el.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    el.style.opacity = fade.toFixed(2);
  });
}

function step(sim: Sim, dt: number) {
  const routes = sim.routes;
  if (!routes) return;
  sim.acc += dt;
  while (sim.acc >= SPAWN_EVERY) {
    sim.acc -= SPAWN_EVERY;
    spawn(sim);
  }
  for (const q of sim.parts) {
    if (!q.alive) continue;
    q.p += dt / (travelTime(routes[q.route]) * q.mul);
    if (q.p >= 1) {
      q.alive = false;
      ripple(sim.ripples[q.route]);
    }
  }
  paint(sim);
}

/** Layout box of el relative to root, ignoring transforms (springs, taps). */
function boxIn(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== root) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

const f = (n: number) => n.toFixed(1);

function computeGeo(root: HTMLElement, vis: HTMLElement, sw: HTMLElement, cards: [HTMLElement, HTMLElement]) {
  const v = boxIn(vis, root);
  const s = boxIn(sw, root);
  const from = { x: v.x + v.w, y: v.y + v.h / 2 };
  const into = { x: s.x, y: s.y + s.h / 2 };
  const trunk = `M${f(from.x)} ${f(from.y)}L${f(into.x)} ${f(into.y)}`;

  const branch = (i: 0 | 1) => {
    const c = boxIn(cards[i], root);
    const out = { x: s.x + s.w, y: s.y + (i === 0 ? PORT_TOP : PORT_BOTTOM) };
    const end = { x: c.x, y: c.y + c.h / 2 };
    const k = Math.max(10, (end.x - out.x) * 0.5);
    const c1 = { x: out.x + k, y: out.y };
    const c2 = { x: end.x - k, y: end.y };
    const pts: Pt[] = [from, into, out];
    for (let j = 1; j <= 28; j++) pts.push(cubic(out, c1, c2, end, j / 28));
    return {
      route: buildRoute(pts),
      d: `M${f(out.x)} ${f(out.y)}C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(end.x)} ${f(end.y)}`,
    };
  };

  const wp = branch(0);
  const next = branch(1);
  const geo: Geo = { w: root.clientWidth, h: root.clientHeight, trunk, branches: [wp.d, next.d] };
  return { geo, routes: [wp.route, next.route] as [Route, Route] };
}

const noopSubscribe = () => () => {};
/** False during SSR and hydration, true after: keeps reduced-motion text hydration-safe. */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                       */
/* -------------------------------------------------------------------------- */

function PeopleIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke={CREAM} strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="7" r="2.75" />
      <path d="M3 16c.5-2.7 2.5-4.3 5-4.3s4.5 1.6 5 4.3" />
      <path d="M13.2 4.6a2.6 2.6 0 0 1 0 5" strokeOpacity="0.55" />
      <path d="M15 11.9c1.2.5 2 1.7 2.3 3.6" strokeOpacity="0.55" />
    </svg>
  );
}

function Rack({ lit }: { lit: boolean }) {
  const led = lit ? GOLD : "rgba(245, 241, 235, 0.3)";
  return (
    <svg viewBox="0 0 16 16" className="mt-[1px] hidden h-4 w-4 shrink-0 @min-[180px]/srv:block" fill="none" aria-hidden="true">
      <rect x="1.75" y="2.25" width="12.5" height="5" rx="1.5" stroke="rgba(245, 241, 235, 0.35)" strokeWidth="1.2" />
      <rect x="1.75" y="8.75" width="12.5" height="5" rx="1.5" stroke="rgba(245, 241, 235, 0.35)" strokeWidth="1.2" />
      <circle cx="4.6" cy="4.75" r="1" fill={led} />
      <circle cx="4.6" cy="11.25" r="1" fill={led} />
      <path d="M8.5 4.75h3.5M8.5 11.25h3.5" stroke="rgba(245, 241, 235, 0.22)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function PlayPauseIcon({ playing }: { playing: boolean }) {
  return (
    <span className="relative h-3 w-3 shrink-0" aria-hidden="true">
      <AnimatePresence initial={false}>
        <motion.svg
          key={playing ? "pause" : "play"}
          viewBox="0 0 12 12"
          className="absolute inset-0 h-3 w-3"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={SPRING}
        >
          {playing ? (
            <>
              <rect x="2" y="1.5" width="2.6" height="9" rx="0.8" fill="currentColor" />
              <rect x="7.4" y="1.5" width="2.6" height="9" rx="0.8" fill="currentColor" />
            </>
          ) : (
            <path d="M3 1.8v8.4a.6.6 0 0 0 .9.5l6.7-4.2a.6.6 0 0 0 0-1L3.9 1.3a.6.6 0 0 0-.9.5Z" fill="currentColor" />
          )}
        </motion.svg>
      </AnimatePresence>
    </span>
  );
}

/* -------------------------------------------------------------------------- */

export default function CutoverTile({ className }: { className?: string }) {
  const prefersReduced = useReducedMotion();
  const hydrated = useHydrated();
  const reduced = hydrated && prefersReduced === true;

  const { ref: demoRef, active: demoActive } = useAutoDemo<HTMLDivElement>();
  const readoutId = useId();
  const [phase, setPhase] = useState<Phase>("wp");
  const [rolledBack, setRolledBack] = useState(false);
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  /** Bumped when a server takes the traffic: [WordPress, Next.js]. */
  const [flash, setFlash] = useState<[number, number]>([0, 0]);
  /** The demo is "holding" the knob (it squeezes, as under a finger). */
  const [grip, setGrip] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const visRef = useRef<HTMLDivElement>(null);
  const switchRef = useRef<HTMLButtonElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([null, null]);
  const sim = useRef<Sim>(createSim());
  const run = useRef(0);
  const dragged = useRef(false);
  const knobAnim = useRef<Controls | null>(null);
  const countAnim = useRef<Controls | null>(null);
  /** The demo's knob drag while it is in flight; settled if the demo stops mid-drag. */
  const demoDrag = useRef<Controls | null>(null);

  const y = useMotionValue(0);
  const arrowRotate = useTransform(y, [0, TRAVEL], [-40, 40]);
  const topPort = useTransform(y, [0, TRAVEL], [1, 0.15]);
  const bottomPort = useTransform(y, [0, TRAVEL], [0.15, 1]);
  const count = useMotionValue(0);
  const countText = useTransform(count, (v) => String(Math.round(v)));

  const inView = useInView(rootRef, { amount: 0.2 });
  const playing = userPlaying ?? !reduced;
  const running = playing && inView;
  const onNext = phase !== "wp";

  /* Measure the diagram and build both routes from the real layout. */
  useEffect(() => {
    const root = rootRef.current;
    const vis = visRef.current;
    const sw = switchRef.current;
    const wp = cardRefs.current[0];
    const nx = cardRefs.current[1];
    if (!root || !vis || !sw || !wp || !nx) return;
    const s = sim.current;
    let key = "";
    const measure = () => {
      const { geo: g, routes } = computeGeo(root, vis, sw, [wp, nx]);
      s.routes = routes;
      if (!s.parts.some((q) => q.alive)) seed(s);
      paint(s);
      const k = `${g.w}|${g.h}|${g.trunk}|${g.branches[0]}|${g.branches[1]}`;
      if (k !== key) {
        key = k;
        setGeo(g);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    for (const el of [root, vis, sw, wp, nx]) ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Traffic loop: only while playing and on screen. */
  useEffect(() => {
    if (!running) return;
    const s = sim.current;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      step(s, dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  useEffect(() => {
    const r = run;
    const k = knobAnim;
    const c = countAnim;
    return () => {
      r.current += 1;
      k.current?.stop();
      c.current?.stop();
    };
  }, []);

  /** Point DNS at WordPress (false) or Next.js (true). */
  const go = (next: boolean, velocity = 0) => {
    knobAnim.current?.stop();
    const to = next ? TRAVEL : 0;
    if (reduced) {
      knobAnim.current = null;
      y.set(to);
    } else {
      knobAnim.current = animate(y, to, { ...KNOB_SPRING, velocity: Math.max(-1600, Math.min(1600, velocity)) });
    }
    if (next === onNext) return;

    const s = sim.current;
    s.target = next ? 1 : 0;
    if (running) spawn(s);
    else {
      seed(s);
      paint(s);
    }
    setFlash(([a, b]) => (next ? [a, b + 1] : [a + 1, b]));

    const id = ++run.current;
    countAnim.current?.stop();
    countAnim.current = null;
    count.set(0);

    if (!next) {
      setPhase("wp");
      setRolledBack(true);
      return;
    }
    setRolledBack(false);
    if (reduced) {
      count.set(REDIRECTS);
      setPhase("live");
      return;
    }
    setPhase("cutting");
    const ctrl = animate(count, REDIRECTS, { duration: STAGGER * REDIRECTS, delay: LEAD, ease: "linear" });
    countAnim.current = ctrl;
    ctrl.then(() => {
      if (run.current === id) setPhase("live");
    });
  };

  const message =
    phase === "cutting"
      ? "DNS now points to Next.js. Checking redirects…"
      : phase === "live"
        ? "Live on Next.js with one DNS change. WordPress stays up as the rollback."
        : rolledBack
          ? "Rolled back in one flip. WordPress stayed up as the rollback."
          : "Visitors are on WordPress. Flip the switch to cut over.";

  /* Attract mode: drag the knob to Next.js, watch every redirect pass, then
     show the safety net: Roll back puts visitors on WordPress in one flip.
     Ending on WordPress lets the next loop start exactly where this one ends. */
  const latest = useRef({ go, onNext });
  useEffect(() => {
    latest.current = { go, onNext };
  });
  const toWordPress = () => {
    demoDrag.current?.stop();
    demoDrag.current = null;
    setGrip(false);
    if (latest.current.onNext) latest.current.go(false);
  };
  useDemoScript(
    demoActive,
    [
      { at: 0, run: toWordPress },
      { at: 650, run: () => setGrip(true) },
      {
        at: 800,
        run: () => {
          knobAnim.current?.stop();
          const ctrl = animate(y, DEMO_DRAG.to, { duration: DEMO_DRAG.duration, ease: DEMO_DRAG.ease });
          knobAnim.current = ctrl;
          demoDrag.current = ctrl;
        },
      },
      {
        at: 800 + DEMO_DRAG.duration * 1000 + 40,
        run: () => {
          demoDrag.current = null;
          setGrip(false);
          latest.current.go(true, DEMO_RELEASE_VELOCITY);
        },
      },
      { at: 5800, run: () => latest.current.go(false) },
    ],
    { loop: true, loopDelay: 3000, reset: toWordPress },
  );

  /* The demo stopped mid-drag (someone took over, or it scrolled away): let the
     knob spring back into the detent it actually points at. */
  useEffect(() => {
    if (demoActive) return;
    const d = demoDrag.current;
    if (!d) return;
    demoDrag.current = null;
    d.stop();
    if (knobAnim.current === d) knobAnim.current = animate(y, onNext ? TRAVEL : 0, KNOB_SPRING);
  }, [demoActive, onNext, y]);

  const dir = onNext ? 1 : -1;
  /** Rollbacks (and reduced motion) snap; only the cutover plays out. */
  const snap = reduced || !onNext;

  return (
    <Tile
      ref={demoRef}
      demo={demoActive}
      glow={GOLD}
      skill="Migrations without downtime"
      from="Proof of Talk"
      title="A live site moved off WordPress with one DNS change. Not one URL lost."
      className={className}
    >
      <MotionConfig reducedMotion="user">
        <div className="@container flex flex-1 flex-col">
          {/* Readout + traffic control */}
          <div className="flex items-start justify-between gap-3">
            <p id={readoutId} className="min-w-0 pt-[9px] text-[13px] leading-[1.45] text-text-2">
              <span className="whitespace-nowrap">proofoftalk.io points to</span>{" "}
              <span className="relative inline-flex overflow-hidden align-bottom">
                <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                  <motion.span
                    key={onNext ? "next" : "wp"}
                    custom={dir}
                    variants={SLIDE}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={reduced ? INSTANT : SPRING}
                    className="whitespace-nowrap font-medium"
                    style={{ color: CREAM }}
                  >
                    {onNext ? "Next.js 16 + Supabase" : "WordPress"}
                  </motion.span>
                </AnimatePresence>
              </span>
            </p>

            <motion.button
              type="button"
              onClick={() => setUserPlaying(!playing)}
              whileTap={{ scale: 0.94 }}
              transition={SPRING}
              className="inline-flex h-10 shrink-0 items-center gap-2 px-3.5 text-[13px] text-text-2 transition-colors hover:text-text"
              style={{
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.03)",
                boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.12)",
              }}
            >
              <PlayPauseIcon playing={playing} />
              <span>
                {playing ? "Pause" : "Play"}
                <span className="sr-only"> traffic</span>
              </span>
            </motion.button>
          </div>

          {/* Diagram: visitors -> DNS switch -> servers */}
          <div ref={rootRef} className="relative mt-2 flex min-h-[176px] flex-1 items-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1.3px)",
                backgroundSize: "14px 14px",
                maskImage: "radial-gradient(ellipse at 50% 50%, #000 25%, transparent 72%)",
                WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, #000 25%, transparent 72%)",
              }}
            />

            <svg
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 overflow-visible"
              width={geo?.w ?? 0}
              height={geo?.h ?? 0}
              viewBox={`0 0 ${geo?.w ?? 1} ${geo?.h ?? 1}`}
              fill="none"
            >
              {geo && (
                <>
                  <path d={geo.trunk} stroke={GOLD} strokeOpacity={0.16} strokeWidth={6} strokeLinecap="round" />
                  <path d={geo.trunk} stroke={GOLD} strokeOpacity={0.8} strokeWidth={1.5} strokeLinecap="round" />
                  {geo.branches.map((d, i) => {
                    const active = (i === 1) === onNext;
                    const draw = reduced
                      ? INSTANT
                      : { duration: snap ? 0.2 : active ? 0.55 : 0.3, ease: [0.22, 1, 0.36, 1] as const };
                    return (
                      <g key={i}>
                        <path d={d} stroke="rgba(245, 241, 235, 0.16)" strokeWidth={1.25} strokeDasharray="3 5" strokeLinecap="round" />
                        <motion.path
                          d={d}
                          stroke={GOLD}
                          strokeOpacity={0.16}
                          strokeWidth={6}
                          strokeLinecap="round"
                          initial={false}
                          animate={{ pathLength: active ? 1 : 0, opacity: active ? 1 : 0 }}
                          transition={draw}
                        />
                        <motion.path
                          d={d}
                          stroke={GOLD}
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          initial={false}
                          animate={{ pathLength: active ? 1 : 0, opacity: active ? 0.9 : 0 }}
                          transition={draw}
                        />
                      </g>
                    );
                  })}
                </>
              )}
              {PARTICLES.map((i) => (
                <g
                  key={i}
                  ref={(el) => {
                    sim.current.nodes[i] = el;
                  }}
                  style={{ opacity: 0 }}
                >
                  <circle r={5} fill={GOLD} opacity={0.24} />
                  <circle r={1.9} fill={CREAM} />
                </g>
              ))}
            </svg>

            {/* Visitors */}
            <div className="relative z-10 shrink-0">
              <div
                ref={visRef}
                className="grid h-11 w-11 place-items-center rounded-full"
                style={{
                  background: "#12110e",
                  boxShadow: "inset 0 0 0 1px rgba(220, 184, 119, 0.38), 0 0 26px -6px rgba(220, 184, 119, 0.5)",
                }}
              >
                <PeopleIcon />
              </div>
              <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-[12px] text-text-2">
                Visitors
              </span>
            </div>

            <div aria-hidden="true" className="min-w-3 flex-1" />

            {/* The DNS switch: click, drag the knob, or use the arrow keys */}
            <div className="relative z-10 shrink-0">
              <motion.button
                ref={switchRef}
                type="button"
                aria-pressed={onNext}
                aria-label="proofoftalk.io points to Next.js 16 + Supabase"
                aria-describedby={readoutId}
                onPointerDown={() => {
                  dragged.current = false;
                }}
                onClick={(e) => {
                  if (e.detail !== 0 && dragged.current) {
                    dragged.current = false;
                    return;
                  }
                  go(!onNext);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    go(e.key === "ArrowDown");
                  }
                }}
                initial="rest"
                animate={demoActive && grip ? "press" : "rest"}
                whileHover="hover"
                whileTap="press"
                className="group relative block cursor-pointer touch-manipulation"
                style={{ width: TRACK_W, height: TRACK_H, borderRadius: 999 }}
              >
                {/* Track */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `linear-gradient(180deg, #17150f, ${BLACK})`,
                    boxShadow:
                      "inset 0 0 0 1px rgba(245, 241, 235, 0.13), inset 0 6px 14px rgba(0, 0, 0, 0.75), 0 12px 30px -12px rgba(220, 184, 119, 0.4)",
                  }}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ boxShadow: "inset 0 0 0 1px rgba(220, 184, 119, 0.45)" }}
                />
                {/* Rail between the two detents */}
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 w-px -translate-x-1/2 bg-white/10"
                  style={{ top: PORT_TOP, height: PORT_BOTTOM - PORT_TOP }}
                />
                {/* Ports where the wires leave the switch */}
                {[PORT_TOP, PORT_BOTTOM].map((top, i) => (
                  <motion.span
                    key={top}
                    aria-hidden="true"
                    className="absolute h-[7px] w-[7px] rounded-full"
                    style={{
                      top: top - 3.5,
                      right: -3.5,
                      background: GOLD,
                      boxShadow: `0 0 8px ${GOLD}`,
                      opacity: i === 0 ? topPort : bottomPort,
                    }}
                  />
                ))}
                {/* Knob */}
                <motion.span
                  aria-hidden="true"
                  drag="y"
                  dragConstraints={{ top: 0, bottom: TRAVEL }}
                  dragElastic={0.14}
                  dragMomentum={false}
                  onDragStart={() => {
                    dragged.current = true;
                  }}
                  onDragEnd={(_, info) => {
                    const v = info.velocity.y;
                    go(Math.abs(v) > 400 ? v > 0 : y.get() > TRAVEL / 2, v);
                    window.setTimeout(() => {
                      dragged.current = false;
                    }, 0);
                  }}
                  variants={KNOB_V}
                  transition={SPRING}
                  className="absolute grid cursor-grab place-items-center rounded-full active:cursor-grabbing"
                  style={{
                    y,
                    top: PAD,
                    left: (TRACK_W - KNOB) / 2,
                    width: KNOB,
                    height: KNOB,
                    background: `radial-gradient(circle at 34% 28%, #FFF9EC 0%, ${CREAM} 22%, ${GOLD} 68%, #A9854A 100%)`,
                    boxShadow:
                      "inset 0 1px 0 rgba(255, 255, 255, 0.75), inset 0 -2px 4px rgba(12, 11, 9, 0.25), 0 6px 16px -4px rgba(220, 184, 119, 0.7), 0 2px 4px rgba(0, 0, 0, 0.6)",
                  }}
                >
                  <motion.svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" style={{ rotate: arrowRotate }} fill="none">
                    <path
                      d="M4.5 10h10M11 6.25 14.75 10 11 13.75"
                      stroke={BLACK}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                </motion.span>
              </motion.button>
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-[12px] text-text-3"
              >
                DNS
              </span>
            </div>

            <div aria-hidden="true" className="min-w-3 flex-1" />

            {/* Servers */}
            <div className="@container/srv relative z-10 flex w-[48%] max-w-[264px] shrink-0 flex-col justify-center self-stretch py-1">
              <div className="flex max-h-[236px] flex-1 flex-col justify-between gap-3">
                {SERVERS.map((srv, i) => {
                  const active = (i === 1) === onNext;
                  return (
                    <motion.div
                      key={srv.name}
                      ref={(el) => {
                        cardRefs.current[i] = el;
                      }}
                      className="relative overflow-hidden rounded-2xl px-2.5 py-2.5 @min-[180px]/srv:px-3.5"
                      initial={false}
                      animate={{
                        backgroundColor: active ? "rgba(220, 184, 119, 0.08)" : "rgba(255, 255, 255, 0.02)",
                        boxShadow: active
                          ? "inset 0 0 0 1px rgba(220, 184, 119, 0.5), 0 14px 34px -18px rgba(220, 184, 119, 0.6)"
                          : "inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 14px 34px -18px rgba(220, 184, 119, 0)",
                      }}
                      transition={snap ? INSTANT : { duration: 0.35 }}
                    >
                      {flash[i] > 0 && !reduced && (
                        <motion.span
                          key={flash[i]}
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0"
                          style={{
                            background: "radial-gradient(120% 100% at 0% 50%, rgba(220, 184, 119, 0.32), transparent 70%)",
                          }}
                          initial={{ opacity: 1 }}
                          animate={{ opacity: 0 }}
                          transition={{ duration: 0.9, ease: "easeOut" }}
                        />
                      )}
                      <div className="relative flex items-start gap-2">
                        <Rack lit={active} />
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-baseline gap-x-1.5 leading-[1.3]">
                            <span
                              className="whitespace-nowrap text-[13.5px] font-medium transition-colors duration-300"
                              style={{ color: active ? CREAM : "var(--text-2)" }}
                            >
                              {srv.name}
                            </span>
                            <span aria-hidden="true" className="hidden text-[12px] text-text-3 @min-[200px]/srv:inline">
                              {srv.sep}
                            </span>
                            <span className="whitespace-nowrap text-[12px] text-text-3">{srv.detail}</span>
                          </p>
                          <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] leading-none">
                            <span className="relative h-[7px] w-[7px] shrink-0" aria-hidden="true">
                              <span
                                ref={(el) => {
                                  sim.current.ripples[i] = el;
                                }}
                                className="absolute inset-0 rounded-full"
                                style={{ background: GOLD, opacity: 0 }}
                              />
                              <span
                                className="absolute inset-0 rounded-full transition-[background-color,box-shadow] duration-300"
                                style={
                                  active
                                    ? { background: GOLD, boxShadow: `0 0 8px ${GOLD}` }
                                    : { background: "transparent", boxShadow: "inset 0 0 0 1px rgba(245, 241, 235, 0.35)" }
                                }
                              />
                            </span>
                            <span className="relative inline-flex overflow-hidden py-px">
                              <AnimatePresence mode="popLayout" initial={false} custom={snap}>
                                <motion.span
                                  key={active ? "on" : "off"}
                                  className="whitespace-nowrap"
                                  style={{ color: active ? GOLD : "var(--text-3)" }}
                                  custom={snap}
                                  variants={SWAP_STATUS}
                                  initial="enter"
                                  animate="center"
                                  exit="exit"
                                >
                                  {active ? "Serving visitors" : srv.standby}
                                </motion.span>
                              </AnimatePresence>
                            </span>
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Redirects */}
          <div className="mt-6">
            <div className="flex min-h-[30px] items-end justify-between gap-3">
              <p className="relative inline-flex overflow-hidden text-[13px] leading-[1.4] text-text-2">
                <AnimatePresence mode="popLayout" initial={false} custom={snap}>
                  {phase === "wp" ? (
                    <motion.span
                      key="staged"
                      className="whitespace-nowrap"
                      custom={snap}
                      variants={SWAP_COUNT}
                      initial="enter"
                      animate="center"
                      exit="exit"
                    >
                      <span className="tabular-nums text-text">{REDIRECTS}</span> redirects staged
                    </motion.span>
                  ) : (
                    <motion.span
                      key="passing"
                      className="whitespace-nowrap"
                      custom={snap}
                      variants={SWAP_COUNT}
                      initial="enter"
                      animate="center"
                      exit="exit"
                    >
                      <motion.span className="font-medium tabular-nums" style={{ color: GREEN }}>
                        {countText}
                      </motion.span>{" "}
                      redirects passing
                    </motion.span>
                  )}
                </AnimatePresence>
              </p>

              <AnimatePresence initial={false}>
                {phase === "live" && (
                  <motion.p
                    key="lost"
                    className="flex items-baseline gap-1.5 whitespace-nowrap"
                    initial={{ opacity: 0, y: 10, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, transition: INSTANT }}
                    transition={reduced ? INSTANT : { ...SPRING, stiffness: 500, damping: 22, delay: 0.2 }}
                  >
                    <span
                      className="text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums"
                      style={{ color: GOLD, textShadow: "0 0 18px rgba(220, 184, 119, 0.55)" }}
                    >
                      0
                    </span>
                    <span className="text-[13px] text-text-2">URLs lost</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.div
              aria-hidden="true"
              className="mt-2.5 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-[4px] @min-[420px]:grid-cols-[repeat(21,minmax(0,1fr))]"
              custom={reduced}
              variants={GRID}
              initial={false}
              animate={onNext ? "pass" : "idle"}
            >
              {CHIPS.map((i) => (
                <motion.span key={i} custom={reduced} variants={CHIP} className="block h-[10px] rounded-[3px]" />
              ))}
            </motion.div>
          </div>

          {/* Result + rollback */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-line pt-4">
            <p aria-live={demoActive ? "off" : "polite"} className="min-h-[2.9em] min-w-0 flex-1 basis-[200px] text-[13px] leading-[1.45]">
              <AnimatePresence mode="wait" initial={false} custom={snap}>
                <motion.span
                  key={`${phase}-${rolledBack}`}
                  className="block"
                  style={{ color: phase === "live" ? "var(--text)" : "var(--text-2)" }}
                  custom={snap}
                  variants={SWAP_MESSAGE}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  {message}
                  {phase === "live" && <span className="sr-only"> {REDIRECTS} redirects passing, 0 URLs lost.</span>}
                </motion.span>
              </AnimatePresence>
            </p>

            <motion.button
              type="button"
              aria-disabled={!onNext}
              onClick={() => {
                if (onNext) go(false);
              }}
              whileHover={onNext ? { y: -1 } : undefined}
              whileTap={onNext ? { scale: 0.95 } : undefined}
              transition={SPRING}
              className={`inline-flex h-10 shrink-0 items-center gap-2 px-4 text-[13px] font-medium transition-colors duration-200 ${
                onNext ? "text-text" : "cursor-not-allowed text-text-3"
              }`}
              style={{
                borderRadius: 999,
                background: onNext ? "rgba(211, 84, 0, 0.12)" : "rgba(255, 255, 255, 0.03)",
                boxShadow: onNext
                  ? "inset 0 0 0 1px rgba(211, 84, 0, 0.6), 0 8px 22px -12px rgba(211, 84, 0, 0.8)"
                  : "inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
              }}
            >
              <motion.svg
                viewBox="0 0 16 16"
                className="h-4 w-4"
                fill="none"
                aria-hidden="true"
                initial={false}
                animate={{ rotate: -360 * flash[0] }}
                transition={reduced ? INSTANT : SPRING}
              >
                <path
                  d="M3.5 6.5h6a3.25 3.25 0 0 1 0 6.5H6.5M6 4 3.5 6.5 6 9"
                  stroke={onNext ? ORANGE : "currentColor"}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
              Roll back
            </motion.button>
          </div>
        </div>
      </MotionConfig>
    </Tile>
  );
}
