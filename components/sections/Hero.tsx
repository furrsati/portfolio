"use client";

import { View } from "@react-three/drei";
import { useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { Bot, Languages, Smartphone, Wallet } from "lucide-react";
import HeroScene from "@/components/three/HeroScene";
import ProjectLogo from "@/components/ui/ProjectLogo";
import { projects } from "@/lib/content/projects";
import LiveName from "./LiveName";

const strengths = [
  { icon: Wallet, label: "Marketplaces and payments" },
  { icon: Bot, label: "AI systems and agents" },
  { icon: Languages, label: "Arabic-first apps" },
  { icon: Smartphone, label: "iOS, Android and web" },
];

export default function Hero({ onOpenPalette }: { onOpenPalette: () => void }) {
  const reduced = useReducedMotion() ?? false;
  const live = projects.filter((p) => p.status === "Live").length;
  const section = useRef<HTMLElement>(null);
  const onScreen = useInView(section);

  return (
    <section ref={section} id="top" aria-labelledby="hero-name" className="relative flex min-h-[100svh] items-center overflow-hidden px-5 pb-12 pt-24 md:px-10 lg:px-16 lg:pb-16 lg:pt-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(42% 50% at 70% 46%, rgba(250,162,27,.16), transparent 70%), radial-gradient(34% 40% at 88% 70%, rgba(86,86,255,.14), transparent 70%), radial-gradient(30% 34% at 58% 20%, rgba(220,184,119,.08), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-[1500px] grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-6">
        <div className="relative z-10 order-2 lg:order-1">
          <div id="hero-name">
            <LiveName text="Dani Zein" className="select-none text-[clamp(3.75rem,9.5vw,9.5rem)] leading-[0.86] tracking-[-0.035em] text-text" />
          </div>

          <p
            style={{ animationDelay: "600ms" }}
            className="fadeup mt-6 max-w-[26ch] text-[clamp(1.35rem,2.1vw,2rem)] font-medium leading-[1.22] tracking-[-0.015em] text-text lg:mt-8"
          >
            I build products end to end, from the database to the App Store.
          </p>

          {/* Proof: the real products, straight away */}
          <a
            href="#work"
            style={{ animationDelay: "750ms" }}
            className="fadeup group mt-7 inline-flex flex-col items-start gap-3 rounded-[26px] border border-line bg-white/[0.03] p-3 pr-5 backdrop-blur-sm transition-colors hover:border-line-strong sm:flex-row sm:items-center sm:gap-4 sm:rounded-full sm:py-2 sm:pl-2"
          >
            <span className="flex -space-x-2.5">
              {projects.map((p) => (
                <span key={p.slug} className="rounded-[26%] ring-2 ring-black transition-transform duration-300 group-hover:translate-x-0.5">
                  <ProjectLogo slug={p.slug} name={p.name} size={32} />
                </span>
              ))}
            </span>
            <span className="pl-1 text-[14px] leading-snug text-text-2 sm:pl-0">
              <span className="text-text">{projects.length} products shipped.</span> {live} live on the App Store, Google Play and the web.
            </span>
          </a>

          <ul style={{ animationDelay: "880ms" }} className="fadeup mt-6 grid max-w-[560px] grid-cols-2 gap-2">
            {strengths.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 rounded-2xl border border-line bg-white/[0.02] px-3.5 py-3 text-[14px] text-text">
                <Icon className="h-4 w-4 shrink-0 text-text-2" strokeWidth={1.8} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>

          <div style={{ animationDelay: "1000ms" }} className="fadeup mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#work"
              className="inline-flex h-12 items-center rounded-full bg-text px-6 text-[15px] font-medium text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              See the work
            </a>
            <a
              href="#contact"
              className="inline-flex h-12 items-center rounded-full border border-line-strong px-6 text-[15px] font-medium text-text transition-colors hover:bg-white/5"
            >
              Start a project
            </a>
            <button
              type="button"
              onClick={onOpenPalette}
              className="ml-1 hidden h-12 items-center gap-2 rounded-full px-3 text-[14px] text-text-3 transition-colors hover:text-text md:inline-flex"
            >
              <kbd className="rounded-md border border-line-strong px-1.5 py-0.5 font-sans text-[12px]">⌘K</kbd>
              jump anywhere
            </button>
          </div>
          <p style={{ animationDelay: "1100ms" }} className="fadeup mt-8 text-[14px] text-text-3">
            Lebanon, working worldwide. I reply in English, Arabic or French.
          </p>
        </div>

        <div className="relative order-1 h-[42svh] min-h-[300px] lg:order-2 lg:h-[min(80svh,760px)]">
          <View className="absolute inset-0">
            <HeroScene reduced={reduced} active={onScreen} />
          </View>
        </div>
      </div>
    </section>
  );
}
