"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FAN, LAPTOP, PANELS, PHONE, TV, WIN, fanPose } from "./framing";
import { GLOW_LAYER, clamp01, cover, crop, easeOutCubic, now, once, roundedRect, sec, slab, span, type Live, LIGHT_BLEND, sharpScreen, sharpKey } from "./kit";
import { glowShader, glowUniforms, mats } from "./materials";

type Power = React.RefObject<number>;

/* ------------------------------------------------------------------ */
/* Screen: cross-fades between textures when `index` changes.         */
/* ------------------------------------------------------------------ */
function Screen({
  screens,
  index,
  width,
  height,
  radius,
  z = 0,
  y = 0,
  power,
}: {
  screens: string[];
  index: number;
  width: number;
  height: number;
  radius: number;
  z?: number;
  y?: number;
  /** Optional brightness multiplier (0 = off). Read every frame. */
  power?: Power;
}) {
  const loaded = useTexture(screens) as THREE.Texture[];
  const aspect = width / height;
  // Own copies so each screen can crop its image (object-fit: cover) without
  // disturbing other screens that share the cached image. GPU uploads are shared.
  const textures = useMemo(() => loaded.map((t) => cover(t.clone(), aspect)), [loaded, aspect]);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  const geo = useMemo(() => roundedRect(width, height, radius), [width, height, radius]);
  const back = useRef<THREE.MeshBasicMaterial>(null);
  const front = useRef<THREE.MeshBasicMaterial>(null);
  const n = textures.length;
  const wrap = (i: number) => ((i % n) + n) % n;
  // The screen being shown and the one it fades from: derived during render
  // when `index` changes (React's derived-state pattern), not in an effect.
  const [pair, setPair] = useState(() => ({ idx: index, cur: wrap(index), prev: wrap(index) }));
  if (pair.idx !== index) setPair({ idx: index, cur: wrap(index), prev: pair.cur });
  const anim = useRef({ pair, fade: 1 });

  useFrame((_, delta) => {
    const a = anim.current;
    // New pair committed: restart the fade before this frame is drawn.
    if (a.pair !== pair) {
      a.pair = pair;
      a.fade = pair.cur === pair.prev ? 1 : 0;
    }
    a.fade = Math.min(1, a.fade + sec(delta) / 0.7);
    const e = a.fade * a.fade * (3 - 2 * a.fade);
    const p = power ? power.current : 1;
    if (front.current) {
      front.current.opacity = e;
      front.current.color.setScalar(p);
    }
    if (back.current) back.current.color.setScalar(p);
  });

  return (
    <group position={[0, y, z]}>
      <mesh geometry={geo}>
        <meshBasicMaterial ref={back} map={textures[pair.prev]} toneMapped={false} onBeforeCompile={sharpScreen} customProgramCacheKey={sharpKey} />
      </mesh>
      <mesh geometry={geo} position={[0, 0, 0.0004]}>
        <meshBasicMaterial ref={front} map={textures[pair.cur]} transparent toneMapped={false} depthWrite={false} onBeforeCompile={sharpScreen} customProgramCacheKey={sharpKey} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Film: a real screen recording on a device screen.                  */
/*  - "scrub": its time follows the chapter's pinned scroll progress, */
/*    forward and backward, like the scroll-driven site it records.   */
/*  - "loop":  plays muted on repeat at `rate`, only while `active`.  */
/* Shows the poster until the first frame is decoded.                 */
/* ------------------------------------------------------------------ */
export type Film = {
  src: string;
  poster: string;
  mode: "scrub" | "loop";
  rate?: number;
  live?: React.RefObject<Live>;
  active?: boolean;
};

/** One <video> + texture per film and mode, created once and kept (like the geometry cache). */
function filmSource(src: string, loop: boolean) {
  return once(`film:${src}:${loop ? "loop" : "scrub"}`, () => {
    const video = document.createElement("video");
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.preload = "auto";
    video.loop = loop;
    video.src = src;
    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { video, tex };
  });
}

/** Mark the video texture ready to display at the screen's aspect (runs once metadata is known). */
function fitFilm(video: HTMLVideoElement, tex: THREE.VideoTexture, aspect: number) {
  video.width = video.videoWidth;
  video.height = video.videoHeight;
  cover(tex, aspect);
}

const setRate = (v: HTMLVideoElement, r: number) => {
  v.playbackRate = r;
};
const seek = (v: HTMLVideoElement, t: number) => {
  v.currentTime = t;
};

function FilmScreen({
  film,
  width,
  height,
  radius,
  y = 0,
  z,
  power,
}: {
  film: Film;
  width: number;
  height: number;
  radius: number;
  y?: number;
  z: number;
  power?: Power;
}) {
  const aspect = width / height;
  const posterLoaded = useTexture(film.poster) as THREE.Texture;
  const poster = useMemo(() => cover(posterLoaded.clone(), aspect), [posterLoaded, aspect]);
  const geo = useMemo(() => roundedRect(width, height, radius), [width, height, radius]);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const { video, tex } = filmSource(film.src, film.mode === "loop");
  const [ready, setReady] = useState(false);
  const shown = useRef(0);

  useEffect(() => {
    const onData = () => {
      fitFilm(video, tex, aspect);
      setReady(true);
    };
    if (video.readyState >= 2) onData();
    video.addEventListener("loadeddata", onData);
    // iOS only buffers after a play() call; start and (for scrubbing) pause straight away.
    const unlock = video.play();
    if (film.mode === "scrub") unlock?.then(() => video.pause()).catch(() => {});
    return () => video.removeEventListener("loadeddata", onData);
  }, [video, tex, aspect, film.mode]);

  useEffect(() => {
    if (film.mode !== "loop") return;
    setRate(video, film.rate ?? 1);
    if (film.active ?? true) video.play().catch(() => {});
    else video.pause();
  }, [video, film.mode, film.rate, film.active]);

  // The video and its texture are cached for reuse; only pause it and free the poster copy.
  useEffect(
    () => () => {
      video.pause();
      poster.dispose();
    },
    [video, poster],
  );

  useFrame((_, delta) => {
    const m = mat.current;
    if (!m) return;
    if (power) m.color.setScalar(power.current);
    if (film.mode !== "scrub" || !ready || !video.duration) return;
    const L = film.live?.current;
    const target = (L ? Math.min(1, Math.max(0, L.pin)) : 0) * (video.duration - 0.05);
    // Glide toward the scroll position so fast flicks still read as motion.
    shown.current = THREE.MathUtils.damp(shown.current, target, 9, sec(delta));
    if (!video.seeking && Math.abs(video.currentTime - shown.current) > 1 / 45) seek(video, shown.current);
  });

  return (
    <mesh geometry={geo} position={[0, y, z]}>
      <meshBasicMaterial ref={mat} map={ready ? tex : poster} toneMapped={false} onBeforeCompile={sharpScreen} customProgramCacheKey={sharpKey} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Phone                                                              */
/* ------------------------------------------------------------------ */
const P = PHONE;
const P_BEVEL = 0.036;
const P_R = 0.17;
const P_FACE = P.d / 2;
const P_SCREEN = { w: 0.955, h: 2.09, r: 0.128 };

function phoneParts() {
  return once("g:phone", () => {
    const body = slab(P.w, P.h, P.d, P_R, P_BEVEL, 6, 20);
    const glass = roundedRect(P.w - P_BEVEL * 2 + 0.004, P.h - P_BEVEL * 2 + 0.004, P_R - P_BEVEL + 0.002, 16);
    const island = new THREE.CapsuleGeometry(0.041, 0.2, 6, 16).rotateZ(Math.PI / 2).scale(1, 1, 0.08);
    // Side buttons: action + volume on the left, power on the right.
    const btn = (len: number, x: number, y: number) =>
      new THREE.CapsuleGeometry(0.0135, len, 4, 10).scale(0.55, 1, 1).translate(x, y, 0);
    const lx = -P.w / 2 - 0.0035;
    const rx = P.w / 2 + 0.0035;
    const buttons = mergeGeometries([btn(0.07, lx, 0.66), btn(0.13, lx, 0.46), btn(0.13, lx, 0.27), btn(0.21, rx, 0.4)]);
    // Camera plateau on the back (top right seen from the front, top left from behind).
    const plate = slab(0.46, 0.46, 0.028, 0.12, 0.009, 4, 12);
    const cx = P.w / 2 - 0.07 - 0.23;
    const cy = P.h / 2 - 0.07 - 0.23;
    const lensAt: [number, number][] = [
      [0.105, 0.105],
      [0.105, -0.105],
      [-0.105, 0],
    ];
    const ring = (x: number, y: number) =>
      new THREE.CylinderGeometry(0.083, 0.088, 0.026, 40).rotateX(Math.PI / 2).translate(cx + x, cy + y, -P_FACE - 0.028 - 0.013);
    const glassDisc = (x: number, y: number) =>
      new THREE.CircleGeometry(0.066, 40).rotateY(Math.PI).translate(cx + x, cy + y, -P_FACE - 0.028 - 0.0265);
    const rings = mergeGeometries(lensAt.map(([x, y]) => ring(x, y)));
    const lenses = mergeGeometries(lensAt.map(([x, y]) => glassDisc(x, y)));
    const flash = new THREE.CircleGeometry(0.028, 24).rotateY(Math.PI).translate(cx - 0.105, cy + 0.125, -P_FACE - 0.0285);
    return { body, glass, island, buttons, plate, plateAt: [cx, cy, -P_FACE - 0.014] as const, rings, lenses, flash };
  });
}

export function Phone({ screens, index }: { screens: string[]; index: number }) {
  const g = phoneParts();
  return (
    <group>
      <mesh geometry={g.body.edge} material={mats.titanium()} />
      <mesh geometry={g.body.front} material={mats.blackGlass()} />
      <mesh geometry={g.body.back} material={mats.backGlass()} />
      <mesh geometry={g.buttons} material={mats.titanium()} />
      <group position={g.plateAt}>
        <mesh geometry={g.plate.front} material={mats.backGlass()} />
        <mesh geometry={g.plate.back} material={mats.backGlass()} />
        <mesh geometry={g.plate.edge} material={mats.backGlass()} />
      </group>
      <mesh geometry={g.rings} material={mats.titanium()} />
      <mesh geometry={g.lenses} material={mats.lens()} />
      <mesh geometry={g.flash} material={mats.flash()} />
      <Screen screens={screens} index={index} width={P_SCREEN.w} height={P_SCREEN.h} radius={P_SCREEN.r} z={P_FACE + 0.0006} />
      <mesh geometry={g.island} position={[0, P_SCREEN.h / 2 - 0.085, P_FACE + 0.0016]} material={mats.island()} />
      <mesh geometry={g.glass} position={[0, 0, P_FACE + 0.0024]} material={mats.sheen()} renderOrder={5} layers={GLOW_LAYER} />
    </group>
  );
}

/**
 * Chapter phones: the main phone in front shows screens[index]; one or two
 * phones behind it show the neighbouring screens. They start stacked like a
 * deck and fan out as the story scrolls (live.fan), damped so it glides.
 */
export function PhoneFan({
  screens,
  index,
  live,
  sideDir,
  reduced,
}: {
  screens: string[];
  index: number;
  live: React.RefObject<Live>;
  sideDir: number;
  reduced: boolean;
}) {
  const n = screens.length;
  const sides = n >= 3 ? [-1, 1] : n === 2 ? [sideDir] : [];
  const main = useRef<THREE.Group>(null);
  const a = useRef<THREE.Group>(null);
  const b = useRef<THREE.Group>(null);
  const refs = [a, b];
  const st = useRef({ f: reduced ? 1 : 0 });

  useFrame((_, delta) => {
    const L = live.current;
    if (!L) return;
    const target = reduced ? 1 : L.fan;
    st.current.f = THREE.MathUtils.damp(st.current.f, target, 4, sec(delta));
    const f = st.current.f;
    const count = sides.length;
    if (main.current) main.current.position.x = count === 1 ? -sideDir * L.spread * 0.5 * f : 0;
    sides.forEach((i, k) => {
      const grp = refs[k].current;
      if (!grp) return;
      const to = fanPose(i, count, L.spread);
      // Stacked: tucked just behind the main phone, edges peeking like cards.
      const from = { x: i * 0.07, y: -0.02, z: -0.2 - k * 0.06, ry: 0, rz: -i * 0.045 };
      grp.position.set(THREE.MathUtils.lerp(from.x, to.x, f), THREE.MathUtils.lerp(from.y, to.y, f), THREE.MathUtils.lerp(from.z, to.z, f));
      grp.rotation.set(0, THREE.MathUtils.lerp(from.ry, to.ry, f), THREE.MathUtils.lerp(from.rz, 0, f));
      grp.scale.setScalar(THREE.MathUtils.lerp(0.97, FAN.scale, f));
    });
  });

  const other = (d: number) => (((index + d) % n) + n) % n;
  return (
    <group position={[0, P.lift + P.h / 2, 0]}>
      <group ref={main}>
        <Phone screens={screens} index={index} />
      </group>
      {sides.map((i, k) => (
        <group key={i} ref={refs[k]} position={[i * 0.07, -0.02, -0.2]}>
          <Phone screens={screens} index={other(n === 2 ? 1 : i)} />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Laptop                                                             */
/* ------------------------------------------------------------------ */
const L_ = LAPTOP;
const HINGE_Z = -L_.depth / 2 + 0.03;
const L_SCREEN = { w: 3.02, h: 1.8875 };

function laptopParts() {
  return once("g:laptop", () => {
    const base = slab(L_.w, L_.depth, L_.t, 0.15, 0.026, 5, 16);
    for (const k of ["front", "back", "edge"] as const) base[k].rotateX(-Math.PI / 2);
    const lid = slab(L_.w, L_.lidH, L_.lidT, 0.15, 0.014, 4, 16);
    const lidGlass = roundedRect(L_.w - 0.028, L_.lidH - 0.028, 0.136, 12);
    const well = roundedRect(2.78, 1.16, 0.05).rotateX(-Math.PI / 2).translate(0, 0, -0.42);
    // Keyboard: every key merged into one mesh (one draw call).
    const rows: number[][] = [
      Array(14).fill(1),
      [...Array(13).fill(1), 1.5],
      [1.5, ...Array(13).fill(1)],
      [1.8, ...Array(11).fill(1), 1.8],
      [2.3, ...Array(10).fill(1), 2.3],
      [1, 1, 1, 1.25, 5.2, 1.25, 1, 3],
    ];
    const kbW = 2.62;
    const gap = 0.024;
    const keys: THREE.BufferGeometry[] = [];
    let z = -0.92;
    rows.forEach((row, r) => {
      const depth = r === 0 ? 0.085 : 0.158;
      const units = row.reduce((s, u) => s + u, 0);
      const unitW = (kbW - gap * (row.length - 1)) / units;
      let x = -kbW / 2;
      for (const u of row) {
        const w = unitW * u;
        keys.push(new THREE.BoxGeometry(w, 0.012, depth).translate(x + w / 2, 0, z + depth / 2));
        x += w + gap;
      }
      z += depth + gap;
    });
    const keyboard = mergeGeometries(keys);
    keys.forEach((k) => k.dispose());
    const pad = roundedRect(1.36, 0.8, 0.06).rotateX(-Math.PI / 2);
    const padEdge = roundedRect(1.38, 0.82, 0.068).rotateX(-Math.PI / 2);
    const hinge = new THREE.CylinderGeometry(0.034, 0.034, L_.w - 0.52, 24).rotateZ(Math.PI / 2);
    const deckGlow = new THREE.PlaneGeometry(3.0, 2.0).rotateX(-Math.PI / 2);
    return { base, lid, lidGlass, well, keyboard, pad, padEdge, hinge, deckGlow };
  });
}

export function Laptop({
  screens,
  index,
  enter,
  reduced,
  glow,
  film,
}: {
  screens: string[];
  index: number;
  enter: boolean;
  reduced: boolean;
  glow: string;
  film?: Film;
}) {
  const g = laptopParts();
  const lid = useRef<THREE.Group>(null);
  const deck = useRef<THREE.ShaderMaterial>(null);
  const power = useRef(reduced ? 1 : 0);
  const clock = useRef({ start: -1 });
  const tint = useMemo(() => "#" + new THREE.Color(glow).lerp(new THREE.Color("#ffffff"), 0.55).getHexString(), [glow]);
  const deckU = useMemo(() => glowUniforms(tint, 0, 0, 0, 1.15, [0.5, 1]), [tint]);
  const closed = Math.PI / 2;
  const opened = Math.PI / 2 - L_.open;

  useFrame(() => {
    let e = 1;
    if (!reduced) {
      if (enter && clock.current.start < 0) clock.current.start = now();
      e = clock.current.start < 0 ? 0 : easeOutCubic(span(now() - clock.current.start, 0.25, 1.65));
    }
    if (lid.current) lid.current.rotation.x = THREE.MathUtils.lerp(closed, opened, e);
    power.current = 0.2 + 0.8 * span(e, 0.45, 1);
    if (deck.current) deck.current.uniforms.uOpacity.value = 0.2 * span(e, 0.35, 1);
  });

  const t = L_.t;
  return (
    <group>
      {/* Base */}
      <group position={[0, t / 2, 0]}>
        <mesh geometry={g.base.edge} material={mats.aluminium()} />
        <mesh geometry={g.base.front} material={mats.aluminium()} />
        <mesh geometry={g.base.back} material={mats.aluminiumDark()} />
      </group>
      <group position={[0, t, 0]}>
        <mesh geometry={g.well} position={[0, 0.0006, 0]} material={mats.well()} />
        <mesh geometry={g.keyboard} position={[0, 0.0066, 0]} material={mats.keycap()} />
        <mesh geometry={g.padEdge} position={[0, 0.0004, 0.62]} material={mats.aluminiumDark()} />
        <mesh geometry={g.pad} position={[0, 0.0008, 0.62]} material={mats.trackpad()} />
        {/* Light from the open display falling on the deck */}
        <mesh geometry={g.deckGlow} position={[0, 0.0014, HINGE_Z + 1.0]} renderOrder={3} layers={GLOW_LAYER}>
          <shaderMaterial
            ref={deck}
            args={[glowShader]}
            uniforms={deckU}
            transparent
            depthWrite={false}
            {...LIGHT_BLEND}
            toneMapped={false}
          />
        </mesh>
      </group>
      <mesh geometry={g.hinge} position={[0, t + 0.004, HINGE_Z - 0.01]} material={mats.aluminiumDark()} />
      {/* Lid: pivots on the hinge; the display faces +z at local z = 0 */}
      <group ref={lid} position={[0, t, HINGE_Z]} rotation-x={reduced ? opened : closed}>
        <group position={[0, L_.lidH / 2, -L_.lidT / 2]}>
          <mesh geometry={g.lid.edge} material={mats.aluminium()} />
          <mesh geometry={g.lid.front} material={mats.blackGlass()} />
          <mesh geometry={g.lid.back} material={mats.aluminium()} />
        </group>
        {film ? (
          <FilmScreen film={film} width={L_SCREEN.w} height={L_SCREEN.h} radius={0.03} y={L_.lidH / 2 + 0.03} z={0.0006} power={power} />
        ) : (
          <Screen screens={screens} index={index} width={L_SCREEN.w} height={L_SCREEN.h} radius={0.03} y={L_.lidH / 2 + 0.03} z={0.0006} power={power} />
        )}
        <mesh geometry={g.lidGlass} position={[0, L_.lidH / 2, 0.0022]} material={mats.sheenSoft()} renderOrder={5} layers={GLOW_LAYER} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* TV                                                                 */
/* ------------------------------------------------------------------ */
const TV_SCREEN = { w: 4.0, h: 2.25 };

function tvParts() {
  return once("g:tv", () => {
    const panel = slab(TV.w, TV.h, TV.t, 0.04, 0.012, 4, 10);
    const housing = slab(2.7, 1.4, 0.08, 0.12, 0.024, 4, 12);
    const neck = slab(0.2, 1.0, 0.045, 0.04, 0.012, 3, 8);
    const foot = slab(1.5, 0.56, 0.032, 0.24, 0.012, 4, 16);
    for (const k of ["front", "back", "edge"] as const) foot[k].rotateX(-Math.PI / 2);
    const glass = roundedRect(TV.w - 0.024, TV.h - 0.024, 0.03, 8);
    const flash = roundedRect(TV_SCREEN.w, TV_SCREEN.h, 0.01, 4);
    const led = new THREE.CircleGeometry(0.011, 16);
    const back = new THREE.PlaneGeometry(6.4, 4.2);
    return { panel, housing, neck, foot, glass, flash, led, back };
  });
}

export function Television({
  screens,
  index,
  enter,
  reduced,
  glow,
}: {
  screens: string[];
  index: number;
  enter: boolean;
  reduced: boolean;
  glow: string;
}) {
  const g = tvParts();
  const power = useRef(reduced ? 1 : 0);
  const clock = useRef({ start: -1 });
  const flash = useRef<THREE.MeshBasicMaterial>(null);
  const led = useRef<THREE.MeshBasicMaterial>(null);
  const backMat = useRef<THREE.ShaderMaterial>(null);
  const backU = useMemo(() => glowUniforms(glow, 0, 0, 0, 1, [0.5, 0.5]), [glow]);
  const cy = TV.bottom + TV.h / 2;

  useFrame(() => {
    let p = 1;
    if (!reduced) {
      if (enter && clock.current.start < 0) clock.current.start = now();
      const u = clock.current.start < 0 ? -1 : now() - clock.current.start - 0.4;
      // Power on: black → a quick over-bright bloom → settle.
      p = u < 0 ? 0 : u < 0.2 ? 1.9 * easeOutCubic(u / 0.2) : 1 + 0.9 * (1 - easeOutCubic(span(u, 0.2, 1.25)));
    }
    power.current = Math.min(p, 1.35);
    const over = Math.max(0, p - 1);
    if (flash.current) flash.current.opacity = over * 0.45;
    if (led.current) led.current.color.setScalar(clamp01(1 - p * 3));
    if (backMat.current) backMat.current.uniforms.uOpacity.value = 0.16 * Math.min(p, 1) + 0.45 * over;
  });

  return (
    <group>
      {/* Stand */}
      <group position={[0, 0.016, -0.06]}>
        <mesh geometry={g.foot.edge} material={mats.aluminium()} />
        <mesh geometry={g.foot.front} material={mats.aluminium()} />
        <mesh geometry={g.foot.back} material={mats.aluminiumDark()} />
      </group>
      <group position={[0, 0.5, -0.1]}>
        <mesh geometry={g.neck.edge} material={mats.aluminium()} />
        <mesh geometry={g.neck.front} material={mats.aluminium()} />
        <mesh geometry={g.neck.back} material={mats.aluminium()} />
      </group>
      <group position={[0, cy, 0]}>
        {/* Bias light behind the panel, blooms as it powers on */}
        <mesh geometry={g.back} position={[0, 0, -0.16]} renderOrder={1} layers={GLOW_LAYER}>
          <shaderMaterial
            ref={backMat}
            args={[glowShader]}
            uniforms={backU}
            transparent
            depthWrite={false}
            {...LIGHT_BLEND}
            toneMapped={false}
          />
        </mesh>
        <group position={[0, -0.12, -TV.t / 2 - 0.04]}>
          <mesh geometry={g.housing.edge} material={mats.graphite()} />
          <mesh geometry={g.housing.back} material={mats.graphite()} />
        </group>
        <mesh geometry={g.panel.edge} material={mats.graphite()} />
        <mesh geometry={g.panel.back} material={mats.graphite()} />
        <mesh geometry={g.panel.front} material={mats.blackGlass()} />
        <Screen screens={screens} index={index} width={TV_SCREEN.w} height={TV_SCREEN.h} radius={0.012} z={TV.t / 2 + 0.0006} power={power} />
        <mesh geometry={g.flash} position={[0, 0, TV.t / 2 + 0.0014]} renderOrder={4} layers={GLOW_LAYER}>
          <meshBasicMaterial ref={flash} color="#ffffff" transparent premultipliedAlpha opacity={0} depthWrite={false} {...LIGHT_BLEND} toneMapped={false} />
        </mesh>
        <mesh geometry={g.led} position={[0, -TV.h / 2 + 0.024, TV.t / 2 + 0.001]}>
          <meshBasicMaterial ref={led} color="#ff3b30" toneMapped={false} />
        </mesh>
        <mesh geometry={g.glass} position={[0, 0, TV.t / 2 + 0.0022]} material={mats.sheenSoft()} renderOrder={5} layers={GLOW_LAYER} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* App window (HQ): a thick glass window with two floating panels     */
/* behind it, cut from the same screenshot, that parallax.            */
/* ------------------------------------------------------------------ */
const W_BEVEL = 0.024;
const W_R = 0.11;

function windowParts() {
  return once("g:window", () => {
    const main = slab(WIN.w, WIN.h, WIN.t, W_R, W_BEVEL, 5, 16);
    const glass = roundedRect(WIN.w - W_BEVEL * 2, WIN.h - W_BEVEL * 2, W_R - W_BEVEL, 12);
    const panels = PANELS.map((p) => ({
      body: slab(p.w, p.h, 0.036, 0.07, 0.012, 4, 12),
      face: roundedRect(p.w - 0.034, p.h - 0.034, 0.055, 10),
    }));
    return { main, glass, panels };
  });
}

function PanelFace({ src, geo, cropBox }: { src: string; geo: THREE.BufferGeometry; cropBox: readonly [number, number, number, number] }) {
  const loaded = useTexture(src) as THREE.Texture;
  const tex = useMemo(() => crop(loaded.clone(), cropBox[0], cropBox[1], cropBox[2], cropBox[3]), [loaded, cropBox]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh geometry={geo} position={[0, 0, 0.0186]}>
      <meshBasicMaterial map={tex} toneMapped={false} onBeforeCompile={sharpScreen} customProgramCacheKey={sharpKey} />
    </mesh>
  );
}

export function AppWindow({
  screens,
  index,
  live,
  enter,
  reduced,
}: {
  screens: string[];
  index: number;
  live: React.RefObject<Live>;
  enter: boolean;
  reduced: boolean;
}) {
  const g = windowParts();
  const panelRefs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const clock = useRef({ start: -1 });
  const cy = WIN.lift + WIN.h / 2;

  useFrame(() => {
    const L = live.current;
    let e = 1;
    if (!reduced) {
      if (enter && clock.current.start < 0) clock.current.start = now();
      e = clock.current.start < 0 ? 0 : easeOutCubic(span(now() - clock.current.start, 0.3, 1.7));
    }
    PANELS.forEach((p, i) => {
      const grp = panelRefs[i].current;
      if (!grp || !L) return;
      const k = p.depth;
      const px = reduced ? 0 : L.px * 0.16 * k;
      const py = reduced ? 0 : L.py * 0.09 * k + (L.progress - 0.5) * 0.5 * k * (i === 0 ? 1 : -1);
      // Tucked behind the window until the entrance slides them out.
      grp.position.set(
        THREE.MathUtils.lerp(p.pos[0] * 0.35, p.pos[0], e) + px,
        THREE.MathUtils.lerp(p.pos[1] * 0.35, p.pos[1], e) + py,
        THREE.MathUtils.lerp(p.pos[2] - 0.25, p.pos[2], e),
      );
      grp.scale.setScalar(0.86 + 0.14 * e);
    });
  });

  return (
    <group position={[0, cy, 0]}>
      <mesh geometry={g.main.edge} material={mats.windowEdge()} />
      <mesh geometry={g.main.back} material={mats.windowEdge()} />
      <mesh geometry={g.main.front} material={mats.windowEdge()} />
      <Screen screens={screens} index={index} width={WIN.w - 0.07} height={WIN.h - 0.07} radius={W_R - 0.035} z={WIN.t / 2 + 0.0006} />
      <mesh geometry={g.glass} position={[0, 0, WIN.t / 2 + 0.0022]} material={mats.sheenSoft()} renderOrder={5} layers={GLOW_LAYER} />
      {PANELS.map((p, i) => (
        <group key={i} ref={panelRefs[i]} position={[p.pos[0] * 0.35, p.pos[1] * 0.35, p.pos[2] - 0.25]} rotation-y={i === 0 ? 0.1 : -0.08}>
          <mesh geometry={g.panels[i].body.edge} material={mats.windowEdge()} />
          <mesh geometry={g.panels[i].body.back} material={mats.windowEdge()} />
          <mesh geometry={g.panels[i].body.front} material={mats.windowEdge()} />
          <PanelFace src={screens[0]} geo={g.panels[i].face} cropBox={p.crop} />
        </group>
      ))}
    </group>
  );
}
