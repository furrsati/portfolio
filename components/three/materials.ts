import * as THREE from "three";
import { once, LIGHT_BLEND } from "./kit";

/**
 * Shared, colour-neutral materials. Created lazily on the client and reused by
 * every view (programs and uniforms are shared, so seven scenes cost the same
 * as one). Anything tinted by a project's brand colour lives in the component.
 */
export const mats = {
  /** Natural titanium: bright enough to read on black, bevels catch the light formers. */
  titanium: () =>
    once("m:titanium", () => new THREE.MeshPhysicalMaterial({ color: "#9a9ca3", metalness: 1, roughness: 0.26, envMapIntensity: 1.25 })),
  /** Front glass around the display. */
  blackGlass: () =>
    once(
      "m:blackGlass",
      () => new THREE.MeshPhysicalMaterial({ color: "#040405", metalness: 0.2, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06 }),
    ),
  /** Frosted back glass of the phone. */
  backGlass: () =>
    once(
      "m:backGlass",
      () =>
        new THREE.MeshPhysicalMaterial({
          color: "#3a3c43",
          metalness: 0.35,
          roughness: 0.5,
          clearcoat: 0.7,
          clearcoatRoughness: 0.32,
          envMapIntensity: 1.1,
        }),
    ),
  /** Camera lens glass with a coated, iridescent sheen. */
  lens: () =>
    once(
      "m:lens",
      () =>
        new THREE.MeshPhysicalMaterial({
          color: "#05060a",
          metalness: 0.6,
          roughness: 0.08,
          clearcoat: 1,
          clearcoatRoughness: 0.02,
          iridescence: 0.9,
          iridescenceIOR: 1.6,
          envMapIntensity: 1.6,
        }),
    ),
  flash: () => once("m:flash", () => new THREE.MeshStandardMaterial({ color: "#e9dcc0", roughness: 0.35, metalness: 0, emissive: "#3a3222" })),
  /** Space-grey aluminium for laptop and stand. */
  aluminium: () =>
    once("m:aluminium", () => new THREE.MeshPhysicalMaterial({ color: "#6d7078", metalness: 1, roughness: 0.34, envMapIntensity: 1.2 })),
  aluminiumDark: () =>
    once("m:aluminiumDark", () => new THREE.MeshPhysicalMaterial({ color: "#3b3d43", metalness: 1, roughness: 0.4, envMapIntensity: 1.1 })),
  /** Satin graphite for the TV frame. */
  graphite: () =>
    once("m:graphite", () => new THREE.MeshPhysicalMaterial({ color: "#2a2b30", metalness: 0.9, roughness: 0.3, clearcoat: 0.5, envMapIntensity: 1.2 })),
  keycap: () => once("m:keycap", () => new THREE.MeshStandardMaterial({ color: "#0d0d10", metalness: 0.25, roughness: 0.55, envMapIntensity: 0.9 })),
  well: () => once("m:well", () => new THREE.MeshStandardMaterial({ color: "#0a0a0c", metalness: 0.3, roughness: 0.7 })),
  trackpad: () =>
    once(
      "m:trackpad",
      () => new THREE.MeshPhysicalMaterial({ color: "#5d6068", metalness: 0.85, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1 }),
    ),
  black: () => once("m:black", () => new THREE.MeshBasicMaterial({ color: "#000000" })),
  island: () =>
    once("m:island", () => new THREE.MeshPhysicalMaterial({ color: "#000000", metalness: 0, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 })),
  /**
   * Reflections only: a black, near-mirror dielectric drawn additively over
   * the display, so the light formers slide across the glass as it turns.
   */
  sheen: () =>
    once(
      "m:sheen",
      () =>
        new THREE.MeshPhysicalMaterial({
          color: "#000000",
          metalness: 0,
          roughness: 0.1,
          ior: 1.65,
          envMapIntensity: 1,
          transparent: true,
          depthWrite: false,
          ...LIGHT_BLEND,
        }),
    ),
  /** Same glass for big, bright displays: weaker, so reflections never wash the picture out. */
  sheenSoft: () =>
    once(
      "m:sheenSoft",
      () =>
        new THREE.MeshPhysicalMaterial({
          color: "#000000",
          metalness: 0,
          roughness: 0.12,
          ior: 1.5,
          // A faint reflection only: enough to read as glass, never enough to wash out the screen.
          envMapIntensity: 0.16,
          transparent: true,
          depthWrite: false,
          ...LIGHT_BLEND,
        }),
    ),
  /** Pedestal: polished dark metal edge, satin top so the contact shadow reads. */
  plinthEdge: () =>
    once("m:plinthEdge", () => new THREE.MeshPhysicalMaterial({ color: "#26272c", metalness: 1, roughness: 0.2, envMapIntensity: 1.3 })),
  plinthTop: () =>
    once(
      "m:plinthTop",
      () =>
        new THREE.MeshPhysicalMaterial({
          color: "#2a2b31",
          metalness: 0.7,
          roughness: 0.4,
          clearcoat: 1,
          clearcoatRoughness: 0.22,
          envMapIntensity: 1.2,
        }),
    ),
  /** Warm light glass edge of the HQ app window. */
  windowEdge: () =>
    once(
      "m:windowEdge",
      () =>
        new THREE.MeshPhysicalMaterial({
          color: "#d8d2c8",
          metalness: 0.1,
          roughness: 0.18,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
          envMapIntensity: 1.2,
        }),
    ),
};

