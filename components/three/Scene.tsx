"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const Canvas = dynamic(
  () => import("@react-three/fiber").then((mod) => mod.Canvas),
  { ssr: false }
);

const ParticleField = dynamic(() => import("./ParticleField"), { ssr: false });

interface SceneProps {
  opacity?: number;
}

export default function Scene({ opacity = 1 }: SceneProps) {
  return (
    <div
      className="absolute inset-0 z-0 transition-opacity duration-300"
      style={{ opacity }}
    >
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
