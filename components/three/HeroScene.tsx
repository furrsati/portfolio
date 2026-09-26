"use client";

import { Environment, Lightformer, PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { Laptop, Phone } from "./devices";
import { FOV, PHONE } from "./framing";
import { bindPointer, easeInOut, easeOutQuart, makeLive, now, pointer, sec, span, type Live } from "./kit";
import { Halo, Pedestal, SoftShadow } from "./Stagecraft";

/**
 * The hero: a product line-up on one lit pedestal. The Proof of Talk laptop
 * stands in the middle; Furrsati and Collabfront phones stand at the front
 * corners, turned toward it. Entrance, once: the pedestal's LED line draws,
 * the laptop rises and opens its lid, then each phone glides in from its
 * side. After that the stage turns very slowly and leans with the pointer.
 */

const R = 2.75; // pedestal radius
const PHONE_Y = PHONE.lift + PHONE.h / 2;

type Pose = { pos: [number, number, number]; yaw: number; scale: number };
const LAPTOP_POSE: Pose = { pos: [0, 0, -0.35], yaw: 0, scale: 1.05 };
const LEFT_POSE: Pose = { pos: [-2.05, PHONE_Y, 0.95], yaw: 0.5, scale: 1 };
const RIGHT_POSE: Pose = { pos: [2.05, PHONE_Y, 0.95], yaw: -0.5, scale: 1 };

/**
 * Moves a piece from an offset start pose into its rest pose between
 * `delay` and `delay + dur` seconds after `start`, once.
 */
function Enter({
  pose,
  from,
  delay,
  dur,
  start,
  reduced,
  children,
}: {
  pose: Pose;
  from: { dx?: number; dy?: number; dz?: number; yaw?: number; scale?: number };
  delay: number;
  dur: number;
  start: number;
  reduced: boolean;
  children: React.ReactNode;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const grp = g.current;
    if (!grp) return;
    const e = reduced || start < 0 ? (reduced ? 1 : 0) : easeOutQuart(span(now() - start, delay, delay + dur));
    const k = 1 - e;
    grp.position.set(pose.pos[0] + k * (from.dx ?? 0), pose.pos[1] + k * (from.dy ?? 0), pose.pos[2] + k * (from.dz ?? 0));
    grp.rotation.set(0, pose.yaw + k * (from.yaw ?? 0), 0);
    grp.scale.setScalar(pose.scale * (1 - k * (1 - (from.scale ?? 1))));
    grp.visible = e > 0.001;
  });
  return (
    <group ref={g} visible={false}>
      {children}
    </group>
  );
}

/** Cycles 0..n-1 on its own timer, offset per device so they never change together. */
function useCycle(n: number, ms: number, offset: number, run: boolean) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!run || n < 2) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const t = setTimeout(() => {
      setI((v) => (v + 1) % n);
      id = setInterval(() => setI((v) => (v + 1) % n), ms);
    }, offset);
    return () => {
      clearTimeout(t);
      if (id) clearInterval(id);
    };
  }, [n, ms, offset, run]);
  return i;
}

const FURRSATI = ["/work/furrsati-2.jpg", "/work/furrsati-1.jpg", "/work/furrsati-3.jpg", "/work/furrsati-4.jpg"];
const COLLAB = ["/work/collabfront-1.jpg", "/work/collabfront-3.jpg", "/work/collabfront-2.jpg"];
const POT = ["/work/pot-film-poster.jpg", "/work/pot-ad.jpg"];

