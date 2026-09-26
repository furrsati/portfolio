"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";
import { PLINTH } from "./framing";
import { GLOW_LAYER, easeOutCubic, now, once, sec, span, type Live, LIGHT_BLEND } from "./kit";
import { glowShader, glowUniforms, mats, ringShader, ringUniforms } from "./materials";

/* ------------------------------------------------------------------ */
/* Pedestal: a thin dark metal disc with a rounded top edge, an LED    */
/* line round its side in the brand colour, and a soft light spill.   */
/* Built at unit radius and scaled to the fitted radius each frame.   */
/* ------------------------------------------------------------------ */
const T = PLINTH.t / 2; // unit-radius thickness; at r≈2 it is PLINTH.t

function plinthGeometry() {
  return once("g:plinth", () => {
    const pts: THREE.Vector2[] = [];
    const rc = 0.014;
    pts.push(new THREE.Vector2(1 - rc, 0));
    for (let i = 1; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      pts.push(new THREE.Vector2(1 - rc + Math.sin(a) * rc, -rc + Math.cos(a) * rc));
    }
    pts.push(new THREE.Vector2(1, -T + 0.006));
    pts.push(new THREE.Vector2(0.994, -T));
    pts.push(new THREE.Vector2(0.9, -T));
    // Lathe winds clockwise for a profile drawn outward; reverse so faces point out.
    const edge = new THREE.LatheGeometry(pts.reverse(), 160);
    const top = new THREE.CircleGeometry(1 - rc, 160).rotateX(-Math.PI / 2);
    // Left in its own XY plane: the draw-on shader measures angles there.
    const rim = new THREE.TorusGeometry(1.0015, 0.0036, 8, 220);
    const spill = new THREE.PlaneGeometry(3, 3).rotateX(-Math.PI / 2);
    return { edge, top, rim, spill };
  });
}

