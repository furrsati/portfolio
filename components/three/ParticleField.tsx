"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export default function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const { viewport } = useThree();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const count = isMobile ? 600 : 1200;

  const [positions, originalPositions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const origPos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const color1 = new THREE.Color("#334155");
    const color2 = new THREE.Color("#64748B");
    const warmColor = new THREE.Color("#D4A574");
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 4 + Math.random() * 5;

      pos[i3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = (Math.random() - 0.5) * 8;

      origPos[i3] = pos[i3];
      origPos[i3 + 1] = pos[i3 + 1];
      origPos[i3 + 2] = pos[i3 + 2];

      // 5% warm accent particles, concentrated in upper-right
      const isWarm = i % 20 === 0 && pos[i3] > 0 && pos[i3 + 1] > 0;

      if (isWarm) {
        const intensity = 0.4 + Math.random() * 0.4;
        col[i3] = warmColor.r * intensity;
        col[i3 + 1] = warmColor.g * intensity;
        col[i3 + 2] = warmColor.b * intensity;
      } else {
        const t = Math.random();
        tempColor.copy(color1).lerp(color2, t);
        const intensity = 0.3 + Math.random() * 0.5;
        col[i3] = tempColor.r * intensity;
        col[i3 + 1] = tempColor.g * intensity;
        col[i3 + 2] = tempColor.b * intensity;
      }

      siz[i] = 0.01 + Math.random() * 0.02;
    }
    return [pos, origPos, col, siz];
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const time = state.clock.elapsedTime;
    pointsRef.current.rotation.y = time * 0.03;
    pointsRef.current.rotation.x = Math.sin(time * 0.015) * 0.15;

    const pointer = state.pointer;
    mouseRef.current.x +=
      (pointer.x * viewport.width * 0.5 - mouseRef.current.x) * 0.03;
    mouseRef.current.y +=
      (pointer.y * viewport.height * 0.5 - mouseRef.current.y) * 0.03;

    pointsRef.current.position.x = mouseRef.current.x * 0.3;
    pointsRef.current.position.y = mouseRef.current.y * 0.3;

    // Cursor gravity well: attract every 3rd particle toward mouse
    const posArray = pointsRef.current.geometry.attributes.position
      .array as Float32Array;
    const gravityRadius = 2.0;
    const gravityStrength = 0.01;
    const springBack = 0.005;
    const mx = pointer.x * viewport.width * 0.5;
    const my = pointer.y * viewport.height * 0.5;

    for (let i = 0; i < count; i += 3) {
      const i3 = i * 3;
      const px = posArray[i3];
      const py = posArray[i3 + 1];

      const dx = mx - px;
      const dy = my - py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < gravityRadius && dist > 0.01) {
        const force = (1 - dist / gravityRadius) * gravityStrength;
        posArray[i3] += dx * force;
        posArray[i3 + 1] += dy * force;
      } else {
        posArray[i3] += (originalPositions[i3] - posArray[i3]) * springBack;
        posArray[i3 + 1] +=
          (originalPositions[i3 + 1] - posArray[i3 + 1]) * springBack;
        posArray[i3 + 2] +=
          (originalPositions[i3 + 2] - posArray[i3 + 2]) * springBack;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        vertexColors
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}
