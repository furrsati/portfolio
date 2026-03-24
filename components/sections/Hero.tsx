"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Scene from "@/components/three/Scene";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <Scene />

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/10 to-background z-[1]" />

      {/* Content */}
      <div className="relative z-10 px-6 sm:px-8 max-w-5xl mx-auto w-full">
        <motion.h1
          initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-text-primary leading-[0.95]"
        >
          Ship faster.
          <br />
          <span className="text-gradient">Ship complete.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-6 text-lg sm:text-xl text-text-secondary max-w-xl leading-relaxed"
        >
          I take startup ideas from zero to production. Mobile apps,
          <br className="hidden sm:block" />
          web platforms, payment systems, real-time features. All from one developer.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10"
        >
          <Button variant="primary" size="lg" href="#projects">
            View my projects
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
