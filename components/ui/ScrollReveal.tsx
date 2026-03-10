"use client";

import { motion, type Variants } from "framer-motion";
import { fadeInUp, viewportConfig } from "@/lib/animations";
import type { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  variants?: Variants;
  className?: string;
  delay?: number;
}

export default function ScrollReveal({
  children,
  variants = fadeInUp,
  className,
  delay = 0,
}: ScrollRevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportConfig}
      variants={variants}
      className={className}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
