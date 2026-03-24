"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Button from "@/components/ui/Button";
import Scene from "@/components/three/Scene";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

function useCharacterRipple(containerRef: React.RefObject<HTMLElement | null>) {
  const rafRef = useRef<number>(0);
  const spansRef = useRef<HTMLSpanElement[]>([]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const spans = spansRef.current;
      if (!spans.length) return;

      for (let i = 0; i < spans.length; i++) {
        const span = spans[i];
        const rect = span.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 150;

        if (dist < maxDist) {
          const strength = (1 - dist / maxDist) * 2;
          const yOffset = -strength * (dy > 0 ? 1 : -1);
          span.style.transform = `translateY(${yOffset}px)`;
          span.style.transition = "transform 0.15s ease-out";
        } else {
          span.style.transform = "translateY(0)";
          span.style.transition = "transform 0.4s ease-out";
        }
      }
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    const spans = spansRef.current;
    for (let i = 0; i < spans.length; i++) {
      spans[i].style.transform = "translateY(0)";
      spans[i].style.transition = "transform 0.6s ease-out";
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check for touch device
    if ("ontouchstart" in window) return;

    spansRef.current = Array.from(
      container.querySelectorAll<HTMLSpanElement>("[data-char]")
    );

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef, handleMouseMove, handleMouseLeave]);
}

function RippleText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {text.split("").map((char, i) =>
        char === " " ? (
          <span key={i}>&nbsp;</span>
        ) : (
          <span key={i} data-char className="inline-block will-change-transform">
            {char}
          </span>
        )
      )}
    </span>
  );
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useCharacterRipple(headlineRef);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const particleOpacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 1, 0]);
  const scrollIndicatorOpacity = useTransform(
    scrollYProgress,
    [0, 0.1],
    [1, 0]
  );

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100svh] flex items-center overflow-hidden noise-texture"
    >
      {/* Particle field with scroll-linked fadeout */}
      <motion.div className="absolute inset-0" style={{ opacity: particleOpacity }}>
        <Scene />
      </motion.div>

      {/* Radial gradient spotlight on text area */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_20%_50%,rgba(255,255,255,0.85)_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] z-[1] pointer-events-none" />

      {/* Ambient gradient orb */}
      <motion.div
        className="absolute w-[40vw] h-[40vw] rounded-full blur-[120px] pointer-events-none z-[1]"
        style={{ background: "rgba(15, 23, 42, 0.03)" }}
        animate={{
          x: ["-5%", "5%", "-5%"],
          y: ["-5%", "8%", "-5%"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        initial={{ top: "20%", left: "10%" }}
      />

      {/* Bottom gradient fade to surface for seamless transition */}
      <div className="absolute bottom-0 left-0 right-0 h-[150px] bg-gradient-to-b from-transparent to-surface z-[2] pointer-events-none" />

      {/* Content */}
      <div className="relative z-[5] px-6 sm:px-8 max-w-5xl mx-auto w-full text-center md:text-left">
        {/* Mono label */}
        <motion.p
          initial={{ opacity: 0, filter: "blur(6px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.5, delay: 0.2, ease }}
          className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-text-muted mb-6 md:mb-8"
        >
          Dani Zein / Full-Stack Developer
        </motion.p>

        {/* Headline with character ripple */}
        <div ref={headlineRef}>
          {/* Line 1 */}
          <motion.div
            initial={{ clipPath: "inset(100% 0 0 0)", y: 20 }}
            animate={{ clipPath: "inset(0% 0 0 0)", y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease }}
          >
            <h1 className="text-[clamp(2.2rem,6vw,5.5rem)] font-bold tracking-tight leading-[0.95] text-text-primary">
              <RippleText text="I build the platforms" />
            </h1>
          </motion.div>

          {/* Line 2 */}
          <motion.div
            initial={{ clipPath: "inset(100% 0 0 0)", y: 20 }}
            animate={{ clipPath: "inset(0% 0 0 0)", y: 0 }}
            transition={{ duration: 0.7, delay: 0.8, ease }}
          >
            <h1 className="text-[clamp(2.2rem,6vw,5.5rem)] font-bold tracking-tight leading-[0.95] text-text-secondary">
              <RippleText text="startups " />
              <span
                style={{
                  background: "linear-gradient(135deg, #111827, #2563EB)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >depend</span>
              <RippleText text=" on." />
            </h1>
          </motion.div>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1, ease }}
          className="mt-6 md:mt-8 text-base sm:text-lg text-text-muted max-w-xl leading-relaxed mx-auto md:mx-0"
        >
          Mobile apps, web platforms, payment systems. Zero to App Store.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.3, ease }}
          className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start"
        >
          <Button variant="primary" size="lg" href="#projects">
            View Projects
          </Button>
          <Button variant="outline" size="lg" href="#contact">
            Let&apos;s Talk
          </Button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[6]"
        style={{ opacity: scrollIndicatorOpacity }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        {isMobile ? (
          <motion.svg
            className="w-5 h-5 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 9l-7 7-7-7"
            />
          </motion.svg>
        ) : (
          <div className="w-px h-10 bg-border/40 relative overflow-hidden">
            <div className="w-full h-3 bg-text-muted/60 animate-scroll-line" />
          </div>
        )}
      </motion.div>
    </section>
  );
}
