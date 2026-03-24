"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export default function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const { viewport } = useThree();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const count = isMobile ? 600 : 1200;
  const connectionCount = isMobile ? 0 : 400;
  const maxConnections = 150;
  const connectionDistance = 1.8;

  const [positions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const color1 = new THREE.Color("#334155");
    const color2 = new THREE.Color("#64748B");
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 4 + Math.random() * 5;

      pos[i3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = (Math.random() - 0.5) * 8;

      const t = Math.random();
      tempColor.copy(color1).lerp(color2, t);
      const intensity = 0.3 + Math.random() * 0.5;
      col[i3] = tempColor.r * intensity;
      col[i3 + 1] = tempColor.g * intensity;
      col[i3 + 2] = tempColor.b * intensity;

      siz[i] = 0.02 + Math.random() * 0.04;
    }
    return [pos, col, siz];
  }, [count]);

  const linePositions = useMemo(() => {
    return new Float32Array(maxConnections * 6);
  }, []);

  const lineColors = useMemo(() => {
    return new Float32Array(maxConnections * 6);
  }, []);

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

    // Update connection lines
    if (linesRef.current && connectionCount > 0) {
      linesRef.current.position.copy(pointsRef.current.position);
      linesRef.current.rotation.copy(pointsRef.current.rotation);

      const posAttr = pointsRef.current.geometry.attributes.position;
      let lineIdx = 0;

      for (let i = 0; i < connectionCount && lineIdx < maxConnections; i++) {
        const ix = posAttr.getX(i);
        const iy = posAttr.getY(i);
        const iz = posAttr.getZ(i);

        for (
          let j = i + 1;
          j < connectionCount && lineIdx < maxConnections;
          j++
        ) {
          const jx = posAttr.getX(j);
          const jy = posAttr.getY(j);
          const jz = posAttr.getZ(j);

          const dx = ix - jx;
          const dy = iy - jy;
          const dz = iz - jz;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < connectionDistance) {
            const idx = lineIdx * 6;
            linePositions[idx] = ix;
            linePositions[idx + 1] = iy;
            linePositions[idx + 2] = iz;
            linePositions[idx + 3] = jx;
            linePositions[idx + 4] = jy;
            linePositions[idx + 5] = jz;

            const alpha = 1 - dist / connectionDistance;
            lineColors[idx] = 0.2 * alpha;
            lineColors[idx + 1] = 0.25 * alpha;
            lineColors[idx + 2] = 0.33 * alpha;
            lineColors[idx + 3] = 0.39 * alpha;
            lineColors[idx + 4] = 0.45 * alpha;
            lineColors[idx + 5] = 0.55 * alpha;

            lineIdx++;
          }
        }
      }

      const lineGeom = linesRef.current.geometry;
      lineGeom.attributes.position.needsUpdate = true;
      lineGeom.attributes.color.needsUpdate = true;
      lineGeom.setDrawRange(0, lineIdx * 2);
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          vertexColors
          transparent
          opacity={0.4}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>

      {connectionCount > 0 && (
        <lineSegments ref={linesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[linePositions, 3]}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[lineColors, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={0.08}
            depthWrite={false}
            blending={THREE.NormalBlending}
          />
        </lineSegments>
      )}
    </group>
  );
}