/* ------------------------------------------------------------------ */
/* Shaders                                                            */
/* ------------------------------------------------------------------ */
const uvVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const glowFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uInner;
uniform float uPeak;
uniform float uOuter;
uniform vec2 uCenter;
varying vec2 vUv;
void main() {
  float r = length((vUv - uCenter) * 2.0);
  float rise = uPeak > uInner + 0.0001 ? smoothstep(uInner, uPeak, r) : 1.0;
  float a = rise * (1.0 - smoothstep(uPeak, uOuter, r));
  gl_FragColor = vec4(uColor * a * a * uOpacity, 1.0);
  #include <colorspace_fragment>
}`;

/**
 * Additive radial glow on a plane. Alpha rises from `inner` to `peak` then
 * falls to zero at `outer` (radii in plane-half units, 1 = edge).
 */
export function glowUniforms(color: string, opacity: number, inner: number, peak: number, outer: number, center: [number, number] = [0.5, 0.5]) {
  return {
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
    uInner: { value: inner },
    uPeak: { value: peak },
    uOuter: { value: outer },
    uCenter: { value: new THREE.Vector2(center[0], center[1]) },
  };
}
export const glowShader = { vertexShader: uvVert, fragmentShader: glowFrag };

const ringVert = /* glsl */ `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/**
 * Thin torus shader. `uDraw` reveals the ring symmetrically from its front
 * (local -y) round to the back; `uTail` > 0 turns it into a comet gradient
 * so a slow rotation is visible.
 */
const ringFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uDraw;
uniform float uTail;
varying vec3 vPos;
void main() {
  float d = abs(atan(vPos.x, -vPos.y)) / 3.14159265;
  if (d > uDraw) discard;
  float head = 1.0 - smoothstep(uDraw - 0.03, uDraw, d);
  float ang = atan(vPos.y, vPos.x) / 6.2831853 + 0.5;
  float comet = uTail > 0.0 ? mix(0.08, 1.0, pow(ang, uTail)) : 1.0;
  gl_FragColor = vec4(uColor * uOpacity * comet * max(head, step(0.999, uDraw)), 1.0);
  #include <colorspace_fragment>
}`;

export function ringUniforms(color: string, opacity: number, draw: number, tail: number) {
  return {
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
    uDraw: { value: draw },
    uTail: { value: tail },
  };
}
export const ringShader = { vertexShader: ringVert, fragmentShader: ringFrag };
