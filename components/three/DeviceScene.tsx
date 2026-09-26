"use client";

import { Environment, Lightformer, PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Device } from "@/lib/content/projects";
import { AppWindow, Laptop, Phone, PhoneFan, Television, type Film } from "./devices";
import { FACE, FAN, FOV, PHONE, frame, plinthRadius, type Framing } from "./framing";
import { GLOW_LAYER, bindPointer, clamp01, easeInOut, easeOutQuart, makeLive, now, pointer, sec, span, type Live } from "./kit";
import { Halo, Pedestal, SoftShadow } from "./Stagecraft";

type Props = {
  device: Device;
  screens: string[];
  /** Current screen on the main device. */
  index: number;
  /** Brand light: [primary, secondary]. */
  glow: [string, string];
  /** Whole chapter 0..1 (offset ["start end", "end start"]): drives the turn. */
  progress?: MotionValue<number>;
  /** Pinned story range 0..1 (offset ["start 30%", "end end"]): drives the fan. */
  pin?: MotionValue<number>;
  /** Signed max turn across the chapter, in radians (flip side is negative). */
  sweep?: number;
  /** True once the chapter is in view: plays the entrance once. */
  enter?: boolean;
  /** prefers-reduced-motion: static final pose, no idle motion. */
  reduced?: boolean;
  /** hero = single phone, halo only; chapter = full choreography + pedestal. */
  variant?: "hero" | "chapter";
  /** A screen recording to play on the device, scrubbed by the pinned scroll. */
  film?: { src: string; poster: string };
};

/**
 * Entrance, played once: chapters turn into place on their pedestal (the
 * device-specific moments — lid, power, fan — run inside each model); the
 * hero phone rises into frame. Waits inside Suspense, so it starts only once
 * the screens have loaded.
 */
function Appear({ children, enter, reduced, hero, dir }: { children: React.ReactNode; enter: boolean; reduced: boolean; hero: boolean; dir: number }) {
  const g = useRef<THREE.Group>(null);
  const clock = useRef({ start: -1 });
  useFrame(() => {
    const grp = g.current;
    if (!grp) return;
    let e = 1;
    if (!reduced) {
      if (enter && clock.current.start < 0) clock.current.start = now();
      e = clock.current.start < 0 ? 0 : easeOutQuart(span(now() - clock.current.start, 0, hero ? 1.8 : 1.6));
    }
    const k = 1 - e;
    if (hero) {
      grp.position.y = k * -3;
      grp.rotation.set(k * 0.25, k * -1.0, k * 0.12);
    } else {
      grp.rotation.set(0, k * -0.75 * dir, 0);
    }
    grp.scale.setScalar(0.9 + 0.1 * e);
  });
  const k = reduced ? 0 : 1;
  return (
    <group
      ref={g}
      position={[0, hero ? k * -3 : 0, 0]}
      rotation={hero ? [k * 0.25, k * -1.0, k * 0.12] : [0, k * -0.75 * dir, 0]}
      scale={reduced ? 1 : 0.9}
    >
      {children}
    </group>
  );
}

