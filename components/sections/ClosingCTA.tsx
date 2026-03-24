"use client";

import { motion } from "framer-motion";
import { fadeInUp, viewportConfig } from "@/lib/animations";

export default function ClosingCTA() {
  return (
    <section className="py-24 sm:py-32 bg-accent text-white text-center px-6">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        variants={fadeInUp}
        className="max-w-2xl mx-auto"
      >
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Ready to ship your next product?
        </h2>
        <p className="text-white/70 text-lg mb-10">
          From idea to App Store. Let&apos;s make it happen.
        </p>
        <a
          href="#contact"
          className="inline-flex items-center justify-center px-8 py-4 bg-white text-accent font-semibold rounded-lg hover:bg-white/90 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
        >
          Start a conversation
        </a>
      </motion.div>
    </section>
  );
}
