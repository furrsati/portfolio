import type { Device } from "@/lib/content/projects";

/* ------------------------------------------------------------------ */
/* Device dimensions (world units). Shared by the models and framing. */
/* ------------------------------------------------------------------ */
export const PHONE = { w: 1.06, h: 2.2, d: 0.118, lift: 0.18 };
export const FAN = { z: -0.95, y: -0.12, turn: 0.3, scale: 0.94, max: 1.22, min: 0.72 };
export const LAPTOP = { w: 3.2, depth: 2.2, t: 0.085, lidH: 2.1, lidT: 0.045, open: (105 * Math.PI) / 180 };
export const TV = { w: 4.1, h: 2.34, t: 0.045, bottom: 0.52 };
export const WIN = { w: 3.3, h: 2.215, t: 0.07, lift: 0.5 };
/** Floating HQ panels: offset from the window centre, size, and texture crop (u0,u1,v0,v1 from top-left). */
export const PANELS = [
  // A live task: "Furrsati 2.5 in the Play Store and App Store", top left.
  { pos: [-1.66, 0.86, -0.55] as const, w: 1.6, h: 0.648, crop: [0.145, 0.5155, 0.1147, 0.3538] as const, depth: 1 },
  // A finished task with its "Backend live · OTA live" tags, lower right.
  { pos: [1.36, -0.92, -0.34] as const, w: 2.05, h: 0.47, crop: [0.145, 0.5155, 0.7498, 0.8853] as const, depth: 0.65 },
];
export const PLINTH = { t: 0.07 };

/** Camera elevation (radians) per device: laptops are seen a little from above to show the deck. */
export const ELEV: Record<Device, number> = { phone: 0.15, laptop: 0.27, tv: 0.13, window: 0.13 };
/** How far the device faces toward the copy, in radians. */
export const FACE: Record<Device, number> = { phone: 0.12, laptop: 0.22, tv: 0.16, window: 0.12 };

export const FOV = 30;
/** Content fills 80% of the box: ~10% breathing room each side. */
export const FILL = 0.8;
/**
 * Below lg the chapter stage is a full-bleed band above the copy, not a pinned
 * column, so the device can fill more of it (still ~6% clear of each edge).
 */
export const FILL_COMPACT = 0.88;

/**
 * True when the chapters use the pinned two-column layout (Tailwind's lg,
 * 64rem and up). Read at event and frame time only, never during render.
 */
let wideQuery: MediaQueryList | null = null;
export function wideLayout() {
  if (typeof window === "undefined") return true;
  wideQuery ??= window.matchMedia("(min-width: 64rem)");
  return wideQuery.matches;
}
/** A mouse or trackpad drives the pointer tilt (touch never does). */
let fineQuery: MediaQueryList | null = null;
export function finePointer() {
  if (typeof window === "undefined") return true;
  fineQuery ??= window.matchMedia("(hover: hover) and (pointer: fine)");
  return fineQuery.matches;
}

type V3 = [number, number, number];

function box(cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, ry = 0, s = 1): V3[] {
  const out: V3[] = [];
  const c = Math.cos(ry);
  const sn = Math.sin(ry);
  for (const x of [-hx, hx])
    for (const y of [-hy, hy])
      for (const z of [-hz, hz]) {
        const X = x * s;
        const Z = z * s;
        out.push([cx + X * c + Z * sn, cy + y * s, cz - X * sn + Z * c]);
      }
  return out;
}

function ring(r: number, y: number, n = 28): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  return out;
}

/** Pedestal radius for a device (phones depend on how wide the fan opens). */
export function plinthRadius(device: Device, sides: number, spread: number) {
  if (device === "phone") return sides === 0 ? 0.95 : sides === 1 ? 0.62 + spread * 0.62 : 0.62 + spread * 0.78;
  if (device === "laptop") return 1.96;
  if (device === "tv") return 1.3;
  return 1.42;
}

/** Fan positions for side phone `i` (-1 left, +1 right) at full spread. */
export function fanPose(i: number, sides: number, spread: number) {
  const x = sides === 1 ? spread * 0.5 * i : spread * i;
  return { x, y: FAN.y, z: FAN.z, ry: -i * FAN.turn, s: FAN.scale };
}