export function Pedestal({ live, color, enter, reduced }: { live: React.RefObject<Live>; color: string; enter: boolean; reduced: boolean }) {
  const g = plinthGeometry();
  const group = useRef<THREE.Group>(null);
  const rimMat = useRef<THREE.ShaderMaterial>(null);
  const bloomMat = useRef<THREE.ShaderMaterial>(null);
  const poolMat = useRef<THREE.ShaderMaterial>(null);
  const orbitMat = useRef<THREE.ShaderMaterial>(null);
  const clock = useRef({ start: -1 });
  const rimU = useMemo(() => ringUniforms(color, 2.2, reduced ? 1 : 0, 0), [color, reduced]);
  const bloomU = useMemo(() => glowUniforms(color, 0.3, 0.62, 0.667, 0.75), [color]);
  const poolU = useMemo(() => glowUniforms(color, 0.07, 0, 0, 0.95), [color]);
  const orbitU = useMemo(() => ringUniforms(color, 0.5, reduced ? 1 : 0, 0), [color, reduced]);

  useFrame(() => {
    const L = live.current;
    if (group.current && L) group.current.scale.setScalar(L.plinthR);
    // The LED line draws itself round the disc once, when the chapter enters.
    let d = 1;
    if (!reduced) {
      if (enter && clock.current.start < 0) clock.current.start = now();
      d = clock.current.start < 0 ? 0 : easeOutCubic(span(now() - clock.current.start, 0.15, 1.55));
    }
    if (rimMat.current) rimMat.current.uniforms.uDraw.value = d;
    if (bloomMat.current) bloomMat.current.uniforms.uOpacity.value = 0.3 * d;
    if (poolMat.current) poolMat.current.uniforms.uOpacity.value = 0.07 * d;
    if (orbitMat.current) orbitMat.current.uniforms.uDraw.value = reduced ? 1 : clock.current.start < 0 ? 0 : easeOutCubic(span(now() - clock.current.start, 0.45, 2.1));
  });

  return (
    <group ref={group}>
      <mesh geometry={g.top} material={mats.plinthTop()} />
      <mesh geometry={g.edge} material={mats.plinthEdge()} />
      <mesh geometry={g.rim} rotation-x={-Math.PI / 2} position-y={-T * 0.42} renderOrder={2} layers={GLOW_LAYER}>
        <shaderMaterial ref={rimMat} args={[ringShader]} uniforms={rimU} toneMapped={false} />
      </mesh>
      {/* A faint marking on the floor, a step out from the disc */}
      <mesh geometry={g.rim} rotation-x={-Math.PI / 2} position-y={-T} scale={1.15} renderOrder={2} layers={GLOW_LAYER}>
        <shaderMaterial ref={orbitMat} args={[ringShader]} uniforms={orbitU} transparent depthWrite={false} {...LIGHT_BLEND} toneMapped={false} />
      </mesh>
      {/* Soft light spilling from the LED line into the air round the rim */}
      <mesh geometry={g.spill} position={[0, -T * 0.42, 0]} renderOrder={3} layers={GLOW_LAYER}>
        <shaderMaterial
          ref={bloomMat}
          args={[glowShader]}
          uniforms={bloomU}
          transparent
          depthWrite={false}
          {...LIGHT_BLEND}
          toneMapped={false}
        />
      </mesh>
      {/* A faint pool of light under the disc */}
      <mesh geometry={g.spill} position={[0, -T - 0.002, 0]} scale={1.25} renderOrder={1} layers={GLOW_LAYER}>
        <shaderMaterial
          ref={poolMat}
          args={[glowShader]}
          uniforms={poolU}
          transparent
          depthWrite={false}
          {...LIGHT_BLEND}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Soft contact shadow. Same technique as drei's <ContactShadows>, but */
/* it only re-renders while its view is on screen (drei's renders all  */
/* seven scenes every frame), and it is masked to the pedestal disc.   */
/* Anything on GLOW_LAYER (rings, glows, glass) casts no shadow.       */
/* ------------------------------------------------------------------ */
const shadowFrag = /* glsl */ `
uniform sampler2D tMap;
uniform float uOpacity;
uniform float uRadius;
varying vec2 vUv;
void main() {
  vec4 s = texture2D(tMap, vec2(vUv.x, 1.0 - vUv.y));
  float r = length(vUv - 0.5) * 2.0;
  float m = 1.0 - smoothstep(uRadius - 0.05, uRadius, r);
  gl_FragColor = vec4(0.0, 0.0, 0.0, s.a * uOpacity * m);
}`;

type ShadowKit = {
  rt: THREE.WebGLRenderTarget;
  rtBlur: THREE.WebGLRenderTarget;
  depth: THREE.MeshDepthMaterial;
  quad: THREE.Mesh;
  quadCam: THREE.OrthographicCamera;
  hBlur: THREE.ShaderMaterial;
  vBlur: THREE.ShaderMaterial;
  frame: number;
};

function makeShadowKit(resolution: number): ShadowKit {
  const rt = new THREE.WebGLRenderTarget(resolution, resolution);
  const rtBlur = new THREE.WebGLRenderTarget(resolution, resolution);
  rt.texture.generateMipmaps = rtBlur.texture.generateMipmaps = false;
  const depth = new THREE.MeshDepthMaterial();
  depth.depthTest = depth.depthWrite = false;
  depth.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "vec4( vec3( 1.0 - fragCoordZ ), opacity );",
      "vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) );",
    );
  };
  const hBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
  const vBlur = new THREE.ShaderMaterial(VerticalBlurShader);
  hBlur.depthTest = vBlur.depthTest = false;
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), hBlur);
  quad.position.z = -0.5;
  quad.frustumCulled = false;
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return { rt, rtBlur, depth, quad, quadCam, hBlur, vBlur, frame: 0 };
}

