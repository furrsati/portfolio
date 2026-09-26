"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";

export default function Nav({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setSolid(y > 40));

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <nav
        aria-label="Main"
        className={`flex h-14 w-full max-w-[1500px] items-center justify-between rounded-full px-3 pl-5 transition-[background,border-color,backdrop-filter] duration-500 ${
          solid ? "border border-line bg-black/55 backdrop-blur-xl" : "border border-transparent"
        }`}
      >
        <a href="#top" className="text-[16px] font-semibold tracking-[-0.01em]">
          Dani Zein
        </a>
        <div className="flex items-center gap-1 text-[14px]">
          <a href="#work" className="hidden rounded-full px-4 py-2 text-text-2 transition-colors hover:text-text sm:block">
            Work
          </a>
          <a href="#skills" className="hidden rounded-full px-4 py-2 text-text-2 transition-colors hover:text-text sm:block">
            What I do
          </a>
          <a href="#process" className="hidden rounded-full px-4 py-2 text-text-2 transition-colors hover:text-text lg:block">
            How I work
          </a>
          <button
            type="button"
            onClick={onOpenPalette}
            className="flex h-10 items-center gap-2 rounded-full px-3 text-text-2 transition-colors hover:text-text"
            aria-label="Open menu and search"
          >
            <kbd className="hidden rounded-md border border-line-strong px-1.5 py-0.5 font-sans text-[12px] md:inline">⌘K</kbd>
            <span className="md:hidden">Menu</span>
          </button>
          <a href="#contact" className="ml-1 inline-flex h-10 items-center rounded-full bg-text px-4 font-medium text-black transition-transform hover:scale-[1.03]">
            <span className="sm:hidden">Contact</span>
            <span className="hidden sm:inline">Start a project</span>
          </a>
        </div>
      </nav>
    </motion.header>
  );
}
