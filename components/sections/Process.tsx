"use client";

import { ArrowRight, Briefcase } from "lucide-react";
import Chooser from "./process/Chooser";
import Journey from "./process/Journey";

/**
 * How I work: a pinned, scroll-driven walk through the four steps (with a
 * live picture of each on a glass stage), then a chooser for the kind of
 * project, then a short note for people hiring.
 */
export default function Process() {
  return (
    <section id="process" aria-labelledby="process-title" className="relative flow-root pb-28 lg:pb-40">
      <Journey />

      <div className="mt-28 lg:mt-24">
        <Chooser />
      </div>

      <div className="mx-auto mt-16 max-w-[1500px] px-5 md:px-10 lg:mt-20 lg:px-12 2xl:px-16">
        <div className="flex flex-col gap-5 rounded-[24px] border border-line bg-white/[0.02] p-5 md:flex-row md:items-center md:gap-8 md:px-7 md:py-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.06] text-text ring-1 ring-white/10">
            <Briefcase className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-medium tracking-[-0.01em] text-text">Hiring for your team?</h3>
            <p className="mt-1 max-w-[70ch] text-[15px] leading-[1.55] text-text-2">
              Every chapter above lists the hard problems and the stack behind them. Send a note with the role and I’ll walk you through any of it.
            </p>
          </div>
          <a
            href="#contact"
            className="group/note inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-full border border-line-strong px-5 text-[15px] text-text transition-colors duration-300 hover:bg-white/[0.06] md:self-center"
          >
            Send a note
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/note:translate-x-0.5" strokeWidth={1.9} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