export function SoftShadow({
  live,
  size,
  far,
  opacity = 0.6,
  blur = 2.5,
}: {
  live: React.RefObject<Live>;
  /** Side of the square the shadow covers (world units). */
  size: number;
  far: number;
  opacity?: number;
  blur?: number;
}) {
  const small = useThree((s) => s.size.width < 460);
  const resolution = small ? 256 : 512;
  const kit = useRef<ShadowKit | null>(null);
  const cam = useRef<THREE.OrthographicCamera>(null);
  const plane = useRef<THREE.Mesh>(null);
  const display = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ tMap: { value: null as THREE.Texture | null }, uOpacity: { value: opacity }, uRadius: { value: 1 } }), [opacity]);

  useEffect(() => {
    const k = kit;
    return () => {
      if (!k.current) return;
      k.current.rt.dispose();
      k.current.rtBlur.dispose();
      k.current.depth.dispose();
      k.current.hBlur.dispose();
      k.current.vBlur.dispose();
      k.current.quad.geometry.dispose();
      k.current = null;
    };
  }, [resolution]);

  useFrame((state) => {
    if (!kit.current) kit.current = makeShadowKit(resolution);
    const k = kit.current;
    const L = live.current;
    if (display.current) {
      display.current.uniforms.tMap.value = k.rt.texture;
      display.current.uniforms.uRadius.value = L ? Math.min(1, (L.plinthR * 2) / size) : 1;
    }
    // On screen: refresh every other frame (invisible at 60–120 Hz, halves the
    // depth + blur passes). Off screen: twice a second so it is never stale.
    const onScreen = L ? performance.now() - L.seenAt < 200 : true;
    k.frame++;
    if (onScreen ? k.frame % 2 !== 0 : k.frame % 30 !== 0) return;
    if (!cam.current || !plane.current) return;
    // Glows, rings and glass live on GLOW_LAYER, which the shadow camera does not see.
    const { gl, scene } = state;
    plane.current.visible = false;
    const bg = scene.background;
    const override = scene.overrideMaterial;
    scene.background = null;
    scene.overrideMaterial = k.depth;
    const prevTarget = gl.getRenderTarget();
    gl.setRenderTarget(k.rt);
    gl.clear();
    gl.render(scene, cam.current);
    scene.overrideMaterial = override;
    scene.background = bg;
    const pass = (amount: number) => {
      k.quad.material = k.hBlur;
      k.hBlur.uniforms.tDiffuse.value = k.rt.texture;
      k.hBlur.uniforms.h.value = amount / 256;
      gl.setRenderTarget(k.rtBlur);
      gl.render(k.quad, k.quadCam);
      k.quad.material = k.vBlur;
      k.vBlur.uniforms.tDiffuse.value = k.rtBlur.texture;
      k.vBlur.uniforms.v.value = amount / 256;
      gl.setRenderTarget(k.rt);
      gl.render(k.quad, k.quadCam);
    };
    pass(blur);
    pass(blur * 0.4);
    gl.setRenderTarget(prevTarget);
    plane.current.visible = true;
  });

  return (
    <group position={[0, 0.002, 0]}>
      <mesh ref={plane} rotation-x={-Math.PI / 2} renderOrder={4}>
        <planeGeometry args={[size, size]} />
        <shaderMaterial
          ref={display}
          vertexShader={glowShader.vertexShader}
          fragmentShader={shadowFrag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
      <orthographicCamera ref={cam} args={[-size / 2, size / 2, size / 2, -size / 2, 0, far]} rotation-x={Math.PI / 2} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Halo: one large, very faint ring behind the device, turning slowly. */
/* ------------------------------------------------------------------ */
export function haloGeometry() {
  return once("g:halo", () => new THREE.TorusGeometry(1, 0.0022, 6, 320));
}

export function Halo({ color, opacity = 0.32, reduced }: { color: string; opacity?: number; reduced: boolean }) {
  const spin = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  // Created once: later colours are blended in by the frame loop, not swapped.
  const [uniforms] = useState(() => ringUniforms(color, opacity, 1, 2.2));
  const target = useMemo(() => new THREE.Color(color), [color]);
  useFrame((_, delta) => {
    const dt = sec(delta);
    if (spin.current && !reduced) spin.current.rotation.z -= dt * 0.11;
    // Colour glides when the hero switches project instead of snapping.
    if (mat.current) mat.current.uniforms.uColor.value.lerp(target, 1 - Math.exp(-3 * dt));
  });
  return (
    <mesh ref={spin} geometry={haloGeometry()} rotation-z={1.2} renderOrder={0} layers={GLOW_LAYER}>
      <shaderMaterial ref={mat} args={[ringShader]} uniforms={uniforms} transparent depthWrite={false} {...LIGHT_BLEND} toneMapped={false} />
    </mesh>
  );
}