export default function DeviceScene({
  device,
  screens,
  index,
  glow,
  progress,
  pin,
  sweep = 0.45,
  enter = true,
  reduced = false,
  variant = "chapter",
  film,
}: Props) {
  const hero = variant === "hero";
  const dir = sweep < 0 ? -1 : 1;
  const sides = device === "phone" && !hero ? Math.min(2, Math.max(0, screens.length - 1)) : 0;
  // Rest pose faces a little toward the copy; the frame covers every yaw it can reach.
  const base = hero ? -0.26 : -dir * FACE[device];
  // The sticky stage is on screen for roughly progress 0.1..0.9, so the scroll
  // turn reaches ±0.4·sweep there; plus pointer (0.12) and idle (0.035).
  const amp = Math.abs(sweep) * 0.4 + (reduced ? 0.02 : 0.16);
  const floating = device === "phone" || device === "window";
  const shadowSize = 2 * plinthRadius(device, sides, FAN.max) + 0.1;
  const shadowFar = device === "phone" ? PHONE.lift + PHONE.h + 0.3 : device === "laptop" ? 2.4 : 3.1;

  const live = useRef<Live>(makeLive());
  const cam = useRef<THREE.PerspectiveCamera>(null);
  const stage = useRef<THREE.Group>(null);
  const turn = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Group>(null);
  const lights = useRef<THREE.Group>(null);
  const rimA = useRef<THREE.PointLight>(null);
  const rimB = useRef<THREE.PointLight>(null);
  const fit = useRef<{ aspect: number; f: Framing } | null>(null);
  const hooked = useRef(false);
  const tint = useMemo(() => [new THREE.Color(glow[0]), new THREE.Color(glow[1])], [glow]);

  useEffect(() => bindPointer(), []);

  useFrame((state, delta) => {
    const dt = sec(delta);
    const L = live.current;
    if (!hooked.current) {
      hooked.current = true;
      // Note when this view is actually drawn on screen (not into a shadow target).
      state.scene.onBeforeRender = (...args: unknown[]) => {
        if (!args[3]) L.seenAt = performance.now();
      };
    }
    const c = cam.current;
    if (!c) return;

    // Frame the composition to the view box. Only recomputed when the aspect changes.
    const aspect = c.aspect > 0 ? c.aspect : 1;
    if (!fit.current || Math.abs(fit.current.aspect - aspect) > 0.002) {
      const f = frame(device, hero, sides, dir, aspect, [base - amp, base, base + amp]);
      fit.current = { aspect, f };
      L.spread = f.spread;
      L.plinthR = f.plinthR;
      const se = Math.sin(f.elev);
      const ce = Math.cos(f.elev);
      c.position.set(f.tx, f.ty + f.dist * se, f.tz + f.dist * ce);
      c.lookAt(f.tx, f.ty, f.tz);
      c.far = f.dist * 3 + 10;
      c.updateProjectionMatrix();
      c.layers.enable(GLOW_LAYER);
      if (halo.current) {
        halo.current.position.set(f.tx, f.ty - f.haloBack * se, f.tz - f.haloBack * ce);
        halo.current.rotation.set(-f.elev + 0.32, 0.22 * dir, 0);
        halo.current.scale.setScalar(f.haloR);
      }
      const s = f.dist / 7;
      if (lights.current) {
        lights.current.position.set(f.tx, f.ty, f.tz);
        lights.current.scale.setScalar(s);
      }
      if (rimA.current) rimA.current.intensity = 46 * s * s;
      if (rimB.current) rimB.current.intensity = 32 * s * s;
    }

    // Inputs, each damped so the motion glides and never steps.
    L.px = THREE.MathUtils.damp(L.px, reduced ? 0 : pointer.x, 2.6, dt);
    L.py = THREE.MathUtils.damp(L.py, reduced ? 0 : pointer.y, 2.6, dt);
    const p = progress ? clamp01(progress.get()) : 0.5;
    L.progress = THREE.MathUtils.damp(L.progress, p, 4.5, dt);
    L.fan = reduced ? 1 : pin ? easeInOut(span(clamp01(pin.get()), 0.03, 0.36)) : 1;
    // Pinned-story progress (the film scrubs with it); the film glides on its own.
    L.pin = pin ? clamp01(pin.get()) : p;

    // Turntable: scroll turn + pointer + a slow idle sway (rotation only, no bob).
    const t = now();
    const idleYaw = reduced ? 0 : Math.sin((t / 9) * Math.PI * 2) * 0.035;
    const idlePitch = reduced ? 0 : Math.sin((t / 11) * Math.PI * 2 + 0.7) * 0.012;
    const idleRoll = reduced || !floating ? 0 : Math.sin((t / 10) * Math.PI * 2 + 1.9) * 0.012;
    const scroll = reduced ? 0 : (L.progress - 0.5) * sweep;
    if (turn.current) {
      turn.current.rotation.y = base + scroll + L.px * 0.12 + idleYaw;
      turn.current.rotation.z = idleRoll;
    }
    if (stage.current) stage.current.rotation.x = -L.py * 0.055 + idlePitch;

    const k = 1 - Math.exp(-3 * dt);
    rimA.current?.color.lerp(tint[0], k);
    rimB.current?.color.lerp(tint[1], k);
  });

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault fov={FOV} near={0.1} far={60} />
      <ambientLight intensity={0.12} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <group ref={lights}>
        <pointLight ref={rimA} color={glow[0]} position={[-3.4, 1.8, -1.6]} intensity={46} distance={16} />
        <pointLight ref={rimB} color={glow[1]} position={[3.6, -0.8, -1.2]} intensity={32} distance={16} />
      </group>
      <Environment resolution={256} frames={1}>
        {/* Top softbox and side strips: the titanium and aluminium edges pick these up */}
        <Lightformer intensity={2.2} position={[0, 5, 2]} scale={[10, 3, 1]} />
        <Lightformer intensity={1.4} position={[-6, 1.5, 1]} scale={[3, 10, 1]} />
        <Lightformer intensity={1} position={[6, 0.5, 2]} scale={[2.5, 9, 1]} />
        {/* Broad, dim studio wall behind: gives the pedestal top a soft horizon gradient */}
        <Lightformer intensity={0.32} position={[0, 2.5, -8]} scale={[16, 5, 1]} />
        {/* A long diagonal strip in front: the streak that slides across the glass as it turns */}
        <Lightformer intensity={1.8} position={[2.6, 1.8, 7]} scale={[0.9, 12, 1]} rotation={[0, 0, 0.55]} />
        {/* Brand light from behind */}
        <Lightformer intensity={2.6} color={glow[0]} position={[0, -3, -4]} scale={[9, 3, 1]} />
        <Lightformer intensity={1.6} color={glow[1]} position={[5, 3, -5]} scale={[4, 4, 1]} />
      </Environment>

      <group ref={halo}>
        <Halo color={glow[1]} opacity={hero ? 0.36 : 0.3} reduced={reduced} />
      </group>

      <group ref={stage}>
        {!hero && <Pedestal live={live} color={glow[0]} enter={enter} reduced={reduced} />}
        {!hero && <SoftShadow live={live} size={shadowSize} far={shadowFar} opacity={0.6} blur={2.5} />}
        <group ref={turn}>
          <Suspense fallback={null}>
            <Appear enter={enter} reduced={reduced} hero={hero} dir={dir}>
              {device === "phone" &&
                (hero ? (
                  <Phone screens={screens} index={index} />
                ) : (
                  <PhoneFan screens={screens} index={index} live={live} sideDir={dir} reduced={reduced} />
                ))}
              {device === "laptop" && (
                <Laptop
                  screens={screens}
                  index={index}
                  enter={enter}
                  reduced={reduced}
                  glow={glow[0]}
                  film={film ? ({ ...film, mode: "scrub", live } satisfies Film) : undefined}
                />
              )}
              {device === "tv" && <Television screens={screens} index={index} enter={enter} reduced={reduced} glow={glow[0]} />}
              {device === "window" && <AppWindow screens={screens} index={index} live={live} enter={enter} reduced={reduced} />}
            </Appear>
          </Suspense>
        </group>
      </group>
    </>
  );
}
