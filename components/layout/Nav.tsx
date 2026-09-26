"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";

const link =
  "hidden h-11 items-center rounded-full px-4 text-text-2 transition-colors hover:text-text active:bg-white/[0.06] active:text-text [-webkit-tap-highlight-color:transparent]";

export default function Nav({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setSolid(y > 40));

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      // Clear of the notch / Dynamic Island and the landscape sensor housing.
      className="fixed inset-x-0 top-0 z-50 flex justify-center pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))]"
    >
      <nav
        aria-label="Main"
        className={`flex h-14 w-full max-w-[1500px] items-center justify-between rounded-full pl-3 pr-1.5 transition-[background,border-color,backdrop-filter] duration-500 ${
          solid ? "border border-line bg-black/55 backdrop-blur-xl" : "border border-transparent"
        }`}
      >
        <a
          href="#top"
          className="inline-flex h-11 items-center rounded-full px-2 text-[16px] font-semibold tracking-[-0.01em] [-webkit-tap-highlight-color:transparent]"
        >
          Dani Zein
        </a>
        <div className="flex items-center gap-1 text-[14px]">
          <a href="#work" className={`${link} sm:inline-flex`}>
            Work
          </a>
          <a href="#skills" className={`${link} sm:inline-flex`}>
            What I do
          </a>
          <a href="#process" className={`${link} lg:inline-flex`}>
            How I work
          </a>
          <button
            type="button"
            onClick={onOpenPalette}
            aria-haspopup="dialog"
            className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3.5 text-[15px] text-text-2 transition-colors hover:text-text active:bg-white/[0.06] active:text-text [-webkit-tap-highlight-color:transparent] md:pointer-fine:text-[14px]"
            aria-label="Open menu and search"
          >
            {/* The shortcut only means something with a keyboard and a mouse; touch screens get "Menu". */}
            <kbd className="hidden rounded-md border border-line-strong px-1.5 py-0.5 font-sans text-[12px] md:pointer-fine:inline">⌘K</kbd>
            <span className="md:pointer-fine:hidden">Menu</span>
          </button>
          <a
            href="#contact"
            className="ml-1 inline-flex h-11 items-center rounded-full bg-text px-5 text-[15px] font-medium text-black transition-transform hover:scale-[1.03] active:scale-[0.97] [-webkit-tap-highlight-color:transparent] sm:px-4 sm:text-[14px]"
          >
            <span className="sm:hidden">Contact</span>
            <span className="hidden sm:inline">Start a project</span>
          </a>
        </div>
      </nav>
    </motion.header>
  );
}