function devicePoints(device: Device, hero: boolean, sides: number, sideDir: number, spread: number): V3[] {
  if (device === "phone") {
    const hw = PHONE.w / 2;
    const hh = PHONE.h / 2;
    const hd = PHONE.d / 2 + 0.04;
    if (hero) return box(0, 0, 0, hw, hh, hd);
    const cy = PHONE.lift + hh;
    const mainX = sides === 1 ? -sideDir * spread * 0.5 : 0;
    const pts = box(mainX, cy, 0, hw, hh, hd);
    const idx = sides === 2 ? [-1, 1] : sides === 1 ? [sideDir] : [];
    for (const i of idx) {
      const f = fanPose(i, sides, spread);
      pts.push(...box(f.x, cy + f.y, f.z, hw, hh, hd, f.ry, f.s));
    }
    return pts;
  }
  if (device === "laptop") {
    const { w, depth, t, lidH, lidT, open } = LAPTOP;
    const hingeZ = -depth / 2 + 0.03;
    const back = open - Math.PI / 2;
    const topY = t + Math.cos(back) * lidH;
    const topZ = hingeZ - Math.sin(back) * lidH;
    const pts = box(0, t / 2, 0, w / 2, t / 2, depth / 2);
    for (const x of [-w / 2, w / 2]) {
      pts.push([x, t, hingeZ + 0.02], [x, topY, topZ], [x, topY + lidT * Math.sin(back), topZ - lidT]);
    }
    return pts;
  }
  if (device === "tv") {
    const cy = TV.bottom + TV.h / 2;
    return [...box(0, cy, 0, TV.w / 2, TV.h / 2, 0.06), ...box(0, cy, -0.12, 1.3, 0.7, 0.06), ...box(0, 0.02, -0.05, 0.7, 0.02, 0.3)];
  }
  const cy = WIN.lift + WIN.h / 2;
  const pts = box(0, cy, 0, WIN.w / 2, WIN.h / 2, WIN.t / 2);
  for (const p of PANELS) {
    pts.push(...box(p.pos[0], cy + p.pos[1], p.pos[2], p.w / 2 + 0.1 * p.depth, p.h / 2 + 0.1 * p.depth, 0.03));
  }
  return pts;
}

export type Framing = {
  /** Camera elevation (radians). */
  elev: number;
  /** Camera distance from the target along the elevation ray. */
  dist: number;
  /** Look-at target in stage space. */
  ty: number;
  tz: number;
  tx: number;
  spread: number;
  plinthR: number;
  /** Halo ring radius when placed `haloBack` behind the target. */
  haloR: number;
  haloBack: number;
};

function solve(dyn: V3[], stat: V3[], yaws: number[], elev: number, aspect: number, fill: number) {
  const tY = Math.tan(((FOV / 2) * Math.PI) / 180);
  const tX = tY * aspect;
  const se = Math.sin(elev);
  const ce = Math.cos(elev);
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  const add = (x: number, y: number, z: number) => {
    xs.push(x);
    ys.push(y * ce - z * se);
    zs.push(y * se + z * ce);
  };
  for (const yaw of yaws) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    for (const [x, y, z] of dyn) add(x * c + z * s, y, -x * s + z * c);
  }
  for (const [x, y, z] of stat) add(x, y, z);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < xs.length; i++) {
    minX = Math.min(minX, xs[i]);
    maxX = Math.max(maxX, xs[i]);
    minY = Math.min(minY, ys[i]);
    maxY = Math.max(maxY, ys[i]);
  }
  let cx = (minX + maxX) / 2;
  let cy = (minY + maxY) / 2;
  let dist = 0;
  // Fit, then re-centre on the perspective-projected bounds (near parts project
  // larger) and fit again, so the margins come out even on every side.
  for (let pass = 0; pass < 3; pass++) {
    dist = 0;
    for (let i = 0; i < xs.length; i++) {
      dist = Math.max(dist, zs[i] + Math.abs(xs[i] - cx) / (fill * tX), zs[i] + Math.abs(ys[i] - cy) / (fill * tY));
    }
    let u0 = Infinity;
    let u1 = -Infinity;
    let v0 = Infinity;
    let v1 = -Infinity;
    for (let i = 0; i < xs.length; i++) {
      const k = 1 / (dist - zs[i]);
      u0 = Math.min(u0, (xs[i] - cx) * k);
      u1 = Math.max(u1, (xs[i] - cx) * k);
      v0 = Math.min(v0, (ys[i] - cy) * k);
      v1 = Math.max(v1, (ys[i] - cy) * k);
    }
    cx += ((u0 + u1) / 2) * dist;
    cy += ((v0 + v1) / 2) * dist;
  }
  return { dist, cx, cy, se, ce, tX, tY };
}

/**
 * Frame the whole composition (device at every yaw it can reach, fan fully
 * open, pedestal) so it fits the view box at this aspect, filling `fill` of it.
 */
export function frame(
  device: Device,
  hero: boolean,
  sides: number,
  sideDir: number,
  aspect: number,
  yaws: number[],
  fill = FILL,
): Framing {
  const elev = hero ? 0.04 : ELEV[device];
  const build = (spread: number) => {
    const plinthR = hero ? 0 : plinthRadius(device, sides, spread);
    const stat = hero ? [] : [...ring(plinthR + 0.06, 0), ...ring(plinthR * 1.16, -PLINTH.t * 0.5 * plinthR)];
    return { plinthR, r: solve(devicePoints(device, hero, sides, sideDir, spread), stat, yaws, elev, aspect, fill) };
  };
  let spread = FAN.max;
  let best = build(spread);
  if (device === "phone" && !hero && sides > 0) {
    // Open the fan as wide as the box allows without shrinking the phones much.
    const tight = build(FAN.min).r.dist;
    for (let s = FAN.max; s >= FAN.min - 1e-6; s -= 0.05) {
      const b = build(s);
      spread = s;
      best = b;
      if (b.r.dist <= tight * 1.08) break;
    }
  }
  const { dist, cx, cy, se, ce, tX, tY } = best.r;
  const haloBack = 1.8;
  const haloR = Math.min(tX, tY) * (dist + haloBack) * 0.9;
  return { elev, dist, tx: cx, ty: cy * ce, tz: -cy * se, spread, plinthR: best.plinthR, haloR, haloBack };
}