function Stage({ reduced, active }: { reduced: boolean; active: boolean }) {
  const live = useRef<Live>(makeLive());
  const turn = useRef<THREE.Group>(null);
  const [start, setStart] = useState(-1);
  const [lidOpen, setLidOpen] = useState(reduced);
  const sway = useRef(0);

  // Mounted inside Suspense: this runs once every texture has loaded.
  useEffect(() => {
    const t0 = setTimeout(() => setStart(now()), 60);
    const t1 = setTimeout(() => setLidOpen(true), reduced ? 0 : 700);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
    };
  }, [reduced]);

  const iL = useCycle(FURRSATI.length, 4200, 2600, !reduced && active);
  const iR = useCycle(COLLAB.length, 4200, 4000, !reduced && active);
  const iT = useCycle(POT.length, 5600, 5200, !reduced && active);

  useFrame((_, delta) => {
    const dt = sec(delta);
    const L = live.current;
    L.plinthR = R;
    if (active) L.seenAt = performance.now();
    L.px = THREE.MathUtils.damp(L.px, reduced ? 0 : pointer.x, 4, dt);
    L.py = THREE.MathUtils.damp(L.py, reduced ? 0 : pointer.y, 4, dt);
    if (!reduced && active) sway.current += dt;
    const settle = start < 0 ? 0 : easeInOut(span(now() - start, 0, 2.4));
    // A slow turntable sway once everything has arrived, plus a lean toward the pointer.
    const idle = Math.sin(sway.current * 0.32) * 0.05 * settle;
    if (turn.current) {
      turn.current.rotation.y = idle + L.px * 0.1 + (1 - settle) * -0.35;
      turn.current.rotation.x = -L.py * 0.04;
    }
  });

  return (
    <group ref={turn}>
      <Pedestal live={live} color="#FAA21B" enter={start >= 0} reduced={reduced} />
      <SoftShadow live={live} size={2 * R + 0.2} far={3} opacity={0.62} blur={2.5} />
      <Enter pose={LAPTOP_POSE} from={{ dy: -1.6, scale: 0.9 }} delay={0.15} dur={1.2} start={start} reduced={reduced}>
        <Laptop
          screens={POT}
          index={iT}
          enter={lidOpen}
          reduced={reduced}
          glow="#DCB877"
          film={reduced ? undefined : { src: "/work/pot-film.mp4", poster: "/work/pot-film-poster.jpg", mode: "loop", rate: 2, active }}
        />
      </Enter>
      <Enter pose={LEFT_POSE} from={{ dx: -2.4, dz: 0.6, yaw: 0.9, scale: 0.92 }} delay={0.85} dur={1.25} start={start} reduced={reduced}>
        <Phone screens={FURRSATI} index={iL} />
      </Enter>
      <Enter pose={RIGHT_POSE} from={{ dx: 2.4, dz: 0.6, yaw: -0.9, scale: 0.92 }} delay={1.05} dur={1.25} start={start} reduced={reduced}>
        <Phone screens={COLLAB} index={iR} />
      </Enter>
    </group>
  );
}

/** Phones and tablets (below the desktop two-column layout). */
const COMPACT = "(max-width: 1023px)";
function subscribeCompact(cb: () => void) {
  const m = window.matchMedia(COMPACT);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
const isCompact = () => window.matchMedia(COMPACT).matches;

export default function HeroScene({ reduced = false, active = true }: { reduced?: boolean; active?: boolean }) {
  const cam = useRef<THREE.PerspectiveCamera>(null);
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(1, size.height);
  const compact = useSyncExternalStore(subscribeCompact, isCompact, () => false);

  useEffect(() => bindPointer(), []);

  // Seen from a little above so the pedestal reads as a stage; fitted to the view.
  const { pos, target } = useMemo(() => {
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    // Room for the phones as the stage turns and leans with the mouse. Touch
    // screens never lean, and on a phone every pixel of width counts, so the
    // compact layouts frame the pedestal tighter.
    const w = 2 * R + (compact ? 1.2 : 1.7);
    const h = 3.3;
    const dist = Math.max(h / 2 / t, w / 2 / (t * aspect)) * 1.04;
    const elev = 0.22;
    // Compact views are width-bound with height to spare: aim a little lower so
    // the line-up sits in the middle of its box instead of low in it.
    const tgt = new THREE.Vector3(0, compact ? 0.6 : 1.05, 0);
    return { pos: new THREE.Vector3(0, tgt.y + Math.sin(elev) * dist, Math.cos(elev) * dist), target: tgt };
  }, [aspect, compact]);

  useFrame(() => {
    cam.current?.lookAt(target);
  });

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault fov={FOV} position={pos} near={0.1} far={80} />
      <ambientLight intensity={0.12} />
      <directionalLight position={[3, 6, 5]} intensity={1.1} />
      <pointLight color="#FAA21B" position={[-4.4, 1.8, -1.4]} intensity={70} distance={20} />
      <pointLight color="#5656FF" position={[4.6, 1.2, -1]} intensity={60} distance={20} />
      <pointLight color="#DCB877" position={[0, 3.4, -3.2]} intensity={34} distance={16} />
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2.2} position={[0, 5, 2]} scale={[10, 3, 1]} />
        <Lightformer intensity={1.4} position={[-6, 1.5, 1]} scale={[3, 10, 1]} />
        <Lightformer intensity={1} position={[6, 0.5, 2]} scale={[2.5, 9, 1]} />
        <Lightformer intensity={0.32} position={[0, 2.5, -8]} scale={[16, 5, 1]} />
        <Lightformer intensity={1.8} position={[2.6, 1.8, 7]} scale={[0.9, 12, 1]} rotation={[0, 0, 0.55]} />
        <Lightformer intensity={2.4} color="#FAA21B" position={[-3, -3, -4]} scale={[7, 3, 1]} />
        <Lightformer intensity={2} color="#5656FF" position={[4, 2, -5]} scale={[5, 4, 1]} />
      </Environment>

      <group position={[0, 1.35, -2.6]} scale={2.55}>
        <Halo color="#DCB877" opacity={0.28} reduced={reduced} />
      </group>

      <Suspense fallback={null}>
        <Stage reduced={reduced} active={active} />
      </Suspense>
    </>
  );
}
