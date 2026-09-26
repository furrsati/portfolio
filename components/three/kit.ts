import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Seconds since the last frame. SmoothScroll drives the canvas with
 * advance(rafTimestamp), so R3F hands useFrame deltas in milliseconds; a real
 * seconds delta is always < 0.5. Clamped so a stalled tab never jumps.
 */
export function sec(delta: number) {
  return Math.min(0.1, Math.max(0, delta > 0.5 ? delta / 1000 : delta));
}

/** Wall-clock seconds, for idle motion that must not depend on frame deltas. */
export function now() {
  return performance.now() / 1000;
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
export const easeInOut = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
/** Progress of `t` through [a, b], clamped to 0..1. */
export const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/** Layer for glows, rings and glass: seen by the view camera, not by the contact-shadow camera. */
export const GLOW_LAYER = 1;

/**
 * Per-scene values written by DeviceScene every frame and read by the
 * device, pedestal and shadow in their own useFrame callbacks.
 */
export type Live = {
  /** Fan opening target 0..1 (phones). */
  fan: number;
  /** Fan spread in world units, fitted to the view's aspect. */
  spread: number;
  /** Pedestal radius. */
  plinthR: number;
  /** Damped 0..1 chapter progress. */
  progress: number;
  /** Damped 0..1 pinned-story progress. */
  pin: number;
  /** Damped pointer, -1..1. */
  px: number;
  py: number;
  /** performance.now() of the last time this view was drawn on screen. */
  seenAt: number;
};

export function makeLive(): Live {
  return { fan: 0, spread: 1.2, plinthR: 1, progress: 0.5, pin: 0, px: 0, py: 0, seenAt: 0 };
}

/* ------------------------------------------------------------------ */
/* Pointer: tracked once for the whole page, mouse only (touch drags   */
/* would make devices twitch while scrolling).                        */
/* ------------------------------------------------------------------ */
export const pointer = { x: 0, y: 0 };
let pointerBound = false;
export function bindPointer() {
  if (pointerBound || typeof window === "undefined") return;
  pointerBound = true;
  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    },
    { passive: true },
  );
}

/* ------------------------------------------------------------------ */
/* Module cache: geometries are built once and shared by every view.  */
/* ------------------------------------------------------------------ */
const cache = new Map<string, unknown>();
export function once<T>(key: string, make: () => T): T {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T;
}

/* ------------------------------------------------------------------ */
/* Geometry                                                           */
/* ------------------------------------------------------------------ */
export function rrShape(w: number, h: number, r: number) {
  const x = -w / 2;
  const y = -h / 2;
  const rr = Math.max(0.0005, Math.min(r, w / 2 - 0.0005, h / 2 - 0.0005));
  const s = new THREE.Shape();
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.absarc(x + w - rr, y + rr, rr, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - rr);
  s.absarc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2, false);
  s.lineTo(x + rr, y + h);
  s.absarc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + rr);
  s.absarc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** Flat rounded rectangle in the XY plane whose UVs span 0..1 over its box. */
export function roundedRect(w: number, h: number, r: number, segments = 12) {
  const g = new THREE.ShapeGeometry(rrShape(w, h, r), segments);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) + w / 2) / w;
    uv[i * 2 + 1] = (pos.getY(i) + h / 2) / h;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

function slice(src: THREE.BufferGeometry, start: number, count: number, keep: (i: number) => boolean) {
  const pos = src.attributes.position.array as Float32Array;
  const nor = src.attributes.normal.array as Float32Array;
  const p: number[] = [];
  const n: number[] = [];
  for (let t = start; t < start + count; t += 3) {
    if (!keep(t)) continue;
    for (let k = 0; k < 3; k++) {
      const i = (t + k) * 3;
      p.push(pos[i], pos[i + 1], pos[i + 2]);
      n.push(nor[i], nor[i + 1], nor[i + 2]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
  return g;
}

export type Slab = { front: THREE.BufferGeometry; back: THREE.BufferGeometry; edge: THREE.BufferGeometry };

/**
 * A rounded slab (w × h, `depth` thick along z, centred) with a soft rounded
 * bevel. Split in three so each part can take its own material: flat front
 * face, flat back face, and the edge band, whose normals are smoothed so the
 * bevel catches light as one continuous highlight.
 */
export function slab(w: number, h: number, depth: number, r: number, bevel: number, bevelSegments = 5, curveSegments = 18): Slab {
  const core = Math.max(0.0005, depth - bevel * 2);
  const g = new THREE.ExtrudeGeometry(rrShape(w - bevel * 2, h - bevel * 2, r - bevel), {
    depth: core,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
    curveSegments,
    steps: 1,
  });
  g.translate(0, 0, -core / 2);
  const caps = g.groups.find((x) => x.materialIndex === 0)!;
  const sides = g.groups.find((x) => x.materialIndex === 1)!;
  const nz = g.attributes.normal.array as Float32Array;
  const front = slice(g, caps.start, caps.count, (t) => nz[t * 3 + 2] > 0);
  const back = slice(g, caps.start, caps.count, (t) => nz[t * 3 + 2] <= 0);
  let edge = slice(g, sides.start, sides.count, () => true);
  edge.deleteAttribute("normal");
  edge = mergeVertices(edge, 1e-5);
  edge.computeVertexNormals();
  g.dispose();
  return { front, back, edge };
}

/** Fit a texture into a screen like CSS object-fit: cover (anchored top). Mutates and returns it. */
export function cover(tex: THREE.Texture, screenAspect: number) {
  const img = tex.image as { width: number; height: number } | undefined;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16; // clamped to the GPU maximum by three
  if (img?.width) {
    const a = img.width / img.height;
    if (a > screenAspect) {
      tex.repeat.set(screenAspect / a, 1);
      tex.offset.set((1 - screenAspect / a) / 2, 0);
    } else {
      tex.repeat.set(1, a / screenAspect);
      tex.offset.set(0, 1 - a / screenAspect);
    }
  }
  tex.needsUpdate = true;
  return tex;
}

/** Show only a region of a texture: u0..u1 from the left, v0..v1 from the top. */
export function crop(tex: THREE.Texture, u0: number, u1: number, v0: number, v1: number) {
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16; // clamped to the GPU maximum by three
  tex.repeat.set(u1 - u0, v1 - v0);
  tex.offset.set(u0, 1 - v1);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Additive light that never writes opacity. The canvas is transparent and the
 * page (glow, giant name) shows through it; three's AdditiveBlending also adds
 * to the destination alpha, which turned faint glows into opaque black boxes.
 * Colour is added (src ONE + dst ONE) and alpha is left exactly as it was.
 */
export const LIGHT_BLEND = {
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendEquationAlpha: THREE.AddEquation,
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor,
} as const;

/**
 * Screens show screenshots drawn smaller than their real size, so the GPU
 * samples a pre-shrunk (mip) copy and small UI text goes soft. A negative LOD
 * bias makes it pick the sharper, larger copy: crisp text, no shimmer.
 * Use as <meshBasicMaterial onBeforeCompile={sharpScreen} customProgramCacheKey={sharpKey} />.
 */
const SHARP_MAP = /* glsl */ `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv, -0.7 );
  #ifdef DECODE_VIDEO_TEXTURE
    sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
  #endif
  diffuseColor *= sampledDiffuseColor;
#endif
`;
export function sharpScreen(shader: { fragmentShader: string }) {
  shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", SHARP_MAP);
}
export const sharpKey = () => "sharp-screen";
