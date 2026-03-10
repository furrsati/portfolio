"use client";

import { motion } from "framer-motion";
import { staggerContainer, viewportConfig } from "@/lib/animations";
import { stats } from "@/lib/data";
import StatCounter from "@/components/ui/StatCounter";

export default function Stats() {
  return (
    <section id="stats" className="section-padding bg-background relative overflow-hidden">
      {/* Subtle accent gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportConfig}
          variants={staggerContainer}
          className="grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {stats.map((stat) => (
            <StatCounter
              key={stat.label}
              value={stat.value}
              label={stat.label}
              suffix={stat.suffix}
              icon={stat.icon}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
