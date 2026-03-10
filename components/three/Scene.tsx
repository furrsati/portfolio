"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const Canvas = dynamic(
  () => import("@react-three/fiber").then((mod) => mod.Canvas),
  { ssr: false }
);

const ParticleField = dynamic(() => import("./ParticleField"), { ssr: false });

export default function Scene() {
  return (
    <div className="absolute inset-0 z-0">
      <Suspense fallback={<div className="absolute inset-0 bg-background" />}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 75 }}
          dpr={[1, 2]}
          performance={{ min: 0.5 }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.5} />
          <ParticleField />
        </Canvas>
      </Suspense>
    </div>
  );
}
