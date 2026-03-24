"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp, viewportConfig } from "@/lib/animations";
import { testimonials } from "@/lib/data";

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % testimonials.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, isPaused]);

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0, scale: 0.97 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0, scale: 0.97 }),
  };

  return (
    <section id="testimonials" className="section-padding bg-surface relative overflow-hidden">
      {/* Decorative background gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-br from-accent/[0.03] via-transparent to-accent/[0.02] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={fadeInUp}
          className="mb-10 md:mb-16"
        >
          <p className="text-sm uppercase tracking-widest text-text-muted mb-3">
            Testimonials
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary">
            Trusted by founders.
          </h2>
        </motion.div>

        <div
          className="relative min-h-[300px] sm:min-h-[320px]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute inset-0"
            >
              {/* Glassmorphism card */}
              <div className="relative backdrop-blur-xl bg-white/60 border border-white/80 rounded-3xl p-6 sm:p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
                {/* Large decorative quote */}
                <span className="absolute top-4 right-6 sm:top-6 sm:right-8 text-[80px] sm:text-[100px] leading-none font-serif text-accent/[0.07] select-none pointer-events-none">
                  &ldquo;
                </span>

                {/* Quote text */}
                <p className="text-text-primary text-lg sm:text-xl md:text-2xl leading-relaxed mb-8 relative z-10 max-w-3xl">
                  {testimonials[current].content}
                </p>

                {/* Author info - inline */}
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
                    <span className="text-accent font-semibold text-sm">
                      {testimonials[current].name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-text-primary font-semibold text-sm">
                      {testimonials[current].name}
                    </p>
                    <p className="text-text-muted text-xs">
                      {testimonials[current].role}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-8 relative z-10">
          <button
            onClick={prev}
            className="w-9 h-9 rounded-full border border-border/80 hover:border-accent/40 text-text-muted hover:text-accent transition-all duration-300 flex items-center justify-center cursor-pointer backdrop-blur-sm bg-white/40"
            aria-label="Previous testimonial"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex gap-1.5">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > current ? 1 : -1);
                  setCurrent(i);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === current
                    ? "bg-accent w-6"
                    : "bg-border/60 w-1.5 hover:bg-text-muted"
                }`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="w-9 h-9 rounded-full border border-border/80 hover:border-accent/40 text-text-muted hover:text-accent transition-all duration-300 flex items-center justify-center cursor-pointer backdrop-blur-sm bg-white/40"
            aria-label="Next testimonial"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
